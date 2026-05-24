const ACCENT = "#C4956A";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";

function whoLabel(servings) {
  if (!servings || servings.length === 0) return "";
  const all = servings.find(s => s.for_who === "all");
  if (all) return "Everyone";
  const parts = [];
  const adult = servings.find(s => s.for_who === "adult");
  const kids = servings.find(s => s.for_who === "kids");
  if (adult) parts.push("Adult");
  if (kids) parts.push(`Kids ×${kids.count}`);
  return parts.join(" + ");
}

export default function DaySummary({ day }) {
  const comments = day.recipes
    .map(r => r.comments)
    .filter(c => c && c.trim() !== "");

  return (
    <div style={{
      background: CREAM,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      {/* Recipe list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: comments.length > 0 ? 12 : 0 }}>
        {day.recipes.map((recipe) => (
          <div key={recipe.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>{recipe.emoji}</span>
              <span style={{ fontSize: 14, fontFamily: "Georgia, serif", color: DARK }}>{recipe.title}</span>
            </div>
            <span style={{
              fontSize: 11, fontFamily: "sans-serif", fontWeight: 600,
              color: "white", background: ACCENT,
              borderRadius: 20, padding: "2px 8px",
              whiteSpace: "nowrap", letterSpacing: 0.3,
            }}>
              {whoLabel(recipe.servings)}
            </span>
          </div>
        ))}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {comments.map((comment, i) => (
            <p key={i} style={{ margin: 0, fontSize: 13, fontFamily: "sans-serif", color: "#777", lineHeight: 1.6 }}>
              💡 {comment}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
