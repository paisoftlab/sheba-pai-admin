import { useState } from "react";
import { API_URL } from "./api";

/**
 * Creates a `role: "shop"` account — the backend already allows this via
 * public signup (same as helper/rider self-registration). This screen was
 * simply missing: the dashboard and admin-approval side existed, but
 * there was no way to actually create the account in the first place.
 */
export default function ShopSignup({ onDone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim() || !password) {
      setError("Please fill in every field.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password, role: "shop" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not create the account."); return; }
      onDone(); // back to login — the account exists now, sign in with it
    } catch (err) {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSignup}>
        <div className="login-brand">
          <div className="mark">সে</div>
          <div className="brand">সেবা পাই</div>
          <p className="subtitle">Register your shop</p>
        </div>

        <p className="hint" style={{ marginBottom: 14 }}>
          Creates your login. After signing in, you'll fill in your shop's address, contact
          details, and license — then an admin reviews and approves it before you can go live.
        </p>

        <label className="field">
          <span className="field-label">Owner / manager name</span>
          <input className="input" placeholder="Your name"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Phone</span>
          <input className="input" placeholder="01XXXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" placeholder="Choose a password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn block" disabled={loading}>
          {loading ? "Creating account…" : "Create shop account"}
        </button>

        <button type="button" className="btn-ghost block" style={{ marginTop: 10 }} onClick={onDone}>
          Back to sign in
        </button>
      </form>
    </div>
  );
}