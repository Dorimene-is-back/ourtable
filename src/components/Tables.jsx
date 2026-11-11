import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { createKitchen, joinKitchen } from "../lib/social";
import { ErrorNote, Sheet, fieldStyle, labelStyle, outlineButton, primaryButton, textButton } from "./ui";

// Runs an action, showing its error under the section it belongs to.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

// Start a table: the new one becomes the table you are looking at.
export function NewTableForm({ onDone, autoFocus }) {
  const { reload } = useAuth();
  const [name, setName] = useState("");
  const { busy, error, run } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => { await reload(await createKitchen(name)); onDone?.(); });
  };
  return (
    <form onSubmit={submit}>
      <label htmlFor="table-name" style={labelStyle}>Table name</label>
      <input id="table-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Home, Summer in Brittany" autoFocus={autoFocus} style={fieldStyle} />
      <button type="submit" className="btn-red" disabled={busy || !name.trim()} style={{ ...primaryButton, width: "100%", marginTop: 10, opacity: name.trim() ? 1 : 0.5 }}>{busy ? "Starting…" : "Start this table"}</button>
      <ErrorNote>{error}</ErrorNote>
    </form>
  );
}

export function JoinTableForm({ onDone, autoFocus }) {
  const { reload } = useAuth();
  const [code, setCode] = useState("");
  const [asked, setAsked] = useState(false);
  const { busy, error, run } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const joined = await joinKitchen(code);
      await reload(joined.status === "active" ? joined.kitchen_id : undefined);
      if (joined.status === "active") onDone?.();
      else setAsked(true);
    });
  };
  if (asked) return <p style={{ fontSize: 16, lineHeight: 1.4 }}>Your request is in. The table appears here once its head approves you.</p>;
  return (
    <form onSubmit={submit}>
      <label htmlFor="invite-code" style={labelStyle}>Invite code</label>
      <input id="invite-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ZUZU-1A2B3C4D" autoCapitalize="characters" autoCorrect="off" autoComplete="off" autoFocus={autoFocus} style={fieldStyle} />
      <button type="submit" disabled={busy || !code.trim()} style={{ ...outlineButton, width: "100%", marginTop: 10, opacity: code.trim() ? 1 : 0.5 }}>{busy ? "Joining…" : "Join"}</button>
      <ErrorNote>{error}</ErrorNote>
    </form>
  );
}

const rowStyle = { width: "100%", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0", border: "none", borderBottom: "2px solid var(--line)", background: "none", color: "var(--ink)", fontSize: 17, textAlign: "left" };

// Opened by the account button on every tab: switch table, start or join one, reach settings.
export function AccountSheet({ onClose }) {
  const { profile, user, tables, table, requests, switchTable, signOut } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(tables.length ? null : "new"); // null | "new" | "join"

  return (
    <Sheet title={profile?.display_name || user.email} onClose={onClose}>
      {tables.length > 0 && (
        <div role="radiogroup" aria-label="Your tables">
          {tables.map((t) => {
            const on = t.id === table?.id;
            return (
              <button key={t.id} role="radio" aria-checked={on} onClick={() => { if (!on) switchTable(t.id); onClose(); }} style={{ ...rowStyle, fontWeight: on ? 800 : 500 }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, border: on ? "7px solid var(--tomato)" : "2px solid var(--line)" }} />
              </button>
            );
          })}
        </div>
      )}
      {requests.map((t) => <p key={t.id} style={{ padding: "10px 0", fontSize: 15, color: "var(--muted)", borderBottom: "2px solid var(--line)" }}>{t.name}: waiting for approval</p>)}

      {adding === null && (
        <div style={{ display: "flex", gap: 18 }}>
          <button onClick={() => setAdding("new")} style={textButton}>New table</button>
          <button onClick={() => setAdding("join")} style={textButton}>Join with a code</button>
        </div>
      )}
      {adding !== null && (
        <div style={{ padding: "14px 0 4px" }}>
          {!tables.length && <p style={{ marginBottom: 12, fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>A table is the people you plan and eat with: your home, a holiday with friends. Each has its own weeks.</p>}
          {adding === "new" ? <NewTableForm onDone={onClose} autoFocus={tables.length > 0} /> : <JoinTableForm onDone={onClose} autoFocus />}
          <button onClick={() => setAdding(adding === "new" ? "join" : "new")} style={textButton}>{adding === "new" ? "Join with a code instead" : "Start a new table instead"}</button>
        </div>
      )}

      {table && <Link to="/table" onClick={onClose} style={{ ...outlineButton, marginTop: 16 }}>{table.name}: people and settings</Link>}
      <button onClick={async () => { onClose(); await signOut(); navigate("/"); }} style={{ ...textButton, marginTop: 6, color: "var(--muted)" }}>Sign out</button>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}
