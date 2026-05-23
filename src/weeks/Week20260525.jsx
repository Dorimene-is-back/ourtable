import { useState } from "react";
import { useNavigate } from "react-router-dom";

const meals = [
  {
    day: "Monday", date: "25 May", emoji: "🇻🇳",
    title: "Pho Gà",
    subtitle: "Vietnamese chicken noodle soup · DIY toppings at the table",
    kids: "~70g noodles + ~80g chicken each, mild broth. Spring onions on side.",
    adult: "Full bowl + coriander, chilli, lime, hoisin 🌶️",
    adultRef: "Adapted from Vicky Pham",
    adultRefUrl: "https://www.vickypham.com/blog/vietnamese-chicken-noodle-soup-pho-ga",
    dessert: null,
    ingredients: [
      "800g chicken legs or bone-in thighs",
      "1.5L good quality chicken stock",
      "180g flat rice noodles (bánh phở)",
      "3cm fresh ginger, halved",
      "1 onion, halved",
      "2 star anise",
      "1 cinnamon stick",
      "3 cloves",
      "2 tbsp fish sauce",
      "— Toppings (on the table) —",
      "Bean sprouts, handful",
      "Fresh coriander",
      "2 spring onions, sliced",
      "1 lime, cut in wedges",
      "1 red chilli, sliced (adult)",
      "Hoisin sauce (adult)",
    ],
    steps: [
      "Char ginger & onion: place cut side down on gas flame or under grill until lightly blackened, 2–3 min. Key for a deep fragrant broth.",
      "Bring stock + 500ml water to boil. Add charred ginger, onion, star anise, cinnamon, cloves.",
      "Add chicken. Simmer 25–30 min on medium-low until cooked through.",
      "Remove chicken. Shred meat finely, discard skin & bones.",
      "Strain broth through fine sieve. Return to pot. Season with fish sauce — taste as you go.",
      "Soak rice noodles in warm water 20 min, then cook in boiling water 1–2 min. Drain.",
      "Assemble bowls: noodles, shredded chicken, hot broth poured over.",
      "Bring all toppings to table — everyone adds their own! Kids: spring onions only. Adult: coriander, chilli, lime, hoisin.",
    ],
  },
  {
    day: "Tuesday", date: "26 May", emoji: "🇻🇳",
    title: "Cá Kho Tộ",
    subtitle: "Vietnamese caramelised fish · steamed rice · greens · make double for Wednesday!",
    kids: "~80g fish each, ~160g cooked rice each. Glaze on the side.",
    adult: "Full portion + sliced chilli & fresh coriander 🌶️",
    adultRef: "Adapted from The Ravenous Couple",
    adultRefUrl: "https://theravenouscouple.com/ca-kho-to-vietnamese-braised-fish-in-clay-pot/",
    dessert: null,
    ingredients: [
      "900g salmon fillets or catfish, thick pieces (double batch)",
      "480g jasmine rice — cook half tonight, half Wed",
      "5 tbsp fish sauce",
      "4 tbsp sugar (for caramel — authentic)",
      "5 garlic cloves, minced",
      "3cm fresh ginger, sliced",
      "3 spring onions",
      "1 red chilli (adult only)",
      "4 tbsp water",
      "1 tbsp neutral oil",
      "250g baby bok choy or broccoli",
    ],
    steps: [
      "Make dry caramel: heat sugar in small pan on medium, no stirring, until amber — 3–4 min. Watch carefully, it burns fast.",
      "Carefully add water (it will spit). Stir quickly. Add fish sauce, garlic, ginger. Mix well.",
      "Place all fish in wide pan or clay pot. Pour caramel-fish sauce over.",
      "Cook on medium heat, gently turning fish once, 8–10 min until sauce thickens & fish cooked through.",
      "Spoon sauce over fish continuously — this builds the glaze.",
      "Cook rice. Steam bok choy or broccoli last 3 min.",
      "⚠️ Set aside half the fish + sauce for Wednesday — store in airtight container in fridge.",
      "Serve tonight's portion over rice with greens. Kids: sauce on side. Adult: sliced chilli & coriander.",
    ],
  },
  {
    day: "Wednesday", date: "27 May",
    holiday: true,
    holidayName: "Hari Raya Haji 🎉",
    subtitle: "Leftover Cá Kho Tộ · fresh rice · steamed greens",
    holidayMeal: true,
    holidaySteps: [
      "Cook fresh jasmine rice (240g dry).",
      "Gently reheat fish in its sauce on low heat, 5–6 min. Add tiny splash of water if sauce too thick.",
      "Steam fresh greens alongside.",
      "Serve over rice — the glaze is even better on day 2! 🙌",
    ],
  },
  {
    day: "Thursday", date: "28 May", emoji: "🇱🇧",
    title: "Fattoush & Grilled Chicken",
    subtitle: "Lebanese fattoush salad for adult · pasta al burro for kids",
    kids: "~160g cooked pasta, butter & Parmesan 🧀",
    kidsRef: null,
    adult: "Fattoush with crispy pita, grilled chicken, sumac dressing.",
    adultRef: "Adapted from Maureen Abood",
    adultRefUrl: "https://www.maureenabood.com/fattoush/",
    dessert: null,
    ingredients: [
      "— Adult: Fattoush —",
      "1 chicken breast (~200g)",
      "1 small pita or flatbread",
      "60g mixed greens or romaine, torn",
      "1 medium tomato, diced",
      "½ cucumber, diced",
      "3 radishes, thinly sliced",
      "2 spring onions, sliced",
      "Fresh mint leaves, small handful",
      "Fresh coriander, small handful",
      "2 tbsp olive oil + juice 1 lemon (dressing)",
      "1 tsp sumac + ½ tsp Dijon (dressing)",
      "— Chicken marinade —",
      "1 tbsp olive oil",
      "Juice of ½ lemon",
      "½ tsp cumin",
      "½ tsp sumac",
      "— Kids: Pasta al Burro —",
      "160g fusilli or penne",
      "20g unsalted butter",
      "35g Parmesan, freshly grated",
    ],
    steps: [
      "Marinate chicken 20 min in marinade ingredients.",
      "— Kids pasta —",
      "Cook pasta in well-salted boiling water. Reserve ½ cup pasta water before draining.",
      "Return to pot on low heat. Add butter, toss until melted. Add pasta water splash for silky texture.",
      "Add Parmesan, toss until creamy. Serve immediately.",
      "— Adult fattoush —",
      "Grill or pan-fry chicken on medium-high 5–6 min each side until cooked through. Rest 3 min, slice thinly.",
      "Toast pita under grill or in dry pan until golden & very crispy. Break into rough pieces.",
      "Make dressing: whisk olive oil, lemon juice, sumac, Dijon, salt & pepper.",
      "Toss greens, tomato, cucumber, radishes, spring onions, mint & coriander with dressing.",
      "Top with sliced chicken & crispy pita pieces. Serve immediately — pita must stay crispy!",
    ],
  },
  {
    day: "Friday", date: "29 May", emoji: "🇫🇷",
    title: "Salade Chèvre Chaud",
    subtitle: "Warm goat's cheese on toast · walnuts · balsamic",
    kids: "Pasta al Pistacchio + plenty of Parmesan 🧀",
    kidsRef: "Adapted from Giallo Zafferano",
    kidsRefUrl: "https://www.giallozafferano.com/recipes/Fusilli-pasta-with-pistachio-pesto-and-cherry-tomatoes.html",
    adult: "Warm goat's cheese toasts on dressed greens, walnuts & balsamic.",
    adultRef: "Adapted from Marmiton",
    adultRefUrl: "https://www.food.com/recipe/salade-au-chevre-chaud-salad-with-warm-goat-cheese-483318",
    dessert: "Apple & pear crumble · buttery oat topping · warm from the oven",
    dessertRef: "Adapted from BBC Good Food",
    dessertRefUrl: "https://www.bbcgoodfood.com/recipes/collection/crumble-recipes",
    ingredients: [
      "— Adult: Salade Chèvre Chaud —",
      "150g goat's cheese log, sliced 1.5cm thick",
      "3 slices baguette or sourdough",
      "80g mixed greens or frisée",
      "25g walnuts",
      "2 tbsp olive oil",
      "1 tbsp balsamic vinegar",
      "1 tsp Dijon mustard",
      "— Kids: Pasta al Pistacchio —",
      "160g rigatoni or penne",
      "65g shelled pistachios, unsalted",
      "2 garlic cloves",
      "2 tbsp olive oil",
      "40ml pasta water (reserved)",
      "35g Parmesan, grated",
      "— Dessert: Fruit Crumble —",
      "3 apples + 2 pears, peeled & diced",
      "2 tbsp sugar",
      "1 tsp cinnamon",
      "100g plain flour",
      "80g rolled oats",
      "80g cold butter, cubed",
      "50g brown sugar",
    ],
    steps: [
      "— Start with dessert — bakes while you cook dinner —",
      "Preheat oven to 180°C. Toss diced fruit with sugar & cinnamon in baking dish.",
      "Rub flour, oats, cold butter & brown sugar with fingers until crumbly. Spread over fruit.",
      "Bake 35–40 min until golden & bubbling. Leave to cool slightly.",
      "— Kids: Pasta al Pistacchio —",
      "Blend pistachios, garlic, olive oil & pinch of salt to rough paste — keep some texture.",
      "Cook pasta in well-salted boiling water. Reserve 40ml pasta water before draining.",
      "Toss hot pasta with pistachio paste, add pasta water gradually to loosen into creamy sauce.",
      "Finish with plenty of Parmesan & black pepper. Serve hot.",
      "— Adult: Salade Chèvre Chaud —",
      "Make dressing: whisk olive oil, balsamic, Dijon, salt & pepper.",
      "Toast walnuts in dry pan 2–3 min until fragrant.",
      "Place baguette slices on baking tray. Top each with a goat's cheese slice.",
      "Grill under high heat 3–4 min until cheese is golden & bubbling.",
      "Plate greens, drizzle dressing, scatter walnuts. Place hot cheese toasts on top. Serve immediately.",
    ],
  },
];

const shopping = [
  { day: "Mon 25", items: ["Chicken legs or bone-in thighs 800g", "Flat rice noodles 180g", "Star anise", "Cinnamon stick", "Cloves", "Bean sprouts", "Fresh coriander", "Lime x2", "Hoisin sauce", "Spring onions"] },
  { day: "Tue + Wed 26–27", items: ["Salmon fillets or catfish 900g", "Jasmine rice 500g", "Fresh ginger", "Baby bok choy or broccoli 250g"] },
  { day: "Thu 28", items: ["Chicken breast 200g", "Pita or flatbread x1", "Mixed greens 60g", "Tomato x1", "Radishes x3", "Fresh mint", "Sumac", "Fusilli or penne 160g", "Parmesan 35g", "Butter 20g"] },
  { day: "Fri 29 + Dessert", items: ["Goat's cheese log 150g", "Baguette or sourdough", "Mixed greens 80g", "Walnuts 25g", "Rigatoni or penne 160g", "Shelled pistachios 65g (unsalted)", "Parmesan 35g", "Apples x3", "Pears x2", "Rolled oats 80g", "Plain flour 100g", "Brown sugar 50g", "Butter 80g"] },
];

const ACCENT = "#C4956A";
const GREEN = "#7A9E8A";
const PURPLE = "#9B7AB0";
const DARK = "#2A2A2A";
const BORDER = "#EEE8DE";
const BG = "#FAFAF7";
const CREAM = "#FDF6EC";

function RefLink({ label, url, color }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 13, fontFamily: "sans-serif",
      color: color || ACCENT,
      textDecoration: "none",
      borderBottom: `1px dashed ${color || ACCENT}`,
      marginTop: 5,
    }}>
      📖 {label} — tap for photo reference ↗
    </a>
  );
}

function Section({ label, color, content, refLabel, refUrl }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "0 0 6px", fontSize: 15, fontFamily: "sans-serif", color: "#444", lineHeight: 1.5 }}>{content}</p>
      {refLabel && refUrl && <RefLink label={refLabel} url={refUrl} color={color} />}
    </div>
  );
}

export default function MealPlan() {
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState("plan");
  const navigate = useNavigate();
  const toggle = (i) => setExpanded(expanded === i ? null : i);

  return (
    <div style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", background: BG, minHeight: "100vh", maxWidth: 500, margin: "0 auto", paddingBottom: 60 }}>

      {/* Back button */}
      <div style={{ padding: "16px 20px 0" }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, fontFamily: "sans-serif", color: ACCENT,
          display: "flex", alignItems: "center", gap: 6, padding: 0,
        }}>
          ← All weeks
        </button>
      </div>

      {/* Header */}
      <div style={{ background: CREAM, borderBottom: `2px solid ${BORDER}`, padding: "20px 20px 22px", marginTop: 12 }}>
        <p style={{ margin: "0 0 5px", fontSize: 11, letterSpacing: 3, color: ACCENT, fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: 600 }}>Family Table · 2026</p>
        <h1 style={{ margin: "0 0 4px", fontSize: 36, fontWeight: "normal", color: DARK, letterSpacing: -0.5 }}>25 – 29 May</h1>
        <p style={{ margin: 0, fontSize: 15, color: "#999", fontFamily: "sans-serif", fontWeight: 300 }}>5 meals · Wednesday off (Hari Raya Haji) + leftovers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {[["plan", "Meal Plan"], ["shopping", "Shopping List"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "15px", border: "none", background: "none",
            fontFamily: "sans-serif", fontSize: 15, fontWeight: tab === key ? 600 : 400,
            color: tab === key ? ACCENT : "#AAA",
            borderBottom: tab === key ? `2px solid ${ACCENT}` : "2px solid transparent",
            cursor: "pointer", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === "plan" && (
        <div style={{ padding: "16px 14px 0" }}>
          {meals.map((meal, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, marginBottom: 16, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              {meal.holiday ? (
                <div>
                  <div style={{ background: CREAM, padding: "20px 20px 16px" }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontFamily: "sans-serif", color: ACCENT, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{meal.day} · {meal.date}</p>
                    <p style={{ margin: "0 0 2px", fontSize: 24, color: DARK }}>{meal.holidayName}</p>
                    <p style={{ margin: 0, fontSize: 14, fontFamily: "sans-serif", color: "#AAA" }}>{meal.subtitle}</p>
                  </div>
                  {meal.holidayMeal && (
                    <div style={{ padding: "16px 20px 20px" }}>
                      <p style={{ margin: "0 0 10px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Reheat Steps</p>
                      {meal.holidaySteps.map((step, j) => (
                        <div key={j} style={{ display: "flex", gap: 14, marginBottom: 12, alignItems: "flex-start" }}>
                          <span style={{ minWidth: 26, height: 26, background: "#F5EFE6", color: ACCENT, borderRadius: "50%", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{j + 1}</span>
                          <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333", lineHeight: 1.6 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: "18px 20px 16px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontFamily: "sans-serif", color: ACCENT, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{meal.day} · {meal.date}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 26, color: DARK, lineHeight: 1.15 }}>{meal.emoji} {meal.title}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "#AAA", fontFamily: "sans-serif" }}>{meal.subtitle}</p>
                  </div>
                  <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <Section label="Kids" color={ACCENT} content={meal.kids} refLabel={meal.kidsRef} refUrl={meal.kidsRefUrl} />
                    <Section label="Adult" color={GREEN} content={meal.adult} refLabel={meal.adultRef} refUrl={meal.adultRefUrl} />
                    {meal.dessert && (
                      <Section label="Dessert" color={PURPLE} content={meal.dessert} refLabel={meal.dessertRef} refUrl={meal.dessertRefUrl} />
                    )}
                    <button onClick={() => toggle(i)} style={{
                      width: "100%", padding: "14px",
                      background: expanded === i ? DARK : CREAM,
                      color: expanded === i ? "white" : DARK,
                      border: `1px solid ${BORDER}`, borderRadius: 10,
                      fontSize: 15, fontFamily: "sans-serif", fontWeight: 500,
                      cursor: "pointer",
                    }}>
                      {expanded === i ? "▲ Hide Recipe" : "▼ See Full Recipe"}
                    </button>
                    {expanded === i && (
                      <div>
                        <p style={{ margin: "4px 0 10px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Ingredients</p>
                        {meal.ingredients.map((ing, j) => {
                          const isHeader = ing.startsWith("—");
                          return isHeader ? (
                            <p key={j} style={{ margin: "16px 0 8px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: "uppercase" }}>
                              {ing.replace(/—/g, "").trim()}
                            </p>
                          ) : (
                            <div key={j} style={{ display: "flex", gap: 10, borderBottom: "1px solid #F5F0E8", padding: "8px 0", alignItems: "baseline" }}>
                              <span style={{ color: ACCENT, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>·</span>
                              <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333" }}>{ing}</p>
                            </div>
                          );
                        })}
                        <p style={{ margin: "24px 0 10px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: "#BBB", letterSpacing: 2.5, textTransform: "uppercase" }}>Steps</p>
                        {(() => {
                          let n = 0;
                          return meal.steps.map((step, j) => {
                            const isHeader = step.startsWith("—");
                            if (!isHeader) n++;
                            return isHeader ? (
                              <p key={j} style={{ margin: "16px 0 8px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: "uppercase" }}>
                                {step.replace(/—/g, "").trim()}
                              </p>
                            ) : (
                              <div key={j} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                                <span style={{ minWidth: 26, height: 26, background: "#F5EFE6", color: ACCENT, borderRadius: "50%", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
                                <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333", lineHeight: 1.6 }}>{step}</p>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "shopping" && (
        <div style={{ padding: "16px 14px 0" }}>
          <div style={{ background: CREAM, borderRadius: 12, padding: "16px 18px", marginBottom: 14, border: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700, color: ACCENT, letterSpacing: 1.5, textTransform: "uppercase" }}>✅ Check pantry first</p>
            <p style={{ margin: 0, fontSize: 14, fontFamily: "sans-serif", color: "#888", lineHeight: 1.9 }}>
              Olive oil · Soy sauce · Sesame oil · Fish sauce · Garlic · Sugar · Rice vinegar · Balsamic vinegar · Dijon mustard · Chilli flakes · Star anise · Cinnamon stick · Cloves · Neutral oil · Sumac · Salt & pepper
            </p>
          </div>
          {shopping.map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 12, padding: "16px 18px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, color: DARK, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.day}</p>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 10, borderBottom: j < s.items.length - 1 ? "1px solid #F5F0E8" : "none", padding: "8px 0", alignItems: "baseline" }}>
                  <span style={{ color: ACCENT, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>·</span>
                  <p style={{ margin: 0, fontSize: 15, fontFamily: "sans-serif", color: "#333" }}>{item}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
