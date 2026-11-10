import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, Chevron, Message, Photo, RedHeader, TabBar } from "../components/ui";
import { fetchWeeks, useLoad, useToday } from "../lib/data";
import { dayDate, toISO, whoFor } from "../lib/weeks";

// Same dish across weeks has different ids, so dishes are matched by title (notes in brackets ignored).
const dishKey = (title) => title.replace(/\([^)]*\)/g, "").trim().toLowerCase();

// One entry per dish: how many times it was cooked (days up to today), when last, and the
// most recent copy to open. Leftover nights and no-cook placeholders are not dishes.
function buildLibrary(weeks, today) {
  const dishes = new Map();
  weeks.forEach((week) =>
    week.days.forEach((day) => {
      const date = toISO(dayDate(week.id, day));
      day.recipes.forEach((recipe) => {
        if (!recipe.title || !recipe.ingredients?.length || /leftover/i.test(recipe.title)) return;
        const key = dishKey(recipe.title);
        if (!dishes.has(key)) dishes.set(key, { key, cooked: 0, planned: 0, last: null, latest: null });
        const dish = dishes.get(key);
        if (date <= today) {
          dish.cooked += 1;
          if (!dish.last || date > dish.last) dish.last = date;
        } else {
          dish.planned += 1;
        }
        if (!dish.latest || date > dish.latest.date) dish.latest = { date, weekId: week.id, recipe };
      });
    })
  );
  return [...dishes.values()];
}

const SORTS = [
  ["cooked", "Most cooked"],
  ["recent", "Recent"],
  ["name", "A–Z"],
];

function sortDishes(dishes, sort) {
  const byName = (a, b) => a.latest.recipe.title.localeCompare(b.latest.recipe.title);
  if (sort === "name") return [...dishes].sort(byName);
  if (sort === "recent") return [...dishes].sort((a, b) => (b.last || "").localeCompare(a.last || "") || byName(a, b));
  return [...dishes].sort((a, b) => b.cooked - a.cooked || (b.last || "").localeCompare(a.last || "") || byName(a, b));
}

function lastLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function DishRow({ dish }) {
  const { recipe, weekId } = dish.latest;
  const status = dish.cooked
    ? `Cooked ${dish.cooked}× · last ${lastLabel(dish.last)}`
    : "Not cooked yet";
  return (
    <Link to={`/weeks/${weekId}/${recipe.id}`} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 68, padding: "6px 0", borderBottom: "2px solid var(--line)" }}>
      <Photo src={recipe.image} size={56} radius={12} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{recipe.title}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--muted)", lineHeight: 1.3 }}>
          {status}{dish.planned ? " · planned" : ""} · {whoFor(recipe)}
        </span>
      </span>
      <span style={{ color: "var(--muted)", flexShrink: 0 }}><Chevron size={16} /></span>
    </Link>
  );
}

export default function Recipes() {
  const today = useToday();
  const { data: weeks, loading, error } = useLoad(fetchWeeks, []);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("cooked");

  const library = useMemo(() => (weeks ? buildLibrary(weeks, today) : []), [weeks, today]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortDishes(q ? library.filter((d) => d.latest.recipe.title.toLowerCase().includes(q)) : library, sort);
  }, [library, query, sort]);

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>Recipes</h1>
          {weeks && <span style={{ fontSize: 15, fontWeight: 600 }}>{library.length} dishes</span>}
        </div>
      </RedHeader>

      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--white)", padding: "12px 20px 10px", borderBottom: "2px solid var(--line)" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes"
          aria-label="Search dishes"
          style={{ width: "100%", height: 44, padding: "0 14px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--white)", color: "var(--ink)", font: "inherit", fontSize: 16 }}
        />
        <div role="tablist" aria-label="Sort" style={{ display: "flex", gap: 2, marginTop: 8, background: "var(--chip)", borderRadius: 14, padding: 3 }}>
          {SORTS.map(([id, label]) => {
            const active = sort === id;
            return (
              <button key={id} role="tab" aria-selected={active} onClick={() => setSort(id)} style={{ flex: 1, height: 40, border: "none", borderRadius: 11, background: active ? "var(--white)" : "transparent", color: active ? "var(--ink)" : "var(--muted)", fontSize: 15, fontWeight: 800 }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load your recipes.</Message>}
      {weeks && !shown.length && <Message>{query ? "No dish matches that." : "No recipes yet."}</Message>}

      <main style={{ padding: "0 20px" }}>
        {shown.map((dish) => <DishRow key={dish.key} dish={dish} />)}
      </main>
      <TabBar />
    </AppShell>
  );
}
