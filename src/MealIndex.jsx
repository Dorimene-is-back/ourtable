import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

const ACCENT = "#C4956A";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";
const BG = "#FAFAF7";

const WEEK_ROUTES = {
  "2026-05-25": "/weeks/2026-05-25",
};

export default function MealIndex() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWeeks() {
      const { data } = await supabase
        .from("weeks")
        .select(`*, days(*, recipes(*))`)
        .order("id", { ascending: false });
      if (data) setWeeks(data);
      setLoading(false);
    }
    fetchWeeks();
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#AAA" }}>
      Loading...
    </div>
  );

  const currentWeek = weeks[0];
  const pastWeeks = weeks.slice(1);

  return (
    <div style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", background: BG, minHeight: "100vh", maxWidth: 500, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ background: CREAM, borderBottom: `2px solid ${BORDER}`, padding: "32px 22px 26px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 3, color: ACCENT, fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: 600 }}>Our Table · Singapore</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 34, fontWeight: "normal", color: DARK, letterSpacing: -0.5, lineHeight: 1.1 }}>Family Table</h1>
        <p style={{ margin: 0, fontSize: 15, color: "#AAA", fontFamily: "sans-serif", fontWeight: 300 }}>Weekly meal plans · 1 adult + 2 kids</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {currentWeek && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>This Week</p>
            <div
              onClick={() => navigate(WEEK_ROUTES[currentWeek.id])}
              style={{
                background: DARK, borderRadius: 16, padding: "22px 20px", marginBottom: 28,
                cursor: "pointer", transition: "transform 0.15s",
                transform: hoveredIndex === "current" ? "scale(0.99)" : "scale(1)",
              }}
              onMouseEnter={() => setHoveredIndex("current")}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "sans-serif", color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase" }}>Week of</p>
                  <p style={{ margin: 0, fontSize: 22, color: "white", lineHeight: 1.2 }}>{currentWeek.dates}</p>
                  {currentWeek.note && <p style={{ margin: "4px 0 0", fontSize: 12, fontFamily: "sans-serif", color: "rgba(255,255,255,0.4)" }}>{currentWeek.note}</p>}
                </div>
                <span style={{ fontSize: 22, marginTop: 2, color: "white" }}>→</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {currentWeek.days?.sort((a,b) => a.id - b.id).map((day) =>
                  day.recipes?.filter(r => r.type === "main").map((recipe) => (
                    <div key={recipe.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{recipe.emoji}</span>
                      <div>
                        <span style={{ fontSize: 10, fontFamily: "sans-serif", color: "rgba(255,255,255,0.45)", display: "block", letterSpacing: 0.5 }}>{day.day.slice(0,3)}</span>
                        <span style={{ fontSize: 13, fontFamily: "sans-serif", color: "white" }}>{recipe.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {pastWeeks.length > 0 && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Previous Weeks</p>
            {pastWeeks.map((week, i) => (
              <div key={week.id}
                onClick={() => navigate(WEEK_ROUTES[week.id])}
                style={{
                  background: "white", border: `1px solid ${BORDER}`, borderRadius: 14,
                  padding: "18px", marginBottom: 12, cursor: "pointer",
                  transition: "transform 0.15s",
                  transform: hoveredIndex === i ? "scale(0.99)" : "scale(1)",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 11, fontFamily: "sans-serif", color: ACCENT, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Week of</p>
                    <p style={{ margin: 0, fontSize: 19, color: DARK }}>{week.dates}</p>
                    {week.note && <p style={{ margin: "3px 0 0", fontSize: 12, fontFamily: "sans-serif", color: "#BBB" }}>{week.note}</p>}
                  </div>
                  <span style={{ fontSize: 18, color: "#CCC" }}>→</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {week.days?.sort((a,b) => a.id - b.id).map((day) =>
                    day.recipes?.filter(r => r.type === "main").map((recipe) => (
                      <div key={recipe.id} style={{ background: CREAM, borderRadius: 20, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 12 }}>{recipe.emoji}</span>
                        <span style={{ fontSize: 12, fontFamily: "sans-serif", color: "#666" }}>{day.day.slice(0,3)} · {recipe.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        <p style={{ textAlign: "center", padding: "24px 0 0", fontSize: 12, fontFamily: "sans-serif", color: "#DDD", letterSpacing: 0.5 }}>Updated every Saturday · Singapore 🇸🇬</p>
      </div>
    </div>
  );
}
