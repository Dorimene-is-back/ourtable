import { useEffect } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ShoppingBody, ShoppingProgress, useShopping } from "../components/Shopping";
import { AppShell, BackButton, Message, Photo, RedHeader, SmallBowl } from "../components/ui";
import { fetchWeek, useLoad } from "../lib/data";
import { dayAnchor, dayDate, dayNumber, dayShort, isNoCookingDay, startOfToday, toISO, weekTitle, whoFor } from "../lib/weeks";

function Segments({ view, onChange }) {
  const tab = (id, label) => {
    const active = view === id;
    return (
      <button role="tab" aria-selected={active} onClick={() => onChange(id)} style={{ flex: 1, height: 44, border: "none", borderRadius: 10, background: active ? "var(--white)" : "transparent", color: active ? "var(--tomato)" : "var(--white)", fontSize: 16, fontWeight: active ? 800 : 600 }}>
        {label}
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="View" style={{ display: "flex", gap: 4, marginTop: 14, background: "rgba(0,0,0,0.2)", borderRadius: 14, padding: 4 }}>
      {tab("plan", "Plan")}
      {tab("shopping", "Shopping")}
    </div>
  );
}

function Plan({ week, today }) {
  const isToday = (day) => toISO(dayDate(week.id, day)) === toISO(today);
  const jump = (day) => document.getElementById(dayAnchor(day))?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div style={{ display: "flex", gap: 6, padding: "12px 20px", borderBottom: "2px solid var(--line)" }}>
        {week.days.map((day) => (
          <button key={day.id} onClick={() => jump(day)} style={{ flex: 1, minWidth: 0, height: 52, border: "none", borderRadius: 14, background: isToday(day) ? "var(--tomato)" : "var(--chip)", color: isToday(day) ? "var(--white)" : "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{dayShort(day)}</span>
            <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{dayNumber(day)}</span>
          </button>
        ))}
      </div>

      <main style={{ padding: "0 20px" }}>
        {week.days.map((day) => (
          <section key={day.id} id={dayAnchor(day)} style={{ paddingTop: 18, scrollMarginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, letterSpacing: -0.8 }}>{day.day} {dayNumber(day)}</h2>
              {isToday(day) && <span style={{ fontSize: 15, fontWeight: 800, color: "var(--tomato)" }}>Tonight</span>}
            </div>
            {isNoCookingDay(day) ? (
              <p style={{ minHeight: 64, display: "flex", alignItems: "center", fontSize: 16, color: "var(--muted)", borderBottom: "2px solid var(--line)" }}>{day.recipes[0]?.title || day.holiday_name}</p>
            ) : day.recipes.map((recipe) => (
              <Link key={recipe.id} to={`/weeks/${week.id}/${recipe.id}`} style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 64, padding: "6px 0", borderBottom: "2px solid var(--line)" }}>
                <Photo src={recipe.image} size={52} radius={12} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{recipe.title}</span>
                <span style={{ fontSize: 14, color: "var(--muted)", flexShrink: 0 }}>{whoFor(recipe)}</span>
              </Link>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}

export default function Week() {
  const { weekId } = useParams();
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const { data: week, loading, error } = useLoad(() => fetchWeek(weekId), [weekId]);
  const shopping = useShopping(week);
  const view = params.get("view") === "shopping" ? "shopping" : "plan";
  const setView = (next) => setParams(next === "shopping" ? { view: next } : {}, { replace: true });

  useEffect(() => {
    if (week && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [week, hash]);

  return (
    <AppShell>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton fallback="/" label="Back" />
          <h1 style={{ flex: 1, fontWeight: 800, fontSize: 30, lineHeight: 1, letterSpacing: -1.2 }}>{week ? weekTitle(week) : ""}</h1>
          <SmallBowl />
        </div>
        <Segments view={view} onChange={setView} />
        {week && view === "shopping" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <ShoppingProgress done={shopping.done.length} total={shopping.total} />
            <span style={{ fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{shopping.done.length} / {shopping.total}</span>
          </div>
        )}
      </RedHeader>
      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load this week.</Message>}
      {week && (view === "plan" ? <Plan week={week} today={startOfToday()} /> : <ShoppingBody shopping={shopping} />)}
    </AppShell>
  );
}
