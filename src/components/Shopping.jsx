import { useState } from "react";
import { SHOPPING_TYPES } from "../lib/weeks";

const TICKS_KEY = "tambouille:shopping:ticked";
const GROUP_KEY = "tambouille:shopping:groupBy";

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

const toggled = (set, value) => {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
};

// dates: groups from shoppingDates(). All dates start selected.
export function useShopping(dates) {
  const [ticked, setTicked] = useState(() => new Set(read(TICKS_KEY, [])));
  const [deselected, setDeselected] = useState(() => new Set());
  const [groupBy, setGroupByState] = useState(() => read(GROUP_KEY, "date"));

  const selected = dates.filter((d) => !deselected.has(d.key));
  const items = selected.flatMap((d) => d.items);
  const pending = items.filter((item) => !ticked.has(item.id));
  const toBuy = pending.filter((item) => item.category !== "Pantry");

  const toggle = (id) => {
    const next = toggled(ticked, id);
    setTicked(next);
    write(TICKS_KEY, [...next]);
  };

  const setGroupBy = (value) => {
    setGroupByState(value);
    write(GROUP_KEY, value);
  };

  const groups = groupBy === "type"
    ? SHOPPING_TYPES
        .map((type) => ({ key: type, title: type, items: toBuy.filter((item) => (SHOPPING_TYPES.includes(item.category) ? item.category : "Other") === type) }))
        .filter((g) => g.items.length)
    : selected
        .map((d) => ({ key: d.key, title: d.label, items: d.items.filter((item) => toBuy.includes(item)) }))
        .filter((g) => g.items.length);

  return {
    dates,
    deselected,
    toggleDate: (key) => setDeselected((prev) => toggled(prev, key)),
    total: items.length,
    done: items.filter((item) => ticked.has(item.id)),
    pantry: pending.filter((item) => item.category === "Pantry"),
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

function ItemText({ item, showDate, crossed }) {
  const detail = [showDate && item.day, item.recipeTitle].filter(Boolean).join(" · ");
  return (
    <span style={{ minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 16, lineHeight: 1.25, textDecoration: crossed ? "line-through" : "none" }}>{item.item}</span>
      {detail && <span style={{ display: "block", fontSize: 13, lineHeight: 1.25, color: "var(--muted)" }}>{detail}</span>}
    </span>
  );
}

function ItemRow({ item, showDate, onToggle }) {
  return (
    <button onClick={() => onToggle(item.id)} style={rowStyle}>
      <span style={{ width: 22, height: 22, borderRadius: 7, border: "2px solid var(--ink)", flexShrink: 0 }} />
      <ItemText item={item} showDate={showDate} />
    </button>
  );
}

function DatePicker({ shopping }) {
  return (
    <div role="group" aria-label="Dates to shop for" style={{ display: "flex", gap: 6, padding: "10px 20px", overflowX: "auto", borderBottom: "2px solid var(--line)" }}>
      {shopping.dates.map((d) => {
        const on = !shopping.deselected.has(d.key);
        const [weekday, number] = d.label.split(" ");
        return (
          <button key={d.key} onClick={() => shopping.toggleDate(d.key)} aria-pressed={on} style={{ flex: "1 0 52px", maxWidth: 80, height: 48, border: "none", borderRadius: 14, background: on ? "var(--tomato)" : "var(--chip)", color: on ? "var(--white)" : "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{weekday}</span>
            <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{number}</span>
          </button>
        );
      })}
    </div>
  );
}

function GroupToggle({ value, onChange }) {
  const option = (id, label) => {
    const active = value === id;
    return (
      <button aria-pressed={active} onClick={() => onChange(id)} style={{ height: 44, padding: "0 12px", border: "none", borderRadius: 10, background: active ? "var(--white)" : "transparent", color: active ? "var(--tomato)" : "var(--muted)", fontSize: 14, fontWeight: active ? 800 : 600 }}>
        {label}
      </button>
    );
  };
  return (
    <div role="group" aria-label="Group by" style={{ display: "flex", gap: 2, background: "var(--chip)", borderRadius: 12, padding: 2 }}>
      {option("date", "By date")}
      {option("type", "By type")}
    </div>
  );
}

export function ShoppingBody({ shopping }) {
  const [pantryOpen, setPantryOpen] = useState(true);
  const [basketOpen, setBasketOpen] = useState(false);
  const { dates, total, done, pantry, groups, groupBy, setGroupBy, toggle } = shopping;

  if (!dates.length) return <p style={{ padding: "24px 20px", fontSize: 16, color: "var(--muted)" }}>No shopping list for these dates.</p>;

  return (
    <>
      <DatePicker shopping={shopping} />
      {!total ? (
        <p style={{ padding: "24px 20px", fontSize: 16, color: "var(--muted)" }}>Pick a date to see what to buy.</p>
      ) : (
        <main style={{ padding: "12px 20px 0" }}>
          {pantry.length > 0 && (
            <section style={{ marginBottom: 14 }}>
              <button onClick={() => setPantryOpen((o) => !o)} aria-expanded={pantryOpen} style={foldStyle}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Pantry checks · {pantry.length}</span>
                <span style={{ fontSize: 15, color: "var(--muted)" }}>{pantryOpen ? "Hide" : "Show"}</span>
              </button>
              {pantryOpen && pantry.map((item) => <ItemRow key={item.id} item={item} showDate onToggle={toggle} />)}
            </section>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>To buy</h2>
            <GroupToggle value={groupBy} onChange={setGroupBy} />
          </div>

          {groups.map((group) => (
            <section key={group.key} style={{ paddingTop: 10 }}>
              <h3 style={{ fontWeight: 800, fontSize: 14, color: "var(--muted)" }}>{group.title}</h3>
              {group.items.map((item) => <ItemRow key={item.id} item={item} showDate={groupBy === "type"} onToggle={toggle} />)}
            </section>
          ))}

          <button onClick={() => setBasketOpen((open) => !open)} aria-expanded={basketOpen} style={{ ...foldStyle, marginTop: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>In the basket · {done.length}</span>
            <span style={{ fontSize: 15, color: "var(--muted)" }}>{basketOpen ? "Hide" : "Show"}</span>
          </button>

          {basketOpen && done.map((item) => (
            <button key={item.id} onClick={() => toggle(item.id)} style={{ ...rowStyle, color: "var(--muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--tomato)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
              </span>
              <ItemText item={item} showDate crossed />
            </button>
          ))}
        </main>
      )}
    </>
  );
}
