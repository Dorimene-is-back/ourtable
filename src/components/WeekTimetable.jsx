const ACCENT = "#C4956A";
const GREEN = "#7A9E8A";
const PURPLE = "#9B7AB0";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";

export function whoLabel(recipe) {
  if (recipe.type === "dessert") return { text: "Dessert", color: PURPLE };
  const servings = recipe.servings || [];
  if (servings.some(s => s.for_who === "all")) return { text: "Everyone", color: PURPLE };
  const kids = servings.find(s => s.for_who === "kids");
  const adult = servings.find(s => s.for_who === "adult");
  if (kids && adult) return { text: "Everyone", color: PURPLE };
  if (kids) return { text: "Kids", color: ACCENT };
  if (adult) return { text: "Adult", color: GREEN };
  return { text: "", color: ACCENT };
}

export function isNoCookingDay(day) {
  return day.holiday && day.recipes.length > 0 &&
    day.recipes.every(r => !r.ingredients || r.ingredients.length === 0);
}

export function recipeAnchor(recipe) {
  return `recipe-${recipe.id}`;
}

function splitDate(date) {
  // "25 May" -> { num: "25", month: "May" }
  const [num, ...rest] = (date || "").split(" ");
  return { num, month: rest.join(" ") };
}

export default function WeekTimetable({ days }) {
  const jump = (recipe) => {
    const el = document.getElementById(recipeAnchor(recipe));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
      {days.map((day, i) => {
        const { num, month } = splitDate(day.date);
        const noCooking = isNoCookingDay(day);
        return (
          <div key={day.id} style={{
            display: "grid",
            gridTemplateColumns: "64px 1fr",
            borderTop: i === 0 ? "none" : `1px solid ${BORDER}`,
            minHeight: 56,
          }}>
            {/* Day column */}
            <div style={{
              background: CREAM, borderRight: `1px solid ${BORDER}`,
              padding: "12px 0", textAlign: "center",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {(day.day || "").slice(0, 3)}
              </span>
              <span style={{ fontSize: 20, color: DARK, lineHeight: 1.2 }}>{num}</span>
              <span style={{ fontSize: 10, fontFamily: "sans-serif", color: "#AAA" }}>{month}</span>
            </div>

            {/* Entries column */}
            <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {day.holiday && (
                <p style={{ margin: "4px 0", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, color: ACCENT }}>
                  🎉 {day.holiday_name}
                </p>
              )}
              {noCooking ? (
                <p style={{ margin: "4px 0", fontSize: 14, fontFamily: "sans-serif", color: "#AAA" }}>No cooking</p>
              ) : day.recipes.length === 0 ? (
                <p style={{ margin: "4px 0", fontSize: 14, fontFamily: "sans-serif", color: "#CCC" }}>—</p>
              ) : (
                day.recipes.map((recipe, j) => {
                  const who = whoLabel(recipe);
                  return (
                    <button key={recipe.id} onClick={() => jump(recipe)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      padding: "7px 0", width: "100%",
                      borderTop: j === 0 ? "none" : "1px dashed #F0E9DD",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{recipe.emoji}</span>
                        <span style={{ fontSize: 14, fontFamily: "Georgia, serif", color: DARK, lineHeight: 1.3 }}>{recipe.title}</span>
                      </span>
                      {who.text && (
                        <span style={{
                          fontSize: 10, fontFamily: "sans-serif", fontWeight: 700,
                          color: who.color, border: `1px solid ${who.color}`,
                          borderRadius: 20, padding: "1px 7px",
                          whiteSpace: "nowrap", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0,
                        }}>{who.text}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
