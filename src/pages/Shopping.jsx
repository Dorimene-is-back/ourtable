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
      <RedHeader style={{ position: "sticky", top: 0, zIndex: 5, padding: "calc(var(--safe-top) + 10px) 20px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <h1 style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1, letterSpacing: -0.8 }}>Shopping</h1>
          {week && <ShoppingProgress done={shopping.done.length} total={shopping.total} />}
          {week && <span style={{ fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{shopping.done.length} / {shopping.total}</span>}
        </div>
        {week && data.kind !== "this" && <p style={{ marginTop: 2, fontSize: 14, fontWeight: 600 }}>{weekTitle(week)}</p>}
      </RedHeader>
      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load the list. Check your connection and try again.</Message>}
      {week && <ShoppingBody shopping={shopping} />}
      <TabBar hideOnScroll />
    </AppShell>
  );
}
