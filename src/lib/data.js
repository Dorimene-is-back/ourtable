import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { normalizeWeek } from "./weeks";

// What the app reads depends on who is signed in: their kitchen's weeks, or the open
// kitchen's when signed out. The auth provider sets this scope; changing it drops the caches.
let scopeKitchen = null;
let scopeSet = false;
let version = 0;
let resolveReady;
const ready = new Promise((resolve) => { resolveReady = resolve; });
const listeners = new Set();

const weekCache = new Map();
const recipeCache = new Map();
let weeksPromise = null;
let libraryPromise = null;

// Call after anything that changes weeks or recipes, so open screens reload.
export function refreshData() {
  weekCache.clear();
  recipeCache.clear();
  weeksPromise = null;
  libraryPromise = null;
  version += 1;
  listeners.forEach((listener) => listener());
}

export function setScope(kitchenId) {
  const changed = scopeSet && scopeKitchen !== kitchenId;
  scopeKitchen = kitchenId;
  scopeSet = true;
  resolveReady();
  if (changed) refreshData();
}

const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const useDataVersion = () => useSyncExternalStore(subscribe, () => version);

const RECIPE_SUMMARY = "id, title, image, type, sort_order, dish_id, created_by, servings(for_who), ingredients(id)";
const RECIPE_FULL = "*, servings(*), ingredients(id, sort_order, value), steps(id, sort_order, value, timer_minutes, meanwhile)";

function sortParts(recipe) {
  recipe.ingredients.sort((a, b) => a.sort_order - b.sort_order);
  recipe.steps.sort((a, b) => a.sort_order - b.sort_order);
  return recipe;
}

export function fetchWeeks() {
  if (!weeksPromise) {
    weeksPromise = ready
      .then(() => {
        let query = supabase
          .from("weeks")
          .select(`id, dates, kitchen_id, week_start, days(id, day, date, holiday, holiday_name, recipes(${RECIPE_SUMMARY})), shopping(recipe_id, category)`)
          .order("week_start", { ascending: false });
        if (scopeKitchen) query = query.eq("kitchen_id", scopeKitchen);
        return query;
      })
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
      .select(`*, days(*, recipes(${RECIPE_FULL})), shopping(*)`)
      .eq("id", weekId)
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        const week = normalizeWeek(data);
        week.days.forEach((day) => day.recipes.forEach(sortParts));
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

// Recipes beyond the kitchen's own weeks: the ones people add themselves (not on any day) and,
// for someone in their own kitchen, every public recipe other kitchens have cooked.
export function fetchLibrary() {
  if (!libraryPromise) {
    libraryPromise = ready
      .then(() => {
        const query = supabase.from("recipes").select(`${RECIPE_SUMMARY}, day_id, days(week_id)`);
        return scopeKitchen ? query : query.is("day_id", null);
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
      .catch((err) => {
        libraryPromise = null;
        throw err;
      });
  }
  return libraryPromise;
}

// One recipe on its own, for library recipes that have no week.
export function fetchRecipe(recipeId) {
  if (!recipeCache.has(recipeId)) {
    const promise = supabase
      .from("recipes")
      .select(RECIPE_FULL)
      .eq("id", recipeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return data ? sortParts(data) : null;
      })
      .catch((err) => {
        recipeCache.delete(recipeId);
        throw err;
      });
    recipeCache.set(recipeId, promise);
  }
  return recipeCache.get(recipeId);
}

// keep: hold on to what is on screen while reloading, for lists that refresh in place.
// initial: something to show straight away (a screen returning to what it showed before).
export function useLoad(load, deps, { keep = false, initial = null } = {}) {
  const [state, setState] = useState({ data: initial, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setState((prev) => ({ data: keep ? prev.data : null, loading: true, error: null }));
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
