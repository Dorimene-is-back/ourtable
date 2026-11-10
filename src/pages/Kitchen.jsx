import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, Avatar, BackButton, Choice, ErrorNote, Message, RedHeader, fieldStyle, labelStyle, outlineButton, primaryButton, textButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { createInvite, createKitchen, fetchInvite, fetchMembers, inviteLink, joinKitchen, removeMember, respondToRequest, updateKitchen, updateProfile } from "../lib/social";

const sectionTitle = { fontWeight: 800, fontSize: 22, letterSpacing: -0.8 };
const row = { display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0", borderBottom: "2px solid var(--line)" };
const smallButton = { minHeight: 44, padding: "0 14px", borderRadius: 12, border: "2px solid var(--ink)", background: "var(--white)", fontSize: 15, fontWeight: 800 };

// Runs an action, showing its error under the section it belongs to.
function useAction() {
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
      <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>Shown to your kitchen, and on reviews you share with everyone. Signed in as {user.email}.</p>
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

// No kitchen yet: start one, or join with a code.
function Start() {
  const { request, reload } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const create = useAction();
  const join = useAction();

  return (
    <>
      {request && (
        <p style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "var(--chip)", fontSize: 16, lineHeight: 1.4 }}>
          You've asked to join the <strong>{request.kitchens?.name}</strong> kitchen. Its head needs to approve you.
        </p>
      )}
      <section style={{ paddingTop: 24 }}>
        <h2 style={sectionTitle}>Start a kitchen</h2>
        <p style={{ marginTop: 4, fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>A kitchen is the people you cook for and plan with. It holds your weeks, your recipes and your reviews.</p>
        <form onSubmit={(e) => { e.preventDefault(); create.run(async () => { await createKitchen(name); await reload(); }); }} style={{ marginTop: 12 }}>
          <label htmlFor="kitchen-name" style={labelStyle}>Kitchen name</label>
          <input id="kitchen-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="The Martins" style={fieldStyle} />
          <button type="submit" className="btn-red" disabled={create.busy || !name.trim()} style={{ ...primaryButton, width: "100%", marginTop: 10, opacity: name.trim() ? 1 : 0.5 }}>Start my kitchen</button>
          <ErrorNote>{create.error}</ErrorNote>
        </form>
      </section>
      <section style={{ paddingTop: 28 }}>
        <h2 style={sectionTitle}>Join a kitchen</h2>
        <form onSubmit={(e) => { e.preventDefault(); join.run(async () => { await joinKitchen(code); await reload(); }); }} style={{ marginTop: 12 }}>
          <label htmlFor="invite-code" style={labelStyle}>Invite code</label>
          <input id="invite-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ZUZU-1A2B3C4D" autoCapitalize="characters" autoCorrect="off" autoComplete="off" style={fieldStyle} />
          <button type="submit" disabled={join.busy || !code.trim()} style={{ ...outlineButton, width: "100%", marginTop: 10, opacity: code.trim() ? 1 : 0.5 }}>Join</button>
          <ErrorNote>{join.error}</ErrorNote>
        </form>
      </section>
    </>
  );
}

function Invite({ kitchen }) {
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => { fetchInvite(kitchen.id).then(setInvite); }, [kitchen.id]);

  const share = async () => {
    const url = inviteLink(invite.code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tambouille", text: `Join the ${kitchen.name} kitchen on Tambouille`, url });
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
          <p style={{ marginTop: 6, fontSize: 16, lineHeight: 1.4 }}>Send this link. Whoever opens it and signs in joins your kitchen and can plan, cook and review with you.</p>
          <p style={{ marginTop: 10, padding: "12px 14px", borderRadius: 14, background: "var(--chip)", fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>{invite.code}</p>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>Works until {new Date(invite.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. After that, people who use it ask to join and you approve them.</p>
          <button className="btn-red" onClick={share} style={{ ...primaryButton, width: "100%", marginTop: 12 }}>{copied ? "Link copied" : "Share invite link"}</button>
          <button onClick={() => run(async () => setInvite({ code: await createInvite(kitchen.id), expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }))} disabled={busy} style={textButton}>Make a new code (the old one stops working)</button>
        </>
      ) : (
        <>
          <p style={{ marginTop: 6, fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>Create a link to send to the people you cook with.</p>
          <button className="btn-red" onClick={() => run(async () => setInvite({ code: await createInvite(kitchen.id), expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }))} disabled={busy} style={{ ...primaryButton, width: "100%", marginTop: 12 }}>Create invite link</button>
        </>
      )}
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

function People({ kitchen }) {
  const { user, isHead, reload } = useAuth();
  const [members, setMembers] = useState(null);
  const { busy, error, run } = useAction();
  const load = () => fetchMembers(kitchen.id).then(setMembers);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kitchen.id]);

  const act = (action) => run(async () => { await action(); await load(); });
  const leave = () => window.confirm(`Leave the ${kitchen.name} kitchen?`) && run(async () => { await removeMember(kitchen.id, user.id); await reload(); });
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
              <button onClick={() => act(() => respondToRequest(kitchen.id, m.user_id, false))} disabled={busy} style={{ ...smallButton, border: "2px solid var(--line)" }}>Decline</button>
              <button onClick={() => act(() => respondToRequest(kitchen.id, m.user_id, true))} disabled={busy} className="btn-red" style={{ ...smallButton, border: "2px solid var(--tomato)", background: "var(--tomato)", color: "var(--white)" }}>Approve</button>
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
              <button onClick={() => window.confirm(`Remove ${nameOf(m)} from the kitchen?`) && act(() => removeMember(kitchen.id, m.user_id))} disabled={busy} style={{ ...smallButton, border: "2px solid var(--line)" }}>Remove</button>
            )}
          </div>
        ))}
        <ErrorNote>{error}</ErrorNote>
        <button onClick={leave} style={{ ...textButton, marginTop: 6, color: "var(--muted)" }}>Leave this kitchen</button>
      </section>
    </>
  );
}

function Visibility({ kitchen }) {
  const { reload } = useAuth();
  const { error, run } = useAction();
  return (
    <section style={{ paddingTop: 28 }}>
      <h2 style={sectionTitle}>Who can see your weeks</h2>
      <p style={{ margin: "6px 0 10px", fontSize: 16, lineHeight: 1.4, color: "var(--muted)" }}>With "Anyone", your plan opens without signing in, handy on a shared tablet. With "Kitchen only", each person signs in first.</p>
      <Choice label="Who can see your weeks" value={kitchen.weeks_public} onChange={(open) => run(async () => { await updateKitchen(kitchen.id, { weeks_public: open }); await reload(); })} options={[[true, "Anyone"], [false, "Kitchen only"]]} />
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

export default function Kitchen() {
  const { user, ready, profile, kitchen, isHead, openSignIn, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <RedHeader style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton fallback="/" label="Back" />
        <h1 style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 28, lineHeight: 1.05, letterSpacing: -1.2 }}>{kitchen ? `${kitchen.name} kitchen` : "My kitchen"}</h1>
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
          {kitchen ? (
            <>
              <People kitchen={kitchen} />
              {isHead && <Invite kitchen={kitchen} />}
              {isHead && <Visibility kitchen={kitchen} />}
            </>
          ) : <Start />}
          <YourName key={profile?.display_name ?? user.id} />
          <button onClick={async () => { await signOut(); navigate("/"); }} style={{ ...outlineButton, width: "100%", marginTop: 28 }}>Sign out</button>
        </main>
      )}
    </AppShell>
  );
}
