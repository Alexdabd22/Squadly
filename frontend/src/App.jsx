import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectsPage from "./pages/ProjectsPage";
import TasksPage from "./pages/TasksPage";
import TeamsPage from "./pages/TeamsPage";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <nav style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/tasks">Tasks</Link>
          <Link to="/teams">Teams</Link>
        </nav>

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="*" element={<LoginPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/teams" element={<TeamsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}