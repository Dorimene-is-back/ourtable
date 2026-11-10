// Favourites, ratings, reviews with photos, and kitchens.
import { supabase } from "./supabase";

const fail = (error) => { throw new Error(error.message || "Something went wrong."); };

// ── Ratings and favourites ─────────────────────────────────────────────
// Average rating per dish, over the reviews the person may see (their own, their kitchen's, public ones).
export async function fetchRatings() {
  const { data, error } = await supabase.from("dish_ratings").select("dish_id, rating, ratings, reviews, photos");
  if (error) fail(error);
  return new Map((data || []).map((row) => [row.dish_id, row]));
}

export async function fetchFavorites(userId) {
  if (!userId) return new Set();
  const { data, error } = await supabase.from("favorites").select("dish_id").eq("user_id", userId);
  if (error) fail(error);
  return new Set((data || []).map((row) => row.dish_id));
}

export async function setFavorite(userId, dishId, on) {
  const query = on
    ? supabase.from("favorites").upsert({ user_id: userId, dish_id: dishId }, { onConflict: "user_id,dish_id", ignoreDuplicates: true })
    : supabase.from("favorites").delete().eq("user_id", userId).eq("dish_id", dishId);
  const { error } = await query;
  if (error) fail(error);
}

// ── Photos ─────────────────────────────────────────────────────────────
// Phone photos are several megabytes: shrink to 1600px on the long side before uploading.
export async function shrinkPhoto(file, max = 1600) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This photo could not be read."));
      img.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("This photo could not be read.");
  return blob;
}

async function upload(bucket, userId, file) {
  const blob = await shrinkPhoto(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" });
  if (error) fail(error);
  return path;
}

// The main photo of a recipe someone adds. Returns a public link.
export async function uploadRecipeImage(userId, file) {
  const path = await upload("recipe-images", userId, file);
  return supabase.storage.from("recipe-images").getPublicUrl(path).data.publicUrl;
}

// ── Reviews ────────────────────────────────────────────────────────────
// Every review of a dish the person may see, newest first, with who wrote it and a link to its photo.
export async function fetchReviews(dishId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, dish_id, recipe_id, kitchen_id, user_id, rating, comment, photo_path, is_public, cooked_on, source, created_at")
    .eq("dish_id", dishId)
    .order("cooked_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) fail(error);
  const reviews = data || [];

  const authorIds = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))];
  const paths = reviews.map((r) => r.photo_path).filter(Boolean);
  const [authors, photos] = await Promise.all([
    authorIds.length ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds) : { data: [] },
    paths.length ? supabase.storage.from("review-photos").createSignedUrls(paths, 3600) : { data: [] },
  ]);
  const authorById = new Map((authors.data || []).map((a) => [a.id, a]));
  const urlByPath = new Map((photos.data || []).filter((p) => p.signedUrl).map((p) => [p.path, p.signedUrl]));
  return reviews.map((r) => ({ ...r, author: authorById.get(r.user_id) || null, photoUrl: urlByPath.get(r.photo_path) || null }));
}

export async function addReview({ userId, kitchenId, dishId, recipeId, rating, comment, file, isPublic, cookedOn }) {
  const photoPath = file ? await upload("review-photos", userId, file) : null;
  const { error } = await supabase.from("reviews").insert({
    user_id: userId,
    kitchen_id: kitchenId || null,
    dish_id: dishId,
    recipe_id: recipeId || null,
    rating: rating || null,
    comment: (comment || "").trim(),
    photo_path: photoPath,
    is_public: !!isPublic,
    cooked_on: cookedOn || null,
  });
  if (error) {
    if (photoPath) await supabase.storage.from("review-photos").remove([photoPath]);
    fail(error);
  }
}

export async function deleteReview(review) {
  const { error } = await supabase.from("reviews").delete().eq("id", review.id);
  if (error) fail(error);
  if (review.photo_path) await supabase.storage.from("review-photos").remove([review.photo_path]);
}

// ── Recipes and weeks ──────────────────────────────────────────────────
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) fail(error);
  return data;
}

export const saveRecipe = (recipe) => rpc("save_recipe", { p: recipe });
export const deleteRecipe = (recipeId) => rpc("delete_recipe", { p_id: recipeId });
export const addRecipeToDay = (recipeId, isoDate) => rpc("add_recipe_to_day", { p_recipe: recipeId, p_date: isoDate });

export async function fetchDish(dishId) {
  const { data, error } = await supabase.from("dishes").select("id, title, kitchen_id, created_by, is_public").eq("id", dishId).maybeSingle();
  if (error) fail(error);
  return data;
}

// ── Kitchens ───────────────────────────────────────────────────────────
export const createKitchen = (name) => rpc("create_kitchen", { p_name: name });
export const createInvite = (kitchenId) => rpc("create_invite", { p_kitchen: kitchenId });
export const joinKitchen = (code) => rpc("join_kitchen", { p_code: code });
export const respondToRequest = (kitchenId, userId, approve) => rpc("respond_to_request", { p_kitchen: kitchenId, p_user: userId, p_approve: approve });
export const removeMember = (kitchenId, userId) => rpc("remove_member", { p_kitchen: kitchenId, p_user: userId });

export async function previewInvite(code) {
  const rows = await rpc("invite_preview", { p_code: code });
  return rows?.[0] || null;
}

export async function fetchMembers(kitchenId) {
  const { data, error } = await supabase.from("kitchen_members").select("user_id, role, status, created_at").eq("kitchen_id", kitchenId).order("created_at");
  if (error) fail(error);
  const ids = (data || []).map((m) => m.user_id);
  const profiles = ids.length ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids) : { data: [] };
  const byId = new Map((profiles.data || []).map((p) => [p.id, p]));
  return (data || []).map((m) => ({ ...m, profile: byId.get(m.user_id) || null }));
}

// The kitchen's live invite, if the person is its head.
export async function fetchInvite(kitchenId) {
  const { data } = await supabase.from("kitchen_invites").select("code, expires_at").eq("kitchen_id", kitchenId).eq("role", "member").gt("expires_at", new Date().toISOString()).maybeSingle();
  return data || null;
}

export async function updateKitchen(kitchenId, changes) {
  const { error } = await supabase.from("kitchens").update(changes).eq("id", kitchenId);
  if (error) fail(error);
}

export async function updateProfile(userId, changes) {
  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) fail(error);
}

export const inviteLink = (code) => `${window.location.origin}/join/${code}`;
