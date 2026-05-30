import { Routes, Route } from "react-router-dom";
import MealIndex from "./MealIndex";
import WeekPage from "./weeks/WeekPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MealIndex />} />
      <Route path="/weeks/:weekId" element={<WeekPage />} />
    </Routes>
  );
}
