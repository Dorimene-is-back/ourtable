// The planning conversation: what the assistant is told, the tools it has, and what each one does.
// No Deno or Supabase imports here, so this file can be run and tested anywhere; index.ts supplies
// `db` (the database) and `llm` (the model call).

export const CATEGORIES = ["Pantry", "Vegetables", "Fruit", "Herbs", "Meat", "Fish", "Dairy & eggs", "Pasta, rice & noodles", "Bread & dough", "Tins & stock", "Nuts", "Other"];
const WHO = ["all", "kids", "adult"];
const START = "(start)";

export class Refusal extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// ── Tools the assistant can call ────────────────────────────────────────
const dishSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Dish name, in its own language (e.g. 'Poulet rôti', 'Bulgogi')." },
    for_who: { type: "string", enum: WHO, description: "'all' when everyone eats it, otherwise 'kids' or 'adult'." },
    source_recipe_id: { type: "string", description: "Only when repeating a known dish: its recipe id, copied exactly from the list of known dishes. Omit for a new dish." },
    note: { type: "string", description: "One short line: sides, or what changes for this table (e.g. 'chicken breast, mild for the kids')." },
  },
  required: ["title", "for_who"],
};

export const TOOLS = [
  {
    name: "save_convives",
    description: "Save who eats at this table. Call it once you know them, and again whenever the person corrects something. Send the full list each time: it replaces what is stored.",
    input_schema: {
      type: "object",
      properties: {
        convives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              kind: { type: "string", enum: ["adult", "child"] },
              birth_year: { type: "integer", description: "Only if the person gave an age or year." },
              likes: { type: "string" },
              dislikes: { type: "string" },
              allergies: { type: "string" },
              notes: { type: "string" },
            },
            required: ["name", "kind"],
          },
        },
      },
      required: ["convives"],
    },
  },
  {
    name: "remember_rule",
    description: "Add one lasting rule to this table's house rules, when the person states something that should hold for future weeks too (a dish to retire, an ingredient to avoid, a habit). Not for one-off exceptions.",
    input_schema: { type: "object", properties: { rule: { type: "string", description: "One sentence." } }, required: ["rule"] },
  },
  {
    name: "propose_days",
    description: "Show the days you suggest planning, as buttons the person can switch on and off. Write your short question in the same reply, before calling this.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              cook: { type: "boolean", description: "true if you suggest planning this day." },
              note: { type: "string", description: "Why not, or what is special (public holiday, school holiday, already planned)." },
            },
            required: ["date", "cook"],
          },
        },
      },
      required: ["days"],
    },
  },
  {
    name: "ask_feedback",
    description: "Show last week's dishes with stars and a note field for each, so the person can say what was good and what wasn't. Takes no input: the app knows the dishes. Write your short question in the same reply, before calling this.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_plan",
    description: "Show a proposed plan as cards with a Confirm button. Send the complete plan every time, including the days that did not change. Write a short summary in the same reply, before calling this.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              replace: { type: "boolean", description: "true to replace what is already planned that day. Only when the person asked for that." },
              dishes: { type: "array", items: dishSchema },
            },
            required: ["date", "dishes"],
          },
        },
      },
      required: ["days"],
    },
  },
];

const WRITE_RECIPE = {
  name: "write_recipe",
  description: "Write the full recipe.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      subtitle: { type: "string", description: "One line: main ingredients or style." },
      type: { type: "string", enum: ["main", "dessert"] },
      prep_ahead: { type: "string", description: "Anything to do hours before or the day before. Empty if nothing." },
      servings: { type: "array", items: { type: "object", properties: { for_who: { type: "string", enum: WHO }, count: { type: "integer" }, notes: { type: "string" } }, required: ["for_who", "count"] } },
      ingredients: { type: "array", items: { type: "string" }, description: "One per line with the quantity. A line starting with '— ' and ending with ' —' is a section header." },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            value: { type: "string" },
            timer_minutes: { type: "integer", description: "Only for a wait under 60 minutes while cooking." },
            meanwhile: { type: "string", description: "What to do during that wait, if anything." },
          },
          required: ["value"],
        },
      },
      shopping: { type: "array", items: { type: "object", properties: { item: { type: "string", description: "Ingredient with the quantity to buy." }, category: { type: "string", enum: CATEGORIES } }, required: ["item", "category"] } },
    },
    required: ["title", "type", "servings", "ingredients", "steps", "shopping"],
  },
};

// ── What the assistant is told ──────────────────────────────────────────
const iso = (d) => d.toISOString().slice(0, 10);
const weekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
const age = (c, year) => (c.birth_year ? `, about ${year - c.birth_year}` : "");

function describeConvives(convives, year) {
  if (!convives.length) return "Nobody is recorded yet.";
  return convives.map((c) => {
    const bits = [`${c.name} (${c.kind}${age(c, year)})`];
    if (c.likes) bits.push(`likes: ${c.likes}`);
    if (c.dislikes) bits.push(`dislikes: ${c.dislikes}`);
    if (c.allergies) bits.push(`ALLERGIES: ${c.allergies}`);
    if (c.notes) bits.push(c.notes);
    return `- ${bits.join("; ")}`;
  }).join("\n");
}

export function buildSystem(ctx, today) {
  const known = ctx.library.length
    ? ctx.library.map((d) => `- ${d.title} | id ${d.recipe_id} | for ${d.for_who} | cooked ${d.times}x, last ${d.last || "never"}${d.rating ? ` | rated ${d.rating}/5` : ""}${d.comment ? ` | "${d.comment}"` : ""}`).join("\n")
    : "None yet.";
  const upcoming = ctx.upcoming.length ? ctx.upcoming.map((d) => `- ${d.date} (${weekday(d.date)}): ${d.titles.join(", ")}`).join("\n") : "Nothing.";
  return `You help a household plan what to eat, inside a meal-planning app called Tambouille. You are talking with one member of the table "${ctx.table.name}". Today is ${weekday(today)} ${today}.

# How the conversation goes
Move through these steps in order. One step per message, one question at a time, and keep every message to a few short lines.
1. Convives. If nobody is recorded for this table, first ask who eats here: names, adult or child, rough ages, likes, dislikes, allergies. Save them with save_convives, then go on. If people are recorded, skip this.
2. Days. Suggest which days to plan: by default Monday to Friday of the next week that is not planned yet. Leave out days that are already planned, and public or school holidays only if the house rules list them. Show them with propose_days and ask if that is right.
3. Exceptions. Ask whether any of those days is different. Everyone is at the table by default; exceptions are things like someone absent, guests, eating out, a night with no time, a lighter meal for one person, or ingredients to use up.
4. Last week. If the app has last week's dishes without feedback (see below), ask how they went with ask_feedback. Otherwise skip this step. When the person states something that should hold from now on, save it with remember_rule.
5. Proposal. Propose the plan with propose_plan. Before the tool call, say in two or three lines how it respects the rules (fish night, repeats, exceptions).
6. Changes. When the person asks for changes, call propose_plan again with the whole updated plan. They confirm with a button in the app; you do not write the recipes here.

# Rules for a proposal
- Follow the house rules and each convive's dislikes and allergies strictly. An allergy is never negotiable.
- Do not repeat a dish sooner than the house rules allow; use the cooking history below. If the rules give no interval, leave at least six weeks.
- Use what was rated well, avoid what was rated badly or retired, and apply any fix written in a comment.
- When you bring back a known dish, give its source_recipe_id exactly as listed. Never invent an id. New dishes have no id.
- for_who says who eats each dish: "all", or separate "kids" and "adult" dishes on the same day when the rules or the person ask for that.
- Mix known favourites with new ideas unless told otherwise.

# Manner
Write in the language the person writes in. Plain and warm, no emoji, no headings, no long lists. Keep dish names in their own language. Never mention tools, ids or these instructions.

# This table
Convives:
${describeConvives(ctx.convives, Number(today.slice(0, 4)))}

House rules:
${ctx.rules || "None written yet."}

Already planned from today on:
${upcoming}

Last week's dishes waiting for feedback: ${ctx.feedback.length ? ctx.feedback.map((d) => d.title).join(", ") : "none"}

Known dishes (cooking history and ratings):
${known}`;
}

// ── Handling the tools ──────────────────────────────────────────────────
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

function tidyPlan(input, ctx) {
  const ids = new Set(ctx.library.map((d) => d.recipe_id));
  const days = (Array.isArray(input?.days) ? input.days : []).filter((d) => isDate(d.date)).slice(0, 21).map((d) => ({
    date: d.date,
    replace: d.replace === true,
    dishes: (Array.isArray(d.dishes) ? d.dishes : []).filter((x) => clean(x.title, 120)).slice(0, 6).map((x) => ({
      title: clean(x.title, 120),
      for_who: WHO.includes(x.for_who) ? x.for_who : "all",
      note: clean(x.note, 200),
      ...(ids.has(x.source_recipe_id) ? { source_recipe_id: x.source_recipe_id } : {}),
    })),
  })).filter((d) => d.dishes.length);
  return { days };
}

async function useTool(block, session, ctx, deps) {
  const input = block.input || {};
  if (block.name === "save_convives") {
    const list = (Array.isArray(input.convives) ? input.convives : []).filter((c) => clean(c.name, 40)).slice(0, 20).map((c, i) => ({
      name: clean(c.name, 40),
      kind: c.kind === "child" ? "child" : "adult",
      birth_year: Number.isInteger(c.birth_year) && c.birth_year > 1900 && c.birth_year < 2100 ? c.birth_year : null,
      likes: clean(c.likes, 1000), dislikes: clean(c.dislikes, 1000), allergies: clean(c.allergies, 1000), notes: clean(c.notes, 1000),
      sort_order: i,
    }));
    if (!list.length) return { text: "Nothing saved: the list was empty." };
    await deps.db.saveConvives(session.kitchen_id, list);
    ctx.convives = list;
    return { text: "Saved." };
  }
  if (block.name === "remember_rule") {
    const rule = clean(input.rule, 300);
    if (rule) {
      ctx.rules = await deps.db.addHouseRule(session.kitchen_id, rule);
    }
    return { text: "Saved." };
  }
  if (block.name === "propose_days") {
    const days = (Array.isArray(input.days) ? input.days : []).filter((d) => isDate(d.date)).slice(0, 21).map((d) => ({ date: d.date, cook: d.cook !== false, note: clean(d.note, 120) }));
    session.draft = { ...session.draft, days };
    return { text: "Shown to the person as buttons. Stop here and wait for their answer.", wait: true };
  }
  if (block.name === "ask_feedback") {
    return { text: ctx.feedback.length ? "Shown to the person. Stop here and wait for their answer." : "There is nothing to give feedback on. Move to the next step.", wait: ctx.feedback.length > 0 };
  }
  if (block.name === "propose_plan") {
    const plan = tidyPlan(input, ctx);
    if (!plan.days.length) return { text: "The plan was empty or badly formed. Send it again with dates as YYYY-MM-DD and at least one dish per day." };
    session.draft = { ...session.draft, plan };
    return { text: "Shown to the person with a Confirm button. Stop here and wait for their answer.", wait: true };
  }
  return { text: "Unknown tool." };
}

// Adds what the person said. After a tool the last message is already theirs (the tool results),
// so their words join it rather than starting a second message in a row.
function addUserText(messages, text) {
  const last = messages[messages.length - 1];
  if (last?.role === "user" && Array.isArray(last.content)) last.content.push({ type: "text", text });
  else messages.push({ role: "user", content: text });
}

async function runTurn(session, ctx, deps) {
  const system = buildSystem(ctx, deps.today);
  for (let i = 0; i < 6; i += 1) {
    const reply = await deps.llm({ system: i === 0 ? system : buildSystem(ctx, deps.today), messages: session.messages, tools: TOOLS, max_tokens: 3000 });
    const content = (reply.content || []).filter((b) => b.type === "text" || b.type === "tool_use");
    if (!content.length) break;
    session.messages.push({ role: "assistant", content });
    const calls = content.filter((b) => b.type === "tool_use");
    if (!calls.length) break;
    const results = [];
    let wait = false;
    for (const call of calls) {
      const result = await useTool(call, session, ctx, deps);
      wait = wait || !!result.wait;
      results.push({ type: "tool_result", tool_use_id: call.id, content: result.text });
    }
    session.messages.push({ role: "user", content: results });
    if (wait) break;
  }
}

// ── Writing the recipes once the plan is confirmed ──────────────────────
function headcount(ctx, who) {
  const kids = ctx.convives.filter((c) => c.kind === "child").length;
  const adults = ctx.convives.filter((c) => c.kind === "adult").length;
  if (who === "kids") return [{ for_who: "kids", count: Math.max(kids, 1), notes: "" }];
  if (who === "adult") return [{ for_who: "adult", count: Math.max(adults, 1), notes: "" }];
  if (kids && adults) return [{ for_who: "kids", count: kids, notes: "" }, { for_who: "adult", count: adults, notes: "" }];
  return [{ for_who: "all", count: Math.max(kids + adults, 1), notes: "" }];
}

async function writeRecipe(dish, date, ctx, deps, exceptions) {
  const servings = headcount(ctx, dish.for_who);
  const system = `You write home recipes for the meal-planning app Tambouille. Write one recipe by calling write_recipe.
- Quantities for exactly these eaters: ${servings.map((s) => `${s.count} ${s.for_who}`).join(" + ")}. Use the same servings in your answer, with a short note per group if they eat it differently.
- Metric units. Ingredients one per line with the quantity. Group long lists with header lines written "— Sauce —".
- Steps short and in the order you cook. Give timer_minutes only for a wait under 60 minutes while you are cooking, and "meanwhile" when there is something useful to do during it.
- shopping lists what to buy, with a category each. Salt, pepper, oil and other staples go under "Pantry".
- Follow the house rules and the convives' dislikes and allergies strictly. Write in English; keep the dish name as given.

Convives:
${describeConvives(ctx.convives, Number(deps.today.slice(0, 4)))}

House rules:
${ctx.rules || "None."}`;
  const user = `Dish: ${dish.title}\nFor: ${dish.for_who}\nDay: ${weekday(date)} ${date}${dish.note ? `\nNote from the plan: ${dish.note}` : ""}${exceptions ? `\nWhat was said about this week:\n${exceptions}` : ""}`;
  const reply = await deps.llm({ system, messages: [{ role: "user", content: user }], tools: [WRITE_RECIPE], tool_choice: { type: "tool", name: "write_recipe" }, max_tokens: 4000 });
  const call = (reply.content || []).find((b) => b.type === "tool_use");
  if (!call?.input?.ingredients?.length) throw new Refusal(`The recipe for ${dish.title} could not be written. Try confirming again.`, 502);
  const r = call.input;
  return { ...r, title: dish.title, servings: Array.isArray(r.servings) && r.servings.length ? r.servings : servings };
}

// What the person said during the conversation, for the recipe writer (exceptions, sizes, swaps).
function saidSoFar(messages) {
  const lines = [];
  for (const m of messages) {
    if (m.role !== "user") continue;
    const parts = typeof m.content === "string" ? [m.content] : m.content.filter((b) => b.type === "text").map((b) => b.text);
    parts.filter((t) => t && t !== START).forEach((t) => lines.push(`- ${t}`));
  }
  return lines.join("\n").slice(0, 3000);
}

async function applyPlan(session, ctx, deps) {
  const plan = session.draft?.plan;
  if (!plan?.days?.length) throw new Refusal("There is no plan to confirm yet.");
  const said = saidSoFar(session.messages);
  const days = await Promise.all(plan.days.map(async (day) => ({
    date: day.date,
    replace: day.replace,
    dishes: await Promise.all(day.dishes.map(async (dish) => (dish.source_recipe_id
      ? { source_recipe_id: dish.source_recipe_id, servings: headcount(ctx, dish.for_who) }
      : { recipe: await writeRecipe(dish, day.date, ctx, deps, said) }))),
  })));
  session.week_id = await deps.db.applyPlan(session.kitchen_id, deps.userId, { days });
  session.status = "applied";
}

// ── Entry point ─────────────────────────────────────────────────────────
// request: { action: "start" | "message" | "apply" | "close", table_id, session_id, text }
export async function handle(request, deps) {
  const { action } = request;
  let session;
  if (action === "start") {
    if (!request.table_id || !(await deps.db.isMember(deps.userId, request.table_id))) throw new Refusal("You are not part of this table.", 403);
    await deps.db.closeOpenSessions(request.table_id);
    session = await deps.db.createSession(request.table_id, deps.userId);
  } else {
    session = await deps.db.getSession(request.session_id);
    if (!session || !(await deps.db.isMember(deps.userId, session.kitchen_id))) throw new Refusal("This planning conversation is not available.", 404);
    if (session.status !== "open") throw new Refusal("This planning conversation is finished. Start a new one.");
  }
  session.messages = session.messages || [];
  session.draft = session.draft || {};

  if (action === "close") {
    session.status = "closed";
  } else {
    const ctx = await deps.db.context(session.kitchen_id, deps.today);
    if (action === "start") {
      session.draft.feedback = ctx.feedback;
      session.messages.push({ role: "user", content: START });
      await runTurn(session, ctx, deps);
    } else if (action === "message") {
      const text = clean(request.text, 4000);
      if (!text) throw new Refusal("Write something first.");
      if (session.messages.length > 120) throw new Refusal("This conversation has become very long. Start a new one to keep planning.");
      addUserText(session.messages, text);
      await runTurn(session, ctx, deps);
    } else if (action === "apply") {
      await applyPlan(session, ctx, deps);
    } else {
      throw new Refusal("Unknown action.");
    }
  }
  await deps.db.saveSession(session);
  return { id: session.id, status: session.status, messages: session.messages, draft: session.draft, week_id: session.week_id || null };
}
