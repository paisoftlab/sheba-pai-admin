import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import Verifications from "./Verifications";
import ServiceManager from "./ServiceManager";
import Submissions from "./Submissions";
import Payments from "./Payments";
import Reports from "./Reports";
import Settings from "./Settings";
import Admins from "./Admins";
import Pharmacy from "./Pharmacy";
import Orders from "./Orders";

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("verify");
  const currentUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [roleBangla, setRoleBangla] = useState("");
  // pending counts for tab badges
  const [pending, setPending] = useState({ verify: 0, submissions: 0, payments: 0, orders: 0 });

  async function loadRoles() {
    try {
      const res = await apiFetch("/api/roles");
      setRoles(await res.json());
    } catch (e) {}
  }
  async function loadCounts() {
    try {
      const [v, s, p, o] = await Promise.all([
        apiFetch("/api/admin/verifications?status=pending"),
        apiFetch("/api/admin/submissions?status=pending"),
        apiFetch("/api/admin/payments?status=pending"),
        apiFetch("/api/admin/orders?status=pending"),
      ]);
      const vd = v.ok ? await v.json() : [];
      const sd = s.ok ? await s.json() : [];
      const pd = p.ok ? await p.json() : [];
      const od = o.ok ? await o.json() : [];
      setPending({ verify: vd.length || 0, submissions: sd.length || 0, payments: pd.length || 0, orders: od.length || 0 });
    } catch (e) {}
  }
  useEffect(() => { loadRoles(); loadCounts(); }, []);

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
    if (!confirm("Delete this role? Helpers using it may be affected.")) return;
    const res = await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) loadRoles();
  }

  const TABS = [
    { key: "verify", label: "Identity checks", badge: pending.verify },
    { key: "submissions", label: "Document proofs", badge: pending.submissions },
    { key: "payments", label: "Payments", badge: pending.payments },
    { key: "orders", label: "Orders", badge: pending.orders },
    { key: "reports", label: "Overview", badge: null },
    { key: "services", label: "Services", badge: null },
    { key: "pharmacy", label: "Pharmacy", badge: null },
    { key: "roles", label: "Professions", badge: null },
    { key: "settings", label: "Settings", badge: null },
    { key: "admins", label: "Admins", badge: null },
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="mark">সে</div>
          <div>
            <h1>সেবা পাই</h1>
            <div className="tag">Admin Console</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={logout}>Sign out</button>
      </header>

      <nav className="tabs">
        {TABS.map((tb) => (
          <button key={tb.key}
            className={tab === tb.key ? "tab active" : "tab"}
            onClick={() => { setTab(tb.key); if (["verify", "submissions", "payments", "orders"].includes(tb.key)) loadCounts(); }}>
            {tb.label}
            {tb.badge !== null && (
              <span className={`count ${tb.badge === 0 ? "zero" : ""}`}>{tb.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === "verify" && <Verifications onChange={loadCounts} />}
      {tab === "submissions" && <Submissions onChange={loadCounts} />}
      {tab === "payments" && <Payments onChange={loadCounts} />}
      {tab === "reports" && <Reports />}
      {tab === "settings" && <Settings />}
      {tab === "admins" && <Admins currentUserId={currentUser._id || currentUser.id} />}
      {tab === "pharmacy" && <Pharmacy />}
      {tab === "orders" && <Orders />}
      {tab === "services" && <ServiceManager />}

      {tab === "roles" && (
        <section className="panel">
          <div className="panel-head">
            <h2>Professions</h2>
            <p className="hint">
              A caregiver picks one profession when they join. They then only see the
              services you've assigned to that profession.
            </p>
          </div>
          <form className="row" onSubmit={addRole} style={{ marginBottom: 18 }}>
            <input className="input" placeholder="Name (English)" value={roleName}
              onChange={(e) => setRoleName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input className="input" placeholder="নাম (বাংলা)" value={roleBangla}
              onChange={(e) => setRoleBangla(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <button className="btn">Add profession</button>
          </form>
          <ul className="list">
            {roles.map((r) => (
              <li key={r._id} className="list-item">
                <span><strong>{r.nameBangla}</strong> <span className="muted">· {r.name}</span></span>
                <button className="icon-btn" onClick={() => deleteRole(r._id)} title="Delete">✕</button>
              </li>
            ))}
            {roles.length === 0 && <li className="muted small">No professions yet. Add one above.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}