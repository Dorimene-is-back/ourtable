-- User module, part 2: the functions the app calls. Each one checks who is calling.

-- ───────────────────────── Kitchens ─────────────────────────
create function public.create_kitchen(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  kid uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then
    raise exception 'Give your kitchen a name of up to 40 characters.';
  end if;
  if private.my_kitchen() is not null then raise exception 'You already belong to a kitchen.'; end if;
  insert into public.kitchens (name, created_by) values (btrim(p_name), uid) returning id into kid;
  delete from public.kitchen_members where user_id = uid and status = 'requested';
  insert into public.kitchen_members (kitchen_id, user_id, role, status) values (kid, uid, 'head', 'active');
  return kid;
end $$;

create function public.create_invite(p_kitchen uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  kname text;
  prefix text;
  new_code text;
begin
  if not private.is_head(p_kitchen) then raise exception 'Only the head of the kitchen can invite people.'; end if;
  select name into kname from public.kitchens where id = p_kitchen;
  prefix := upper(left(regexp_replace(kname, '[^A-Za-z]', '', 'g'), 4));
  if prefix = '' then prefix := 'JOIN'; end if;
  -- One live invite link per kitchen: a new one replaces the old.
  delete from public.kitchen_invites where kitchen_id = p_kitchen and role = 'member';
  new_code := prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.kitchen_invites (code, kitchen_id, role, created_by, expires_at)
  values (new_code, p_kitchen, 'member', auth.uid(), now() + interval '14 days');
  return new_code;
end $$;

-- Shown on the join page before signing in.
create function public.invite_preview(p_code text) returns table (kitchen_name text, status text)
language sql stable security definer set search_path = '' as $$
  select k.name,
         case when (i.expires_at is null or i.expires_at > now()) and (i.max_uses is null or i.uses < i.max_uses)
              then 'valid' else 'expired' end
  from public.kitchen_invites i join public.kitchens k on k.id = i.kitchen_id
  where i.code = upper(btrim(p_code));
$$;

-- A live code joins straight away. An expired one becomes a request the head approves.
create function public.join_kitchen(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  inv public.kitchen_invites%rowtype;
  mine public.kitchen_members%rowtype;
  live boolean;
  other uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.kitchen_invites where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'This invite code is not recognised.'; end if;

  select * into mine from public.kitchen_members where kitchen_id = inv.kitchen_id and user_id = uid;
  if found and mine.status = 'active' then
    return jsonb_build_object('kitchen_id', inv.kitchen_id, 'status', 'active');
  end if;

  other := private.my_kitchen();
  if other is not null then raise exception 'You already belong to a kitchen. Leave it before joining another.'; end if;

  live := (inv.expires_at is null or inv.expires_at > now()) and (inv.max_uses is null or inv.uses < inv.max_uses);
  if not live then
    insert into public.kitchen_members (kitchen_id, user_id, role, status)
    values (inv.kitchen_id, uid, 'member', 'requested')
    on conflict (kitchen_id, user_id) do nothing;
    return jsonb_build_object('kitchen_id', inv.kitchen_id, 'status', 'requested');
  end if;

  insert into public.kitchen_members (kitchen_id, user_id, role, status)
  values (inv.kitchen_id, uid, inv.role, 'active')
  on conflict (kitchen_id, user_id) do update set role = excluded.role, status = 'active';
  update public.kitchen_invites set uses = uses + 1 where code = inv.code;
  delete from public.kitchen_members where user_id = uid and status = 'requested' and kitchen_id <> inv.kitchen_id;

  if inv.role = 'head' then
    -- The head takes over what was recorded for the kitchen before anyone had an account.
    update public.kitchens set created_by = uid where id = inv.kitchen_id and created_by is null;
    update public.reviews set user_id = uid where kitchen_id = inv.kitchen_id and user_id is null;
  end if;
  return jsonb_build_object('kitchen_id', inv.kitchen_id, 'status', 'active');
end $$;

create function public.respond_to_request(p_kitchen uuid, p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_head(p_kitchen) then raise exception 'Only the head of the kitchen can do this.'; end if;
  if not p_approve then
    delete from public.kitchen_members where kitchen_id = p_kitchen and user_id = p_user and status = 'requested';
    return;
  end if;
  if exists (select 1 from public.kitchen_members where user_id = p_user and status = 'active') then
    raise exception 'This person already belongs to a kitchen.';
  end if;
  update public.kitchen_members set status = 'active' where kitchen_id = p_kitchen and user_id = p_user and status = 'requested';
  delete from public.kitchen_members where user_id = p_user and status = 'requested' and kitchen_id <> p_kitchen;
end $$;

-- Leave a kitchen yourself, or (as head) remove someone.
create function public.remove_member(p_kitchen uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  target public.kitchen_members%rowtype;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if p_user <> uid and not private.is_head(p_kitchen) then raise exception 'Only the head of the kitchen can remove people.'; end if;
  select * into target from public.kitchen_members where kitchen_id = p_kitchen and user_id = p_user;
  if not found then return; end if;
  if target.role = 'head' and target.status = 'active'
     and not exists (select 1 from public.kitchen_members where kitchen_id = p_kitchen and user_id <> p_user and role = 'head' and status = 'active')
     and exists (select 1 from public.kitchen_members where kitchen_id = p_kitchen and user_id <> p_user and status = 'active') then
    raise exception 'Make someone else head of the kitchen before leaving.';
  end if;
  delete from public.kitchen_members where kitchen_id = p_kitchen and user_id = p_user;
end $$;

create function public.set_member_role(p_kitchen uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_head(p_kitchen) then raise exception 'Only the head of the kitchen can do this.'; end if;
  if p_role not in ('head', 'member') then raise exception 'Unknown role.'; end if;
  if p_role = 'member' and not exists (select 1 from public.kitchen_members
      where kitchen_id = p_kitchen and user_id <> p_user and role = 'head' and status = 'active') then
    raise exception 'A kitchen needs at least one head.';
  end if;
  update public.kitchen_members set role = p_role where kitchen_id = p_kitchen and user_id = p_user and status = 'active';
end $$;

-- ───────────────────────── Recipes ─────────────────────────
create function private.slug(t text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(btrim(regexp_replace(
    translate(lower(coalesce(t, '')),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæộồốổỗơờớởỡợưừứửữựăằắẳẵặâầấẩẫậêềếểễệđ',
      'aaaaaaceeeeiiiinooooouuuuyyoaooooooooooouuuuuuaaaaaaaaaaaaeeeeeed'),
    '[^a-z0-9]+', '-', 'g'), '-'), ''), 'recipe');
$$;

-- Creates a recipe in the caller's library, or replaces one they may edit.
-- p: { id?, title, type, image, ref, ref_url, prep_ahead, for_who, count, is_public, ingredients[], steps[] }
create function public.save_recipe(p jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k uuid := private.my_kitchen();
  rid text := nullif(p->>'id', '');
  v_title text := btrim(coalesce(p->>'title', ''));
  v_type text := case when p->>'type' = 'dessert' then 'dessert' else 'main' end;
  v_who text := case when p->>'for_who' in ('kids', 'adult') then p->>'for_who' else 'all' end;
  v_count int := least(greatest(coalesce(nullif(p->>'count', '')::int, 1), 1), 50);
  v_public boolean := coalesce((p->>'is_public')::boolean, true);
  v_image text := left(coalesce(p->>'image', ''), 1000);
  v_ref_url text := left(coalesce(p->>'ref_url', ''), 1000);
  dkey text;
  did uuid;
  planned boolean := false;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if char_length(v_title) not between 1 and 120 then raise exception 'Give the recipe a name of up to 120 characters.'; end if;
  if jsonb_typeof(coalesce(p->'ingredients', '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p->'steps', '[]'::jsonb)) <> 'array' then
    raise exception 'Ingredients and steps must be lists.';
  end if;
  if jsonb_array_length(coalesce(p->'ingredients', '[]'::jsonb)) > 80 or jsonb_array_length(coalesce(p->'steps', '[]'::jsonb)) > 60 then
    raise exception 'That is too many ingredients or steps for one recipe.';
  end if;
  if v_image <> '' and v_image !~* '^https://' then raise exception 'The photo link must start with https://'; end if;
  if v_ref_url <> '' and v_ref_url !~* '^https?://' then raise exception 'The source link must start with http:// or https://'; end if;
  dkey := private.dish_key(v_title);

  if rid is null then
    if k is not null then
      select id into did from public.dishes where kitchen_id = k and key = dkey;
    else
      select id into did from public.dishes where kitchen_id is null and created_by = uid and key = dkey;
    end if;
    if did is null then
      insert into public.dishes (key, title, kitchen_id, created_by, is_public)
      values (dkey, v_title, k, uid, v_public) returning id into did;
    end if;
    rid := left(private.slug(v_title), 60) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    insert into public.recipes (id, day_id, title, type, image, ref, ref_url, comments, sort_order, prep_ahead, dish_id, created_by)
    values (rid, null, v_title, v_type, v_image, left(coalesce(p->>'ref', ''), 200), v_ref_url, '', 0,
            nullif(left(btrim(coalesce(p->>'prep_ahead', '')), 500), ''), did, uid);
  else
    if not private.can_edit_recipe(rid) then raise exception 'You cannot change this recipe.'; end if;
    select day_id is not null, dish_id into planned, did from public.recipes where id = rid;
    update public.recipes set title = v_title, type = v_type, image = v_image,
      ref = left(coalesce(p->>'ref', ''), 200), ref_url = v_ref_url,
      prep_ahead = nullif(left(btrim(coalesce(p->>'prep_ahead', '')), 500), '')
    where id = rid;
    if not planned and did is not null then
      -- The library copy carries the dish's name and visibility, unless the new name is already another dish.
      update public.dishes d set is_public = v_public,
        title = case when clash.hit then d.title else v_title end,
        key = case when clash.hit then d.key else dkey end
      from (select exists (select 1 from public.dishes o
              where o.id <> did and o.key = dkey
                and o.kitchen_id is not distinct from (select kitchen_id from public.dishes where id = did)) as hit) clash
      where d.id = did;
    end if;
    delete from public.servings where recipe_id = rid;
    delete from public.ingredients where recipe_id = rid;
    delete from public.steps where recipe_id = rid;
  end if;

  insert into public.servings (recipe_id, for_who, count, notes) values (rid, v_who, v_count, '');
  insert into public.ingredients (recipe_id, sort_order, value)
    select rid, ord, left(btrim(val), 500) from jsonb_array_elements_text(coalesce(p->'ingredients', '[]'::jsonb)) with ordinality as t(val, ord)
    where btrim(val) <> '';
  insert into public.steps (recipe_id, sort_order, value)
    select rid, ord, left(btrim(val), 1500) from jsonb_array_elements_text(coalesce(p->'steps', '[]'::jsonb)) with ordinality as t(val, ord)
    where btrim(val) <> '';
  return rid;
end $$;

-- Deletes a library recipe, or takes a planned recipe off its week.
create function public.delete_recipe(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.recipes%rowtype;
  wid text;
begin
  if not private.can_edit_recipe(p_id) then raise exception 'You cannot remove this recipe.'; end if;
  select * into r from public.recipes where id = p_id;
  delete from public.shopping where recipe_id = p_id;
  delete from public.steps where recipe_id = p_id;
  delete from public.ingredients where recipe_id = p_id;
  delete from public.servings where recipe_id = p_id;
  delete from public.recipes where id = p_id;
  if r.day_id is not null then
    select week_id into wid from public.days where id = r.day_id;
    if not exists (select 1 from public.recipes where day_id = r.day_id) then
      delete from public.days where id = r.day_id;
    end if;
    if not exists (select 1 from public.days where week_id = wid) then
      delete from public.shopping where week_id = wid;
      delete from public.weeks where id = wid;
    end if;
  end if;
  if r.dish_id is not null
     and not exists (select 1 from public.recipes where dish_id = r.dish_id)
     and not exists (select 1 from public.reviews where dish_id = r.dish_id) then
    delete from public.dishes where id = r.dish_id;
  end if;
end $$;

-- Puts a copy of a recipe on a day of the caller's kitchen calendar, creating the week and day if needed.
create function public.add_recipe_to_day(p_recipe text, p_date date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k uuid := private.my_kitchen();
  src public.recipes%rowtype;
  monday date := p_date - (extract(isodow from p_date)::int - 1);
  wid text;
  did int;
  new_id text;
  base text;
  n int := 1;
  day_label text := to_char(p_date, 'Dy FMDD');
  next_order int;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if k is null then raise exception 'Create or join a kitchen first.'; end if;
  if p_date is null or p_date < current_date - 60 or p_date > current_date + 366 then raise exception 'Pick a nearer date.'; end if;
  if not private.can_read_recipe(p_recipe) then raise exception 'This recipe is not available.'; end if;
  select * into src from public.recipes where id = p_recipe;

  select id into wid from public.weeks where kitchen_id = k and week_start = monday;
  if wid is null then
    -- Plain dates are the import kitchen's week ids; other kitchens get a suffix.
    if k::text = (select value from private.settings where key = 'import_kitchen_id')
       and not exists (select 1 from public.weeks where id = monday::text) then
      wid := monday::text;
    else
      wid := monday::text || '~' || left(k::text, 8);
    end if;
    insert into public.weeks (id, dates, note, kitchen_id, week_start)
    values (wid, to_char(monday, 'FMDD') || ' – ' || to_char(monday + 4, 'FMDD FMMonth YYYY'), '', k, monday);
  end if;

  select id into did from public.days where week_id = wid and day = to_char(p_date, 'FMDay');
  if did is null then
    insert into public.days (week_id, day, date, holiday, holiday_name)
    values (wid, to_char(p_date, 'FMDay'), to_char(p_date, 'FMDD FMMonth'), false, '') returning id into did;
  end if;

  base := regexp_replace(src.id, '-(\d{4}-\d{2}-\d{2}|w\d+|[0-9a-f]{6})$', '') || '-' || p_date::text;
  new_id := base;
  while exists (select 1 from public.recipes where id = new_id) loop
    n := n + 1;
    new_id := base || '-' || n;
  end loop;

  insert into public.recipes (id, day_id, title, emoji, subtitle, type, image, ref, ref_url, comments, sort_order, prep_ahead, dish_id, created_by, source_recipe_id)
  values (new_id, did, src.title, src.emoji, src.subtitle, src.type, src.image, src.ref, src.ref_url, '',
          (select count(*) from public.recipes where day_id = did), src.prep_ahead, src.dish_id, uid, src.id);
  insert into public.servings (recipe_id, for_who, count, notes)
    select new_id, for_who, count, notes from public.servings where recipe_id = src.id order by id;
  insert into public.ingredients (recipe_id, sort_order, value)
    select new_id, sort_order, value from public.ingredients where recipe_id = src.id;
  insert into public.steps (recipe_id, sort_order, value, timer_minutes, meanwhile)
    select new_id, sort_order, value, timer_minutes, meanwhile from public.steps where recipe_id = src.id;

  select coalesce(max(sort_order), 0) into next_order from public.shopping where week_id = wid;
  if exists (select 1 from public.shopping where recipe_id = src.id and coalesce(category, '') <> 'Note') then
    insert into public.shopping (week_id, day, sort_order, item, day_order, category, recipe_id)
      select wid, day_label, next_order + row_number() over (order by sort_order, id), item, extract(isodow from p_date)::int, category, new_id
      from public.shopping where recipe_id = src.id and coalesce(category, '') <> 'Note';
  else
    insert into public.shopping (week_id, day, sort_order, item, day_order, category, recipe_id)
      select wid, day_label, next_order + row_number() over (order by sort_order, id), value, extract(isodow from p_date)::int, 'Other', new_id
      from public.ingredients where recipe_id = src.id and value !~ '^\s*—';
  end if;
  return jsonb_build_object('week_id', wid, 'recipe_id', new_id);
end $$;

-- Only signed-in people call these; the preview is open so the join page can greet a visitor.
revoke execute on function public.create_kitchen(text), public.create_invite(uuid), public.join_kitchen(text),
  public.respond_to_request(uuid, uuid, boolean), public.remove_member(uuid, uuid), public.set_member_role(uuid, uuid, text),
  public.save_recipe(jsonb), public.delete_recipe(text), public.add_recipe_to_day(text, date) from public, anon;
grant execute on function public.create_kitchen(text), public.create_invite(uuid), public.join_kitchen(text),
  public.respond_to_request(uuid, uuid, boolean), public.remove_member(uuid, uuid), public.set_member_role(uuid, uuid, text),
  public.save_recipe(jsonb), public.delete_recipe(text), public.add_recipe_to_day(text, date) to authenticated;
revoke execute on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
