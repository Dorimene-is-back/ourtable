import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Shopping from "./pages/Shopping";
import Recipe from "./pages/Recipe";
import Week from "./pages/Week";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shopping" element={<Shopping />} />
      <Route path="/weeks/:weekId" element={<Week />} />
      <Route path="/weeks/:weekId/:recipeId" element={<Recipe />} />
    </Routes>
  );
}
