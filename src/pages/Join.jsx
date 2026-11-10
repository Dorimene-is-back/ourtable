import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, ErrorNote, Logo, Message, RedHeader, outlineButton, primaryButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { joinKitchen, previewInvite } from "../lib/social";

// Where an invite link lands: says which kitchen, then joins once the person is signed in.
export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, ready, kitchen, reload, requireUser } = useAuth();
  const [invite, setInvite] = useState(undefined); // undefined = loading, null = unknown code
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    previewInvite(code).then(setInvite, () => setInvite(null));
  }, [code]);

  const join = async () => {
    if (!requireUser(`Sign in to join the ${invite.kitchen_name} kitchen.`)) return;
    setBusy(true);
    setError("");
    try {
      const joined = await joinKitchen(code);
      await reload();
      if (joined.status === "active") navigate("/kitchen", { replace: true });
      else setResult(joined.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <RedHeader><Logo /></RedHeader>
      {invite === undefined && <Message>Loading…</Message>}
      {invite === null && (
        <div style={{ padding: "24px 20px 0" }}>
          <h1 style={{ fontWeight: 800, fontSize: 30, letterSpacing: -1.2 }}>This invite isn't recognised</h1>
          <p style={{ margin: "8px 0 20px", fontSize: 17, lineHeight: 1.45, color: "var(--muted)" }}>Ask the person who sent it for a new link.</p>
          <Link to="/" style={outlineButton}>Go to Tambouille</Link>
        </div>
      )}
      {invite && (
        <div style={{ padding: "24px 20px 0" }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.05, letterSpacing: -1.3 }}>Join the {invite.kitchen_name} kitchen</h1>
          {result === "requested" ? (
            <p style={{ marginTop: 12, fontSize: 17, lineHeight: 1.45 }}>Your request is in. You'll see the kitchen's weeks as soon as its head approves you.</p>
          ) : (
            <>
              <p style={{ margin: "10px 0 20px", fontSize: 17, lineHeight: 1.45, color: "var(--muted)" }}>
                {invite.status === "valid"
                  ? "You'll share its weekly plan, shopping list, recipes and reviews."
                  : "This link has expired, so the head of the kitchen will need to approve your request."}
              </p>
              {ready && kitchen && kitchen.name !== invite.kitchen_name
                ? <p style={{ fontSize: 16, lineHeight: 1.45 }}>You already belong to the {kitchen.name} kitchen. Leave it from <Link to="/kitchen" style={{ textDecoration: "underline", fontWeight: 600 }}>your kitchen page</Link> before joining another.</p>
                : (
                  <button className="btn-red" onClick={join} disabled={busy || !ready} style={{ ...primaryButton, width: "100%" }}>
                    {busy ? "Joining…" : !user ? "Sign in to join" : invite.status === "valid" ? "Join" : "Ask to join"}
                  </button>
                )}
              <ErrorNote>{error}</ErrorNote>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
