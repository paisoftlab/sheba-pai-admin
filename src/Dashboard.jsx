import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import Verifications from "./Verifications";
import ServiceManager from "./ServiceManager";
import Submissions from "./Submissions";

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("verify");
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [roleBangla, setRoleBangla] = useState("");

  async function loadRoles() {
    try {
      const res = await apiFetch("/api/roles");
      setRoles(await res.json());
    } catch (e) {}
  }
  useEffect(() => { loadRoles(); }, []);

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    onLogout();
  }

  async function addRole(e) {
    e.preventDefault();
    if (!roleName || !roleBangla) return;
    const res = await apiFetch("/api/roles", {
      method: "POST",
      body: JSON.stringify({ name: roleName, nameBangla: roleBangla }),
    });
    if (res.ok) { setRoleName(""); setRoleBangla(""); loadRoles(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function deleteRole(id) {
    if (!confirm("Delete this role?")) return;
    const res = await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) loadRoles();
  }

  const TABS = [
    { key: "verify", label: "Identity verification" },
    { key: "submissions", label: "Requirement proofs" },
    { key: "services", label: "Services & requirements" },
    { key: "roles", label: "Roles" },
  ];

  return (
    <div className="dash">
      <header className="topbar">
        <h1 className="brand-sm">সেবা পাই — Admin</h1>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </header>

      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb.key}
            className={tab === tb.key ? "tab active" : "tab"}
            onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "verify" && <Verifications />}
      {tab === "submissions" && <Submissions />}
      {tab === "services" && <ServiceManager />}

      {tab === "roles" && (
        <section className="panel">
          <h2>Helper roles (professions)</h2>
          <p className="hint">
            A helper picks one of these. They then only see services matching it.
          </p>
          <form className="row" onSubmit={addRole}>
            <input className="input" placeholder="Name (English)" value={roleName}
              onChange={(e) => setRoleName(e.target.value)} />
            <input className="input" placeholder="নাম (বাংলা)" value={roleBangla}
              onChange={(e) => setRoleBangla(e.target.value)} />
            <button className="btn">Add</button>
          </form>
          <ul className="list">
            {roles.map((r) => (
              <li key={r._id} className="item">
                <span><strong>{r.nameBangla}</strong> <span className="muted">({r.name})</span></span>
                <button className="del" onClick={() => deleteRole(r._id)}>✕</button>
              </li>
            ))}
            {roles.length === 0 && <li className="muted">No roles yet.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}