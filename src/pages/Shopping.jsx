import { DatePicker, ShoppingBody, ShoppingProgress, useShopping } from "../components/Shopping";
import { AppShell, Message, RedHeader, TabBar } from "../components/ui";
import { fetchWeek, fetchWeeks, useLoad, useToday } from "../lib/data";
import { mondayOf, pickWeek, shoppingDates, startOfToday, toISO, weekTitle } from "../lib/weeks";

const NO_DATES = [];

// Every date from today on that has shopping. With nothing upcoming, the last planned week.
async function loadDates() {
  const weeks = await fetchWeeks();
  const today = startOfToday();
  const fromMonday = toISO(mondayOf(today));
  const ids = weeks.filter((w) => w.id >= fromMonday).map((w) => w.id).sort();
  const loaded = await Promise.all(ids.map(fetchWeek));
  const upcoming = loaded.flatMap(shoppingDates).filter((d) => d.date && toISO(d.date) >= toISO(today));
  if (upcoming.length) return { dates: upcoming, lastPlanned: null };
  const picked = pickWeek(weeks, today);
  if (!picked) return { dates: NO_DATES, lastPlanned: null };
  const week = await fetchWeek(picked.week.id);
  return { dates: shoppingDates(week), lastPlanned: weekTitle(week) };
}

export default function Shopping() {
  const today = useToday();
  const { data, loading, error } = useLoad(loadDates, [today]);
  const shopping = useShopping(data?.dates ?? NO_DATES);

  return (
    <AppShell withTabBar>
      {/* Header and day picker stick together so the chosen days stay in view. */}
      <div style={{ position: "sticky", top: 0, zIndex: 5 }}>
        <RedHeader style={{ padding: "calc(var(--safe-top) + 10px) 20px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h1 style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1, letterSpacing: -0.8 }}>Shopping</h1>
            {data && <ShoppingProgress done={shopping.done.length} total={shopping.total} />}
            {data && <span style={{ fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{shopping.done.length} / {shopping.total}</span>}
        </div>
        {data?.lastPlanned && <p style={{ marginTop: 2, fontSize: 14, fontWeight: 600 }}>Last planned: {data.lastPlanned}</p>}
      </RedHeader>
      {data?.dates.length > 0 && <DatePicker shopping={shopping} />}
      </div>
      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load the list. Check your connection and try again.</Message>}
      {data && <ShoppingBody shopping={shopping} pickerInHeader />}
      <TabBar hideOnScroll />
    </AppShell>
  );
}
