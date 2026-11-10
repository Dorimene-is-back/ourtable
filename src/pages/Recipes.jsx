import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, Message, Photo, RedHeader, TabBar } from "../components/ui";
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

// Photo heights vary so the two columns stagger. Each dish keeps the same shape every time.
const SHAPES = [1.25, 1, 1.4, 0.85, 1.15];
const shapeOf = (key) => SHAPES[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SHAPES.length];

const badge = { position: "absolute", padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, lineHeight: 1.3, whiteSpace: "nowrap" };
const light = { ...badge, background: "rgba(255,255,255,0.92)", color: "var(--ink)" };
const dark = { ...badge, background: "rgba(26,15,12,0.72)", color: "var(--white)", fontWeight: 600 };

function DishCard({ dish }) {
  const { recipe, weekId } = dish.latest;
  return (
    <Link to={`/weeks/${weekId}/${recipe.id}`} style={{ display: "block", marginBottom: 14 }}>
      <div style={{ position: "relative", aspectRatio: `1 / ${shapeOf(dish.key)}`, borderRadius: 16, overflow: "hidden", background: "var(--line)" }}>
        <Photo src={recipe.image} style={{ position: "absolute", inset: 0 }} />
        <span style={{ ...light, top: 8, left: 8 }}>{dish.cooked ? `${dish.cooked}×` : "New"}</span>
        <span style={{ ...light, top: 8, right: 8, fontWeight: 600 }}>{whoFor(recipe)}</span>
        {dish.last && <span style={{ ...dark, bottom: 8, left: 8 }}>{lastLabel(dish.last)}</span>}
        {!dish.last && dish.planned > 0 && <span style={{ ...dark, bottom: 8, left: 8 }}>Planned</span>}
      </div>
      <p style={{ marginTop: 6, fontSize: 15, fontWeight: 700, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.title}</p>
    </Link>
  );
}

// Two columns, each card going to the shorter one so the grid stays balanced.
function Masonry({ dishes }) {
  const cols = [[], []];
  const heights = [0, 0];
  dishes.forEach((dish) => {
    const i = heights[0] <= heights[1] ? 0 : 1;
    cols[i].push(dish);
    heights[i] += shapeOf(dish.key) + 0.35; // + title
  });
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {cols.map((col, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0 }}>{col.map((dish) => <DishCard key={dish.key} dish={dish} />)}</div>
      ))}
    </div>
  );
}

// Shows dishes a page at a time, adding more as the end of the list comes into view.
const PAGE = 20;
function useEndless(list) {
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef(null);
  useEffect(() => setCount(PAGE), [list]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= list.length) return undefined;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setCount((c) => c + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count, list]);
  return { visible: list.slice(0, count), sentinel };
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
  const { visible, sentinel } = useEndless(shown);

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

      <main style={{ padding: "14px 16px 0" }}>
        <Masonry dishes={visible} />
        <div ref={sentinel} style={{ height: 1 }} />
      </main>
      <TabBar />
    </AppShell>
  );
}
