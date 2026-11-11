// The Plan tab's assistant. The browser sends one step of the conversation; this function checks
// who is asking, gathers what the assistant needs to know about the table, calls the model, and
// stores the conversation. The conversation logic itself is in core.js.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, Refusal } from "./core.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MODEL = Deno.env.get("PLAN_MODEL") || "claude-sonnet-5-5";
const DAY_INDEX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

const must = <T>({ data, error }: { data: T; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dishKey = (title: string) => title.replace(/\([^)]*\)/g, "").trim().toLowerCase();

async function llm(body: Record<string, unknown>) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Refusal("The planning assistant isn't connected yet: its API key is missing.", 503);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    console.error("model call failed", res.status, await res.text());
    throw new Refusal(res.status === 401 ? "The planning assistant's API key was refused." : "The planning assistant is not answering right now. Try again in a moment.", 502);
  }
  return await res.json();
}

const db = {
  async isMember(userId: string, tableId: string) {
    const rows = must(await admin.from("kitchen_members").select("user_id").eq("kitchen_id", tableId).eq("user_id", userId).eq("status", "active"));
    return (rows || []).length > 0;
  },

  // Everything the assistant should know about a table.
  async context(tableId: string, today: string) {
    const [table, convives, rules, weeks, reviews] = await Promise.all([
      admin.from("kitchens").select("id, name").eq("id", tableId).single().then(must),
      admin.from("convives").select("name, kind, birth_year, likes, dislikes, allergies, notes").eq("kitchen_id", tableId).order("sort_order").order("created_at").then(must),
      admin.from("house_rules").select("body").eq("kitchen_id", tableId).maybeSingle().then(must),
      admin.from("weeks").select("id, week_start, days(day, recipes(id, title, dish_id, servings(for_who), ingredients(id)))").eq("kitchen_id", tableId).gte("week_start", addDays(today, -200)).then(must),
      admin.from("reviews").select("dish_id, recipe_id, rating, comment, created_at").eq("kitchen_id", tableId).order("created_at", { ascending: false }).limit(400).then(must),
    ]);

    const latestReview = new Map<string, { rating: number | null; comment: string }>();
    const reviewed = new Set<string>();
    for (const r of reviews || []) {
      if (r.recipe_id) reviewed.add(r.recipe_id);
      if (r.dish_id && !latestReview.has(r.dish_id)) latestReview.set(r.dish_id, { rating: r.rating, comment: (r.comment || "").slice(0, 160) });
    }

    type Dish = { title: string; recipe_id: string; dish_id: string | null; for_who: string; times: number; last: string | null; latest: string; rating?: number | null; comment?: string };
    const dishes = new Map<string, Dish>();
    const upcoming = new Map<string, string[]>();
    const lastWeek: { recipe_id: string; dish_id: string; title: string; date: string }[] = [];
    for (const week of weeks || []) {
      for (const day of week.days || []) {
        const date = addDays(week.week_start, DAY_INDEX[day.day] ?? 0);
        for (const recipe of day.recipes || []) {
          if (!recipe.title || !(recipe.ingredients || []).length) continue;
          if (date >= today) upcoming.set(date, [...(upcoming.get(date) || []), recipe.title]);
          if (/leftover/i.test(recipe.title)) continue;
          const who = [...new Set((recipe.servings || []).map((s: { for_who: string }) => s.for_who))];
          const forWho = who.length === 1 && (who[0] === "kids" || who[0] === "adult") ? who[0] : "all";
          const key = recipe.dish_id || dishKey(recipe.title);
          const dish = dishes.get(key) || { title: recipe.title.replace(/\s*\([^)]*\)/g, ""), recipe_id: recipe.id, dish_id: recipe.dish_id, for_who: forWho, times: 0, last: null, latest: "" };
          if (date <= today) {
            dish.times += 1;
            if (!dish.last || date > dish.last) dish.last = date;
          }
          if (date > dish.latest) { dish.latest = date; dish.recipe_id = recipe.id; dish.for_who = forWho; }
          dishes.set(key, dish);
          if (recipe.dish_id && date < today && date >= addDays(today, -10) && !reviewed.has(recipe.id)) {
            lastWeek.push({ recipe_id: recipe.id, dish_id: recipe.dish_id, title: recipe.title, date });
          }
        }
      }
    }
    const library = [...dishes.values()].map((d) => ({ ...d, ...(d.dish_id ? latestReview.get(d.dish_id) : {}) }))
      .sort((a, b) => (b.last || "").localeCompare(a.last || "")).slice(0, 150);

    return {
      table,
      convives: convives || [],
      rules: rules?.body || "",
      library,
      upcoming: [...upcoming.entries()].sort().map(([date, titles]) => ({ date, titles })),
      feedback: lastWeek.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12),
    };
  },

  async saveConvives(tableId: string, list: Record<string, unknown>[]) {
    must(await admin.from("convives").delete().eq("kitchen_id", tableId));
    must(await admin.from("convives").insert(list.map((c) => ({ ...c, kitchen_id: tableId }))));
  },

  async addHouseRule(tableId: string, rule: string) {
    const current = must(await admin.from("house_rules").select("body").eq("kitchen_id", tableId).maybeSingle());
    const body = `${current?.body ? `${current.body.trimEnd()}\n` : ""}- ${rule}`.slice(0, 8000);
    must(await admin.from("house_rules").upsert({ kitchen_id: tableId, body, updated_at: new Date().toISOString() }));
    return body;
  },

  async closeOpenSessions(tableId: string) {
    must(await admin.from("plan_sessions").update({ status: "closed" }).eq("kitchen_id", tableId).eq("status", "open"));
  },
  async createSession(tableId: string, userId: string) {
    return must(await admin.from("plan_sessions").insert({ kitchen_id: tableId, user_id: userId }).select().single());
  },
  async getSession(id: string) {
    if (!id) return null;
    return must(await admin.from("plan_sessions").select().eq("id", id).maybeSingle());
  },
  async saveSession(s: { id: string; status: string; messages: unknown; draft: unknown; week_id?: string }) {
    must(await admin.from("plan_sessions").update({ status: s.status, messages: s.messages, draft: s.draft, week_id: s.week_id ?? null, updated_at: new Date().toISOString() }).eq("id", s.id));
  },
  async applyPlan(tableId: string, userId: string, plan: unknown) {
    return must(await admin.rpc("apply_plan", { p_kitchen: tableId, p_user: userId, p_plan: plan }));
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Not found." }, 404);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Sign in first." }, 401);
    const request = await req.json();
    // "Today" where the person is: the app sends its local date; fall back to the server's.
    const today = /^\d{4}-\d{2}-\d{2}$/.test(request.today || "") ? request.today : new Date().toISOString().slice(0, 10);
    return json(await handle(request, { db, llm, today, userId: user.id }));
  } catch (err) {
    if (err instanceof Refusal) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Something went wrong while planning. Try again." }, 500);
  }
});
