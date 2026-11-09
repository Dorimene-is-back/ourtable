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
- `/weeks/:weekId/:recipeId` → `Recipe`: ingredients, method, timers, wake lock

`vercel.json` rewrites every path to `index.html` so these survive a reload.

### Data model (Supabase)

```
weeks         id (Monday's date, e.g. "2026-05-25"), dates, note
  └─ days     id, day ("Monday"), date, holiday, holiday_name
       └─ recipes   id, type ("main"|"dessert"), title, image, comments, prep_ahead, ref, ref_url, sort_order
            ├─ servings     for_who ("kids"|"adult"|"all"), count, notes
            ├─ ingredients  sort_order, value  (values starting with "—" are section headers)
            └─ steps        sort_order, value, timer_minutes, meanwhile  (same header convention)
  └─ shopping  day, day_order, sort_order, item
```

- `steps.timer_minutes` drives the timer button, `steps.meanwhile` the "Meanwhile" line, `recipes.prep_ahead` the "Ahead" note. All are nullable, and the UI hides each one when empty. New weeks must set them at import.
- `recipes.comments` is planning notes and is no longer shown.
- `src/lib/data.js` fetches and caches; `src/lib/weeks.js` holds the date and display rules (who-for label, main dish, which week is current).

### Auth

`src/lib/useAuth.js` wraps Supabase auth (`user`, `loading`, `signInWithGoogle`, `signInWithMagicLink`, `signOut`). `AuthButton` is in the Home header and opens `AuthModal` (Google OAuth or email magic link).

### Styling

Inline styles using the CSS variables in `src/index.css` (`--tomato`, `--tomato-dark`, `--tomato-tint`, `--ink`, `--muted`, `--line`, `--chip`, `--white`). Never hardcode brand colours. Red means "now / active / primary" only. Bricolage Grotesque everywhere, sentence case, no emoji. Shared pieces (header, back button, tab bar, photo) are in `src/components/ui.jsx`.

### Holiday days

A day with `holiday: true` whose recipes have no ingredients is a "no-cooking" day: its title shows as plain text and it has no main dish.

### PWA

`public/manifest.webmanifest` makes the app installable. `public/sw.js` caches nothing and exists only for timer notifications; it is registered only when running installed.
