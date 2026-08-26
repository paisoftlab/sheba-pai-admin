import { useState } from "react";
import { API_URL } from "./api";

export default function Login({ onLogin, onShowShopSignup }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      if (!["admin", "shop"].includes(data.user.role)) { setError("This account isn't set up for this login."); return; }
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      onLogin();
    } catch (err) {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-brand">
          <div className="mark">সে</div>
          <div className="brand">সেবা পাই</div>
          <p className="subtitle">Admin Console</p>
        </div>

        <label className="field">
          <span className="field-label">Phone</span>
          <input className="input" placeholder="01XXXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" placeholder="Your password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn block" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {onShowShopSignup && (
          <button type="button" className="btn-ghost block" style={{ marginTop: 10 }} onClick={onShowShopSignup}>
            New shop? Create an account
          </button>
        )}
      </form>
    </div>
  );
}