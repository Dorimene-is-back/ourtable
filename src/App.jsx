import { Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import AllWeeks from "./pages/AllWeeks";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Plan from "./pages/Plan";
import Shopping from "./pages/Shopping";
import Recipe from "./pages/Recipe";
import RecipeForm from "./pages/RecipeForm";
import Recipes from "./pages/Recipes";
import Table from "./pages/Table";
import Week from "./pages/Week";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/new" element={<RecipeForm />} />
        <Route path="/recipes/:recipeId" element={<Recipe />} />
        <Route path="/recipes/:recipeId/edit" element={<RecipeForm />} />
        <Route path="/weeks" element={<AllWeeks />} />
        <Route path="/weeks/:weekId" element={<Week />} />
        <Route path="/weeks/:weekId/:recipeId" element={<Recipe />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/table" element={<Table />} />
        <Route path="/kitchen" element={<Navigate to="/table" replace />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
