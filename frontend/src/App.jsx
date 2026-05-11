import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import TasksPage from "./pages/tasks/TasksPage";
import TeamsPage from "./pages/teams/TeamsPage";
import ProfilePage from "./pages/profile/ProfilePage";

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userId, setUserId] = useState(localStorage.getItem("userId"));

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
      setUserId(localStorage.getItem("userId"));
    };

    window.addEventListener("authChanged", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("authChanged", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUserId(localStorage.getItem("userId"));
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-primary-600 text-lg">Squadly</span>
      <Link to="/projects" className="text-sm text-slate-700 hover:text-primary-600">Проєкти</Link>
      <Link to="/tasks" className="text-sm text-slate-700 hover:text-primary-600">Задачі</Link>
      <Link to="/teams" className="text-sm text-slate-700 hover:text-primary-600">Команди</Link>
      <Link to="/profile" className="text-sm text-slate-700 hover:text-primary-600">Профіль</Link>
      <span className="flex-1"></span>
      {token ? (
        <>
          <span className="text-xs text-slate-500 font-mono">{userId?.substring(0, 8)}...</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
          >
            Вийти
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="text-sm text-slate-700 hover:text-primary-600">Вхід</Link>
          <Link to="/register" className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium">Реєстрація</Link>
        </>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}