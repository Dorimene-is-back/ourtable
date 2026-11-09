import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Shopping from "./pages/Shopping";
import WeekPage from "./weeks/WeekPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shopping" element={<Shopping />} />
      <Route path="/weeks/:weekId" element={<WeekPage />} />
    </Routes>
  );
}
