const ACCENT = "#C4956A";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";

export default function ShoppingList({ shopping }) {
  // Group by day, preserving day_order
  const grouped = shopping.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = { order: item.day_order || 0, items: [] };
    acc[item.day].items.push(item);
    return acc;
  }, {});

  // Sort days by day_order
  const sortedDays = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order);

  return (
    <div style={{ padding: "16px 14px 0" }}>
      <div style={{ background: CREAM, borderRadius: 12, padding: "16px 18px", marginBottom: 14, border: `1px solid ${BORDER}` }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 1.5, textTransform: "uppercase" }}>✅ Check pantry first</p>
        <p style={{ margin: 0, fontSize: 14, fontFamily: "sans-serif", color: "#888", lineHeight: 1.9 }}>
          Olive oil · Fish sauce · Garlic · Sugar · Soy sauce · Sesame oil · Rice vinegar · Balsamic vinegar · Dijon mustard · Neutral oil · Salt & pepper
        </p>
      </div>
      {sortedDays.map(([day, { items }]) => (
        <div key={day} style={{ background: "white", borderRadius: 12, padding: "16px 18px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, color: DARK, letterSpacing: 0.5, textTransform: "uppercase" }}>{day}</p>
          {items.sort((a, b) => a.sort_order - b.sort_order).map((item, j) => (
            <div key={j} style={{ display: "flex", gap: 10, borderBottom: j < items.length - 1 ? "1px solid #F5F0E8" : "none", padding: "8px 0", alignItems: "baseline" }}>
              <span style={{ color: ACCENT, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>·</span>
              <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333" }}>{item.item}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
