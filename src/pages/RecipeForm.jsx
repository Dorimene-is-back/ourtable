import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell, BackButton, Choice, ErrorNote, Message, RedHeader, fieldStyle, labelStyle, outlineButton, primaryButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { fetchRecipe, refreshData } from "../lib/data";
import { fetchDish, saveRecipe, uploadRecipeImage } from "../lib/social";
import { whoFor } from "../lib/weeks";

const EMPTY = { title: "", type: "main", for_who: "all", count: 4, image: "", ingredients: "", steps: "", prep_ahead: "", ref_url: "", is_public: true };
const lines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);

function Field({ id, label, hint, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>{hint}</p>}
    </div>
  );
}

// Add a recipe of your own, or edit one. It goes to the library; from there it can be added to a week.
export default function RecipeForm() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user, ready, kitchen, openSignIn } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(!recipeId);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoInput = useRef(null);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value?.target ? value.target.value : value }));

  useEffect(() => {
    if (!recipeId) return undefined;
    let alive = true;
    fetchRecipe(recipeId)
      .then(async (recipe) => {
        if (!recipe) throw new Error("This recipe isn’t available.");
        const dish = recipe.dish_id ? await fetchDish(recipe.dish_id) : null;
        if (!alive) return;
        setForm({
          title: recipe.title,
          type: recipe.type === "dessert" ? "dessert" : "main",
          for_who: { Kids: "kids", Adult: "adult" }[whoFor(recipe)] || "all",
          count: recipe.servings.reduce((sum, s) => sum + (s.count || 0), 0) || 1,
          image: recipe.image || "",
          ingredients: recipe.ingredients.map((row) => row.value).join("\n"),
          steps: recipe.steps.map((row) => row.value).join("\n"),
          prep_ahead: recipe.prep_ahead || "",
          ref_url: recipe.ref_url || "",
          is_public: dish ? dish.is_public : true,
        });
        setLoaded(true);
      })
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [recipeId]);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      set("image")(await uploadRecipeImage(user.id, file));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Give the recipe a name."); return; }
    if (!lines(form.ingredients).length) { setError("Add at least one ingredient."); return; }
    setSaving(true);
    setError("");
    try {
      const id = await saveRecipe({ ...form, id: recipeId || null, count: Number(form.count) || 1, ingredients: lines(form.ingredients), steps: lines(form.steps) });
      refreshData();
      navigate(`/recipes/${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const header = (
    <RedHeader style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <BackButton fallback="/recipes" label="Back" />
      <h1 style={{ fontWeight: 800, fontSize: 28, lineHeight: 1, letterSpacing: -1.2 }}>{recipeId ? "Edit recipe" : "Add a recipe"}</h1>
    </RedHeader>
  );

  if (ready && !user) {
    return (
      <AppShell>
        {header}
        <Message>Sign in to add your own recipes.</Message>
        <div style={{ padding: "0 20px" }}><button className="btn-red" onClick={() => openSignIn()} style={{ ...primaryButton, width: "100%" }}>Sign in</button></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {header}
      {!loaded && !error && <Message>Loading…</Message>}
      {!loaded && error && <Message>{error}</Message>}
      {loaded && (
        <form onSubmit={submit} style={{ padding: "0 20px" }}>
          <Field id="title" label="Name">
            <input id="title" value={form.title} onChange={set("title")} maxLength={120} autoComplete="off" style={fieldStyle} />
          </Field>

          <div style={{ marginTop: 18 }}>
            <span style={labelStyle}>Photo</span>
            {form.image && <img src={form.image} alt="" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 16, display: "block", marginBottom: 10, background: "var(--line)" }} />}
            <button type="button" onClick={() => photoInput.current?.click()} disabled={uploading} style={{ ...outlineButton, width: "100%" }}>
              {uploading ? "Uploading…" : form.image ? "Change photo" : "Add a photo"}
            </button>
            <input ref={photoInput} type="file" accept="image/*" onChange={pickPhoto} tabIndex={-1} aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
          </div>

          <div style={{ marginTop: 18 }}>
            <span style={labelStyle}>Type</span>
            <Choice label="Type" value={form.type} onChange={set("type")} options={[["main", "Main"], ["dessert", "Dessert"]]} />
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 96px", gap: 12, alignItems: "end" }}>
            <div>
              <span style={labelStyle}>Who it's for</span>
              <Choice label="Who it's for" value={form.for_who} onChange={set("for_who")} options={[["all", "All"], ["kids", "Kids"], ["adult", "Adult"]]} />
            </div>
            <div>
              <label htmlFor="count" style={labelStyle}>Serves</label>
              <input id="count" type="number" inputMode="numeric" min={1} max={50} value={form.count} onChange={set("count")} style={{ ...fieldStyle, minHeight: 52 }} />
            </div>
          </div>

          <Field id="ingredients" label="Ingredients" hint="One per line, with the quantity. They go on the shopping list when you add the recipe to a week.">
            <textarea id="ingredients" value={form.ingredients} onChange={set("ingredients")} rows={7} placeholder={"400g chicken breast\n2 tbsp olive oil"} style={{ ...fieldStyle, resize: "vertical" }} />
          </Field>

          <Field id="steps" label="Method" hint="One step per line.">
            <textarea id="steps" value={form.steps} onChange={set("steps")} rows={7} style={{ ...fieldStyle, resize: "vertical" }} />
          </Field>

          <Field id="ahead" label="To do ahead (optional)">
            <input id="ahead" value={form.prep_ahead} onChange={set("prep_ahead")} maxLength={500} placeholder="Marinate the chicken in the morning" style={fieldStyle} />
          </Field>

          <Field id="source" label="Where it's from (optional)">
            <input id="source" type="url" inputMode="url" value={form.ref_url} onChange={set("ref_url")} placeholder="https://" autoCapitalize="none" autoCorrect="off" style={fieldStyle} />
          </Field>

          <div style={{ marginTop: 18 }}>
            <span style={labelStyle}>Who can see it</span>
            <Choice label="Who can see it" value={form.is_public} onChange={set("is_public")} options={[[true, "Everyone"], [false, kitchen ? `${kitchen.name} kitchen` : "Only me"]]} />
          </div>

          <button type="submit" className="btn-red" disabled={saving || uploading} style={{ ...primaryButton, width: "100%", marginTop: 24, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save recipe"}
          </button>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </AppShell>
  );
}
