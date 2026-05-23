import { Routes, Route } from "react-router-dom";
import MealIndex from "./MealIndex";
import Week20260525 from "./weeks/Week20260525";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MealIndex />} />
      <Route path="/weeks/2026-05-25" element={<Week20260525 />} />
    </Routes>
  );
}
