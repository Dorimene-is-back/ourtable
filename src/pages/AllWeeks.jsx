import { Link } from "react-router-dom";
import { AppShell, Chevron, Message, Photo, RedHeader, TabBar } from "../components/ui";
import { fetchWeeks, useLoad } from "../lib/data";
import { addDays, dayDate, dayShort, isoWeekNumber, mainDish, mondayOf, monthName, parseISO, startOfToday, toISO, weekRangeLabel } from "../lib/weeks";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const gridColumns = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 };

// Newest first, grouped by the month of each week's Monday. Unplanned weeks appear
// as empty rows; a month with nothing planned at all is left out.
function buildMonths(weeks, today) {
  if (!weeks.length) return [];
  const byId = new Map(weeks.map((w) => [w.id, w]));
  const earliest = parseISO(weeks[weeks.length - 1].id);
  const newestPlanned = parseISO(weeks[0].id);
  const thisMonday = mondayOf(today);
  const start = newestPlanned > thisMonday ? newestPlanned : thisMonday;

  const months = [];
  for (let monday = start; monday >= earliest; monday = addDays(monday, -7)) {
    const key = `${monday.getFullYear()}-${monday.getMonth()}`;
    let month = months[months.length - 1];
    if (month?.key !== key) {
      month = { key, name: monthName(monday), rows: [] };
      months.push(month);
    }
    month.rows.push({ monday, week: byId.get(toISO(monday)) || null });
  }
  return months.filter((m) => m.rows.some((r) => r.week) || m.rows.some((r) => toISO(r.monday) === toISO(thisMonday)));
}

function Tile({ number, recipe, to, label }) {
  const filled = !!recipe;
  const style = { display: "block", aspectRatio: "1", borderRadius: 12, background: filled ? "var(--ink)" : "var(--chip)", position: "relative", overflow: "hidden" };
  const inner = (
    <>
      {filled && <Photo src={recipe.image} placeholder="var(--ink)" style={{ position: "absolute", inset: 0 }} />}
      <span style={{ position: "absolute", left: 6, top: 4, fontSize: 15, fontWeight: 800, color: filled ? "var(--white)" : "var(--muted)", textShadow: filled ? "0 1px 3px rgba(0,0,0,0.75)" : "none" }}>{number}</span>
    </>
  );
  if (!to) return <div style={style}>{inner}</div>;
  return <Link to={to} aria-label={label} style={style}>{inner}</Link>;
}

// The week label opens the whole week; each planned day's tile opens that day.
function WeekRow({ monday, week, isCurrent }) {
  const tiles = WEEKDAYS.map((weekday, i) => {
    const date = addDays(monday, i);
    const day = week?.days.find((d) => toISO(dayDate(week.id, d)) === toISO(date));
    return {
      number: date.getDate(),
      recipe: day ? mainDish(day) : null,
      to: day?.recipes.length ? `/weeks/${week.id}?day=${dayShort(day).toLowerCase()}` : null,
      label: day ? `Open ${day.day} ${day.date}` : null,
    };
  });
  const range = weekRangeLabel(monday);
  const number = isoWeekNumber(monday);

  const heading = (
    <>
      <span style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? "var(--tomato)" : "var(--ink)" }}>W{number}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 14, fontWeight: 600, color: isCurrent ? "var(--tomato)" : week ? "var(--ink)" : "var(--muted)" }}>
        {range}{isCurrent ? " · this week" : ""}{week && <Chevron size={14} stroke={2.8} />}
      </span>
    </>
  );
  const headingStyle = { display: "inline-flex", gap: 8, alignItems: "center", minHeight: 36 };

  return (
    <div style={{ padding: "2px 0 6px" }}>
      {week
        ? <Link to={`/weeks/${week.id}`} aria-label={`Open week ${number}, ${range}`} style={{ ...headingStyle, minHeight: 44 }}>{heading}</Link>
        : <div style={headingStyle}>{heading}</div>}
      <div style={gridColumns}>{tiles.map((t) => <Tile key={t.number} {...t} />)}</div>
    </div>
  );
}

export default function AllWeeks() {
  const { data: weeks, loading, error } = useLoad(fetchWeeks, []);
  const today = startOfToday();
  const months = weeks ? buildMonths(weeks, today) : [];
  const thisMonday = toISO(mondayOf(today));
  const firstMonth = weeks?.length ? monthName(parseISO(weeks[weeks.length - 1].id)) : "";

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>All weeks</h1>
          {firstMonth && <span style={{ fontSize: 15, fontWeight: 600 }}>Since {firstMonth}</span>}
        </div>
      </RedHeader>

      <div style={{ ...gridColumns, position: "sticky", top: 0, zIndex: 2, background: "var(--white)", padding: "10px 20px 8px", borderBottom: "2px solid var(--line)" }}>
        {WEEKDAYS.map((d) => <span key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{d}</span>)}
      </div>

      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load your weeks.</Message>}

      <main style={{ padding: "0 20px" }}>
        {months.map((month) => (
          <section key={month.key} style={{ paddingTop: 14 }}>
            <h2 style={{ marginBottom: 4, fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>{month.name}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {month.rows.map((row) => <WeekRow key={toISO(row.monday)} {...row} isCurrent={toISO(row.monday) === thisMonday} />)}
            </div>
          </section>
        ))}
      </main>
      <TabBar />
    </AppShell>
  );
}
