import { useState } from "react";
import { useNavigate } from "react-router-dom";

const weeks = [
  {
    dates: "25 – 29 May 2026",
    path: "/weeks/2026-05-25",
    note: "Wed off — Hari Raya Haji",
    meals: [
      { day: "Mon", dish: "Pho Gà", emoji: "🇻🇳" },
      { day: "Tue", dish: "Cá Kho Tộ", emoji: "🇻🇳" },
      { day: "Thu", dish: "Fattoush & Grilled Chicken", emoji: "🇱🇧" },
      { day: "Fri", dish: "Salade Chèvre Chaud", emoji: "🇫🇷" },
    ],
  },
];

const ACCENT = "#C4956A";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const CREAM = "#FDF6EC";
const BG = "#FAFAF7";

export default function MealIndex() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const navigate = useNavigate();

  const currentWeek = weeks[0];
  const pastWeeks = weeks.slice(1);

  return (
    <div style={{
      fontFamily: "Georgia, 'Palatino Linotype', serif",
      background: BG,
      minHeight: "100vh",
      maxWidth: 500,
      margin: "0 auto",
      paddingBottom: 60,
    }}>
      <div style={{
        background: CREAM,
        borderBottom: `2px solid ${BORDER}`,
        padding: "32px 22px 26px",
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: 3, color: ACCENT, fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: 600 }}>Our Table · Singapore</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 34, fontWeight: "normal", color: DARK, letterSpacing: -0.5, lineHeight: 1.1 }}>Family Table</h1>
        <p style={{ margin: 0, fontSize: 15, color: "#AAA", fontFamily: "sans-serif", fontWeight: 300 }}>Weekly meal plans · 1 adult + 2 kids</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {currentWeek && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>This Week</p>
            <div
              onClick={() => navigate(currentWeek.path)}
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
                {currentWeek.meals.map((m, j) => (
                  <div key={j} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ font
