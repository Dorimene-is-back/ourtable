import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import { setScope } from "./data";
import { supabase } from "./supabase";

const AuthContext = createContext(null);
const RETURN_KEY = "tambouille:returnTo";

// Signing in leaves the app (Google, or a link in an email) and comes back to the home page.
// Remember where the person was so they land back there.
function rememberPlace(path) {
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ path: path || window.location.pathname + window.location.search, at: Date.now() }));
  } catch {
    // Private browsing: they return to the home page.
  }
}

function takePlace() {
  try {
    const saved = JSON.parse(localStorage.getItem(RETURN_KEY));
    localStorage.removeItem(RETURN_KEY);
    return saved && Date.now() - saved.at < 30 * 60 * 1000 ? saved.path : null;
  } catch {
    return null;
  }
}

// A "table" is a group of people who plan and eat together: home, a holiday with friends.
// (The database calls it a kitchen.) A person can sit at several and looks at one at a time.
const tableKey = (userId) => `tambouille:table:${userId}`;

function rememberedTable(userId) {
  try { return localStorage.getItem(tableKey(userId)); } catch { return null; }
}

async function loadAccount(userId) {
  const [profile, memberships] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("kitchen_members").select("kitchen_id, role, status, created_at, kitchens(id, name, weeks_public)").eq("user_id", userId).order("created_at"),
  ]);
  const rows = (memberships.data || []).filter((m) => m.kitchens);
  return {
    profile: profile.data || null,
    tables: rows.filter((m) => m.status === "active").map((m) => ({ ...m.kitchens, role: m.role })),
    requests: rows.filter((m) => m.status === "requested").map((m) => m.kitchens),
  };
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [account, setAccount] = useState({ userId: null, profile: null, tables: [], requests: [], tableId: null });
  const [signIn, setSignIn] = useState(null); // { reason, returnTo } while the sign-in sheet is open

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => (prev?.id === session?.user?.id ? prev : session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;
  // prefer: the table to look at afterwards (one just created or joined).
  const reload = useCallback(async (prefer) => {
    if (!userId) {
      setAccount({ userId: null, profile: null, tables: [], requests: [], tableId: null });
      setScope(null);
      return;
    }
    const next = await loadAccount(userId);
    const wanted = typeof prefer === "string" ? prefer : rememberedTable(userId);
    const tableId = (next.tables.find((t) => t.id === wanted) || next.tables[0])?.id ?? null;
    setAccount({ userId, ...next, tableId });
    setScope(tableId);
  }, [userId]);

  const switchTable = useCallback((tableId) => {
    try { localStorage.setItem(tableKey(userId), tableId); } catch { /* stays for this visit only */ }
    setAccount((prev) => ({ ...prev, tableId }));
    setScope(tableId);
  }, [userId]);

  useEffect(() => {
    if (sessionLoaded) reload();
  }, [sessionLoaded, reload]);

  // Back from signing in: return to the screen they left.
  useEffect(() => {
    if (!sessionLoaded || !userId) return;
    const path = takePlace();
    if (path && path !== location.pathname + location.search + location.hash) navigate(path, { replace: true });
    setSignIn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded, userId]);

  const value = useMemo(() => {
    const ready = sessionLoaded && account.userId === userId;
    const tables = ready ? account.tables : [];
    const table = tables.find((t) => t.id === account.tableId) || null;
    return {
      user,
      ready,
      loading: !ready,
      profile: ready ? account.profile : null,
      tables,
      table,
      tableId: table?.id ?? null,
      isHead: table?.role === "head",
      requests: ready ? account.requests : [],
      reload,
      switchTable,
      // Opens the sign-in sheet. Returns true when already signed in, so callers can carry on.
      // returnTo: where to land after signing in, when that is not the current screen
      // (the form the person was heading to, or a spot further down this page).
      requireUser(reason, returnTo) {
        if (user) return true;
        setSignIn({ reason, returnTo });
        return false;
      },
      openSignIn: (reason) => setSignIn({ reason }),
      async signInWithGoogle() {
        rememberPlace(signIn?.returnTo);
        await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      },
      async signInWithMagicLink(email) {
        rememberPlace(signIn?.returnTo);
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
        return { error };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    };
  }, [user, userId, sessionLoaded, account, reload, switchTable, signIn]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signIn && !user && <AuthModal reason={signIn.reason} onClose={() => setSignIn(null)} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
