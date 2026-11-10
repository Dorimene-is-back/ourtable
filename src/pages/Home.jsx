import { Link } from "react-router-dom";
import AuthButton from "../components/AuthButton";
import DayRows from "../components/DayRows";
import { AppShell, Logo, Message, Photo, RedHeader, TabBar } from "../components/ui";
import { useAuth } from "../lib/auth";
import { fetchWeeks, useDataVersion, useLoad } from "../lib/data";
import { findDay, isNoCookingDay, mainDish, pickWeek, shortDate, startOfToday, weekTitle, whoFor } from "../lib/weeks";

const HEADINGS = { this: "This week", next: "Next week", latest: "Last planned" };

function DishLine({ recipe, size, weight, whoSize }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
      <span style={{ fontSize: size, fontWeight: weight, lineHeight: 1.25 }}>{recipe.title}</span>
      <span style={{ fontSize: whoSize, color: "var(--muted)", flexShrink: 0 }}>{whoFor(recipe)}</span>
    </div>
  );
}

function Tonight({ tonight, today }) {
  const day = tonight?.day;
  const main = day ? mainDish(day) || (isNoCookingDay(day) ? null : day.recipes[0]) : null;
  const buttonStyle = { height: 56, border: "2px solid", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", fontSize: 17, fontWeight: 800 };

  return (
    <section style={{ padding: "18px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, letterSpacing: -1.4 }}>Tonight</h1>
        <span style={{ fontSize: 15, color: "var(--muted)" }}>{shortDate(today)}</span>
      </div>

      {day?.recipes.length ? (
        <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center" }}>
          {main && <Photo src={main.image} size={92} radius={18} />}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {day.recipes.map((r) => <DishLine key={r.id} recipe={r} size={18} weight={600} whoSize={14} />)}
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 12, fontSize: 18, color: "var(--muted)" }}>Nothing planned tonight.</p>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: main ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 10 }}>
        {main && (
          <Link to={`/weeks/${tonight.week.id}/${main.id}`} className="btn-red" style={{ ...buttonStyle, borderColor: "var(--tomato)", background: "var(--tomato)", color: "var(--white)" }}>
            Tonight’s recipe
          </Link>
        )}
        <Link to="/shopping" style={{ ...buttonStyle, borderColor: "var(--ink)", color: "var(--ink)" }}>Shopping list</Link>
      </div>
    </section>
  );
}

function WeekRows({ picked, today }) {
  const { week, kind } = picked;
  return (
    <section style={{ padding: "26px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "3px solid var(--ink)", paddingBottom: 6 }}>
        <h2 style={{ fontWeight: 800, fontSize: 28, lineHeight: 1, letterSpacing: -1 }}>{HEADINGS[kind]}</h2>
        <span style={{ fontSize: 15, color: "var(--muted)" }}>{weekTitle(week)}</span>
      </div>
      <DayRows week={week} today={today} dimPast />
    </section>
  );
}

export default function Home() {
  const version = useDataVersion();
  const { data: weeks, loading, error } = useLoad(fetchWeeks, [version], { keep: true });
  const { kitchen } = useAuth();
  const today = startOfToday();
  const picked = weeks && pickWeek(weeks, today);

  return (
    <AppShell withTabBar>
      <RedHeader style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo />
        <AuthButton />
      </RedHeader>
      {loading && !weeks && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load the plan. Check your connection and try again.</Message>}
      {weeks && !weeks.length && kitchen && (
        <section style={{ padding: "24px 20px 0" }}>
          <h1 style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: -1.2 }}>Plan your first week</h1>
          <p style={{ margin: "8px 0 16px", fontSize: 17, lineHeight: 1.45, color: "var(--muted)" }}>The {kitchen.name} kitchen has no weeks yet. Open a recipe and tap "Add to a week" to put it on a day.</p>
          <Link to="/recipes" className="btn-red" style={{ height: 56, borderRadius: 16, background: "var(--tomato)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800 }}>Browse recipes</Link>
        </section>
      )}
      {weeks && weeks.length > 0 && (
        <>
          <Tonight tonight={findDay(weeks, today)} today={today} />
          {picked && <WeekRows picked={picked} today={today} />}
        </>
      )}
      <TabBar />
    </AppShell>
  );
}
