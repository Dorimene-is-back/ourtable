import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { normalizeWeek } from "./weeks";

const weekCache = new Map();
let weeksPromise = null;

export function fetchWeeks() {
  if (!weeksPromise) {
    weeksPromise = supabase
      .from("weeks")
      .select("id, dates, days(id, day, date, holiday, holiday_name, recipes(id, dish_id, title, image, type, sort_order, servings(for_who), ingredients(id))), shopping(recipe_id, category)")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(normalizeWeek);
      })
      .catch((err) => {
        weeksPromise = null;
        throw err;
      });
  }
  return weeksPromise;
}

export function fetchWeek(weekId) {
  if (!weekCache.has(weekId)) {
    const promise = supabase
      .from("weeks")
      .select("*, days(*, recipes(*, servings(*), ingredients(id, sort_order, value), steps(id, sort_order, value, timer_minutes, meanwhile))), shopping(*)")
      .eq("id", weekId)
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        const week = normalizeWeek(data);
        week.days.forEach((day) =>
          day.recipes.forEach((recipe) => {
            recipe.ingredients.sort((a, b) => a.sort_order - b.sort_order);
            recipe.steps.sort((a, b) => a.sort_order - b.sort_order);
          })
        );
        return week;
      })
      .catch((err) => {
        weekCache.delete(weekId);
        throw err;
      });
    weekCache.set(weekId, promise);
  }
  return weekCache.get(weekId);
}

export function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState({ data: null, loading: true, error: null });
    load().then(
      (data) => alive && setState({ data, loading: false, error: null }),
      (error) => alive && setState({ data: null, loading: false, error })
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// Today's date (ISO). Updates when the app comes back into view on a new day, or at midnight,
// so lists that hide past days don't go stale in an app left open in the background.
export function useToday() {
  const iso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [today, setToday] = useState(iso);
  useEffect(() => {
    const check = () => setToday(iso());
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now + 1000;
    const timer = setTimeout(check, msToMidnight);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [today]);
  return today;
}

// Average rating per dish. Reviews are private to their kitchen, so this is empty when signed out.
export async function fetchRatings() {
  const { data, error } = await supabase.from("dish_ratings").select("dish_id, rating, ratings");
  if (error) throw error;
  return new Map((data || []).filter((r) => r.ratings > 0).map((r) => [r.dish_id, { rating: Number(r.rating), count: r.ratings }]));
}

// A dish's ratings and comments, newest first, with the reviewer's name.
export async function fetchReviews(dishId) {
  if (!dishId) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, cooked_on, created_at, user_id")
    .eq("dish_id", dishId)
    .order("cooked_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    (people || []).forEach((p) => names.set(p.id, p.display_name));
  }
  return (data || []).map((r) => ({ ...r, author: names.get(r.user_id) || null }));
}

// The signed-in user's favourite dishes (dish ids), shared by every screen and kept in sync.
let favorites = null; // Set of dish ids, or null when not loaded / signed out
let favoritesUser = null;
const favoriteListeners = new Set();
const emitFavorites = () => favoriteListeners.forEach((fn) => fn(favorites));

async function loadFavorites(userId) {
  favoritesUser = userId;
  if (!userId) { favorites = null; emitFavorites(); return; }
  const { data, error } = await supabase.from("favorites").select("dish_id");
  if (error || favoritesUser !== userId) return;
  favorites = new Set((data || []).map((f) => f.dish_id));
  emitFavorites();
}

export function useFavorites(userId) {
  const [set, setSet] = useState(favorites);
  useEffect(() => {
    favoriteListeners.add(setSet);
    if (favoritesUser !== (userId ?? null)) loadFavorites(userId ?? null);
    else setSet(favorites);
    return () => favoriteListeners.delete(setSet);
  }, [userId]);
  return set;
}

// Adds or removes favourites straight away on screen, then saves; reverts if the save fails.
export async function setFavorite(userId, dishIds, on) {
  const ids = [...dishIds].filter(Boolean);
  if (!userId || !ids.length) return;
  const before = new Set(favorites || []);
  favorites = new Set(before);
  if (on) favorites.add(ids[0]);
  else ids.forEach((id) => favorites.delete(id));
  emitFavorites();
  const { error } = on
    ? await supabase.from("favorites").upsert(ids.slice(0, 1).map((dish_id) => ({ user_id: userId, dish_id })), { onConflict: "user_id,dish_id", ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", userId).in("dish_id", ids);
  if (error) { favorites = before; emitFavorites(); }
}
