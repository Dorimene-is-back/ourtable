import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { refreshData } from "../lib/data";
import { addRecipeToDay, addReview, deleteReview, fetchFavorites, fetchRatings, fetchReviews, setFavorite } from "../lib/social";
import { addDays, mondayOf, shortDate, startOfToday, toISO } from "../lib/weeks";
import { Avatar, Choice, ErrorNote, HeartIcon, Sheet, StarInput, Stars, fieldStyle, labelStyle, outlineButton, primaryButton, textButton } from "./ui";

// A dish's reviews, its average, and whether the person has saved it. reload() after a change.
export function useDish(dishId) {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState({ reviews: [], rating: null, saved: false, loaded: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!dishId || !ready) return undefined;
    let alive = true;
    Promise.all([fetchReviews(dishId), fetchRatings(), fetchFavorites(userId)])
      .then(([reviews, ratings, favorites]) => alive && setState({ reviews, rating: ratings.get(dishId) || null, saved: favorites.has(dishId), loaded: true }))
      .catch(() => alive && setState((prev) => ({ ...prev, loaded: true })));
    return () => { alive = false; };
  }, [dishId, userId, ready, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), setSaved: (saved) => setState((prev) => ({ ...prev, saved })) };
}

// Heart on the recipe photo. Signed out, it asks to sign in first.
export function FavoriteButton({ dishId, saved, onChange, style }) {
  const { user, requireUser } = useAuth();
  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireUser("Sign in to save your favourite recipes.")) return;
    onChange(!saved);
    try {
      await setFavorite(user.id, dishId, !saved);
    } catch {
      onChange(saved);
    }
  };
  return (
    <button onClick={toggle} aria-pressed={saved} aria-label={saved ? "Remove from favourites" : "Save to favourites"} style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--white)", color: saved ? "var(--tomato)" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...style }}>
      <HeartIcon filled={saved} />
    </button>
  );
}

function CameraIcon() {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></svg>;
}

const hidden = { position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" };

// The last thing on a recipe: photograph the dish and rate it. Needs an account.
export function Finished({ recipe, cookedOn, onSaved }) {
  const { requireUser } = useAuth();
  const camera = useRef(null);
  const library = useRef(null);
  const [draft, setDraft] = useState(null); // { file } while the review sheet is open
  const reason = "Sign in to add your photo and rating to this recipe.";
  // After signing in, come back to this block rather than the top of the recipe.
  const here = `${window.location.pathname}${window.location.search}#done`;
  const open = (input) => requireUser(reason, here) && input.current?.click();
  const picked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setDraft({ file });
  };

  return (
    <section id="done" style={{ marginTop: 28, padding: "18px 18px 12px", borderRadius: 20, background: "var(--chip)", scrollMarginTop: 20 }}>
      <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.8 }}>All done?</h2>
      <p style={{ marginTop: 4, fontSize: 16, lineHeight: 1.4 }}>Take a picture of your dish and say how it went.</p>
      <button className="btn-red" onClick={() => open(camera)} style={{ ...primaryButton, width: "100%", marginTop: 14 }}>
        <CameraIcon />
        Take a photo
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
        <button onClick={() => open(library)} style={textButton}>Choose a photo</button>
        <button onClick={() => requireUser(reason, here) && setDraft({ file: null })} style={textButton}>Rate without a photo</button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={picked} tabIndex={-1} aria-hidden="true" style={hidden} />
      <input ref={library} type="file" accept="image/*" onChange={picked} tabIndex={-1} aria-hidden="true" style={hidden} />
      {draft && <ReviewSheet recipe={recipe} cookedOn={cookedOn} file={draft.file} onRetake={() => camera.current?.click()} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); onSaved(); }} />}
    </section>
  );
}

function ReviewSheet({ recipe, cookedOn, file, onRetake, onClose, onSaved }) {
  const { user, tables, tableId } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const empty = !file && !rating && !comment.trim();
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await addReview({ userId: user.id, kitchenId: tableId, dishId: recipe.dish_id, recipeId: recipe.id, rating, comment, file, isPublic, cookedOn });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={recipe.title}
      onClose={onClose}
      footer={
        <>
          <button className="btn-red" onClick={save} disabled={saving || empty} style={{ ...primaryButton, width: "100%", opacity: saving || empty ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <ErrorNote>{error}</ErrorNote>
        </>
      }
    >
      {preview && (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <img src={preview} alt="Your photo" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 16, display: "block" }} />
          <button onClick={onRetake} style={{ position: "absolute", right: 10, bottom: 10, minHeight: 44, padding: "0 14px", border: "none", borderRadius: 999, background: "var(--white)", fontSize: 15, fontWeight: 800 }}>Retake</button>
        </div>
      )}
      <span style={labelStyle}>How was it?</span>
      <StarInput value={rating} onChange={setRating} />
      <label htmlFor="review-comment" style={{ ...labelStyle, marginTop: 12 }}>Notes for next time</label>
      <textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder="What worked, what to change" style={{ ...fieldStyle, resize: "vertical" }} />
      <span style={{ ...labelStyle, marginTop: 14 }}>Who can see this</span>
      <Choice label="Who can see this" value={isPublic} onChange={setIsPublic} options={[[false, tables.length ? "My tables" : "Only me"], [true, "Everyone"]]} />
    </Sheet>
  );
}

const longDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export function ReviewList({ reviews, onChanged }) {
  const { user, tables } = useAuth();
  const [busy, setBusy] = useState(null);
  const remove = async (review) => {
    if (!window.confirm("Delete this review?")) return;
    setBusy(review.id);
    try {
      await deleteReview(review);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {reviews.map((review) => {
        const mine = user && review.user_id === user.id;
        const name = review.author?.display_name || tables.find((t) => t.id === review.kitchen_id)?.name || "A cook";
        return (
          <li key={review.id} style={{ padding: "14px 0", borderBottom: "2px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar profile={review.author || { display_name: name }} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                <p style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {review.cooked_on ? `Cooked ${longDate(review.cooked_on)}` : longDate(review.created_at)}
                  {!review.is_public && " · Private"}
                </p>
              </div>
              {review.rating && <Stars value={review.rating} size={16} />}
            </div>
            {review.comment && <p style={{ marginTop: 8, fontSize: 16, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{review.comment}</p>}
            {review.photoUrl && <img src={review.photoUrl} alt={`${name}'s photo of this dish`} loading="lazy" style={{ marginTop: 10, width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 16, display: "block", background: "var(--line)" }} />}
            {mine && <button onClick={() => remove(review)} disabled={busy === review.id} style={{ ...textButton, marginTop: 4, color: "var(--muted)" }}>{busy === review.id ? "Deleting…" : "Delete"}</button>}
          </li>
        );
      })}
    </ul>
  );
}

// Pick a day in the next three weeks to cook this recipe. It is copied onto the current table's calendar.
export function AddToWeekSheet({ recipe, onClose }) {
  const { table } = useAuth();
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const today = startOfToday();
  const firstMonday = mondayOf(today);
  const weeks = [0, 1, 2].map((w) => ({
    label: w === 0 ? "This week" : w === 1 ? "Next week" : `Week of ${shortDate(addDays(firstMonday, 14)).split(" ").slice(1).join(" ")}`,
    days: [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(firstMonday, w * 7 + d)).filter((d) => d >= today),
  }));

  const add = async (date) => {
    setBusy(toISO(date));
    setError("");
    try {
      const result = await addRecipeToDay(recipe.id, toISO(date), table.id);
      refreshData();
      setDone({ date, weekId: result.week_id });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!table) {
    return (
      <Sheet title="Add to a week" onClose={onClose}>
        <p style={{ fontSize: 16, lineHeight: 1.45 }}>Weeks belong to a table: the people you plan and eat with. Start yours, or join one with an invite code.</p>
        <Link to="/table" className="btn-red" style={{ ...primaryButton, marginTop: 16, marginBottom: 8 }}>Set up my table</Link>
      </Sheet>
    );
  }

  if (done) {
    return (
      <Sheet title="Added" onClose={onClose}>
        <p style={{ fontSize: 16, lineHeight: 1.45 }}>{recipe.title} is on {done.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, with its ingredients on that week's shopping list.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0 8px" }}>
          <Link to={`/weeks/${done.weekId}`} className="btn-red" style={primaryButton}>Open the week</Link>
          <button onClick={onClose} style={outlineButton}>Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add to a week" onClose={onClose}>
      <p style={{ fontSize: 15, color: "var(--muted)" }}>{table.name} · pick the day you'll cook it</p>
      {weeks.map((week) => (
        <section key={week.label} style={{ paddingTop: 14 }}>
          <h3 style={{ marginBottom: 8, fontWeight: 800, fontSize: 16 }}>{week.label}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {week.days.map((date) => {
              const iso = toISO(date);
              const [weekday, number] = shortDate(date).split(" ");
              return (
                <button key={iso} onClick={() => add(date)} disabled={!!busy} style={{ minWidth: 62, minHeight: 56, padding: "6px 10px", border: "2px solid var(--line)", borderRadius: 14, background: "var(--white)", opacity: busy && busy !== iso ? 0.5 : 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{iso === toISO(today) ? "Today" : weekday}</span>
                  <span style={{ fontSize: 19, fontWeight: 800 }}>{busy === iso ? "…" : number}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <ErrorNote>{error}</ErrorNote>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}
