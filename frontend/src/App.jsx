import { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import client from "./api/client";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import WeeklyTimesheet from "./pages/WeeklyTimesheet";
import AdminDashboard from "./pages/AdminDashboard";
import MonthlyReport from "./pages/MonthlyReport";
import ManageUsers from "./pages/ManageUsers";
import NavBar from "./components/NavBar";
import "./App.css";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    Promise.all([
      client
        .get("/api/auth/me")
        .then((r) => r.data)
        .catch(() => null),
      client
        .get("/api/auth/needs-setup")
        .then((r) => r.data.needsSetup)
        .catch(() => false),
    ])
      .then(([me, setup]) => {
        setUser(me);
        setNeedsSetup(setup);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await client.post("/api/auth/logout");
    setUser(null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      <BrowserRouter>
        {user && <NavBar />}
        <main>
          <Routes>
            <Route
              path="/setup"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : needsSetup ? (
                  <Setup />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : needsSetup ? (
                  <Navigate to="/setup" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  {user?.role === "admin" ? <AdminDashboard /> : <Dashboard />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/timesheets/:id"
              element={
                <ProtectedRoute>
                  <WeeklyTimesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute adminOnly>
                  <MonthlyReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
