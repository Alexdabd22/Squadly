import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import TasksPage from "./pages/tasks/TasksPage";
import ProfilePage from "./pages/profile/ProfilePage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import NotificationBell from "./components/layout/NotificationBell";
import LeaderboardPage from "./pages/leaderboard/LeaderboardPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import ReportsPage from "./pages/reports/ReportsPage";
import MentorPage from "./pages/mentor/MentorPage";
import AdminPage from "./pages/admin/AdminPage";
import SearchBar from "./components/common/SearchBar";
import ProjectDetailsPage from "./pages/projects/ProjectDetailsPage";

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [globalRole, setGlobalRole] = useState(sessionStorage.getItem("globalRole"));

  const refreshAuth = () => {
    setToken(sessionStorage.getItem("token"));
    setGlobalRole(sessionStorage.getItem("globalRole"));
  };

  useEffect(() => {
    window.addEventListener("authChanged", refreshAuth);
    return () => window.removeEventListener("authChanged", refreshAuth);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [location]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("globalRole");
    setToken(null);
    setGlobalRole(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
      <span className="font-bold text-primary-600 text-lg">Squadly</span>
      {token && (
        <>
          <Link to="/dashboard" className="text-sm text-slate-700 hover:text-primary-600">Головна</Link>
          <Link to="/projects" className="text-sm text-slate-700 hover:text-primary-600">Проєкти</Link>
          <Link to="/tasks" className="text-sm text-slate-700 hover:text-primary-600">Мої задачі</Link>
          <Link to="/leaderboard" className="text-sm text-slate-700 hover:text-primary-600">Рейтинг</Link>
          <Link to="/analytics" className="text-sm text-slate-700 hover:text-primary-600">Аналітика</Link>
          <Link to="/reports" className="text-sm text-slate-700 hover:text-primary-600">Звіти</Link>
          <Link to="/mentor" className="text-sm text-slate-700 hover:text-primary-600">Менторство</Link>
          <Link to="/profile" className="text-sm text-slate-700 hover:text-primary-600">Профіль</Link>
          {globalRole === "Admin" && (
            <Link to="/admin" className="text-sm text-red-600 hover:text-red-700 font-semibold">
              Адмін-панель
            </Link>
          )}
        </>
      )}
      <span className="flex-1"></span>
      {token && (
        <>
          <SearchBar />
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
          >
            Вийти
          </button>
        </>
      )}
      {!token && (
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/mentor" element={<MentorPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/projects/:id" element={<ProjectDetailsPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}