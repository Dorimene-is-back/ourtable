// Date and display rules for weeks, days and recipes.
// A week's id is the ISO date of its Monday ("2026-11-02").

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function mondayOf(d) {
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function isoWeekNumber(d) {
  const thursday = addDays(d, 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round((thursday - mondayOf(firstThursday)) / 604800000);
}

export const monthName = (d) => MONTHS[d.getMonth()];
export const shortDate = (d) => `${WEEKDAYS_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

export function weekRangeLabel(monday) {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}`;
  }
  return `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}–${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]}`;
}

export const dayDate = (weekId, day) => addDays(parseISO(weekId), DAY_INDEX[day.day] ?? 0);
export const dayShort = (day) => day.day.slice(0, 3);
export const dayNumber = (day) => (day.date || "").split(" ")[0];

// "2–6 November", or "31 August–2 September" across two months.
export function weekTitle(week) {
  const first = week.days[0];
  const last = week.days[week.days.length - 1];
  if (!first) return week.dates;
  const [firstNum, firstMonth] = first.date.split(" ");
  const [lastNum, lastMonth] = last.date.split(" ");
  if (first === last) return first.date;
  if (firstMonth === lastMonth) return `${firstNum}–${lastNum} ${lastMonth}`;
  return `${first.date}–${last.date}`;
}

export function whoFor(recipe) {
  const servings = recipe.servings || [];
  const has = (who) => servings.some((s) => s.for_who === who);
  if (has("all") || (has("kids") && has("adult"))) return "All";
  if (has("kids")) return "Kids";
  if (has("adult")) return "Adult";
  return "";
}

// "Kids × 2", or "All × 3" when kids and adult share a dish.
export function servingLabel(recipe) {
  const who = whoFor(recipe);
  const count = (recipe.servings || []).reduce((sum, s) => sum + (s.count || 0), 0);
  return count ? `${who} × ${count}` : who;
}

const WHO_RANK = { All: 0, Kids: 1, Adult: 2 };

export function sortRecipes(recipes) {
  return [...recipes].sort((a, b) =>
    (a.type === "dessert") - (b.type === "dessert") ||
    (WHO_RANK[whoFor(a)] ?? 3) - (WHO_RANK[whoFor(b)] ?? 3) ||
    (a.sort_order ?? 99) - (b.sort_order ?? 99)
  );
}

export function isNoCookingDay(day) {
  return !!day.holiday && day.recipes.every((r) => !r.ingredients || r.ingredients.length === 0);
}

// First dish of the day served to the kids or everyone, never the adult-only salad.
export function mainDish(day) {
  if (isNoCookingDay(day)) return null;
  return day.recipes.find((r) => r.type !== "dessert" && ["All", "Kids"].includes(whoFor(r))) || null;
}

export function normalizeWeek(week) {
  const days = [...(week.days || [])]
    .sort((a, b) => (DAY_INDEX[a.day] ?? 0) - (DAY_INDEX[b.day] ?? 0))
    .map((day) => ({ ...day, recipes: sortRecipes(day.recipes || []) }));
  return { ...week, days };
}

export function findDay(weeks, date) {
  const week = weeks.find((w) => w.id === toISO(mondayOf(date)));
  const day = week?.days.find((d) => toISO(dayDate(week.id, d)) === toISO(date));
  return day ? { week, day } : null;
}

// The week the app should lead with. On a weekend with nothing to cook, next
// week's plan takes over as soon as it is loaded. kind: "this" | "next" | "latest".
export function pickWeek(weeks, today) {
  if (!weeks.length) return null;
  const monday = mondayOf(today);
  const current = weeks.find((w) => w.id === toISO(monday));
  const next = weeks.find((w) => w.id === toISO(addDays(monday, 7)));
  const isWeekend = [0, 6].includes(today.getDay());
  if (isWeekend && next && !findDay(weeks, today)) return { week: next, kind: "next" };
  if (current) return { week: current, kind: "this" };
  const latest = [...weeks].sort((a, b) => b.id.localeCompare(a.id)).find((w) => w.id < toISO(monday));
  return { week: latest || weeks[0], kind: "latest" };
}

// Shop order for the "by type" view. Pantry items are listed separately as pantry checks.
export const SHOPPING_TYPES = ["Vegetables", "Fruit", "Herbs", "Meat", "Fish", "Dairy & eggs", "Pasta, rice & noodles", "Bread & dough", "Tins & stock", "Nuts", "Other"];

// A week's shopping, one group per shopping date, each item carrying its date and recipe name.
export function shoppingDates(week) {
  const titles = new Map(week.days.flatMap((d) => d.recipes.map((r) => [r.id, r.title])));
  const groups = [];
  [...(week.shopping || [])]
    .filter((item) => item.category !== "Note")
    .sort((a, b) => (a.day_order || 0) - (b.day_order || 0) || a.sort_order - b.sort_order)
    .forEach((item) => {
      let group = groups.find((g) => g.label === item.day);
      if (!group) {
        const day = week.days.find((d) => item.day.startsWith(dayShort(d)));
        group = { key: `${week.id}:${item.day}`, label: item.day, date: day ? dayDate(week.id, day) : null, items: [] };
        groups.push(group);
      }
      group.items.push({ ...item, recipeTitle: titles.get(item.recipe_id) || "" });
    });
  return groups;
}
