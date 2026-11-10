-- User module, part 3: put existing data under the Zuzu kitchen, give every recipe a dish,
-- switch on row-level security, and create photo storage.

do $$
declare
  k uuid;
begin
  insert into public.kitchens (name, weeks_public) values ('Zuzu', true) returning id into k;
  insert into private.settings (key, value) values ('import_kitchen_id', k::text);
  update public.weeks set kitchen_id = k, week_start = id::date;

  -- Same dish under different titles across weeks: one name each.
  create temp table alias (id text primary key, title text) on commit drop;
  insert into alias values
    ('bulgogi-beef-bowl', 'Bulgogi'),
    ('ca-kho-to-leftovers', 'Cá Kho Tộ'),
    ('lentil-beetroot-feta-salad-2026-10-14', 'Lentil & Roasted Beetroot Salad'),
    ('miso-ramen-chashu-w6', 'Miso Ramen with Chashu Pork'),
    ('gnocchi-poeles-pancetta-w5', 'Gnocchi Poêlés & Pancetta'),
    ('gnocchi-poeles-pancetta-w6', 'Gnocchi Poêlés & Pancetta'),
    ('chicken-shawarma-diy-w5', 'DIY Chicken Shawarma'),
    ('rocket-salad-2026-10-26', 'Rocket, Cherry Tomato & Parmesan Salad'),
    ('avocado-feta-chickpea-salad-2026-10-06', 'Chickpea, Avocado & Feta Salad'),
    ('leftover-spaghetti-veg-kids-2026-10-09', 'Spaghetti alla Bolognese');

  -- No-cooking placeholders (no ingredients) are not dishes.
  insert into public.dishes (key, title, kitchen_id)
  select distinct on (private.dish_key(t.title)) private.dish_key(t.title), t.title, k
  from (
    select coalesce(a.title, btrim(regexp_replace(r.title, '\s*\([^)]*\)', '', 'g'))) as title, w.id as week_id
    from public.recipes r
    join public.days d on d.id = r.day_id
    join public.weeks w on w.id = d.week_id
    left join alias a on a.id = r.id
    where exists (select 1 from public.ingredients i where i.recipe_id = r.id)
  ) t
  order by private.dish_key(t.title), t.week_id desc;

  update public.recipes r set dish_id = ds.id
  from public.dishes ds
  where ds.kitchen_id = k
    and ds.key = private.dish_key(coalesce((select a.title from alias a where a.id = r.id), r.title))
    and exists (select 1 from public.ingredients i where i.recipe_id = r.id);

  -- One-time link that makes its first user head of the Zuzu kitchen.
  insert into public.kitchen_invites (code, kitchen_id, role, max_uses)
  values ('ZUZU-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), k, 'head', 1);
end $$;

alter table public.weeks alter column kitchen_id set not null;
alter table public.weeks alter column week_start set not null;
alter table public.weeks add constraint weeks_kitchen_start unique (kitchen_id, week_start);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger reviews_touch before update on public.reviews
  for each row execute function private.touch_updated_at();

-- ───────────────────────── Row-level security ─────────────────────────
-- Plans, recipes and shopping are read-only from the app: changes go through the functions in part 2
-- (or the Saturday import, which runs with full rights).
alter table public.profiles enable row level security;
alter table public.kitchens enable row level security;
alter table public.kitchen_members enable row level security;
alter table public.kitchen_invites enable row level security;
alter table public.dishes enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.weeks enable row level security;
alter table public.days enable row level security;
alter table public.recipes enable row level security;
alter table public.servings enable row level security;
alter table public.ingredients enable row level security;
alter table public.steps enable row level security;
alter table public.shopping enable row level security;

create policy "read own, kitchen-mates and public reviewers" on public.profiles for select
  using (id = (select auth.uid()) or private.shares_kitchen(id)
         or exists (select 1 from public.reviews r where r.user_id = profiles.id and r.is_public));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read open kitchens and your own" on public.kitchens for select
  using (weeks_public or private.has_membership(id));
create policy "head updates the kitchen" on public.kitchens for update to authenticated
  using (private.is_head(id)) with check (private.is_head(id));

create policy "read your memberships and your kitchen's" on public.kitchen_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_member(kitchen_id));

create policy "head reads invites" on public.kitchen_invites for select to authenticated
  using (private.is_head(kitchen_id));

create policy "read public dishes and your own" on public.dishes for select
  using (is_public or created_by = (select auth.uid()) or private.is_member(kitchen_id));

create policy "read weeks of open kitchens and your own" on public.weeks for select
  using (private.can_read_week(id));
create policy "read days of readable weeks" on public.days for select
  using (private.can_read_week(week_id));
create policy "read shopping of readable weeks" on public.shopping for select
  using (private.can_read_week(week_id));

create policy "read readable recipes" on public.recipes for select
  using ((dish_id is not null and private.can_read_dish(dish_id)) or (day_id is not null and private.can_read_day(day_id)));
create policy "read servings of readable recipes" on public.servings for select
  using (private.can_read_recipe(recipe_id));
create policy "read ingredients of readable recipes" on public.ingredients for select
  using (private.can_read_recipe(recipe_id));
create policy "read steps of readable recipes" on public.steps for select
  using (private.can_read_recipe(recipe_id));

create policy "read own favourites" on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "save a favourite" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_dish(dish_id));
create policy "remove a favourite" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "read public reviews, your own and your kitchen's" on public.reviews for select
  using (is_public or user_id = (select auth.uid()) or (kitchen_id is not null and private.is_member(kitchen_id)));
create policy "write a review" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'app'
              and (kitchen_id is null or private.is_member(kitchen_id)) and private.can_read_dish(dish_id));
create policy "edit own review" on public.reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (kitchen_id is null or private.is_member(kitchen_id)));
create policy "delete own review" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────────────────── Photos ─────────────────────────
-- review-photos is private: a photo is readable exactly when its review is.
-- recipe-images is public: main photos of recipes people add.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('review-photos', 'review-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "photos: upload to your own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('review-photos', 'recipe-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: delete your own" on storage.objects for delete to authenticated
  using (bucket_id in ('review-photos', 'recipe-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "review photos: read when the review is readable" on storage.objects for select
  using (bucket_id = 'review-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or exists (select 1 from public.reviews r where r.photo_path = name)));
