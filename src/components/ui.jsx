import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function AppShell({ children, withTabBar = false }) {
  return (
    <div style={{ maxWidth: 500, margin: "0 auto", minHeight: "100dvh", background: "var(--white)", paddingBottom: withTabBar ? "calc(120px + var(--safe-bottom))" : "calc(40px + var(--safe-bottom))" }}>
      {children}
    </div>
  );
}

export function RedHeader({ children, style }) {
  return (
    <header className="on-red" style={{ background: "var(--tomato)", color: "var(--white)", padding: "calc(var(--safe-top) + 14px) 20px 14px", ...style }}>
      {children}
    </header>
  );
}

export function Logo() {
  return (
    <Link to="/" aria-label="Tambouille, home" style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 44 }}>
      <img src="/brand/bowl-white.png" alt="" style={{ width: 34, height: "auto", display: "block" }} />
      <span style={{ fontWeight: 800, fontSize: 27, lineHeight: 1, letterSpacing: -1 }}>tambouille</span>
    </Link>
  );
}

export function SmallBowl() {
  return <img src="/brand/bowl-white.png" alt="" style={{ width: 32, height: "auto", display: "block", flexShrink: 0 }} />;
}

// Goes back when the app has history, otherwise to the parent screen (for shared or reloaded links).
export function BackButton({ fallback, label, style }) {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate(fallback, { replace: true }));
  return (
    <button onClick={goBack} aria-label={label} style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--white)", color: "var(--tomato)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...style }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
  );
}

export function Chevron({ size = 16, stroke = 2.6 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>;
}

// Recipe photo with a flat placeholder when the image is missing or blocked by the source site.
export function Photo({ src, size, radius = 0, height, placeholder = "var(--line)", style }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size ?? "100%", height: height ?? size ?? "100%", borderRadius: radius, background: placeholder, flexShrink: 0, display: "block", ...style };
  if (!src || failed) return <div style={box} />;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ ...box, objectFit: "cover" }} />;
}

const TABS = [
  { to: "/", label: "Week", icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { to: "/shopping", label: "Shopping", icon: <><path d="M4 9h16l-1.5 10a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></> },
  { to: "/weeks", label: "Past weeks", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
];

export function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", width: "min(calc(100% - 40px), 460px)", bottom: "calc(16px + var(--safe-bottom))", height: 66, borderRadius: 24, background: "var(--white)", border: "2px solid var(--line)", boxShadow: "0 10px 28px rgba(26,15,12,0.14)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px", zIndex: 10 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link key={tab.to} to={tab.to} aria-current={active ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 70, minHeight: 50, padding: "6px 10px", justifyContent: "center", color: active ? "var(--tomato)" : "var(--muted)", fontSize: 13, fontWeight: active ? 800 : 500 }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tab.icon}</svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Message({ children }) {
  return <p style={{ padding: "24px 20px", fontSize: 16, color: "var(--muted)" }}>{children}</p>;
}
