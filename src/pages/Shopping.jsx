import { ShoppingBody, ShoppingProgress, useShopping } from "../components/Shopping";
import { AppShell, Message, RedHeader, TabBar } from "../components/ui";
import { fetchWeek, fetchWeeks, useLoad } from "../lib/data";
import { pickWeek, startOfToday, weekTitle } from "../lib/weeks";

async function loadCurrentWeek() {
  const picked = pickWeek(await fetchWeeks(), startOfToday());
  if (!picked) return null;
  return { week: await fetchWeek(picked.week.id), kind: picked.kind };
}

export default function Shopping() {
  const { data, loading, error } = useLoad(loadCurrentWeek, []);
  const week = data?.week;
  const shopping = useShopping(week);

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", minHeight: 44 }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>Shopping</h1>
          {week && <span style={{ fontSize: 16, fontWeight: 800 }}>{shopping.done.length} / {shopping.total}</span>}
        </div>
        {week && data.kind !== "this" && <p style={{ fontSize: 15, fontWeight: 600 }}>{weekTitle(week)}</p>}
        {week && <ShoppingProgress done={shopping.done.length} total={shopping.total} />}
      </RedHeader>
      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load the list. Check your connection and try again.</Message>}
      {week && <ShoppingBody shopping={shopping} />}
      <TabBar />
    </AppShell>
  );
}
