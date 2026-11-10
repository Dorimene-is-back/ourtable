import { useEffect, useState } from "react";
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
  { to: "/recipes", label: "Recipes", icon: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></> },
  { to: "/weeks", label: "All weeks", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
];

// Slides away while scrolling down and returns on scroll up, to free the screen on long lists.
function useHiddenOnScrollDown(enabled) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 40);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);
  return hidden;
}

export function TabBar({ hideOnScroll = false }) {
  const { pathname } = useLocation();
  const hidden = useHiddenOnScrollDown(hideOnScroll);
  return (
    <nav aria-label="Main" style={{ position: "fixed", left: "50%", transform: `translate(-50%, ${hidden ? "calc(100% + 40px)" : "0"})`, transition: "transform 0.2s ease", width: "min(calc(100% - 40px), 460px)", bottom: "calc(16px + var(--safe-bottom))", height: 66, borderRadius: 24, background: "var(--white)", border: "2px solid var(--line)", boxShadow: "0 10px 28px rgba(26,15,12,0.14)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px", zIndex: 10 }}>
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link key={tab.to} to={tab.to} aria-current={active ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1, minWidth: 0, minHeight: 50, padding: "6px 2px", justifyContent: "center", color: active ? "var(--tomato)" : "var(--muted)", fontSize: 13, fontWeight: active ? 800 : 500 }}>
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

// Bottom sheet, as on shopping sites: slides over the page, tap outside to close.
export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(26,15,12,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, maxHeight: "90dvh", display: "flex", flexDirection: "column", background: "var(--white)", color: "var(--ink)", borderRadius: "24px 24px 0 0", paddingBottom: "var(--safe-bottom)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 8px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, border: "none", borderRadius: 999, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 20px 12px" }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px 16px", borderTop: "2px solid var(--line)" }}>{footer}</div>}
      </div>
    </div>
  );
}

const STAR = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";

export function Star({ size = 16, filled = true }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ flexShrink: 0, opacity: filled ? 1 : 0.35 }}>
      <path d={STAR} />
    </svg>
  );
}

// Five stars showing a rating, read out as one label.
export function Stars({ value, size = 16 }) {
  const rounded = Math.round(value || 0);
  return (
    <span role="img" aria-label={`${value} out of 5`} style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} filled={n <= rounded} />)}
    </span>
  );
}

// Five large stars to tap. Tapping the current rating clears it.
export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rating" style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} ${n === 1 ? "star" : "stars"}`} onClick={() => onChange(value === n ? 0 : n)} style={{ width: 52, height: 52, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
          <Star size={36} filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

export function HeartIcon({ filled, size = 22 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  );
}

export function Avatar({ profile, size = 40 }) {
  const name = profile?.display_name || "";
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: "var(--chip)", color: "var(--ink)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.42, fontWeight: 800 }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (name[0] || "?").toUpperCase()}
    </span>
  );
}

// Shared control styles.
export const primaryButton = { minHeight: 56, padding: "0 20px", border: "2px solid var(--tomato)", borderRadius: 16, background: "var(--tomato)", color: "var(--white)", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 };
export const outlineButton = { minHeight: 56, padding: "0 20px", border: "2px solid var(--ink)", borderRadius: 16, background: "var(--white)", color: "var(--ink)", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 };
export const textButton = { minHeight: 44, padding: 0, border: "none", background: "none", color: "var(--ink)", fontSize: 15, fontWeight: 600, textDecoration: "underline", textAlign: "left" };
export const fieldStyle = { width: "100%", minHeight: 48, padding: "11px 14px", border: "2px solid var(--line)", borderRadius: 14, background: "var(--white)", color: "var(--ink)", font: "inherit", fontSize: 16, lineHeight: 1.4 };
export const labelStyle = { display: "block", marginBottom: 6, fontSize: 15, fontWeight: 800 };

// Two or three choices side by side, one always picked.
export function Choice({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 4, background: "var(--chip)", borderRadius: 14, padding: 4 }}>
      {options.map(([id, text]) => {
        const on = value === id;
        return (
          <button key={String(id)} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)} style={{ flex: 1, minHeight: 44, padding: "0 6px", border: "none", borderRadius: 10, background: on ? "var(--white)" : "transparent", color: "var(--ink)", fontSize: 15, fontWeight: on ? 800 : 500, boxShadow: on ? "0 1px 4px rgba(26,15,12,0.12)" : "none" }}>
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p role="alert" style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "var(--tomato-dark)" }}>{children}</p>;
}
