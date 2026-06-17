import { BrowserRouter, Routes, Route, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import TasksPage from './components/tasks/TasksPage';
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
import NotFoundPage from "./pages/NotFoundPage";
import RootRedirect from "./pages/RootRedirect";
import AuthGuard from "./components/common/AuthGuard";
import CalendarPage from "./pages/calendar/CalendarPage";
import MentorProjectPage from "./pages/mentor/MentorProjectPage";
import UserProfilePage from "./pages/profile/UserProfilePage";
import AdminChatWidget from "./components/common/AdminChatWidget";
import AdminChatPage from "./pages/admin/AdminChatPage";

const PRIMARY_LINKS = [
  { to: "/dashboard", label: "Головна" },
  { to: "/projects", label: "Проєкти" },
  { to: "/tasks", label: "Мої задачі" },
  { to: "/leaderboard", label: "Рейтинг" },
];

const SECONDARY_LINKS = [
  { to: "/analytics", label: "Аналітика" },
  { to: "/reports", label: "Звіти" },
  { to: "/calendar", label: "Календар" },
  { to: "/mentor", label: "Менторство" },
];

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [globalRole, setGlobalRole] = useState(sessionStorage.getItem("globalRole"));
  const [fullName, setFullName] = useState(sessionStorage.getItem("fullName") || "");
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const moreRef = useRef(null);
  const userRef = useRef(null);

  const refreshAuth = () => {
    setToken(sessionStorage.getItem("token"));
    setGlobalRole(sessionStorage.getItem("globalRole"));
    setFullName(sessionStorage.getItem("fullName") || "");
  };

  useEffect(() => {
    window.addEventListener("authChanged", refreshAuth);
    return () => window.removeEventListener("authChanged", refreshAuth);
  }, []);

  useEffect(() => {
    refreshAuth();
    setMoreOpen(false);
    setUserOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("globalRole");
    sessionStorage.removeItem("fullName");
    setToken(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const isSecondaryActive = SECONDARY_LINKS.some((l) =>
    location.pathname.startsWith(l.to)
  );

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-primary-50 text-primary-700"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-2">

        {/* Логотип */}
        <Link to="/" className="flex items-center gap-2 mr-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">Squadly</span>
        </Link>

        {token && (
          <>
            {/* Основні посилання */}
            <div className="hidden md:flex items-center gap-0.5">
              {PRIMARY_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className={navLinkClass}>
                  {l.label}
                </NavLink>
              ))}

              {/* Дропдаун «Ще» */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    isSecondaryActive || moreOpen
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Ще
                  <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {moreOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                    {SECONDARY_LINKS.map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? "text-primary-700 bg-primary-50 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                          }`
                        }
                      >
                        {l.label}
                      </NavLink>
                    ))}
                    {globalRole === "Admin" && (
                      <>
                        <hr className="my-1 border-slate-100" />
                        <NavLink
                          to="/admin"
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm font-medium transition-colors ${
                              isActive ? "text-red-700 bg-red-50" : "text-red-600 hover:bg-red-50"
                            }`
                          }
                        >
                          Адмін-панель
                        </NavLink>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Права частина */}
            <div className="flex items-center gap-2 ml-auto">
              <SearchBar />
              <NotificationBell />

              {/* Аватар + профіль */}
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm text-slate-700 font-medium hidden sm:block max-w-[120px] truncate">
                    {fullName || "Профіль"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-900 truncate">{fullName}</p>
                      <p className="text-xs text-slate-400 capitalize">{globalRole?.toLowerCase()}</p>
                    </div>
                    <NavLink
                      to="/profile"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm transition-colors ${
                          isActive ? "text-primary-700 bg-primary-50" : "text-slate-700 hover:bg-slate-50"
                        }`
                      }
                    >
                      Мій профіль
                    </NavLink>
                    <NavLink
                      to="/notifications"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm transition-colors ${
                          isActive ? "text-primary-700 bg-primary-50" : "text-slate-700 hover:bg-slate-50"
                        }`
                      }
                    >
                      Сповіщення
                    </NavLink>
                    {globalRole !== "Admin" && (
                      <button
                        onClick={() => { setUserOpen(false); window.dispatchEvent(new Event("openAdminChat")); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Зв'язатися з адміном
                      </button>
                    )}
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Вийти з акаунту
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!token && (
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/login"
              className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
            >
              Увійти
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
            >
              Реєстрація
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/projects" element={<AuthGuard><ProjectsPage /></AuthGuard>} />
        <Route path="/projects/:id" element={<AuthGuard><ProjectDetailsPage /></AuthGuard>} />
        <Route path="/tasks" element={<AuthGuard><TasksPage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/users/:id" element={<AuthGuard><UserProfilePage /></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
        <Route path="/leaderboard" element={<AuthGuard><LeaderboardPage /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard><AnalyticsPage /></AuthGuard>} />
        <Route path="/reports" element={<AuthGuard><ReportsPage /></AuthGuard>} />
        <Route path="/mentor" element={<AuthGuard><MentorPage /></AuthGuard>} />
        <Route path="/mentor/project/:projectId" element={<AuthGuard><MentorProjectPage /></AuthGuard>} />
        <Route path="/calendar" element={<AuthGuard><CalendarPage /></AuthGuard>} />
        <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
        <Route path="/admin/chat" element={<AuthGuard><AdminChatPage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AdminChatWidget />
    </BrowserRouter>
  );
}
