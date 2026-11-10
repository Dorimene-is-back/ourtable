import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, Message, Photo, RedHeader, TabBar } from "../components/ui";
import { fetchWeeks, useLoad, useToday } from "../lib/data";
import { addDays, dayDate, toISO, whoFor } from "../lib/weeks";

const SALAD = /salad|salade|insalata|panzanella|fattoush|tabbouleh/i;

// Same dish across weeks has different ids, so dishes are matched by title (notes in brackets ignored).
const dishKey = (title) => title.replace(/\([^)]*\)/g, "").trim().toLowerCase();

// One entry per dish: how many times it was cooked (days up to today), when last, and the
// most recent copy to open. Leftover nights and no-cook placeholders are not dishes.
function buildLibrary(weeks, today) {
  const dishes = new Map();
  weeks.forEach((week) => {
    // What each recipe's shopping says about its protein.
    const cats = new Map();
    (week.shopping || []).forEach((item) => {
      if (!item.recipe_id) return;
      if (!cats.has(item.recipe_id)) cats.set(item.recipe_id, new Set());
      cats.get(item.recipe_id).add(item.category);
    });
    week.days.forEach((day) => {
      const date = toISO(dayDate(week.id, day));
      day.recipes.forEach((recipe) => {
        if (!recipe.title || !recipe.ingredients?.length || /leftover/i.test(recipe.title)) return;
        const key = dishKey(recipe.title);
        if (!dishes.has(key)) dishes.set(key, { key, cooked: 0, planned: 0, last: null, latest: null, proteins: new Set(), shopped: false });
        const dish = dishes.get(key);
        const c = cats.get(recipe.id);
        if (c) {
          dish.shopped = true;
          if (c.has("Fish")) dish.proteins.add("fish");
          if (c.has("Meat")) dish.proteins.add("meat");
        }
        if (date <= today) {
          dish.cooked += 1;
          if (!dish.last || date > dish.last) dish.last = date;
        } else {
          dish.planned += 1;
        }
        if (!dish.latest || date > dish.latest.date) dish.latest = { date, weekId: week.id, recipe };
      });
    });
  });
  return [...dishes.values()].map((dish) => ({
    ...dish,
    // No salad field in the data: salads are recognised by name.
    course: dish.latest.recipe.type === "dessert" ? "dessert" : SALAD.test(dish.latest.recipe.title) ? "salad" : "main",
    protein: dish.proteins.has("fish") ? "fish" : dish.proteins.has("meat") ? "meat" : dish.shopped ? "veggie" : null,
    who: whoFor(dish.latest.recipe).toLowerCase(),
  }));
}

const SORTS = [
  ["recent", "Recently cooked"],
  ["longest", "Least recently cooked"],
  ["cooked", "Most cooked"],
  ["name", "A–Z"],
];

function sortDishes(dishes, sort) {
  const byName = (a, b) => a.latest.recipe.title.localeCompare(b.latest.recipe.title);
  const lastOrEnd = (d, end) => d.last || end;
  if (sort === "name") return [...dishes].sort(byName);
  if (sort === "recent") return [...dishes].sort((a, b) => lastOrEnd(b, "").localeCompare(lastOrEnd(a, "")) || byName(a, b));
  if (sort === "longest") return [...dishes].sort((a, b) => lastOrEnd(a, "9999").localeCompare(lastOrEnd(b, "9999")) || byName(a, b));
  return [...dishes].sort((a, b) => b.cooked - a.cooked || lastOrEnd(b, "").localeCompare(lastOrEnd(a, "")) || byName(a, b));
}

// Filter groups. Options within a group widen the results (or); groups narrow them (and).
// "Due again" follows the household rotation rule: not cooked in the last 6 weeks.
const FILTERS = [
  { id: "course", title: "Type", options: [["main", "Main meal"], ["salad", "Salad"], ["dessert", "Dessert"]], test: (d, v) => d.course === v },
  { id: "who", title: "Who it's for", options: [["kids", "Kids"], ["adult", "Adult"], ["all", "Everyone"]], test: (d, v) => d.who === v },
  { id: "protein", title: "Protein", options: [["fish", "Fish"], ["meat", "Meat"], ["veggie", "Veggie"]], test: (d, v) => d.protein === v },
  {
    id: "history", title: "History",
    options: [["due", "Due again (6+ weeks)"], ["cooked", "Cooked before"], ["never", "Never cooked"]],
    test: (d, v, sixWeeksAgo) => (v === "never" ? d.cooked === 0 : v === "cooked" ? d.cooked > 0 : d.cooked > 0 && d.last < sixWeeksAgo),
  },
];
const optionLabel = (group, value) => FILTERS.find((f) => f.id === group).options.find(([v]) => v === value)[1];

function applyFilters(dishes, picked, sixWeeksAgo) {
  return dishes.filter((d) => FILTERS.every((f) => !picked[f.id]?.size || [...picked[f.id]].some((v) => f.test(d, v, sixWeeksAgo))));
}

// Bottom sheet, as on shopping sites: slides over the page, tap outside to close.
function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(26,15,12,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, maxHeight: "85dvh", display: "flex", flexDirection: "column", background: "var(--white)", borderRadius: "24px 24px 0 0", paddingBottom: "var(--safe-bottom)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 8px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, border: "none", borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 20px 12px" }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px 16px", borderTop: "2px solid var(--line)" }}>{footer}</div>}
      </div>
    </div>
  );
}

const chipStyle = (on) => ({ minHeight: 40, padding: "6px 14px", borderRadius: 999, border: "2px solid", borderColor: on ? "var(--ink)" : "var(--line)", background: on ? "var(--ink)" : "var(--white)", color: on ? "var(--white)" : "var(--ink)", fontSize: 15, fontWeight: 600 });
const barButton = { flex: 1, height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "2px solid var(--line)", borderRadius: 12, background: "var(--white)", fontSize: 15, fontWeight: 800, minWidth: 0 };

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

const cookedLabel = (n) => (n === 0 ? "Not cooked yet" : n === 1 ? "Cooked once" : n === 2 ? "Cooked twice" : `Cooked ${n} times`);

function DishCard({ dish }) {
  const { recipe, weekId } = dish.latest;
  return (
    <Link to={`/weeks/${weekId}/${recipe.id}`} style={{ display: "block", marginBottom: 14 }}>
      <div style={{ position: "relative", aspectRatio: `1 / ${shapeOf(dish.key)}`, borderRadius: 16, overflow: "hidden", background: "var(--line)" }}>
        <Photo src={recipe.image} style={{ position: "absolute", inset: 0 }} />
        {dish.cooked !== 1 && <span style={{ ...light, top: 8, left: 8 }}>{cookedLabel(dish.cooked)}</span>}
        {dish.last
          ? <span style={{ ...dark, bottom: 8, left: 8 }}>Last cooked {lastLabel(dish.last)}</span>
          : dish.planned > 0 && <span style={{ ...dark, bottom: 8, left: 8 }}>Coming up</span>}
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
  const [sort, setSort] = useState("recent");
  const [picked, setPicked] = useState({});
  const [draft, setDraft] = useState(null); // filters being edited in the sheet
  const [sortOpen, setSortOpen] = useState(false);

  const sixWeeksAgo = useMemo(() => { const [y, m, d] = today.split("-").map(Number); return toISO(addDays(new Date(y, m - 1, d), -42)); }, [today]);
  const library = useMemo(() => (weeks ? buildLibrary(weeks, today) : []), [weeks, today]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q ? library.filter((d) => d.latest.recipe.title.toLowerCase().includes(q)) : library;
    return sortDishes(applyFilters(searched, picked, sixWeeksAgo), sort);
  }, [library, query, sort, picked, sixWeeksAgo]);
  const draftCount = useMemo(() => (draft ? applyFilters(library, draft, sixWeeksAgo).length : 0), [library, draft, sixWeeksAgo]);
  const activeChips = FILTERS.flatMap((f) => [...(picked[f.id] || [])].map((v) => ({ group: f.id, value: v })));
  const removeChip = ({ group, value }) => setPicked((p) => { const next = new Set(p[group]); next.delete(value); return { ...p, [group]: next }; });
  const toggleDraft = (group, value) => setDraft((d) => { const next = new Set(d[group] || []); if (!next.delete(value)) next.add(value); return { ...d, [group]: next }; });
  const { visible, sentinel } = useEndless(shown);

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>Recipes</h1>
          {weeks && <span style={{ fontSize: 15, fontWeight: 600 }}>{shown.length === library.length ? `${library.length} dishes` : `${shown.length} of ${library.length}`}</span>}
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
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => setDraft(Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, new Set(v)])))} style={barButton}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filter{activeChips.length > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--tomato)", color: "var(--white)", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeChips.length}</span>}
          </button>
          <button onClick={() => setSortOpen(true)} style={barButton}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" /></svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{SORTS.find(([id]) => id === sort)[1]}</span>
          </button>
        </div>
        {activeChips.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "8px -20px 0", padding: "0 20px" }}>
            {activeChips.map((chip) => (
              <button key={chip.group + chip.value} onClick={() => removeChip(chip)} aria-label={`Remove ${optionLabel(chip.group, chip.value)}`} style={{ flexShrink: 0, minHeight: 32, padding: "4px 10px 4px 12px", display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 999, background: "var(--chip)", fontSize: 14, fontWeight: 600 }}>
                {optionLabel(chip.group, chip.value)}
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            ))}
            <button onClick={() => setPicked({})} style={{ flexShrink: 0, minHeight: 32, padding: "4px 8px", border: "none", background: "none", fontSize: 14, fontWeight: 800 }}>Clear all</button>
          </div>
        )}
      </div>

      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load your recipes.</Message>}
      {weeks && !shown.length && <Message>{query ? "No dish matches that." : "No recipes yet."}</Message>}

      <main style={{ padding: "14px 16px 0" }}>
        <Masonry dishes={visible} />
        <div ref={sentinel} style={{ height: 1 }} />
      </main>
      {draft && (
        <Sheet
          title="Filter"
          onClose={() => setDraft(null)}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDraft({})} style={{ height: 52, padding: "0 18px", border: "2px solid var(--ink)", borderRadius: 14, background: "var(--white)", fontSize: 16, fontWeight: 800 }}>Clear</button>
              <button className="btn-red" onClick={() => { setPicked(draft); setDraft(null); }} style={{ flex: 1, height: 52, border: "2px solid var(--tomato)", borderRadius: 14, background: "var(--tomato)", color: "var(--white)", fontSize: 16, fontWeight: 800 }}>
                Show {draftCount} {draftCount === 1 ? "dish" : "dishes"}
              </button>
            </div>
          }
        >
          {FILTERS.map((f) => (
            <section key={f.id} style={{ paddingTop: 12 }}>
              <h3 style={{ marginBottom: 8, fontWeight: 800, fontSize: 16 }}>{f.title}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {f.options.map(([value, label]) => {
                  const on = !!draft[f.id]?.has(value);
                  return <button key={value} aria-pressed={on} onClick={() => toggleDraft(f.id, value)} style={chipStyle(on)}>{label}</button>;
                })}
              </div>
            </section>
          ))}
        </Sheet>
      )}

      {sortOpen && (
        <Sheet title="Sort by" onClose={() => setSortOpen(false)}>
          <div role="radiogroup" aria-label="Sort by">
            {SORTS.map(([id, label]) => {
              const on = sort === id;
              return (
                <button key={id} role="radio" aria-checked={on} onClick={() => { setSort(id); setSortOpen(false); }} style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "space-between", border: "none", borderBottom: "2px solid var(--line)", background: "none", fontSize: 16, fontWeight: on ? 800 : 500, textAlign: "left" }}>
                  {label}
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 999, border: on ? "7px solid var(--tomato)" : "2px solid var(--line)" }} />
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      <TabBar />
    </AppShell>
  );
}
