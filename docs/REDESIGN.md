# Tambouille redesign — build brief

Approved design (canvas, 6 boards): https://claude.ai/code/artifact/948b0ec4-d951-414d-b461-6c3c49426c7c
Build it to match. When the canvas and this brief disagree, the canvas wins.

## 0. Before you start

- `main` on GitHub has no auth code. If the local repo has unpushed auth work (`useAuth.js`, `AuthModal.jsx`, `AuthButton.jsx`), merge it first and keep it working.
- Work on a branch `redesign`, keep `main` deployable, and open a PR at the end.
- Mobile first (390px wide). No desktop layout work beyond "doesn't break".

## 1. Identity

| Token | Value | Use |
|---|---|---|
| `--tomato` | `#D72C16` | headers, primary buttons, today/current, active tab, step numbers |
| `--tomato-dark` | `#A8200E` | hover/pressed |
| `--ink` | `#1A0F0C` | text, secondary button borders |
| `--muted` | `#6B5F5C` | secondary text, inactive tabs |
| `--line` | `#EEE9E8` | dividers (2px), photo placeholders |
| `--chip` | `#F4F1F0` | day chips, empty calendar days |
| `--white` | `#FFFFFF` | background |

Rules: one colour plus white and ink. **Red means "now / active / primary" only.** No other accent colours, no gradients (except inside the logo), no beige, no emoji, no coloured badges.

Type: **Bricolage Grotesque** (Google Fonts, weights 400/500/600/800) for everything. Headings 800 with tight tracking (≈ −1px at 30px), sentence case always, never all caps.

Logo: `public/brand/bowl-white.png` (the user's bowl, unaltered) + the word `tambouille` in Bricolage 800, white, on the red header. **No frame or tile around it in the header.** App icon / favicon / apple-touch-icon: `public/brand/icon-{512,192,180}.png`. Rename the `<title>` to Tambouille.

"Who it's for" is a plain word on the right of the row (`Kids`, `Adult`, `All`) in `--muted`. Map from `servings.for_who`: kids+adult or `all` → All.

## 2. Navigation

Floating bottom tab bar on Home, Shopping and Calendar: white, 2px `--line` border, soft shadow, radius 24, 3 tabs — **Week** (`/`), **Shopping** (`/shopping`), **Past weeks** (`/weeks`). Active tab = red icon + red bold label, others `--muted`. Week page and Recipe page have a back button instead (white circle, red chevron, on the red header).

Routes: `/` Home · `/weeks` Calendar · `/weeks/:weekId` Week · `/weeks/:weekId/:recipeId` Recipe · `/shopping` current week's shopping list.

## 3. Screens

**Home** (fits ~one screen)
- Compact red header: logo + account button.
- "Tonight" (34px) + date. Row: 92px photo of tonight's main dish + the dish names with who-for. Two equal 56px buttons, text only, centred, no wrap: **Tonight's recipe** (red, opens recipe) / **Shopping list** (outlined ink).
- "This week" + "Full week ›" (ink, not red) → compact day rows: day short name, date number (today in a red circle), dish names + who-for. Past days in `--muted`. No thumbnails here.

**Week** (`/weeks/:weekId`)
- Red header: back, "2–6 November", small bowl. Segmented control Plan / Shopping.
- Day chips strip (Mon–Fri, today red) that scrolls to the day.
- Per day: heading "Monday 2" (+ red "Tonight" on today), dish rows: 52px photo, title, who-for, whole row tappable → Recipe.

**Recipe** (`/weeks/:weekId/:recipeId`)
- 200px photo with back button, red title block ("Friday 6 Nov · Kids × 2", title 30px).
- **Ahead** note (red "Ahead:" + text) if present. No serving notes / descriptions.
- **Ingredients**: outlined toggle button with "N items" + chevron, **folded by default**; open = checkable rows (48px+).
- **Method**: numbered red circles. On steps with a time: inline **timer button** ("Start 4 min timer") that counts down in place, turns ink while running, "Time's up" + sound at zero, plus a small running-timer pill pinned at the top while scrolling. On some steps: "**Meanwhile:** …" line.
- **Screen Wake Lock** on while the recipe page is open (`navigator.wakeLock.request('screen')`, re-request on visibilitychange).
- Link to original recipe at the bottom. No separate cook mode.

**Shopping** (`/shopping`, and the Shopping segment of a week)
- Red header: "Shopping" + "5 / 17" + white progress bar.
- Items grouped by day; whole row is the tap target (56px), custom 26px checkbox.
- Ticked items leave the list and go into a folded **"In the basket · N"** section at the bottom (tap to show/untick).
- Persist ticks (localStorage per week is fine for now).

**Calendar** (`/weeks`)
- Red header "Calendar".
- Sticky Mon–Sat header row (white, 2px bottom line).
- Grouped by month. Each week: label line "**W45** 2–8 Nov ›" (ISO week number; red + "· this week" for the current week; no frame), then 6 equal square tiles Mon–Sat. Tile = that day's **main dish photo** with the date number top-left in white; empty day = `--chip` with muted number. Whole week is tappable → Week page.
- Main dish = first recipe of the day served to kids or all (never the adult-only salad).
- Show unplanned weeks between planned ones as empty rows.

## 4. Data changes (Supabase `ctamabtmvsjssugqubhc`)

Add, nullable, then backfill what you can:
- `steps.timer_minutes int` — drives the timer button.
- `steps.meanwhile text` — the "Meanwhile" line.
- `recipes.prep_ahead text` — the "Ahead" note (today this text sits inside `recipes.comments`, which is no longer shown).

Keep data in the DB, not in components.

## 5. PWA

`manifest.webmanifest` (name Tambouille, theme `#D72C16`, background white, icons above, display standalone) + apple-touch-icon, so it can be added to the home screen. Timer notifications only when installed (Notification API); otherwise in-app sound only.

## 6. Done means

- All 6 screens match the canvas at 390px; tap targets ≥ 44px; text contrast ≥ 4.5:1.
- `npm run build` passes; PR opened from `redesign` with screenshots of each screen.
