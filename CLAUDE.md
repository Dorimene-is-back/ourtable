# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, localhost:5173)
npm run build     # production build
npm run preview   # preview production build
```

No test suite configured.

## Architecture

**Tambouille** (repo name `ourtable`) is a family weekly meal planner: a React SPA backed by Supabase. Mobile first (designed at 390px, max width 500px). The brief and approved design are linked from `docs/REDESIGN.md`.

### Routing

`App.jsx` routes (`src/pages/`):
- `/` → `Home`: tonight and this week
- `/shopping` → `Shopping`: the current week's list
- `/weeks` → `AllWeeks`: calendar of every week
- `/weeks/:weekId` → `Week`: plan, plus a Shopping segment (`?view=shopping`)
- `/weeks/:weekId/:recipeId` → `Recipe`: ingredients, method, timers, wake lock, then the photo-and-rating step and reviews
- `/recipes` → `Recipes`: every dish, with times cooked, rating and favourite
- `/recipes/:recipeId` → `Recipe` for a recipe that is not on a week (library); `/recipes/new` and `/recipes/:recipeId/edit` → `RecipeForm`
- `/kitchen` → `Kitchen`: people, invite link, join requests, sign out
- `/join/:code` → `Join`: where an invite link lands

`vercel.json` rewrites every path to `index.html` so these survive a reload.

### Data model (Supabase)

```
kitchens      id, name, weeks_public            ← a household; kitchen_members (role head|member, status active|requested), kitchen_invites
weeks         id, kitchen_id, week_start (the Monday), dates, note
  └─ days     id, day ("Monday"), date, holiday, holiday_name
       └─ recipes   id, type ("main"|"dessert"), title, image, comments, prep_ahead, ref, ref_url, sort_order
            ├─ servings     for_who ("kids"|"adult"|"all"), count, notes
            ├─ ingredients  sort_order, value  (values starting with "—" are section headers)
            └─ steps        sort_order, value, timer_minutes, meanwhile  (same header convention)
  └─ shopping  day, day_order, sort_order, item, category, recipe_id
```

- `steps.timer_minutes` drives the timer button, `steps.meanwhile` the "Meanwhile" line, `recipes.prep_ahead` the "Ahead" note. All are nullable, and the UI hides each one when empty. New weeks must set them at import. Set `timer_minutes` only for waits under 60 minutes, where you are still in the app cooking.
- `shopping.category` is one of Pantry, Vegetables, Fruit, Herbs, Meat, Fish, Dairy & eggs, Pasta, rice & noodles, Bread & dough, Tins & stock, Nuts, Other (Note rows are hidden). `Pantry` items appear as pantry checks. `shopping.recipe_id` names the recipe the item is for. New weeks must set both at import.
- `recipes.comments` is planning notes and is no longer shown.
- **Week ids.** For the kitchen the Saturday import feeds (Zuzu), `weeks.id` is the Monday's date. Other kitchens' weeks are `<monday>~<kitchen prefix>`. Always use `week.start` (from `week_start`) for dates and `week.id` only for links and lookups.
- **Dishes.** `recipes.dish_id → dishes` ties the copies of one dish across weeks. Favourites (`favorites`), reviews (`reviews`: rating, comment, photo_path, is_public, cooked_on) and averages (`dish_ratings` view) hang off the dish. A recipe with `day_id` null is a library recipe someone added.
- **The Saturday import is unchanged**: insert weeks, days, recipes and the rest as before. Triggers set `weeks.kitchen_id` (Zuzu), `weeks.week_start` and `recipes.dish_id` (matched by title, brackets ignored). Insert the week with `on conflict (id) do nothing`, because the app may already have created it.
- **Security.** Every table has row-level security. Plans, recipes and shopping are read-only from the browser; the app changes them only through the database functions `save_recipe`, `delete_recipe`, `add_recipe_to_day`, `create_kitchen`, `create_invite`, `join_kitchen`, `respond_to_request`, `remove_member`. Reviews, favourites and profiles are written directly under their own rules. Schema lives in `supabase/migrations/`.
- **Photos.** Bucket `review-photos` is private (a photo is readable when its review is; shown through signed links). Bucket `recipe-images` is public (main photo of an added recipe). Photos are shrunk to 1600px in the browser before upload (`shrinkPhoto` in `src/lib/social.js`).
- `src/lib/data.js` fetches and caches; `src/lib/weeks.js` holds the date and display rules (who-for label, main dish, which week is current).

### Auth

`src/lib/auth.jsx` holds one `AuthProvider` (wrapped around the routes in `App.jsx`). `useAuth()` gives `user`, `profile`, `kitchen`, `kitchenId`, `isHead`, `ready`, and `requireUser(reason)`, which opens the sign-in sheet (`AuthModal`: Google or email link) when signed out and returns false. After signing in, the person returns to the screen they left. The provider tells `src/lib/data.js` which kitchen's weeks to load (`setScope`); signed out, the app shows kitchens whose `weeks_public` is on. Call `refreshData()` after anything that changes weeks or recipes. `src/lib/social.js` has favourites, reviews, photo upload and kitchen calls.

### Styling

Inline styles using the CSS variables in `src/index.css` (`--tomato`, `--tomato-dark`, `--tomato-tint`, `--ink`, `--muted`, `--line`, `--chip`, `--white`). Never hardcode brand colours. Red means "now / active / primary" only. Bricolage Grotesque everywhere, sentence case, no emoji. Shared pieces (header, back button, tab bar, photo) are in `src/components/ui.jsx`.

### Holiday days

A day with `holiday: true` whose recipes have no ingredients is a "no-cooking" day: its title shows as plain text and it has no main dish.

### PWA

`public/manifest.webmanifest` makes the app installable. `public/sw.js` caches nothing and exists only for timer notifications; it is registered only when running installed.
