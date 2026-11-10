import { Navigate, Routes, Route } from "react-router-dom";
import AllWeeks from "./pages/AllWeeks";
import Home from "./pages/Home";
import Shopping from "./pages/Shopping";
import Recipe from "./pages/Recipe";
import Recipes from "./pages/Recipes";
import Week from "./pages/Week";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shopping" element={<Shopping />} />
      <Route path="/recipes" element={<Recipes />} />
      <Route path="/weeks" element={<AllWeeks />} />
      <Route path="/weeks/:weekId" element={<Week />} />
      <Route path="/weeks/:weekId/:recipeId" element={<Recipe />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
