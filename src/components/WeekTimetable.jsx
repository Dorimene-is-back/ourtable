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

export default function WeekTimetable({ days, dark = false }) {
  // dark = compact version used inside the "This Week" card on the home page
  const t = dark
    ? { bg: "transparent", border: "rgba(255,255,255,0.12)", dayBg: "rgba(255,255,255,0.06)", dayName: "rgba(255,255,255,0.55)", text: "white", muted: "rgba(255,255,255,0.45)", dash: "rgba(255,255,255,0.08)" }
    : { bg: "white", border: BORDER, dayBg: CREAM, dayName: ACCENT, text: DARK, muted: "#AAA", dash: "#F0E9DD" };
  const jump = (recipe) => {
    if (dark) return;
    const el = document.getElementById(recipeAnchor(recipe));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Row = dark ? "div" : "button";

  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: dark ? 10 : 14, overflow: "hidden", marginBottom: 8 }}>
      {days.map((day, i) => {
        const { num, month } = splitDate(day.date);
        const noCooking = isNoCookingDay(day);
        return (
          <div key={day.id} style={{
            display: "grid",
            gridTemplateColumns: dark ? "52px 1fr" : "64px 1fr",
            borderTop: i === 0 ? "none" : `1px solid ${t.border}`,
            minHeight: dark ? 44 : 56,
          }}>
            {/* Day column */}
            <div style={{
              background: t.dayBg, borderRight: `1px solid ${t.border}`,
              padding: dark ? "8px 0" : "12px 0", textAlign: "center",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: t.dayName, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {(day.day || "").slice(0, 3)}
              </span>
              <span style={{ fontSize: dark ? 16 : 20, color: t.text, lineHeight: 1.2 }}>{num}</span>
              {!dark && <span style={{ fontSize: 10, fontFamily: "sans-serif", color: t.muted }}>{month}</span>}
            </div>

            {/* Entries column */}
            <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {day.holiday && (
                <p style={{ margin: "4px 0", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, color: ACCENT }}>
                  🎉 {day.holiday_name}
                </p>
              )}
              {noCooking ? (
                <p style={{ margin: "4px 0", fontSize: 14, fontFamily: "sans-serif", color: t.muted }}>No cooking</p>
              ) : day.recipes.length === 0 ? (
                <p style={{ margin: "4px 0", fontSize: 14, fontFamily: "sans-serif", color: "#CCC" }}>—</p>
              ) : (
                day.recipes.map((recipe, j) => {
                  const who = whoLabel(recipe);
                  return (
                    <Row key={recipe.id} onClick={() => jump(recipe)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      background: "none", border: "none", cursor: "pointer", textAlign: "left",
                      padding: dark ? "5px 0" : "7px 0", width: "100%",
                      borderTop: j === 0 ? "none" : `1px dashed ${t.dash}`,
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{recipe.emoji}</span>
                        <span style={{ fontSize: dark ? 13 : 14, fontFamily: dark ? "sans-serif" : "Georgia, serif", color: t.text, lineHeight: 1.3 }}>{recipe.title}</span>
                      </span>
                      {who.text && (
                        <span style={{
                          fontSize: 10, fontFamily: "sans-serif", fontWeight: 700,
                          color: who.color, border: `1px solid ${who.color}`,
                          borderRadius: 20, padding: "1px 7px",
                          whiteSpace: "nowrap", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0,
                        }}>{who.text}</span>
                      )}
                    </Row>
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
