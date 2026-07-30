import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import Verifications from "./Verifications";

export default function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("verify"); // "verify" | "manage"
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleName, setRoleName] = useState("");
  const [roleBangla, setRoleBangla] = useState("");
  const [svcName, setSvcName] = useState("");
  const [svcBangla, setSvcBangla] = useState("");
  const [svcRoles, setSvcRoles] = useState([]);

  async function loadAll() {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        apiFetch("/api/roles"),
        apiFetch("/api/services"),
      ]);
      setRoles(await rRes.json());
      setServices(await sRes.json());
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

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
    if (res.ok) {
      setRoleName(""); setRoleBangla(""); loadAll();
    } else {
      const d = await res.json(); alert(d.error || "Failed");
    }
  }
  async function deleteRole(id) {
    if (!confirm("Delete this role?")) return;
    const res = await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) loadAll();
  }
  function toggleSvcRole(name) {
    setSvcRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }
  async function addService(e) {
    e.preventDefault();
    if (!svcName || !svcBangla || svcRoles.length === 0) {
      alert("Fill name, Bangla name, and pick at least one role."); return;
    }
    const res = await apiFetch("/api/services", {
      method: "POST",
      body: JSON.stringify({ name: svcName, nameBangla: svcBangla, helperRoles: svcRoles }),
    });
    if (res.ok) {
      setSvcName(""); setSvcBangla(""); setSvcRoles([]); loadAll();
    } else {
      const d = await res.json(); alert(d.error || "Failed");
    }
  }
  async function deleteService(id) {
    if (!confirm("Delete this service?")) return;
    const res = await apiFetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) loadAll();
  }

  return (
    <div className="dash">
      <header className="topbar">
        <h1 className="brand-sm">সেবা পাই — Admin</h1>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </header>

      <div className="tabs">
        <button
          className={tab === "verify" ? "tab active" : "tab"}
          onClick={() => setTab("verify")}
        >
          Verifications
        </button>
        <button
          className={tab === "manage" ? "tab active" : "tab"}
          onClick={() => setTab("manage")}
        >
          Services & Roles
        </button>
      </div>

      {tab === "verify" && <Verifications />}

      {tab === "manage" && (
        loading ? <div className="center">Loading...</div> : (
        <div className="grid">
          <section className="panel">
            <h2>Helper Roles</h2>
            <p className="hint">The kinds of helpers (Nurse, Doctor, Staff...).</p>
            <form className="row" onSubmit={addRole}>
              <input className="input" placeholder="Name (English)" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              <input className="input" placeholder="নাম (বাংলা)" value={roleBangla} onChange={(e) => setRoleBangla(e.target.value)} />
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

          <section className="panel">
            <h2>Services</h2>
            <p className="hint">What a patient can request. Pick which roles fulfill each.</p>
            <form className="col" onSubmit={addService}>
              <input className="input" placeholder="Service name (English)" value={svcName} onChange={(e) => setSvcName(e.target.value)} />
              <input className="input" placeholder="সেবার নাম (বাংলা)" value={svcBangla} onChange={(e) => setSvcBangla(e.target.value)} />
              <div className="rolepick">
                <span className="muted">Served by:</span>
                {roles.map((r) => (
                  <label key={r._id} className="chip">
                    <input type="checkbox" checked={svcRoles.includes(r.name)} onChange={() => toggleSvcRole(r.name)} />
                    {r.nameBangla}
                  </label>
                ))}
                {roles.length === 0 && <span className="muted">Add a role first.</span>}
              </div>
              <button className="btn">Add Service</button>
            </form>
            <ul className="list">
              {services.map((s) => (
                <li key={s._id} className="item">
                  <span>
                    <strong>{s.nameBangla}</strong> <span className="muted">({s.name})</span><br />
                    <span className="muted small">→ {s.helperRoles.join(", ")}</span>
                  </span>
                  <button className="del" onClick={() => deleteService(s._id)}>✕</button>
                </li>
              ))}
              {services.length === 0 && <li className="muted">No services yet.</li>}
            </ul>
          </section>
        </div>
        )
      )}
    </div>
  );
}