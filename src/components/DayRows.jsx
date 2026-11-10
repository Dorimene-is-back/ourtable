import { Link } from "react-router-dom";
import { Photo } from "./ui";
import { dayDate, dayNumber, dayShort, isNoCookingDay, toISO, whoFor } from "../lib/weeks";

function DishRow({ weekId, recipe }) {
  return (
    <Link to={`/weeks/${weekId}/${recipe.id}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "3px 0" }}>
      <Photo src={recipe.image} size={44} radius={10} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.25 }}>{recipe.title}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", flexShrink: 0 }}>{whoFor(recipe)}</span>
    </Link>
  );
}

// A week as compact day rows, one tappable row per dish. dimPast greys out days already gone.
export default function DayRows({ week, today, dimPast = false }) {
  return week.days.map((day) => {
    const date = toISO(dayDate(week.id, day));
    const isToday = date === toISO(today);
    const dimmed = dimPast && date < toISO(today);
    return (
      <div key={day.id} style={{ display: "grid", gridTemplateColumns: "46px 1fr", gap: 12, padding: "6px 0", borderBottom: "2px solid var(--line)", color: dimmed ? "var(--muted)" : "var(--ink)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{dayShort(day)}</span>
          <span style={{ width: 34, height: 34, borderRadius: 999, background: isToday ? "var(--tomato)" : "transparent", color: isToday ? "var(--white)" : "inherit", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 19 }}>{dayNumber(day)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {isNoCookingDay(day)
            ? <span style={{ fontSize: 15, fontWeight: 500, color: "var(--muted)" }}>{day.recipes[0]?.title || day.holiday_name}</span>
            : day.recipes.map((recipe) => <DishRow key={recipe.id} weekId={week.id} recipe={recipe} />)}
        </div>
      </div>
    );
  });
}
