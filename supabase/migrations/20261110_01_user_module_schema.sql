-- User module, part 1: tables, helper functions, and the functions the app calls.
-- Nothing here changes how existing rows read; row-level security is switched on in part 2.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create table private.settings (key text primary key, value text not null);

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_url text,
  created_at timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, ''), '@', 1)), 60),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ───────────────────────── Kitchens ─────────────────────────
create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  weeks_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.kitchen_members (
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('head', 'member')),
  status text not null default 'active' check (status in ('active', 'requested')),
  created_at timestamptz not null default now(),
  primary key (kitchen_id, user_id)
);
create index kitchen_members_user on public.kitchen_members (user_id);

create table public.kitchen_invites (
  code text primary key,
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  role text not null default 'member' check (role in ('head', 'member')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0
);
create index kitchen_invites_kitchen on public.kitchen_invites (kitchen_id);

create function private.is_member(k uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kitchen_members m
    where m.kitchen_id = k and m.user_id = (select auth.uid()) and m.status = 'active');
$$;

create function private.is_head(k uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kitchen_members m
    where m.kitchen_id = k and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'head');
$$;

create function private.has_membership(k uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kitchen_members m
    where m.kitchen_id = k and m.user_id = (select auth.uid()));
$$;

create function private.shares_kitchen(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kitchen_members mine
    join public.kitchen_members theirs on theirs.kitchen_id = mine.kitchen_id
    where mine.user_id = (select auth.uid()) and mine.status = 'active' and theirs.user_id = u);
$$;

create function private.my_kitchen() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.kitchen_id from public.kitchen_members m
  where m.user_id = (select auth.uid()) and m.status = 'active'
  order by m.created_at limit 1;
$$;

-- ───────────────────────── Weeks belong to a kitchen ─────────────────────────
alter table public.weeks add column kitchen_id uuid references public.kitchens(id) on delete cascade;
alter table public.weeks add column week_start date;

-- Weeks loaded by the Saturday import carry no kitchen: they go to the import kitchen.
create function private.weeks_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kitchen_id is null then
    select s.value::uuid into new.kitchen_id from private.settings s where s.key = 'import_kitchen_id';
  end if;
  if new.week_start is null and new.id ~ '^\d{4}-\d{2}-\d{2}$' then
    new.week_start := new.id::date;
  end if;
  return new;
end $$;
create trigger weeks_defaults before insert on public.weeks
  for each row execute function private.weeks_defaults();

-- ───────────────────────── Dishes: one identity for a recipe across weeks ─────────────────────────
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  title text not null,
  kitchen_id uuid references public.kitchens(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index dishes_kitchen_key on public.dishes (kitchen_id, key) where kitchen_id is not null;
create index dishes_created_by on public.dishes (created_by);

-- Same rule as the app: notes in brackets are ignored, case is ignored.
create function private.dish_key(title text) returns text
language sql immutable set search_path = '' as $$
  select lower(btrim(regexp_replace(regexp_replace(coalesce(title, ''), '\([^)]*\)', '', 'g'), '\s+', ' ', 'g')));
$$;

alter table public.recipes add column dish_id uuid references public.dishes(id) on delete set null;
alter table public.recipes add column created_by uuid references auth.users(id) on delete set null;
alter table public.recipes add column source_recipe_id text;

create index if not exists recipes_dish on public.recipes (dish_id);
create index if not exists recipes_day on public.recipes (day_id);
create index if not exists days_week on public.days (week_id);
create index if not exists servings_recipe on public.servings (recipe_id);
create index if not exists ingredients_recipe on public.ingredients (recipe_id);
create index if not exists steps_recipe on public.steps (recipe_id);
create index if not exists shopping_week on public.shopping (week_id);
create index if not exists shopping_recipe on public.shopping (recipe_id);

-- A recipe inserted without a dish (the Saturday import) is matched to its kitchen's dish by title,
-- or starts a new dish.
create function private.recipes_set_dish() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k uuid;
  dkey text := private.dish_key(new.title);
begin
  if new.dish_id is not null or dkey = '' then return new; end if;
  if new.day_id is not null then
    select w.kitchen_id into k from public.days d join public.weeks w on w.id = d.week_id where d.id = new.day_id;
  end if;
  if k is null then
    select s.value::uuid into k from private.settings s where s.key = 'import_kitchen_id';
  end if;
  if k is null then return new; end if;
  select d.id into new.dish_id from public.dishes d where d.kitchen_id = k and d.key = dkey;
  if new.dish_id is null then
    insert into public.dishes (key, title, kitchen_id)
    values (dkey, btrim(regexp_replace(new.title, '\s*\([^)]*\)', '', 'g')), k)
    on conflict (kitchen_id, key) where kitchen_id is not null do update set key = excluded.key
    returning id into new.dish_id;
  end if;
  return new;
end $$;
create trigger recipes_set_dish before insert on public.recipes
  for each row execute function private.recipes_set_dish();

-- ───────────────────────── Favourites and reviews ─────────────────────────
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references public.dishes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  recipe_id text references public.recipes(id) on delete set null,
  kitchen_id uuid references public.kitchens(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  rating smallint check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  photo_path text,
  is_public boolean not null default false,
  cooked_on date,
  source text not null default 'app' check (source in ('app', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating is not null or comment <> '' or photo_path is not null)
);
create index reviews_dish on public.reviews (dish_id);
create index reviews_user on public.reviews (user_id);
create index reviews_kitchen on public.reviews (kitchen_id);
create index reviews_recipe on public.reviews (recipe_id);
create index reviews_photo on public.reviews (photo_path) where photo_path is not null;

-- ───────────────────────── Who can read what ─────────────────────────
create function private.can_read_dish(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dishes x where x.id = d
    and (x.is_public or x.created_by = (select auth.uid()) or private.is_member(x.kitchen_id)));
$$;

create function private.can_read_week(w text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.weeks x join public.kitchens k on k.id = x.kitchen_id
    where x.id = w and (k.weeks_public or private.is_member(k.id)));
$$;

create function private.can_read_day(d int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.days x where x.id = d and private.can_read_week(x.week_id));
$$;

create function private.can_read_recipe(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recipes x where x.id = r
    and ((x.dish_id is not null and private.can_read_dish(x.dish_id))
      or (x.day_id is not null and private.can_read_day(x.day_id))));
$$;

-- A planned recipe is edited by its week's kitchen; a library recipe by its author or their kitchen.
create function private.can_edit_recipe(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recipes x
    left join public.days d on d.id = x.day_id
    left join public.weeks w on w.id = d.week_id
    left join public.dishes ds on ds.id = x.dish_id
    where x.id = r and (select auth.uid()) is not null
      and case when x.day_id is not null then private.is_member(w.kitchen_id)
               else x.created_by = (select auth.uid()) or (ds.kitchen_id is not null and private.is_member(ds.kitchen_id)) end);
$$;

-- Averages follow the caller's own view of the reviews.
create view public.dish_ratings with (security_invoker = true) as
  select dish_id,
         round(avg(rating)::numeric, 1) as rating,
         count(rating) as ratings,
         count(*) as reviews,
         count(photo_path) as photos
  from public.reviews group by dish_id;
