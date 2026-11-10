import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { normalizeWeek } from "./weeks";

const weekCache = new Map();
let weeksPromise = null;

export function fetchWeeks() {
  if (!weeksPromise) {
    weeksPromise = supabase
      .from("weeks")
      .select("id, dates, days(id, day, date, holiday, holiday_name, recipes(id, title, image, type, sort_order, servings(for_who), ingredients(id)))")
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
