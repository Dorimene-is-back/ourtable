import { useEffect, useMemo, useState } from "react";

const storageKey = (weekId) => `tambouille:shopping:${weekId}`;

function readTicks(weekId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(weekId))) || []);
  } catch {
    return new Set();
  }
}

export function useShopping(week) {
  const weekId = week?.id;
  const [ticked, setTicked] = useState(() => new Set());

  useEffect(() => {
    if (weekId) setTicked(readTicks(weekId));
  }, [weekId]);

  const items = useMemo(
    () => [...(week?.shopping || [])].sort((a, b) => (a.day_order || 0) - (b.day_order || 0) || a.sort_order - b.sort_order),
    [week]
  );

  const toggle = (id) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      try {
        localStorage.setItem(storageKey(weekId), JSON.stringify([...next]));
      } catch {
        // Private browsing: ticks last for this visit only.
      }
      return next;
    });
  };

  const done = items.filter((item) => ticked.has(item.id));
  const groups = [];
  items.filter((item) => !ticked.has(item.id)).forEach((item) => {
    const group = groups[groups.length - 1];
    if (group?.day === item.day) group.items.push(item);
    else groups.push({ day: item.day, items: [item] });
  });

  return { total: items.length, done, groups, toggle };
}

export function ShoppingProgress({ done, total, style }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label="Items in the basket" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.35)", overflow: "hidden", ...style }}>
      <div style={{ width: `${pct}%`, height: 6, borderRadius: 999, background: "var(--white)" }} />
    </div>
  );
}

const rowStyle = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "4px 0", border: "none", borderBottom: "2px solid var(--line)", background: "transparent", textAlign: "left" };

export function ShoppingBody({ shopping }) {
  const [basketOpen, setBasketOpen] = useState(false);
  const { total, done, groups, toggle } = shopping;

  if (!total) return <p style={{ padding: "24px 20px", fontSize: 16, color: "var(--muted)" }}>No shopping list for this week.</p>;

  return (
    <main style={{ padding: "0 20px" }}>
      {groups.map((group) => (
        <section key={group.day} style={{ paddingTop: 10 }}>
          <h2 style={{ fontWeight: 800, fontSize: 14, color: "var(--muted)" }}>{group.day}</h2>
          {group.items.map((item) => (
            <button key={item.id} onClick={() => toggle(item.id)} style={{ ...rowStyle, minHeight: 44 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, border: "2px solid var(--ink)", flexShrink: 0 }} />
              <span style={{ fontSize: 16, lineHeight: 1.25 }}>{item.item}</span>
            </button>
          ))}
        </section>
      ))}

      <button onClick={() => setBasketOpen((open) => !open)} aria-expanded={basketOpen} style={{ marginTop: 14, width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", border: "none", borderRadius: 16, background: "var(--chip)" }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>In the basket · {done.length}</span>
        <span style={{ fontSize: 15, color: "var(--muted)" }}>{basketOpen ? "Hide" : "Show"}</span>
      </button>

      {basketOpen && done.map((item) => (
        <button key={item.id} onClick={() => toggle(item.id)} style={{ ...rowStyle, minHeight: 44, color: "var(--muted)" }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--tomato)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
          </span>
          <span style={{ fontSize: 16, lineHeight: 1.25, textDecoration: "line-through" }}>{item.item}</span>
        </button>
      ))}
    </main>
  );
}
