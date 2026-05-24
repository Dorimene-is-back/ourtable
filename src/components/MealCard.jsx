import { useState } from "react";

const ACCENT = "#C4956A";
const GREEN = "#7A9E8A";
const PURPLE = "#9B7AB0";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";

function RefLink({ label, url, color }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 13, fontFamily: "sans-serif",
      color: color || ACCENT,
      textDecoration: "none",
      borderBottom: `1px dashed ${color || ACCENT}`,
      marginTop: 5,
    }}>
      📖 {label} — tap for photo reference ↗
    </a>
  );
}

function ServingBlock({ serving, color }) {
  const label = serving.for_who === "adult" ? "Adult" :
                serving.for_who === "kids" ? "Kids" : "Everyone";
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color, letterSpacing: 1.2, textTransform: "uppercase" }}>
        {label} {serving.count > 1 ? `×${serving.count}` : ""}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#444", lineHeight: 1.5 }}>{serving.notes}</p>
    </div>
  );
}

export default function MealCard({ recipe, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const servingColors = {
    adult: GREEN,
    kids: ACCENT,
    all: PURPLE,
  };

  const cardColor = recipe.type === "dessert" ? PURPLE : ACCENT;

  return (
    <div style={{ background: "white", borderRadius: 14, marginBottom: 16, overflow: "hidden", border: `1px solid ${BORDER}` }}>
      
      {/* Hero image */}
      {recipe.image && (
        <div style={{ width: "100%", height: 200, overflow: "hidden" }}>
          <img
            src={recipe.image}
            alt={recipe.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      )}

      {/* Card header */}
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "18px 20px 16px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: cardColor, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {recipe.type === "dessert" ? "Dessert" : "Main"}
        </p>
        <p style={{ margin: "0 0 4px", fontSize: 26, color: DARK, lineHeight: 1.15 }}>{recipe.emoji} {recipe.title}</p>
        <p style={{ margin: 0, fontSize: 14, color: "#AAA", fontFamily: "sans-serif" }}>{recipe.subtitle}</p>
      </div>

      <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Servings */}
        {recipe.servings?.map((s, i) => (
          <ServingBlock key={i} serving={s} color={servingColors[s.for_who] || ACCENT} />
        ))}

        {/* Comments */}
        {recipe.comments && (
          <div style={{ background: "#FFF8F0", borderRadius: 8, padding: "10px 14px", border: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, fontSize: 13, fontFamily: "sans-serif", color: "#888", lineHeight: 1.6 }}>💡 {recipe.comments}</p>
          </div>
        )}

        {/* Ref link */}
        {recipe.ref && recipe.ref_url && (
          <RefLink label={recipe.ref} url={recipe.ref_url} color={cardColor} />
        )}

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)} style={{
          width: "100%", padding: "14px",
          background: expanded ? DARK : CREAM,
          color: expanded ? "white" : DARK,
          border: `1px solid ${BORDER}`, borderRadius: 10,
          fontSize: 15, fontFamily: "sans-serif", fontWeight: 500,
          cursor: "pointer",
        }}>
          {expanded ? "▲ Hide Recipe" : "▼ See Full Recipe"}
        </button>

        {expanded && (
          <div>
            {/* Ingredients */}
            <p style={{ margin: "4px 0 10px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Ingredients</p>
            {recipe.ingredients?.map((ing, j) => {
              const isHeader = ing.value.startsWith("—");
              return isHeader ? (
                <p key={j} style={{ margin: "16px 0 8px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: cardColor, letterSpacing: 2, textTransform: "uppercase" }}>
                  {ing.value.replace(/—/g, "").trim()}
                </p>
              ) : (
                <div key={j} style={{ display: "flex", gap: 10, borderBottom: "1px solid #F5F0E8", padding: "8px 0", alignItems: "baseline" }}>
                  <span style={{ color: cardColor, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>·</span>
                  <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333" }}>{ing.value}</p>
                </div>
              );
            })}

            {/* Steps */}
            <p style={{ margin: "24px 0 10px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Steps</p>
            {(() => {
              let n = 0;
              return recipe.steps?.map((step, j) => {
                const isHeader = step.value.startsWith("—");
                if (!isHeader) n++;
                return isHeader ? (
                  <p key={j} style={{ margin: "16px 0 8px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: cardColor, letterSpacing: 2, textTransform: "uppercase" }}>
                    {step.value.replace(/—/g, "").trim()}
                  </p>
                ) : (
                  <div key={j} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                    <span style={{ minWidth: 26, height: 26, background: "#F5EFE6", color: cardColor, borderRadius: "50%", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
                    <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333", lineHeight: 1.6 }}>{step.value}</p>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
