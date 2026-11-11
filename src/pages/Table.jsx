import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { JoinTableForm, NewTableForm, useAction } from "../components/Tables";
import { AppShell, Avatar, BackButton, Choice, ErrorNote, Message, RedHeader, Sheet, fieldStyle, labelStyle, outlineButton, primaryButton, textButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { createInvite, deleteConvive, fetchConvives, fetchHouseRules, fetchInvite, fetchMembers, inviteLink, removeMember, respondToRequest, saveConvive, saveHouseRules, updateKitchen, updateProfile } from "../lib/social";

const sectionTitle = { fontWeight: 800, fontSize: 22, letterSpacing: -0.8 };
const row = { display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0", borderBottom: "2px solid var(--line)" };
const smallButton = { minHeight: 44, padding: "0 14px", borderRadius: 12, border: "2px solid var(--ink)", background: "var(--white)", fontSize: 15, fontWeight: 800 };

function YourName() {
  const { user, profile, reload } = useAuth();
  const [name, setName] = useState(profile?.display_name || "");
  const { busy, error, run } = useAction();
  const changed = name.trim() && name.trim() !== (profile?.display_name || "");
  return (
    <section style={{ paddingTop: 20 }}>
      <label htmlFor="display-name" style={labelStyle}>Your name</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" style={fieldStyle} />
        {changed && <button onClick={() => run(async () => { await updateProfile(user.id, { display_name: name.trim() }); await reload(); })} disabled={busy} style={smallButton}>Save</button>}
      </div>
      <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>Shown to the people at your tables, and on reviews you share with everyone. Signed in as {user.email}.</p>
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

// No table yet: start one, or join with a code.
function Start() {
  const { requests } = useAuth();
  return (
    <>
      {requests.map((t) => (
        <p key={t.id} style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "var(--chip)", fontSize: 16, lineHeight: 1.4 }}>
          You've asked to join <strong>{t.name}</strong>. Its head needs to approve you.
        </p>
      ))}
      <section style={{ paddingTop: 24 }}>
        <h2 style={sectionTitle}>Start a table</h2>
        <p style={{ margin: "4px 0 12px", fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>A table is the people you plan and eat with: your home, a holiday with friends. Each has its own weeks, shopping and calendar. Your recipes, favourites and reviews follow you to every table.</p>
        <NewTableForm />
      </section>
      <section style={{ paddingTop: 28 }}>
        <h2 style={sectionTitle}>Join a table</h2>
        <div style={{ marginTop: 12 }}><JoinTableForm /></div>
      </section>
    </>
  );
}

const summary = (c) => [c.kind === "child" ? "Child" : "Adult", c.allergies && `allergies: ${c.allergies}`, c.likes && `likes ${c.likes}`, c.dislikes && `no ${c.dislikes}`].filter(Boolean).join(" · ");
const NEW_CONVIVE = { name: "", kind: "adult", birth_year: "", likes: "", dislikes: "", allergies: "", notes: "" };

function ConviveSheet({ table, convive, onClose, onChanged }) {
  const [form, setForm] = useState({ ...NEW_CONVIVE, ...convive, birth_year: convive.birth_year || "" });
  const { busy, error, run } = useAction();
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e?.target ? e.target.value : e }));
  const field = (key, label, placeholder) => (
    <div style={{ marginTop: 14 }}>
      <label htmlFor={`convive-${key}`} style={labelStyle}>{label}</label>
      <input id={`convive-${key}`} value={form[key]} onChange={set(key)} maxLength={1000} placeholder={placeholder} style={fieldStyle} />
    </div>
  );
  return (
    <Sheet
      title={convive.id ? convive.name : "Add someone"}
      onClose={onClose}
      footer={
        <>
          <button className="btn-red" disabled={busy || !form.name.trim()} onClick={() => run(async () => { await saveConvive(table.id, form); onChanged(); onClose(); })} style={{ ...primaryButton, width: "100%", opacity: form.name.trim() ? 1 : 0.5 }}>{busy ? "Saving…" : "Save"}</button>
          <ErrorNote>{error}</ErrorNote>
        </>
      }
    >
      <label htmlFor="convive-name" style={labelStyle}>Name</label>
      <input id="convive-name" value={form.name} onChange={set("name")} maxLength={40} style={fieldStyle} />
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 120px", gap: 12, alignItems: "end" }}>
        <Choice label="Adult or child" value={form.kind} onChange={set("kind")} options={[["adult", "Adult"], ["child", "Child"]]} />
        <div>
          <label htmlFor="convive-year" style={labelStyle}>Born in</label>
          <input id="convive-year" type="number" inputMode="numeric" value={form.birth_year} onChange={set("birth_year")} placeholder="Year" style={{ ...fieldStyle, minHeight: 52 }} />
        </div>
      </div>
      {field("likes", "Likes", "Fish, crispy things, black olives")}
      {field("dislikes", "Doesn't eat", "Mushrooms, creamy sauces")}
      {field("allergies", "Allergies", "None")}
      {field("notes", "Anything else", "Mild food only")}
      {convive.id && <button onClick={() => window.confirm(`Remove ${convive.name} from this table's convives?`) && run(async () => { await deleteConvive(convive.id); onChanged(); onClose(); })} style={{ ...textButton, marginTop: 8, color: "var(--muted)" }}>Remove</button>}
    </Sheet>
  );
}

// Who eats at this table. The planning assistant plans for everyone listed here.
function Convives({ table }) {
  const [convives, setConvives] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => fetchConvives(table.id).then(setConvives, () => setConvives([]));
  useEffect(() => { setConvives(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table.id]);
  return (
    <section style={{ paddingTop: 24 }}>
      <h2 style={sectionTitle}>Convives</h2>
      <p style={{ marginTop: 4, fontSize: 15, lineHeight: 1.4, color: "var(--muted)" }}>Who eats at this table. Plans are made for everyone here unless you say otherwise that week.</p>
      {convives?.map((c) => (
        <button key={c.id} onClick={() => setEditing(c)} style={{ ...row, width: "100%", border: "none", borderBottom: "2px solid var(--line)", background: "none", textAlign: "left", color: "var(--ink)" }}>
          <Avatar profile={{ display_name: c.name }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 17, fontWeight: 600 }}>{c.name}</span>
            <span style={{ display: "block", fontSize: 14, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary(c)}</span>
          </span>
        </button>
      ))}
      {convives && !convives.length && <p style={{ padding: "12px 0 4px", fontSize: 16 }}>Nobody yet. Add them here, or tell the assistant in the Plan tab and it will fill this in.</p>}
      <button onClick={() => setEditing(NEW_CONVIVE)} style={{ ...outlineButton, width: "100%", marginTop: 12 }}>Add someone</button>
      {editing && <ConviveSheet table={table} convive={editing} onClose={() => setEditing(null)} onChanged={load} />}
    </section>
  );
}

function HouseRules({ table }) {
  const [saved, setSaved] = useState(null);
  const [body, setBody] = useState("");
  const { busy, error, run } = useAction();
  useEffect(() => {
    setSaved(null);
    fetchHouseRules(table.id).then((text) => { setSaved(text); setBody(text); }, () => setSaved(""));
  }, [table.id]);
  return (
    <section style={{ paddingTop: 28 }}>
      <label htmlFor="house-rules" style={{ ...sectionTitle, display: "block" }}>House rules</label>
      <p style={{ margin: "4px 0 10px", fontSize: 15, lineHeight: 1.4, color: "var(--muted)" }}>What the assistant follows every week: what you never eat, how soon a dish may come back, how a week is built, where recipes should come from.</p>
      <textarea id="house-rules" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={8000} disabled={saved === null} placeholder={"One fish night a week\nNo mushrooms\nAt least six weeks before a dish comes back"} style={{ ...fieldStyle, resize: "vertical" }} />
      {saved !== null && body !== saved && <button className="btn-red" disabled={busy} onClick={() => run(async () => { await saveHouseRules(table.id, body); setSaved(body); })} style={{ ...primaryButton, width: "100%", marginTop: 10 }}>{busy ? "Saving…" : "Save house rules"}</button>}
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

function Invite({ table }) {
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => { fetchInvite(table.id).then(setInvite); }, [table.id]);

  const share = async () => {
    const url = inviteLink(invite.code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tambouille", text: `Join our table "${table.name}" on Tambouille`, url });
        return;
      } catch {
        // Share sheet closed: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <section style={{ paddingTop: 28 }}>
      <h2 style={sectionTitle}>Invite someone</h2>
      {invite ? (
        <>
          <p style={{ marginTop: 6, fontSize: 16, lineHeight: 1.4 }}>Send this link. Whoever opens it and signs in joins this table and can plan, shop and cook with you.</p>
          <p style={{ marginTop: 10, padding: "12px 14px", borderRadius: 14, background: "var(--chip)", fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>{invite.code}</p>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>Works until {new Date(invite.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. After that, people who use it ask to join and you approve them.</p>
          <button className="btn-red" onClick={share} style={{ ...primaryButton, width: "100%", marginTop: 12 }}>{copied ? "Link copied" : "Share invite link"}</button>
          <button onClick={() => run(async () => setInvite({ code: await createInvite(table.id), expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }))} disabled={busy} style={textButton}>Make a new code (the old one stops working)</button>
        </>
      ) : (
        <>
          <p style={{ marginTop: 6, fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>Create a link to send to the people you cook with.</p>
          <button className="btn-red" onClick={() => run(async () => setInvite({ code: await createInvite(table.id), expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }))} disabled={busy} style={{ ...primaryButton, width: "100%", marginTop: 12 }}>Create invite link</button>
        </>
      )}
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

function People({ table }) {
  const { user, isHead, reload } = useAuth();
  const [members, setMembers] = useState(null);
  const { busy, error, run } = useAction();
  const load = () => fetchMembers(table.id).then(setMembers);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table.id]);

  const act = (action) => run(async () => { await action(); await load(); });
  const leave = () => window.confirm(`Leave ${table.name}?`) && run(async () => { await removeMember(table.id, user.id); await reload(); });
  const requests = (members || []).filter((m) => m.status === "requested");
  const active = (members || []).filter((m) => m.status === "active");
  const nameOf = (m) => m.profile?.display_name || "Someone";

  return (
    <>
      {isHead && requests.length > 0 && (
        <section style={{ paddingTop: 24 }}>
          <h2 style={sectionTitle}>Asking to join</h2>
          {requests.map((m) => (
            <div key={m.user_id} style={row}>
              <Avatar profile={m.profile} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600 }}>{nameOf(m)}</span>
              <button onClick={() => act(() => respondToRequest(table.id, m.user_id, false))} disabled={busy} style={{ ...smallButton, border: "2px solid var(--line)" }}>Decline</button>
              <button onClick={() => act(() => respondToRequest(table.id, m.user_id, true))} disabled={busy} className="btn-red" style={{ ...smallButton, border: "2px solid var(--tomato)", background: "var(--tomato)", color: "var(--white)" }}>Approve</button>
            </div>
          ))}
        </section>
      )}
      <section style={{ paddingTop: 24 }}>
        <h2 style={sectionTitle}>People</h2>
        {!members && <p style={{ padding: "12px 0", color: "var(--muted)" }}>Loading…</p>}
        {active.map((m) => (
          <div key={m.user_id} style={row}>
            <Avatar profile={m.profile} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600 }}>{nameOf(m)}{m.user_id === user.id ? " (you)" : ""}</span>
            {m.role === "head" && <span style={{ fontSize: 14, color: "var(--muted)" }}>Head</span>}
            {isHead && m.user_id !== user.id && (
              <button onClick={() => window.confirm(`Remove ${nameOf(m)} from this table?`) && act(() => removeMember(table.id, m.user_id))} disabled={busy} style={{ ...smallButton, border: "2px solid var(--line)" }}>Remove</button>
            )}
          </div>
        ))}
        <ErrorNote>{error}</ErrorNote>
        <button onClick={leave} style={{ ...textButton, marginTop: 6, color: "var(--muted)" }}>Leave this table</button>
      </section>
    </>
  );
}

function Visibility({ table }) {
  const { reload } = useAuth();
  const { error, run } = useAction();
  return (
    <section style={{ paddingTop: 28 }}>
      <h2 style={sectionTitle}>Who can see your weeks</h2>
      <p style={{ margin: "6px 0 10px", fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>With "Anyone", your plan opens without signing in, handy on a shared tablet. With "Table only", each person signs in first.</p>
      <Choice label="Who can see your weeks" value={table.weeks_public} onChange={(open) => run(async () => { await updateKitchen(table.id, { weeks_public: open }); await reload(); })} options={[[true, "Anyone"], [false, "Table only"]]} />
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

export default function Table() {
  const { user, ready, profile, table, isHead, openSignIn, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <RedHeader style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton fallback="/" label="Back" />
        <h1 style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 28, lineHeight: 1.05, letterSpacing: -1.2 }}>{table ? table.name : "My table"}</h1>
      </RedHeader>
      {!ready && <Message>Loading…</Message>}
      {ready && !user && (
        <div style={{ padding: "0 20px" }}>
          <p style={{ padding: "24px 0 16px", fontSize: 17, lineHeight: 1.45 }}>Sign in to plan weeks with your household, add your own recipes, save favourites and review what you cook.</p>
          <button className="btn-red" onClick={() => openSignIn()} style={{ ...primaryButton, width: "100%" }}>Sign in</button>
        </div>
      )}
      {ready && user && (
        <main style={{ padding: "0 20px" }}>
          {table ? (
            <>
              <Convives table={table} />
              <HouseRules table={table} />
              <People table={table} />
              {isHead && <Invite table={table} />}
              {isHead && <Visibility table={table} />}
            </>
          ) : <Start />}
          <YourName key={profile?.display_name ?? user.id} />
          <button onClick={async () => { await signOut(); navigate("/"); }} style={{ ...outlineButton, width: "100%", marginTop: 28 }}>Sign out</button>
        </main>
      )}
    </AppShell>
  );
}
