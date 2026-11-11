import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthButton from "../components/AuthButton";
import { AppShell, ErrorNote, Message, RedHeader, StarInput, TabBar, fieldStyle, outlineButton, primaryButton, textButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { refreshData, useToday } from "../lib/data";
import { addReview, fetchOpenPlan, planStep } from "../lib/social";

const START = "(start)";
const WHO = { all: "Everyone", kids: "Kids", adult: "Adult" };
const dayLabel = (iso, options = { weekday: "long", day: "numeric", month: "short" }) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", options);
};

// Turns the stored conversation into what is shown: bubbles, and a card for each thing the
// assistant put on screen (days to pick, last week's dishes, a proposed plan).
function toItems(messages) {
  const items = [];
  messages.forEach((message, m) => {
    const blocks = typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content;
    blocks.forEach((block, b) => {
      const key = `${m}-${b}`;
      if (block.type === "text" && block.text && block.text !== START) items.push({ key, kind: message.role === "user" ? "said" : "reply", text: block.text });
      if (block.type === "tool_use" && block.name === "propose_days") items.push({ key, kind: "days", days: block.input?.days || [] });
      if (block.type === "tool_use" && block.name === "ask_feedback") items.push({ key, kind: "feedback" });
      if (block.type === "tool_use" && block.name === "propose_plan") items.push({ key, kind: "plan" });
      if (block.type === "tool_use" && block.name === "save_convives") items.push({ key, kind: "note", text: "Convives saved to this table." });
      if (block.type === "tool_use" && block.name === "remember_rule") items.push({ key, kind: "note", text: `Added to the house rules: ${block.input?.rule || ""}` });
    });
  });
  // Only the last card still takes input, and only while nothing was said after it.
  const last = items.length - 1;
  return items.map((item, i) => ({ ...item, live: i === last }));
}

const card = { margin: "10px 0", padding: 14, border: "2px solid var(--line)", borderRadius: 18, background: "var(--white)" };
const bubble = (mine) => ({ maxWidth: "86%", margin: "8px 0", padding: "10px 14px", borderRadius: 18, fontSize: 16, lineHeight: 1.45, whiteSpace: "pre-wrap", alignSelf: mine ? "flex-end" : "flex-start", background: mine ? "var(--ink)" : "var(--chip)", color: mine ? "var(--white)" : "var(--ink)" });

function DaysCard({ days, live, onSend }) {
  const [on, setOn] = useState(() => new Set(days.filter((d) => d.cook).map((d) => d.date)));
  const toggle = (date) => setOn((prev) => { const next = new Set(prev); if (!next.delete(date)) next.add(date); return next; });
  const picked = days.filter((d) => on.has(d.date));
  return (
    <div style={card}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {days.map((d) => {
          const active = on.has(d.date);
          return (
            <button key={d.date} aria-pressed={active} disabled={!live} onClick={() => toggle(d.date)} style={{ minWidth: 64, minHeight: 56, padding: "6px 10px", borderRadius: 14, border: active ? "2px solid var(--ink)" : "2px solid var(--line)", background: active ? "var(--ink)" : "var(--white)", color: active ? "var(--white)" : "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{dayLabel(d.date, { weekday: "short" })}</span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{dayLabel(d.date, { day: "numeric" })}</span>
            </button>
          );
        })}
      </div>
      {days.filter((d) => d.note).map((d) => <p key={d.date} style={{ marginTop: 8, fontSize: 14, color: "var(--muted)" }}>{dayLabel(d.date, { weekday: "short", day: "numeric" })}: {d.note}</p>)}
      {live && <button className="btn-red" disabled={!picked.length} onClick={() => onSend(`Plan these days: ${picked.map((d) => dayLabel(d.date)).join(", ")}.`)} style={{ ...primaryButton, width: "100%", marginTop: 12, opacity: picked.length ? 1 : 0.5 }}>Plan {picked.length === 1 ? "this day" : `these ${picked.length} days`}</button>}
    </div>
  );
}

// Stars and a note per dish. What is rated is saved as a review, then told to the assistant.
function FeedbackCard({ dishes, live, onSend }) {
  const { user, tableId } = useAuth();
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (id, patch) => setMarks((prev) => ({ ...prev, [id]: { rating: 0, comment: "", ...prev[id], ...patch } }));
  if (!live) return <p style={{ ...card, color: "var(--muted)", fontSize: 15 }}>Feedback on last week</p>;

  const send = async () => {
    setBusy(true);
    const lines = [];
    for (const dish of dishes) {
      const mark = marks[dish.recipe_id];
      if (!mark || (!mark.rating && !mark.comment.trim())) continue;
      lines.push(`${dish.title}: ${mark.rating ? `${mark.rating}/5` : "no rating"}${mark.comment.trim() ? `, "${mark.comment.trim()}"` : ""}`);
      try {
        await addReview({ userId: user.id, kitchenId: tableId, dishId: dish.dish_id, recipeId: dish.recipe_id, rating: mark.rating, comment: mark.comment, isPublic: false, cookedOn: dish.date });
      } catch {
        // The assistant still hears it; the review can be added from the recipe later.
      }
    }
    onSend(lines.length ? `Last week:\n${lines.join("\n")}` : "No feedback on last week.");
  };

  return (
    <div style={card}>
      {dishes.map((dish) => (
        <div key={dish.recipe_id} style={{ padding: "8px 0", borderBottom: "2px solid var(--line)" }}>
          <p style={{ fontSize: 16, fontWeight: 800 }}>{dish.title}</p>
          <div style={{ marginLeft: -8 }}><StarInput value={marks[dish.recipe_id]?.rating || 0} onChange={(rating) => set(dish.recipe_id, { rating })} /></div>
          <input aria-label={`Note on ${dish.title}`} value={marks[dish.recipe_id]?.comment || ""} onChange={(e) => set(dish.recipe_id, { comment: e.target.value })} placeholder="What to keep or change" maxLength={500} style={fieldStyle} />
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <button disabled={busy} onClick={() => onSend("Skip the feedback this time.")} style={outlineButton}>Skip</button>
        <button className="btn-red" disabled={busy} onClick={send} style={primaryButton}>{busy ? "Sending…" : "Send"}</button>
      </div>
    </div>
  );
}

function PlanCard({ plan, live, busy, onConfirm }) {
  if (!plan) return null;
  return (
    <div style={card}>
      {plan.days.map((day) => (
        <div key={day.date} style={{ padding: "8px 0", borderBottom: "2px solid var(--line)" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>{dayLabel(day.date)}{day.replace ? " · replaces what was planned" : ""}</p>
          {day.dishes.map((dish, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              <p style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{dish.title}</p>
              <p style={{ fontSize: 15, lineHeight: 1.35, color: "var(--muted)" }}>{[WHO[dish.for_who], !dish.source_recipe_id && "new", dish.note].filter(Boolean).join(" · ")}</p>
            </div>
          ))}
        </div>
      ))}
      {live && (
        <>
          <button className="btn-red" disabled={busy} onClick={onConfirm} style={{ ...primaryButton, width: "100%", marginTop: 12 }}>{busy ? "Writing the recipes…" : "Confirm this plan"}</button>
          <p style={{ marginTop: 8, fontSize: 14, color: "var(--muted)" }}>{busy ? "This takes up to a minute. Keep this screen open." : "Or say what to change below."}</p>
        </>
      )}
    </div>
  );
}

function Conversation({ session, setSession, table }) {
  const today = useToday();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null); // null | "reply" | "apply"
  const [pending, setPending] = useState(null); // what the person just said, until the reply arrives
  const [error, setError] = useState("");
  const end = useRef(null);
  const items = useMemo(() => toItems(session.messages || []), [session.messages]);
  const done = session.status === "applied";

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [items.length, pending, busy, done]);

  const step = async (body, kind, said) => {
    setBusy(kind);
    setPending(said || null);
    setError("");
    try {
      setSession(await planStep({ ...body, today }));
      if (kind === "apply") refreshData();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
      setPending(null);
    }
  };
  const send = (said) => step({ action: "message", session_id: session.id, text: said }, "reply", said);
  const submit = async (e) => {
    e.preventDefault();
    const said = text.trim();
    if (!said || busy) return;
    setText("");
    if (!(await send(said))) setText(said);
  };

  return (
    <>
      <main style={{ padding: "8px 16px 0", display: "flex", flexDirection: "column" }}>
        {items.map((item) => {
          const live = item.live && !busy && !done;
          if (item.kind === "said" || item.kind === "reply") return <p key={item.key} style={bubble(item.kind === "said")}>{item.text}</p>;
          if (item.kind === "note") return <p key={item.key} style={{ margin: "4px 0", fontSize: 14, color: "var(--muted)" }}>{item.text}</p>;
          if (item.kind === "days") return <DaysCard key={item.key} days={item.days} live={live} onSend={send} />;
          if (item.kind === "feedback") return <FeedbackCard key={item.key} dishes={session.draft?.feedback || []} live={live} onSend={send} />;
          // Older proposals are folded away: the current one is always the last.
          if (item.kind === "plan") return item.live ? <PlanCard key={item.key} plan={session.draft?.plan} live={!done && busy !== "reply"} busy={busy === "apply"} onConfirm={() => step({ action: "apply", session_id: session.id }, "apply")} /> : <p key={item.key} style={{ margin: "4px 0", fontSize: 14, color: "var(--muted)" }}>Earlier proposal</p>;
          return null;
        })}
        {pending && <p style={bubble(true)}>{pending}</p>}
        {busy === "reply" && <p style={{ ...bubble(false), color: "var(--muted)" }}>Thinking…</p>}
        {done && (
          <div style={{ ...card, borderColor: "var(--ink)" }}>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.6 }}>Your week is planned</p>
            <p style={{ margin: "4px 0 12px", fontSize: 16, lineHeight: 1.4 }}>The recipes are on {table.name}'s calendar and their ingredients on the shopping list. New dishes have no photo yet.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link to={`/weeks/${session.week_id}`} className="btn-red" style={primaryButton}>Open week</Link>
              <Link to={`/weeks/${session.week_id}?view=shopping`} style={outlineButton}>Shopping</Link>
            </div>
            <button onClick={() => setSession(null)} style={{ ...textButton, marginTop: 6 }}>Plan another week</button>
          </div>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div ref={end} style={{ height: 76 }} />
      </main>

      {!done && (
        <form onSubmit={submit} style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(92px + var(--safe-bottom))", width: "min(calc(100% - 40px), 460px)", display: "flex", gap: 8, padding: 6, borderRadius: 24, border: "2px solid var(--line)", background: "var(--white)", boxShadow: "0 6px 20px rgba(26,15,12,0.10)", zIndex: 4 }}>
          <input aria-label="Message to the planning assistant" value={text} onChange={(e) => setText(e.target.value)} placeholder="Answer, or ask for a change" maxLength={4000} enterKeyHint="send" style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", border: "none", outline: "none", background: "none", color: "var(--ink)", font: "inherit", fontSize: 16 }} />
          <button type="submit" aria-label="Send" disabled={!text.trim() || !!busy} className="btn-red" style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--tomato)", color: "var(--white)", opacity: text.trim() && !busy ? 1 : 0.4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </form>
      )}
    </>
  );
}

// The middle tab: plan a week by talking it through with the assistant.
export default function Plan() {
  const { user, ready, table, openSignIn } = useAuth();
  const today = useToday();
  const [session, setSession] = useState(undefined); // undefined = looking for one in progress
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tableId = table?.id;

  useEffect(() => {
    if (!tableId) { setSession(null); return undefined; }
    let alive = true;
    setSession(undefined);
    fetchOpenPlan(tableId).then((found) => alive && setSession(found), () => alive && setSession(null));
    return () => { alive = false; };
  }, [tableId]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      setSession(await planStep({ action: "start", table_id: tableId, today }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startOver = () => window.confirm("Start this plan again from the beginning?") && start();

  return (
    <AppShell withTabBar>
      <RedHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.1, letterSpacing: -1.4 }}>Plan</h1>
          <span style={{ flex: 1, textAlign: "right" }}>
            {session && session.status === "open" && <button onClick={startOver} disabled={busy} style={{ minHeight: 44, padding: "0 4px", border: "none", background: "none", color: "inherit", fontSize: 15, fontWeight: 600, textDecoration: "underline" }}>Start again</button>}
          </span>
          <AuthButton />
        </div>
      </RedHeader>

      {!ready && <Message>Loading…</Message>}
      {ready && !user && (
        <div style={{ padding: "24px 20px 0" }}>
          <p style={{ marginBottom: 16, fontSize: 17, lineHeight: 1.45 }}>Plan your week by talking it through: which days, who is at the table, what worked last week. The assistant proposes, you adjust, and the recipes and shopping list are written for you.</p>
          <button className="btn-red" onClick={() => openSignIn("Sign in to plan your weeks.")} style={{ ...primaryButton, width: "100%" }}>Sign in to plan</button>
        </div>
      )}
      {ready && user && !table && (
        <div style={{ padding: "24px 20px 0" }}>
          <p style={{ marginBottom: 16, fontSize: 17, lineHeight: 1.45 }}>Plans belong to a table: the people you eat with. Set yours up first.</p>
          <Link to="/table" className="btn-red" style={primaryButton}>Set up my table</Link>
        </div>
      )}
      {ready && table && session === undefined && <Message>Loading…</Message>}
      {ready && table && session === null && (
        <div style={{ padding: "24px 20px 0" }}>
          <h2 style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.1, letterSpacing: -1 }}>Plan a week for {table.name}</h2>
          <ol style={{ margin: "12px 0 18px", paddingLeft: 22, fontSize: 17, lineHeight: 1.5 }}>
            <li>Pick the days to plan.</li>
            <li>Say what is different that week: guests, someone away, a night out.</li>
            <li>Rate last week's dishes.</li>
            <li>Get a proposal, change what you like, confirm.</li>
          </ol>
          <button className="btn-red" onClick={start} disabled={busy} style={{ ...primaryButton, width: "100%" }}>{busy ? "Starting…" : "Start planning"}</button>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {ready && table && session && <Conversation key={session.id} session={session} setSession={setSession} table={table} />}
      <TabBar />
    </AppShell>
  );
}
