-- Read rules written as joins instead of one function call per row (home page query: 230 ms → 50 ms).
-- Each subquery is itself filtered by the row-level security of the table it reads.
alter policy "read weeks of open kitchens and your own" on public.weeks
  using (exists (select 1 from public.kitchens k where k.id = weeks.kitchen_id));
alter policy "read days of readable weeks" on public.days
  using (exists (select 1 from public.weeks w where w.id = days.week_id));
alter policy "read shopping of readable weeks" on public.shopping
  using (exists (select 1 from public.weeks w where w.id = shopping.week_id));
alter policy "read readable recipes" on public.recipes
  using (exists (select 1 from public.dishes ds where ds.id = recipes.dish_id)
         or exists (select 1 from public.days d where d.id = recipes.day_id));
alter policy "read servings of readable recipes" on public.servings
  using (exists (select 1 from public.recipes r where r.id = servings.recipe_id));
alter policy "read ingredients of readable recipes" on public.ingredients
  using (exists (select 1 from public.recipes r where r.id = ingredients.recipe_id));
alter policy "read steps of readable recipes" on public.steps
  using (exists (select 1 from public.recipes r where r.id = steps.recipe_id));
