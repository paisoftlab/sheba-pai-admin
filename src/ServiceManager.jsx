import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/* ------------------------------------------------------------------
   RequirementBlock is defined OUTSIDE ServiceManager on purpose.
   Defining a component inside another component's body creates a new
   component type on every render, which unmounts and remounts its
   inputs — making them lose focus after every keystroke.
------------------------------------------------------------------- */
function RequirementBlock({ service, scopeLabel, list, form, onFieldChange, onAdd, onDelete }) {
  const f = form || {};
  return (
    <div className="reqBlock">
      <div className="reqHead">
        <strong>Requirements</strong>
        <span className="muted small"> — {scopeLabel}</span>
      </div>

      {list.length === 0 && <p className="muted small">None yet.</p>}
      <ul className="reqList">
        {list.map((r) => (
          <li key={r._id} className="reqItem">
            <span className={`tag ${r.forWhom}`}>{r.forWhom}</span>
            <span className="reqTitle">
              {r.titleBangla} <span className="muted">({r.title})</span>
            </span>
            <span className={r.isMandatory ? "must" : "opt"}>
              {r.isMandatory ? "must" : "optional"}
            </span>
            <span className="muted small">{r.maxPhotos} 📷</span>
            <button className="del" onClick={() => onDelete(r._id, service._id)}>✕</button>
          </li>
        ))}
      </ul>

      <div className="reqForm">
        <input className="input sm" placeholder="Title (English)"
          value={f.title || ""}
          onChange={(e) => onFieldChange(service._id, "title", e.target.value)} />
        <input className="input sm" placeholder="শিরোনাম (বাংলা)"
          value={f.titleBangla || ""}
          onChange={(e) => onFieldChange(service._id, "titleBangla", e.target.value)} />
        <select className="input sm" value={f.forWhom || "helper"}
          onChange={(e) => onFieldChange(service._id, "forWhom", e.target.value)}>
          <option value="helper">For helper</option>
          <option value="patient">For patient</option>
        </select>
        <select className="input sm" value={f.isMandatory === false ? "no" : "yes"}
          onChange={(e) => onFieldChange(service._id, "isMandatory", e.target.value === "yes")}>
          <option value="yes">Mandatory</option>
          <option value="no">Optional</option>
        </select>
        <select className="input sm" value={f.maxPhotos || 3}
          onChange={(e) => onFieldChange(service._id, "maxPhotos", e.target.value)}>
          <option value={1}>1 photo</option>
          <option value={2}>2 photos</option>
          <option value={3}>3 photos</option>
        </select>
        <button className="btn sm" onClick={() => onAdd(service._id)}>+ Add</button>
      </div>
    </div>
  );
}

export default function ServiceManager() {
  const [tree, setTree] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [requirements, setRequirements] = useState({});

  const [mName, setMName] = useState("");
  const [mBangla, setMBangla] = useState("");
  const [mRoles, setMRoles] = useState([]);
  const [subForm, setSubForm] = useState({});
  const [reqForm, setReqForm] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        apiFetch("/api/services/tree"),
        apiFetch("/api/roles"),
      ]);
      setTree(await tRes.json());
      setRoles(await rRes.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadRequirements(serviceId) {
    try {
      const res = await apiFetch(`/api/services/${serviceId}/requirements`);
      const data = await res.json();
      setRequirements((prev) => ({ ...prev, [serviceId]: data }));
    } catch (e) {}
  }

  function toggleExpand(main) {
    const open = !expanded[main._id];
    setExpanded((p) => ({ ...p, [main._id]: open }));
    if (open) {
      loadRequirements(main._id);
      main.subServices.forEach((s) => loadRequirements(s._id));
    }
  }

  async function addMain(e) {
    e.preventDefault();
    if (!mName || !mBangla || mRoles.length === 0) {
      alert("Fill name, Bangla name and pick at least one role."); return;
    }
    const res = await apiFetch("/api/services", {
      method: "POST",
      body: JSON.stringify({ name: mName, nameBangla: mBangla, helperRoles: mRoles }),
    });
    if (res.ok) { setMName(""); setMBangla(""); setMRoles([]); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function addSub(mainId) {
    const f = subForm[mainId] || {};
    if (!f.name || !f.bangla) { alert("Fill both names"); return; }
    const res = await apiFetch("/api/services", {
      method: "POST",
      body: JSON.stringify({ name: f.name, nameBangla: f.bangla, parent: mainId }),
    });
    if (res.ok) { setSubForm((p) => ({ ...p, [mainId]: {} })); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function delService(id) {
    if (!confirm("Delete this service? Its requirements will be removed too.")) return;
    const res = await apiFetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function addRequirement(serviceId) {
    const f = reqForm[serviceId] || {};
    if (!f.title || !f.titleBangla) { alert("Fill requirement title (both languages)"); return; }
    const res = await apiFetch("/api/requirements", {
      method: "POST",
      body: JSON.stringify({
        service: serviceId,
        forWhom: f.forWhom || "helper",
        title: f.title,
        titleBangla: f.titleBangla,
        isMandatory: f.isMandatory !== false,
        maxPhotos: Number(f.maxPhotos) || 3,
      }),
    });
    if (res.ok) {
      setReqForm((p) => ({ ...p, [serviceId]: {} }));
      loadRequirements(serviceId);
    } else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function delRequirement(reqId, serviceId) {
    if (!confirm("Delete this requirement? Submissions for it will be removed.")) return;
    const res = await apiFetch(`/api/requirements/${reqId}`, { method: "DELETE" });
    if (res.ok) loadRequirements(serviceId);
  }

  function setReqField(serviceId, key, val) {
    setReqForm((p) => ({ ...p, [serviceId]: { ...(p[serviceId] || {}), [key]: val } }));
  }
  function setSubField(mainId, key, val) {
    setSubForm((p) => ({ ...p, [mainId]: { ...(p[mainId] || {}), [key]: val } }));
  }

  if (loading) return <div className="center">Loading services...</div>;

  return (
    <div>
      <section className="panel">
        <h2>Add a main service</h2>
        <p className="hint">
          Main services carry the roles. Helpers see only main services matching their profession.
        </p>
        <form className="col" onSubmit={addMain}>
          <div className="row">
            <input className="input" placeholder="Name (English)" value={mName}
              onChange={(e) => setMName(e.target.value)} />
            <input className="input" placeholder="নাম (বাংলা)" value={mBangla}
              onChange={(e) => setMBangla(e.target.value)} />
          </div>
          <div className="rolepick">
            <span className="muted">Served by roles:</span>
            {roles.map((r) => (
              <label key={r._id} className="chip">
                <input type="checkbox" checked={mRoles.includes(r.name)}
                  onChange={() => setMRoles((p) =>
                    p.includes(r.name) ? p.filter((x) => x !== r.name) : [...p, r.name])} />
                {r.nameBangla}
              </label>
            ))}
            {roles.length === 0 && <span className="muted">Add a role first.</span>}
          </div>
          <button className="btn">Add main service</button>
        </form>
      </section>

      {tree.length === 0 && (
        <div className="panel"><p className="muted">No services yet.</p></div>
      )}

      {tree.map((main) => (
        <div key={main._id} className="serviceCard">
          <div className="serviceHead" onClick={() => toggleExpand(main)}>
            <span className="caret">{expanded[main._id] ? "▾" : "▸"}</span>
            <div style={{ flex: 1 }}>
              <div className="serviceName">
                {main.nameBangla} <span className="muted">({main.name})</span>
              </div>
              <div className="muted small">
                Roles: {main.helperRoles.join(", ") || "—"} · {main.subServices.length} sub-services
              </div>
            </div>
            <button className="del" onClick={(e) => { e.stopPropagation(); delService(main._id); }}>✕</button>
          </div>

          {expanded[main._id] && (
            <div className="serviceBody">
              <RequirementBlock
                service={main}
                scopeLabel="common for all its sub-services"
                list={requirements[main._id] || []}
                form={reqForm[main._id]}
                onFieldChange={setReqField}
                onAdd={addRequirement}
                onDelete={delRequirement}
              />

              <div className="subSection">
                <strong>Sub-services</strong>
                {main.subServices.map((sub) => (
                  <div key={sub._id} className="subCard">
                    <div className="subHead">
                      <span className="subName">
                        {sub.nameBangla} <span className="muted">({sub.name})</span>
                      </span>
                      <button className="del" onClick={() => delService(sub._id)}>✕</button>
                    </div>
                    <RequirementBlock
                      service={sub}
                      scopeLabel="specific to this sub-service"
                      list={requirements[sub._id] || []}
                      form={reqForm[sub._id]}
                      onFieldChange={setReqField}
                      onAdd={addRequirement}
                      onDelete={delRequirement}
                    />
                  </div>
                ))}

                <div className="row" style={{ marginTop: 10 }}>
                  <input className="input sm" placeholder="Sub-service (English)"
                    value={(subForm[main._id] || {}).name || ""}
                    onChange={(e) => setSubField(main._id, "name", e.target.value)} />
                  <input className="input sm" placeholder="উপ-সেবা (বাংলা)"
                    value={(subForm[main._id] || {}).bangla || ""}
                    onChange={(e) => setSubField(main._id, "bangla", e.target.value)} />
                  <button className="btn sm" onClick={() => addSub(main._id)}>+ Sub-service</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}