import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import MealCard from "../components/MealCard";
import ShoppingList from "../components/ShoppingList";
import DaySummary from "../components/DaySummary";

const ACCENT = "#C4956A";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const BG = "#FAFAF7";
const CREAM = "#FDF6EC";

export default function WeekPage() {
  const { weekId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plan");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWeek() {
      const { data: week } = await supabase
        .from("weeks")
        .select(`
          *,
          days (
            *,
            recipes (
              *,
              servings (*),
              ingredients (id, sort_order, value),
              steps (id, sort_order, value)
            )
          ),
          shopping (*)
        `)
        .eq("id", weekId)
        .single();

      if (week) {
        week.days.sort((a, b) => a.id - b.id);
        week.days.forEach(day => {
          day.recipes.sort((a, b) => {
            if (a.type === "dessert") return 1;
            if (b.type === "dessert") return -1;
            return 0;
          });
          day.recipes.forEach(recipe => {
            recipe.ingredients.sort((a, b) => a.sort_order - b.sort_order);
            recipe.steps.sort((a, b) => a.sort_order - b.sort_order);
          });
        });
        setData(week);
      }
      setLoading(false);
    }
    fetchWeek();
  }, [weekId]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#AAA" }}>
      Loading...
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#AAA" }}>
      Week not found.
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", background: BG, minHeight: "100vh", maxWidth: 500, margin: "0 auto", paddingBottom: 60 }}>

      <div style={{ padding: "16px 20px 0" }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, fontFamily: "sans-serif", color: ACCENT,
          display: "flex", alignItems: "center", gap: 6, padding: 0,
        }}>
          ← All weeks
        </button>
      </div>

      <div style={{ background: CREAM, borderBottom: `2px solid ${BORDER}`, padding: "20px 20px 22px", marginTop: 12 }}>
        <p style={{ margin: "0 0 5px", fontSize: 11, letterSpacing: 3, color: ACCENT, fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: 600 }}>Family Table · 2026</p>
        <h1 style={{ margin: "0 0 4px", fontSize: 36, fontWeight: "normal", color: DARK, letterSpacing: -0.5 }}>{data.dates}</h1>
        {data.note && <p style={{ margin: 0, fontSize: 15, color: "#999", fontFamily: "sans-serif", fontWeight: 300 }}>{data.note}</p>}
      </div>

      <div style={{ display: "flex", background: "white", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {[["plan", "Meal Plan"], ["shopping", "Shopping List"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "15px", border: "none", background: "none",
            fontFamily: "sans-serif", fontSize: 15, fontWeight: tab === key ? 600 : 400,
            color: tab === key ? ACCENT : "#AAA",
            borderBottom: tab === key ? `2px solid ${ACCENT}` : "2px solid transparent",
            cursor: "pointer", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === "plan" && (
        <div style={{ padding: "16px 14px 0" }}>
          {data.days.map((day) => (
            <div key={day.id} style={{ marginBottom: 8 }}>
              <div style={{ padding: "20px 4px 10px" }}>
                <p style={{ margin: 0, fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {day.day} · {day.date}
                  {day.holiday && (
                    <span style={{ marginLeft: 8, background: ACCENT, color: "white", borderRadius: 10, padding: "2px 8px", fontSize: 11 }}>
                      {day.holiday_name}
                    </span>
                  )}
                </p>
              </div>
              <DaySummary day={day} />
              {day.recipes.map((recipe) => (
                <MealCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "shopping" && <ShoppingList shopping={data.shopping} />}
    </div>
  );
}
