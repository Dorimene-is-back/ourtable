import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import { setScope } from "./data";
import { supabase } from "./supabase";

const AuthContext = createContext(null);
const RETURN_KEY = "tambouille:returnTo";

// Signing in leaves the app (Google, or a link in an email) and comes back to the home page.
// Remember where the person was so they land back there.
function rememberPlace() {
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ path: window.location.pathname + window.location.search, at: Date.now() }));
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

async function loadAccount(userId) {
  const [profile, memberships] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("kitchen_members").select("kitchen_id, role, status, kitchens(id, name, weeks_public)").eq("user_id", userId),
  ]);
  const rows = memberships.data || [];
  return {
    profile: profile.data || null,
    membership: rows.find((m) => m.status === "active") || null,
    request: rows.find((m) => m.status === "requested") || null,
  };
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [account, setAccount] = useState({ userId: null, profile: null, membership: null, request: null });
  const [signIn, setSignIn] = useState(null); // { reason } while the sign-in sheet is open

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
  const reload = useCallback(async () => {
    if (!userId) {
      setAccount({ userId: null, profile: null, membership: null, request: null });
      setScope(null);
      return;
    }
    const next = await loadAccount(userId);
    setAccount({ userId, ...next });
    setScope(next.membership?.kitchen_id ?? null);
  }, [userId]);

  useEffect(() => {
    if (sessionLoaded) reload();
  }, [sessionLoaded, reload]);

  // Back from signing in: return to the screen they left.
  useEffect(() => {
    if (!sessionLoaded || !userId) return;
    const path = takePlace();
    if (path && path !== location.pathname + location.search) navigate(path, { replace: true });
    setSignIn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded, userId]);

  const value = useMemo(() => {
    const ready = sessionLoaded && account.userId === userId;
    const membership = ready ? account.membership : null;
    return {
      user,
      ready,
      loading: !ready,
      profile: ready ? account.profile : null,
      kitchen: membership?.kitchens ?? null,
      kitchenId: membership?.kitchen_id ?? null,
      isHead: membership?.role === "head",
      request: ready ? account.request : null,
      reload,
      // Opens the sign-in sheet. Returns true when already signed in, so callers can carry on.
      requireUser(reason) {
        if (user) return true;
        setSignIn({ reason });
        return false;
      },
      openSignIn: (reason) => setSignIn({ reason }),
      async signInWithGoogle() {
        rememberPlace();
        await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      },
      async signInWithMagicLink(email) {
        rememberPlace();
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
        return { error };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    };
  }, [user, userId, sessionLoaded, account, reload]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signIn && !user && <AuthModal reason={signIn.reason} onClose={() => setSignIn(null)} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
