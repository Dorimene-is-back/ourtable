import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import WeekPage from "./weeks/WeekPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/weeks/:weekId" element={<WeekPage />} />
    </Routes>
  );
}
