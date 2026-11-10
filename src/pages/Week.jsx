import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DayRows from "../components/DayRows";
import { ShoppingBody, ShoppingProgress, useShopping } from "../components/Shopping";
import { AppShell, BackButton, Message, RedHeader, SmallBowl } from "../components/ui";
import { fetchWeek, useLoad, useToday } from "../lib/data";
import { shoppingDates, startOfToday, toISO, weekTitle } from "../lib/weeks";

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

export default function Week() {
  const { weekId } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: week, loading, error } = useLoad(() => fetchWeek(weekId), [weekId]);
  const today = useToday();
  // From today on; a week that's already over shows all its days.
  const dates = useMemo(() => {
    if (!week) return [];
    const all = shoppingDates(week);
    const upcoming = all.filter((d) => !d.date || toISO(d.date) >= today);
    return upcoming.length ? upcoming : all;
  }, [week, today]);
  const shopping = useShopping(dates);
  const view = params.get("view") === "shopping" ? "shopping" : "plan";
  const setView = (next) => setParams(next === "shopping" ? { view: next } : {}, { replace: true });

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
      {week && (view === "plan" ? <main style={{ padding: "4px 20px 0" }}><DayRows week={week} today={startOfToday()} /></main> : <ShoppingBody shopping={shopping} />)}
    </AppShell>
  );
}
