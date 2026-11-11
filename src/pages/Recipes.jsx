import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useNavigationType } from "react-router-dom";
import AuthButton from "../components/AuthButton";
import { FavoriteButton } from "../components/Reviews";
import { AppShell, Message, Photo, RedHeader, Sheet, Star, TabBar } from "../components/ui";
import { useAuth } from "../lib/auth";
import { fetchLibrary, fetchWeeks, useDataVersion, useLoad, useToday } from "../lib/data";
import { fetchFavorites, fetchRatings } from "../lib/social";
import { addDays, dayDate, toISO, whoFor } from "../lib/weeks";

const SALAD = /salad|salade|insalata|panzanella|fattoush|tabbouleh/i;

// The same dish has a different recipe id each week it is cooked. Its dish id ties them together;
// recipes without one are matched by title (notes in brackets ignored).
const dishKey = (recipe) => recipe.dish_id || recipe.title.replace(/\([^)]*\)/g, "").trim().toLowerCase();

// One entry per dish: how many times it was cooked (days up to today), when last, and the copy to
// open. Leftover nights and no-cook placeholders are not dishes. Recipes people added themselves
// (library) appear even before they are cooked, and are the copy that opens.
function buildLibrary(weeks, library, today) {
  const dishes = new Map();
  const entry = (recipe) => {
    const key = dishKey(recipe);
    if (!dishes.has(key)) dishes.set(key, { key, dishId: recipe.dish_id || null, cooked: 0, planned: 0, last: null, latest: null, own: null, proteins: new Set(), shopped: false });
    return dishes.get(key);
  };
  weeks.forEach((week) => {
    // What each recipe's shopping says about its protein.
    const cats = new Map();
    (week.shopping || []).forEach((item) => {
      if (!item.recipe_id) return;
      if (!cats.has(item.recipe_id)) cats.set(item.recipe_id, new Set());
      cats.get(item.recipe_id).add(item.category);
    });
    week.days.forEach((day) => {
      const date = toISO(dayDate(week.start, day));
      day.recipes.forEach((recipe) => {
        if (!recipe.title || !recipe.ingredients?.length) return;
        const dish = entry(recipe);
        const c = cats.get(recipe.id);
        if (c) {
          dish.shopped = true;
          if (c.has("Fish")) dish.proteins.add("fish");
          if (c.has("Meat")) dish.proteins.add("meat");
        }
        if (/leftover/i.test(recipe.title)) return;
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
  const inMyWeeks = new Set(weeks.flatMap((week) => week.days.flatMap((day) => day.recipes.map((r) => r.id))));
  library.forEach((recipe) => {
    if (!recipe.title || !recipe.ingredients?.length || inMyWeeks.has(recipe.id) || /leftover/i.test(recipe.title)) return;
    const dish = entry(recipe);
    if (!recipe.day_id) dish.own = recipe;
    // Another kitchen's public recipe: keep its most recent copy.
    else if (!dish.shared || (recipe.days?.week_id || "") > (dish.shared.days?.week_id || "")) dish.shared = recipe;
  });
  return [...dishes.values()].filter((dish) => dish.latest || dish.own || dish.shared).map((dish) => {
    const recipe = dish.own || dish.latest?.recipe || dish.shared;
    return {
      ...dish,
      recipe,
      to: dish.latest && !dish.own ? `/weeks/${dish.latest.weekId}/${recipe.id}` : `/recipes/${recipe.id}`,
      // No salad field in the data: salads are recognised by name.
      course: recipe.type === "dessert" ? "dessert" : SALAD.test(recipe.title) ? "salad" : "main",
      protein: dish.proteins.has("fish") ? "fish" : dish.proteins.has("meat") ? "meat" : dish.shopped ? "veggie" : null,
      who: whoFor(recipe).toLowerCase(),
    };
  });
}

const SORTS = [
  ["recent", "Recently cooked"],
  ["longest", "Least recently cooked"],
  ["cooked", "Most cooked"],
  ["rated", "Top rated"],
  ["name", "A–Z"],
];

function sortDishes(dishes, sort) {
  const byName = (a, b) => a.recipe.title.localeCompare(b.recipe.title);
  const lastOrEnd = (d, end) => d.last || end;
  if (sort === "name") return [...dishes].sort(byName);
  if (sort === "recent") return [...dishes].sort((a, b) => lastOrEnd(b, "").localeCompare(lastOrEnd(a, "")) || byName(a, b));
  if (sort === "rated") return [...dishes].sort((a, b) => (b.rating?.rating || 0) - (a.rating?.rating || 0) || (b.rating?.ratings || 0) - (a.rating?.ratings || 0) || byName(a, b));
  if (sort === "longest") return [...dishes].sort((a, b) => lastOrEnd(a, "9999").localeCompare(lastOrEnd(b, "9999")) || byName(a, b));
  return [...dishes].sort((a, b) => b.cooked - a.cooked || lastOrEnd(b, "").localeCompare(lastOrEnd(a, "")) || byName(a, b));
}

// Filter groups. Options within a group widen the results (or); groups narrow them (and).
// "Due again" follows the household rotation rule: not cooked in the last 6 weeks.
const FILTERS = [
  { id: "mine", title: "Yours", options: [["saved", "Favourites"], ["loved", "Rated 4 stars or more"], ["photos", "With your photos"]], test: (d, v) => (v === "saved" ? d.saved : v === "loved" ? (d.rating?.rating || 0) >= 4 : (d.rating?.photos || 0) > 0) },
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

function DishCard({ dish, onSaved }) {
  const { recipe } = dish;
  return (
    <Link to={dish.to} style={{ display: "block", marginBottom: 14 }}>
      <div style={{ position: "relative", aspectRatio: `1 / ${shapeOf(dish.key)}`, borderRadius: 16, overflow: "hidden", background: "var(--line)" }}>
        <Photo src={recipe.image} style={{ position: "absolute", inset: 0 }} />
        {dish.cooked !== 1 && <span style={{ ...light, top: 8, left: 8 }}>{cookedLabel(dish.cooked)}</span>}
        {dish.last
          ? <span style={{ ...dark, bottom: 8, left: 8 }}>Last cooked {lastLabel(dish.last)}</span>
          : dish.planned > 0 && <span style={{ ...dark, bottom: 8, left: 8 }}>Coming up</span>}
        {dish.dishId && <FavoriteButton dishId={dish.dishId} saved={dish.saved} onChange={(on) => onSaved(dish.dishId, on)} style={{ position: "absolute", top: 4, right: 4, background: dish.saved ? "var(--white)" : "rgba(255,255,255,0.92)" }} />}
      </div>
      <p style={{ marginTop: 6, fontSize: 15, fontWeight: 700, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.title}</p>
      {dish.rating?.ratings > 0 && (
        <p style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
          <Star size={13} />
          {dish.rating.rating}{dish.rating.ratings > 1 ? ` · ${dish.rating.ratings} ratings` : ""}
        </p>
      )}
    </Link>
  );
}

// Two columns, each card going to the shorter one so the grid stays balanced.
function Masonry({ dishes, onSaved }) {
  const cols = [[], []];
  const heights = [0, 0];
  dishes.forEach((dish) => {
    const i = heights[0] <= heights[1] ? 0 : 1;
    cols[i].push(dish);
    heights[i] += shapeOf(dish.key) + (dish.rating?.ratings ? 0.47 : 0.35); // + title and rating line
  });
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {cols.map((col, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0 }}>{col.map((dish) => <DishCard key={dish.key} dish={dish} onSaved={onSaved} />)}</div>
      ))}
    </div>
  );
}

// Shows dishes a page at a time, adding more as the end of the list comes into view.
const PAGE = 20;
// resetKey: the search, sort and filters. A new one starts again from the first page; fresh data
// under the same one does not, so the list doesn't jump while you scroll.
function useEndless(list, resetKey, initialCount) {
  const [count, setCount] = useState(initialCount || PAGE);
  const sentinel = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setCount(PAGE);
    window.scrollTo(0, 0);
  }, [resetKey]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= list.length) return undefined;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setCount((c) => c + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count, list]);
  return { visible: list.slice(0, count), sentinel, count };
}

// What the list looked like when it was last on screen: search, sort, filters, how far it was
// scrolled, and its data. Coming back from a dish restores it; opening the tab afresh does not.
let kept = null;

export default function Recipes() {
  const today = useToday();
  const version = useDataVersion();
  const { user, ready, requireUser } = useAuth();
  const navigate = useNavigate();
  const cameBack = useNavigationType() === "POP";
  const [restored] = useState(() => (cameBack && kept && kept.userId === (user?.id ?? null) ? kept : null));
  const { data, loading, error } = useLoad(
    () => Promise.all([fetchWeeks(), fetchLibrary(), fetchRatings().catch(() => new Map()), fetchFavorites(user?.id).catch(() => new Set())])
      .then(([weeks, own, ratings, favorites]) => ({ weeks, own, ratings, favorites })),
    [version, user?.id, ready],
    { keep: true, initial: restored?.data }
  );
  const weeks = data?.weeks;
  // Hearts tapped on this screen, on top of what was loaded.
  const [savedEdits, setSavedEdits] = useState(restored?.savedEdits || {});
  const onSaved = (dishId, on) => setSavedEdits((prev) => ({ ...prev, [dishId]: on }));
  const [query, setQuery] = useState(restored?.query || "");
  const [sort, setSort] = useState(restored?.sort || "recent");
  const [picked, setPicked] = useState(restored?.picked || {});
  const [draft, setDraft] = useState(null); // filters being edited in the sheet
  const [sortOpen, setSortOpen] = useState(false);

  const sixWeeksAgo = useMemo(() => { const [y, m, d] = today.split("-").map(Number); return toISO(addDays(new Date(y, m - 1, d), -42)); }, [today]);
  const library = useMemo(() => {
    if (!data) return [];
    return buildLibrary(data.weeks, data.own, today).map((dish) => ({
      ...dish,
      rating: data.ratings.get(dish.dishId) || null,
      saved: savedEdits[dish.dishId] ?? data.favorites.has(dish.dishId),
    }));
  }, [data, today, savedEdits]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q ? library.filter((d) => d.recipe.title.toLowerCase().includes(q)) : library;
    return sortDishes(applyFilters(searched, picked, sixWeeksAgo), sort);
  }, [library, query, sort, picked, sixWeeksAgo]);
  const draftCount = useMemo(() => (draft ? applyFilters(library, draft, sixWeeksAgo).length : 0), [library, draft, sixWeeksAgo]);
  const activeChips = FILTERS.flatMap((f) => [...(picked[f.id] || [])].map((v) => ({ group: f.id, value: v })));
  const removeChip = ({ group, value }) => setPicked((p) => { const next = new Set(p[group]); next.delete(value); return { ...p, [group]: next }; });
  const toggleDraft = (group, value) => setDraft((d) => { const next = new Set(d[group] || []); if (!next.delete(value)) next.add(value); return { ...d, [group]: next }; });
  const resetKey = `${query.trim().toLowerCase()}|${sort}|${activeChips.map((c) => c.group + c.value).join(",")}`;
  const { visible, sentinel, count } = useEndless(shown, resetKey, restored?.count);

  // Put the list back where it was, before the first paint.
  useLayoutEffect(() => {
    if (restored?.y) window.scrollTo(0, restored.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    kept = { data, query, sort, picked, savedEdits, count, userId: user?.id ?? null, y: window.scrollY };
  }, [data, query, sort, picked, savedEdits, count, user?.id]);
  useEffect(() => {
    const onScroll = () => { if (kept) kept.y = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>Recipes</h1>
          <span style={{ flex: 1 }} />
          <button onClick={() => requireUser("Sign in to add your own recipes.", "/recipes/new") && navigate("/recipes/new")} aria-label="Add a recipe" style={{ alignSelf: "center", width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--white)", color: "var(--tomato)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <AuthButton />
        </div>
      </RedHeader>

      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--white)", padding: "12px 20px 10px", borderBottom: "2px solid var(--line)" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={weeks ? `Search ${library.length} dishes` : "Search dishes"}
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

      {weeks && shown.length > 0 && shown.length < library.length && <p style={{ padding: "10px 20px 0", fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>{shown.length} of {library.length} dishes</p>}
      {loading && !data && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load your recipes.</Message>}
      {weeks && !shown.length && <Message>{query ? "No dish matches that." : "No recipes yet."}</Message>}

      <main style={{ padding: "14px 16px 0" }}>
        <Masonry dishes={visible} onSaved={onSaved} />
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
