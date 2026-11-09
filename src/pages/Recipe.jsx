import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell, BackButton, Chevron, Message, Photo } from "../components/ui";
import { fetchWeek, useLoad } from "../lib/data";
import { formatRemaining, useTimers } from "../lib/useTimers";
import { useWakeLock } from "../lib/useWakeLock";
import { dayDate, servingLabel, shortDate } from "../lib/weeks";

const isHeader = (row) => row.value.startsWith("—");
const headerText = (row) => row.value.replace(/^[—\s]+|[—\s]+$/g, "");
const timerLabel = (min) => `Start ${min} min timer`;

function ClockIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>;
}

function Ingredients({ rows }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(() => new Set());
  const count = rows.filter((r) => !isHeader(r)).length;
  const toggle = (id) => setChecked((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ marginTop: 14, width: "100%", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px", border: "2px solid var(--ink)", borderRadius: 16, background: "var(--white)" }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.6 }}>Ingredients</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--muted)" }}>{count} {count === 1 ? "item" : "items"}</span>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={open ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"} /></svg>
        </span>
      </button>
      {open && rows.map((row) => isHeader(row) ? (
        <h3 key={row.id} style={{ marginTop: 16, fontSize: 16, fontWeight: 800 }}>{headerText(row)}</h3>
      ) : (
        <label key={row.id} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 48, padding: "6px 0", borderBottom: "2px solid var(--line)", fontSize: 17, lineHeight: 1.3, cursor: "pointer" }}>
          <input type="checkbox" checked={checked.has(row.id)} onChange={() => toggle(row.id)} style={{ width: 24, height: 24, margin: 0, accentColor: "var(--tomato)", flexShrink: 0 }} />
          <span>{row.value}</span>
        </label>
      ))}
    </>
  );
}

function TimerButton({ step, timer, now, onStart, onClear }) {
  const running = timer && !timer.fired && timer.endAt > now;
  const label = !timer ? timerLabel(step.timer_minutes) : running ? formatRemaining(timer.endAt - now) : "Time’s up";
  const onClick = () => (timer ? onClear(step.id) : onStart(step.id, step.timer_minutes));
  return (
    <button onClick={onClick} aria-label={running ? `Stop timer, ${label} left` : undefined} style={{ alignSelf: "flex-start", minHeight: 46, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 16px", border: "none", borderRadius: 14, background: running ? "var(--ink)" : "var(--tomato-tint)", color: running ? "var(--white)" : "var(--tomato-dark)", fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
      <ClockIcon />
      {label}
    </button>
  );
}

function Method({ rows, timers }) {
  let number = 0;
  return (
    <ol style={{ padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 18 }}>
      {rows.map((row) => {
        if (isHeader(row)) return <li key={row.id}><h3 style={{ fontSize: 16, fontWeight: 800 }}>{headerText(row)}</h3></li>;
        number += 1;
        return (
          <li key={row.id} id={`step-${row.id}`} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, alignItems: "start", scrollMarginTop: 80 }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--tomato)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{number}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 3 }}>
              <span style={{ fontSize: 17, lineHeight: 1.5 }}>{row.value}</span>
              {row.timer_minutes > 0 && <TimerButton step={row} timer={timers.timers[row.id]} now={timers.now} onStart={timers.start} onClear={timers.clear} />}
              {row.meanwhile && <span style={{ fontSize: 15, lineHeight: 1.4 }}><strong style={{ color: "var(--tomato)" }}>Meanwhile:</strong> {row.meanwhile}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RunningPill({ timers }) {
  const running = Object.entries(timers.timers)
    .filter(([, t]) => !t.fired && t.endAt > timers.now)
    .sort((a, b) => a[1].endAt - b[1].endAt);
  if (!running.length) return null;
  const [stepId, timer] = running[0];
  const jump = () => document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <button onClick={jump} aria-label="Go to the running timer" style={{ position: "fixed", top: "calc(var(--safe-top) + 12px)", left: "50%", transform: "translateX(-50%)", zIndex: 20, minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px", border: "none", borderRadius: 999, background: "var(--ink)", color: "var(--white)", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", boxShadow: "0 6px 18px rgba(26,15,12,0.25)" }}>
      <ClockIcon />
      {formatRemaining(timer.endAt - timers.now)}
      {running.length > 1 && <span style={{ fontWeight: 500 }}>+{running.length - 1}</span>}
    </button>
  );
}

function RecipeView({ week, day, recipe }) {
  const timers = useTimers(recipe.id, recipe.title);
  const wakeLock = useWakeLock();

  return (
    <AppShell>
      <RunningPill timers={timers} />
      <div style={{ height: 200, position: "relative" }}>
        <Photo src={recipe.image} height={200} placeholder="var(--ink)" />
        <BackButton fallback={`/weeks/${week.id}`} label="Back" style={{ position: "absolute", top: "calc(var(--safe-top) + 12px)", left: 20 }} />
      </div>

      <div style={{ background: "var(--tomato)", color: "var(--white)", padding: "14px 20px 16px" }}>
        <p style={{ fontSize: 14, fontWeight: 600 }}>{day.day} {shortDate(dayDate(week.id, day)).split(" ").slice(1).join(" ")} · {servingLabel(recipe)}</p>
        <h1 style={{ marginTop: 2, fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: -1.2 }}>{recipe.title}</h1>
      </div>

      <article style={{ padding: "14px 20px 0" }}>
        {recipe.prep_ahead && <p style={{ fontSize: 16, lineHeight: 1.45 }}><strong style={{ color: "var(--tomato)" }}>Ahead:</strong> {recipe.prep_ahead}</p>}

        {recipe.ingredients.length > 0 && <Ingredients rows={recipe.ingredients} />}

        {recipe.steps.length > 0 && (
          <>
            <div style={{ margin: "22px 0 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>Method</h2>
              {wakeLock && <span style={{ fontSize: 13, color: "var(--muted)" }}>Screen stays on</span>}
            </div>
            <Method rows={recipe.steps} timers={timers} />
          </>
        )}

        {recipe.ref_url && (
          <a href={recipe.ref_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 2, marginTop: 18, minHeight: 44, fontSize: 15, fontWeight: 600, textDecoration: "underline" }}>
            Original recipe{recipe.ref ? ` · ${recipe.ref.replace(/^Adapted from\s+/i, "")}` : ""}<Chevron size={14} />
          </a>
        )}
      </article>
    </AppShell>
  );
}

export default function Recipe() {
  const { weekId, recipeId } = useParams();
  const { data: week, loading, error } = useLoad(() => fetchWeek(weekId), [weekId]);
  const day = week?.days.find((d) => d.recipes.some((r) => r.id === recipeId));
  const recipe = day?.recipes.find((r) => r.id === recipeId);

  if (recipe) return <RecipeView key={recipe.id} week={week} day={day} recipe={recipe} />;
  return (
    <AppShell>
      {loading && <Message>Loading…</Message>}
      {error && <Message>Couldn’t load this recipe.</Message>}
      {week && !recipe && <Message>This recipe isn’t in that week.</Message>}
    </AppShell>
  );
}
