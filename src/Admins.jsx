import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Admins({ currentUserId }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/admins");
      if (res.ok) setAdmins(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addAdmin(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password) {
      alert("Fill in name, phone, and password.");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password }),
      });
      if (res.ok) {
        setName(""); setPhone(""); setPassword("");
        load();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create admin");
      }
    } catch (err) { alert(err.message); } finally { setCreating(false); }
  }

  async function removeAdmin(id, adminName) {
    if (!confirm(`Remove admin access for ${adminName}? They will no longer be able to sign in here.`)) return;
    try {
      const res = await apiFetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      if (res.ok) load();
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); }
  }

  if (loading) return <div className="center">Loading admins…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head">
          <h2>Add an admin</h2>
          <p className="hint">
            Give a colleague their own login to this panel. Each admin signs in with their own
            phone and password — every approval or rejection they make is recorded against their name.
          </p>
        </div>
        <form className="col" onSubmit={addAdmin}>
          <div className="row">
            <input className="input" placeholder="Full name" value={name}
              onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input className="input" placeholder="Phone (01XXXXXXXXX)" value={phone}
              onChange={(e) => setPhone(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          </div>
          <input className="input" type="password" placeholder="Password (min 6 characters)"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn" disabled={creating} style={{ alignSelf: "flex-start" }}>
            {creating ? "Creating…" : "Add admin"}
          </button>
        </form>
      </section>

      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Admins ({admins.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      <ul className="list">
        {admins.map((a) => (
          <li key={a._id} className="list-item">
            <span>
              <strong>{a.name}</strong> <span className="muted small">· {a.phone}</span>
              {a._id === currentUserId && <span className="pill pill-must" style={{ marginLeft: 8 }}>You</span>}
            </span>
            {a._id !== currentUserId && (
              <button className="icon-btn" onClick={() => removeAdmin(a._id, a.name)} title="Remove admin access">✕</button>
            )}
          </li>
        ))}
        {admins.length === 0 && <li className="muted small">No admins found.</li>}
      </ul>
    </div>
  );
}