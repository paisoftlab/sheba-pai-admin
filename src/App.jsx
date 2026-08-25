import { useState, useEffect } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ShopDashboard from "./ShopDashboard";
import "./App.css";

export default function App() {
  const [role, setRole] = useState(null); // null = logged out
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
    setRole(token ? user.role : null);
    setChecking(false);
  }, []);

  if (checking) return null;

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setRole(null);
  }

  if (!role) return <Login onLogin={() => {
    const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
    setRole(user.role);
  }} />;

  return role === "shop" ? <ShopDashboard onLogout={logout} /> : <Dashboard onLogout={logout} />;
}