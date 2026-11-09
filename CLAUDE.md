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

**ourtable** is a family weekly meal planner — a React SPA backed by Supabase. It is mobile-first (max-width 500px) and styled entirely with inline styles (no CSS files or Tailwind).

### Routing

`App.jsx` has two routes:
- `/` → `MealIndex` — lists all weeks (current week card + past weeks list)
- `/weeks/:weekId` → `WeekPage` — detail view for a week with two tabs: Meal Plan and Shopping List

### Data model (Supabase)

```
weeks         id (string, e.g. "2026-05-25"), dates, note
  └─ days     id, day ("Monday"), date, holiday, holiday_name, sort by id
       └─ recipes   id, type ("main"|"dessert"), emoji, title, subtitle, image, comments, ref, ref_url
            ├─ servings     for_who ("kids"|"adult"|"all"), count, notes
            ├─ ingredients  sort_order, value  (values starting with "—" are section headers)
            └─ steps        sort_order, value  (same header convention)
  └─ shopping  day, day_order, sort_order, item
```

`WeekPage` fetches the full tree in a single Supabase query. `MealIndex` fetches a lighter version (`weeks` + `days` + `recipes` only, no servings/ingredients/steps).

### Auth

`src/lib/useAuth.js` — custom hook wrapping Supabase auth. Exposes `user`, `loading`, `signInWithGoogle`, `signInWithMagicLink`, `signOut`. Both pages render `<AuthButton />` in the header; it shows "Sign in" or an avatar/dropdown depending on auth state. The auth modal (`AuthModal.jsx`) offers Google OAuth or email magic link.

### Design tokens (repeated across all files)

```js
const ACCENT = "#C4956A";   // warm terracotta — primary brand color
const DARK   = "#2A2A2A";   // near-black text
const BORDER = "#EEE8DE";   // warm beige border
const CREAM  = "#FDF6EC";   // warm cream background (cards, headers)
const BG     = "#FAFAF7";   // page background
```

These are copy-pasted per file — not shared constants. Keep this pattern when editing.

### Ingredient/step headers

Lines whose `value` starts with `"—"` render as a section sub-header (uppercase, accent color) instead of a bullet. The `—` is stripped before display.

### Holiday days

A day with `holiday: true` and a single recipe with no ingredients is treated as a "no-cooking" day: `WeekPage` and `Week20260525` skip the MealCard, and `DaySummary` renders a simplified comment-only block.

### `Week20260525.jsx`

Legacy page that hardcodes the week id `"2026-05-25"`. The generic `WeekPage` supersedes it; it can be ignored or deleted when no longer needed.
