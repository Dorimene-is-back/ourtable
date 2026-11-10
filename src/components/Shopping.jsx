import { useState } from "react";
import { SHOPPING_TYPES } from "../lib/weeks";

const TICKS_KEY = "tambouille:shopping:ticked";
const GROUP_KEY = "tambouille:shopping:groupBy";
const PANTRY_KEY = "tambouille:shopping:have";

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing: this lasts for the visit only.
  }
}

// Same ingredient name across recipes → one entry carrying every item id.
function mergeByName(list) {
  const map = new Map();
  list.forEach((item) => {
    const name = item.item.trim();
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, { key, name, ids: [] });
    map.get(key).ids.push(item.id);
  });
  return [...map.values()];
}

// Pantry lines arrive as "2 garlic cloves" or "Balsamic vinegar, Dijon mustard, honey (vinaigrette)".
// A pantry check only needs the ingredient: drop quantities and notes, split lists.
const QTY = /^[\d½¼¾⅓⅔.,/\s-]+\s*(g|kg|ml|l|tsp|tbsp|cups?|pinch|handful|cloves?)?\b\s*/i;
function pantryNames(line) {
  return line
    .replace(/\([^)]*\)/g, "")
    .split(/,|\band\b/)
    .map((part) => part.trim().replace(QTY, "").trim())
    .filter(Boolean)
    .map((name) => name[0].toUpperCase() + name.slice(1));
}

// One chip per ingredient name. Each chip remembers the item rows it covers, so ticks
// belong to this week's rows and start fresh next week.
function pantryChips(items) {
  const map = new Map();
  items.forEach((item) => {
    pantryNames(item.item).forEach((name) => {
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { key, name, marks: [] });
      map.get(key).marks.push(`${item.id}:${key}`);
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const toggled = (set, value) => {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
};

// dates: groups from shoppingDates(), in date order.
// The list covers the first date up to `until` (the last date to shop for). null = every date.
export function useShopping(dates) {
  const [ticked, setTicked] = useState(() => new Set(read(TICKS_KEY, [])));
  const [until, setUntil] = useState(null);
  const [have, setHave] = useState(() => new Set(read(PANTRY_KEY, [])));
  // "type" was the old name for the aisle view.
  const [groupBy, setGroupByState] = useState(() => (read(GROUP_KEY, "date") === "date" ? "date" : "aisle"));

  const untilIndex = dates.findIndex((d) => d.key === until);
  const lastIndex = untilIndex === -1 ? dates.length - 1 : untilIndex;
  const selected = dates.slice(0, lastIndex + 1);
  const items = selected.flatMap((d) => d.items);
  const pending = items.filter((item) => !ticked.has(item.id));
  const toBuy = pending.filter((item) => item.category !== "Pantry");
  // Every item to buy, ticked or not: ticked ones stay put, crossed out.
  const buyItems = items.filter((item) => item.category !== "Pantry");

  const toggle = (id) => {
    const next = toggled(ticked, id);
    setTicked(next);
    write(TICKS_KEY, [...next]);
  };

  // Ticks several items at once (a pantry check that covers several recipes).
  // Ticks a row (several ids when merged); tapping a ticked row unticks it.
  const tickAll = (ids) => {
    const next = new Set(ticked);
    const allTicked = ids.every((id) => ticked.has(id));
    ids.forEach((id) => (allTicked ? next.delete(id) : next.add(id)));
    setTicked(next);
    write(TICKS_KEY, [...next]);
  };

  // Pantry checks toggle in place: a mistaken tap is undone by tapping again.
  const pantry = pantryChips(items.filter((item) => item.category === "Pantry"))
    .map((chip) => ({ ...chip, have: chip.marks.every((m) => have.has(m)) }));
  const toggleHave = (chip) => {
    const next = new Set(have);
    chip.marks.forEach((m) => (chip.have ? next.delete(m) : next.add(m)));
    setHave(next);
    write(PANTRY_KEY, [...next]);
  };

  const setGroupBy = (value) => {
    setGroupByState(value);
    write(GROUP_KEY, value);
  };

  // By aisle: one section per shop aisle, no dates or recipes, just what to grab.
  // By day: one section per date, items grouped under the recipe that needs them.
  const withDone = (row) => ({ ...row, done: row.ids.every((id) => ticked.has(id)) });
  const groups = groupBy === "aisle"
    ? SHOPPING_TYPES
        .map((type) => ({ key: type, title: type, rows: mergeByName(buyItems.filter((item) => (SHOPPING_TYPES.includes(item.category) ? item.category : "Other") === type)) }))
        .filter((g) => g.rows.length)
        .map((g) => ({ ...g, rows: g.rows.map(withDone) }))
    : selected
        .map((d) => {
          const items = d.items.filter((item) => item.category !== "Pantry");
          const recipes = [];
          items.forEach((item) => {
            const title = item.recipeTitle || "Other";
            let r = recipes.find((x) => x.title === title);
            if (!r) recipes.push((r = { key: title, title, rows: [] }));
            r.rows.push(withDone({ key: item.id, name: item.item, ids: [item.id] }));
          });
          return { key: d.key, title: d.label, recipes };
        })
        .filter((g) => g.recipes.length);

  return {
    dates,
    lastIndex,
    setUntil: (key) => setUntil(key === dates[dates.length - 1]?.key ? null : key),
    total: items.filter((item) => item.category !== "Pantry").length,
    done: items.filter((item) => item.category !== "Pantry" && ticked.has(item.id)),
    pantry,
    toggleHave,
    // Ticks or unticks every cupboard check shown.
    setAllHave: (on) => {
      const next = new Set(have);
      pantry.forEach((chip) => chip.marks.forEach((m) => (on ? next.add(m) : next.delete(m))));
      setHave(next);
      write(PANTRY_KEY, [...next]);
    },
    toBuyCount: toBuy.length,
    tickAll,
    groups,
    groupBy,
    setGroupBy,
    toggle,
  };
}

export function ShoppingProgress({ done, total, style }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label="Items in the basket" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.35)", overflow: "hidden", ...style }}>
      <div style={{ width: `${pct}%`, height: 6, borderRadius: 999, background: "var(--white)" }} />
    </div>
  );
}

const rowStyle = { width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "4px 0", border: "none", borderBottom: "2px solid var(--line)", background: "transparent", textAlign: "left" };
const foldStyle = { width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", border: "none", borderRadius: 16, background: "var(--chip)" };

function ItemRow({ row, onTick }) {
  return (
    <button onClick={() => onTick(row.ids)} aria-pressed={row.done} style={{ ...rowStyle, color: row.done ? "var(--muted)" : "var(--ink)" }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: row.done ? "none" : "2px solid var(--ink)", background: row.done ? "var(--muted)" : "transparent", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {row.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
      </span>
      <span style={{ fontSize: 16, lineHeight: 1.25, textDecoration: row.done ? "line-through" : "none" }}>{row.name}</span>
      {row.ids.length > 1 && <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>×{row.ids.length}</span>}
    </button>
  );
}

// "Shop until": tap the last day you're buying for; every day up to it is included.
function DatePicker({ shopping }) {
  const { dates, lastIndex, setUntil } = shopping;
  const first = dates[0];
  const last = dates[lastIndex];
  const count = dates.slice(0, lastIndex + 1).reduce((n, d) => n + d.items.length, 0);
  const isAll = lastIndex === dates.length - 1;
  const range = first === last ? first.label : `${first.label} → ${last.label}`;

  return (
    <div style={{ padding: "12px 20px 14px", borderBottom: "2px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <p style={{ fontSize: 15, lineHeight: 1.3 }}>
          <span style={{ fontWeight: 800 }}>Shopping for {range}</span>
          <span style={{ color: "var(--muted)" }}> · {count} {count === 1 ? "item" : "items"}</span>
        </p>
        {!isAll && dates.length > 1 && (
          <button onClick={() => setUntil(null)} style={{ minHeight: 44, padding: "0 4px", border: "none", background: "none", color: "var(--tomato)", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
            All days
          </button>
        )}
      </div>
      <div role="radiogroup" aria-label="Shop until" style={{ display: "flex", overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
        {dates.map((d, i) => {
          const inRange = i <= lastIndex;
          const isEnd = i === lastIndex;
          const [weekday, number] = d.label.split(" ");
          return (
            <button
              key={d.key}
              role="radio"
              aria-checked={isEnd}
              aria-label={`Shop until ${d.label}, ${d.items.length} items`}
              onClick={() => setUntil(d.key)}
              style={{
                flex: "1 0 54px", maxWidth: 84, height: 62, border: "none", padding: 0,
                // Days in range join into one tomato band; the last day is the rounded end.
                background: inRange ? (isEnd ? "var(--tomato)" : "var(--tomato-tint)") : "transparent",
                color: isEnd ? "var(--white)" : inRange ? "var(--tomato-dark)" : "var(--muted)",
                borderRadius: i === 0 && isEnd ? 16 : i === 0 ? "16px 0 0 16px" : isEnd ? "0 16px 16px 0" : 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>{weekday}</span>
              <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{number}</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{d.items.length}</span>
            </button>
          );
        })}
      </div>
      {dates.length > 1 && <p style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>Tap the last day you're shopping for.</p>}
    </div>
  );
}

function GroupToggle({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Group the list" style={{ display: "flex", gap: 2, background: "var(--chip)", borderRadius: 14, padding: 3 }}>
      {[["date", "By day"], ["aisle", "By aisle"]].map(([id, label]) => {
        const active = value === id;
        return (
          <button key={id} role="tab" aria-selected={active} onClick={() => onChange(id)} style={{ flex: 1, height: 44, border: "none", borderRadius: 11, background: active ? "var(--white)" : "transparent", color: active ? "var(--ink)" : "var(--muted)", fontSize: 16, fontWeight: 800 }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ShoppingBody({ shopping }) {
  const [pantryOpen, setPantryOpen] = useState(true);
  const { dates, total, pantry, toggleHave, setAllHave, toBuyCount, groups, groupBy, setGroupBy, tickAll } = shopping;

  if (!dates.length) return <p style={{ padding: "24px 20px", fontSize: 16, color: "var(--muted)" }}>No shopping list for these dates.</p>;

  return (
    <>
      <DatePicker shopping={shopping} />
      {(
        <main style={{ padding: "12px 20px 0" }}>
          {pantry.length > 0 && (() => {
            const missing = pantry.filter((p) => !p.have).length;
            return (
              <section style={{ marginBottom: 16 }}>
                <button onClick={() => setPantryOpen((o) => !o)} aria-expanded={pantryOpen} style={{ ...foldStyle, padding: 0, background: "none", borderRadius: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Check the cupboard</span>
                  <span style={{ fontSize: 15, color: "var(--muted)" }}>{missing ? `${missing} to check` : "All there"} · {pantryOpen ? "Hide" : "Show"}</span>
                </button>
                {pantryOpen && (
                  <>
                    <div role="group" aria-label="Pantry checks" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pantry.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => toggleHave(p)}
                          aria-pressed={p.have}
                          style={{
                            minHeight: 36, padding: "6px 12px 6px 10px", display: "inline-flex", alignItems: "center", gap: 6,
                            border: "2px solid", borderColor: p.have ? "transparent" : "var(--line)", borderRadius: 999,
                            background: p.have ? "var(--chip)" : "var(--white)", color: p.have ? "var(--muted)" : "var(--ink)",
                            fontSize: 14, fontWeight: 600, lineHeight: 1.2,
                          }}
                        >
                          <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: p.have ? "none" : "2px solid var(--ink)", background: p.have ? "var(--muted)" : "transparent", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {p.have && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
                          </span>
                          <span style={{ textDecoration: p.have ? "line-through" : "none" }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                      <p style={{ fontSize: 13, color: "var(--muted)" }}>Tick what you have. Tap again to undo.</p>
                      <div style={{ display: "flex", flexShrink: 0 }}>
                        {[["Tick all", true, missing > 0], ["Untick all", false, missing < pantry.length]].map(([label, on, enabled]) => (
                          <button key={label} onClick={() => setAllHave(on)} disabled={!enabled} style={{ minHeight: 44, padding: "0 6px", border: "none", background: "none", fontSize: 14, fontWeight: 800, color: enabled ? "var(--ink)" : "var(--line)", cursor: enabled ? "pointer" : "default" }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </section>
            );
          })()}

          <GroupToggle value={groupBy} onChange={setGroupBy} />
          {toBuyCount === 0 && <p style={{ paddingTop: 14, fontSize: 16, color: "var(--muted)" }}>All in the basket.</p>}
          {groups.map((group) => (
            <section key={group.key} style={{ paddingTop: 14 }}>
              <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>{group.title}</h3>
              {group.rows
                ? group.rows.map((row) => <ItemRow key={row.key} row={row} onTick={tickAll} />)
                : group.recipes.map((recipe) => (
                    <div key={recipe.key} style={{ paddingTop: 8 }}>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--tomato)" }}>{recipe.title}</h4>
                      {recipe.rows.map((row) => <ItemRow key={row.key} row={row} onTick={tickAll} />)}
                    </div>
                  ))}
            </section>
          ))}
        </main>
      )}
    </>
  );
}
