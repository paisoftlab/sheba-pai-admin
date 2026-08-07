import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const PRICING_LABEL = {
  admin_fixed: "Fixed by admin (locked)",
  admin_default: "Default, helper can edit",
  helper_flexible: "Helper sets price",
};

/* -------- Requirement block (defined OUTSIDE to keep input focus) -------- */
function RequirementBlock({ service, scopeLabel, list, form, onFieldChange, onAdd, onEdit, onDelete }) {
  const f = form || {};
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});

  function startEdit(r) {
    setEditingId(r._id);
    setEdit({
      title: r.title, titleBangla: r.titleBangla,
      forWhom: r.forWhom, isMandatory: r.isMandatory, maxPhotos: r.maxPhotos,
    });
  }
  async function saveEdit(r) {
    await onEdit(r._id, service._id, edit);
    setEditingId(null);
  }

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
            {editingId === r._id ? (
              <>
                <input className="input sm" value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                <input className="input sm" value={edit.titleBangla}
                  onChange={(e) => setEdit({ ...edit, titleBangla: e.target.value })} />
                <select className="input sm" value={edit.forWhom}
                  onChange={(e) => setEdit({ ...edit, forWhom: e.target.value })}>
                  <option value="helper">helper</option>
                  <option value="patient">patient</option>
                </select>
                <select className="input sm" value={edit.isMandatory ? "yes" : "no"}
                  onChange={(e) => setEdit({ ...edit, isMandatory: e.target.value === "yes" })}>
                  <option value="yes">mandatory</option>
                  <option value="no">optional</option>
                </select>
                <select className="input sm" value={edit.maxPhotos}
                  onChange={(e) => setEdit({ ...edit, maxPhotos: Number(e.target.value) })}>
                  <option value={1}>1 📷</option>
                  <option value={2}>2 📷</option>
                  <option value={3}>3 📷</option>
                </select>
                <button className="btn sm" onClick={() => saveEdit(r)}>Save</button>
                <button className="btn-ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className={`tag ${r.forWhom}`}>{r.forWhom}</span>
                <span className="reqTitle">
                  {r.titleBangla} <span className="muted">({r.title})</span>
                </span>
                <span className={r.isMandatory ? "must" : "opt"}>
                  {r.isMandatory ? "must" : "optional"}
                </span>
                <span className="muted small">{r.maxPhotos} 📷</span>
                <button className="link-btn" onClick={() => startEdit(r)}>edit</button>
                <button className="del" onClick={() => onDelete(r._id, service._id)}>✕</button>
              </>
            )}
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

/* -------- Pricing editor for a sub-service (defined OUTSIDE) -------- */
function PricingEditor({ sub, onSave }) {
  const [chargeType, setChargeType] = useState(sub.chargeType || "hourly");
  const [pricingMode, setPricingMode] = useState(sub.pricingMode || "helper_flexible");
  const [adminAmount, setAdminAmount] = useState(sub.adminAmount ?? "");
  const [dirty, setDirty] = useState(false);

  const needsAmount = pricingMode === "admin_fixed" || pricingMode === "admin_default";

  function mark(setter) {
    return (v) => { setter(v); setDirty(true); };
  }

  async function save() {
    await onSave(sub._id, {
      chargeType,
      pricingMode,
      adminAmount: needsAmount ? Number(adminAmount) || 0 : null,
    });
    setDirty(false);
  }

  return (
    <div className="pricingBox">
      <div className="pricingRow">
        <label className="pLabel">Charge</label>
        <select className="input sm" value={chargeType} onChange={(e) => mark(setChargeType)(e.target.value)}>
          <option value="hourly">Hourly</option>
          <option value="fixed">Fixed (per job)</option>
        </select>

        <label className="pLabel">Amount control</label>
        <select className="input sm" value={pricingMode} onChange={(e) => mark(setPricingMode)(e.target.value)}>
          <option value="helper_flexible">Helper sets price</option>
          <option value="admin_default">Default, helper can edit</option>
          <option value="admin_fixed">Fixed by admin (locked)</option>
        </select>

        {needsAmount && (
          <>
            <label className="pLabel">৳</label>
            <input className="input sm" type="number" placeholder="Amount"
              style={{ maxWidth: 110 }}
              value={adminAmount} onChange={(e) => mark(setAdminAmount)(e.target.value)} />
          </>
        )}

        {dirty && <button className="btn sm" onClick={save}>Save price</button>}
      </div>
      <p className="muted small" style={{ marginTop: 4 }}>
        {PRICING_LABEL[pricingMode]} · {chargeType === "hourly" ? "per hour" : "per job"}
      </p>
    </div>
  );
}

/* -------- Inline name editor (defined OUTSIDE) -------- */
function NameEditor({ initName, initBangla, onSave, onCancel }) {
  const [name, setName] = useState(initName);
  const [bangla, setBangla] = useState(initBangla);
  return (
    <div className="row" style={{ margin: 0, flex: 1 }}>
      <input className="input sm" value={bangla} onChange={(e) => setBangla(e.target.value)} placeholder="বাংলা" />
      <input className="input sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="English" />
      <button className="btn sm" onClick={() => onSave({ name, nameBangla: bangla })}>Save</button>
      <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

export default function ServiceManager() {
  const [tree, setTree] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [requirements, setRequirements] = useState({});
  const [editingName, setEditingName] = useState(null); // serviceId being renamed

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

  async function editService(id, body) {
    const res = await apiFetch(`/api/services/${id}`, {
      method: "PUT", body: JSON.stringify(body),
    });
    if (res.ok) { setEditingName(null); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function savePricing(subId, pricing) {
    await editService(subId, pricing);
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
        title: f.title, titleBangla: f.titleBangla,
        isMandatory: f.isMandatory !== false,
        maxPhotos: Number(f.maxPhotos) || 3,
      }),
    });
    if (res.ok) {
      setReqForm((p) => ({ ...p, [serviceId]: {} }));
      loadRequirements(serviceId);
    } else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function editRequirement(reqId, serviceId, body) {
    const willBeMandatory = body.isMandatory === true;
    if (willBeMandatory) {
      const ok = confirm("Making this mandatory may make some helpers/patients ineligible until they submit it. Continue?");
      if (!ok) return;
    }
    const res = await apiFetch(`/api/requirements/${reqId}`, {
      method: "PUT", body: JSON.stringify(body),
    });
    if (res.ok) loadRequirements(serviceId);
    else { const d = await res.json(); alert(d.error || "Failed"); }
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
          <div className="serviceHead">
            <span className="caret" onClick={() => toggleExpand(main)}>
              {expanded[main._id] ? "▾" : "▸"}
            </span>
            {editingName === main._id ? (
              <NameEditor initName={main.name} initBangla={main.nameBangla}
                onSave={(b) => editService(main._id, b)} onCancel={() => setEditingName(null)} />
            ) : (
              <div style={{ flex: 1 }} onClick={() => toggleExpand(main)}>
                <div className="serviceName">
                  {main.nameBangla} <span className="muted">({main.name})</span>
                </div>
                <div className="muted small">
                  Roles: {main.helperRoles.join(", ") || "—"} · {main.subServices.length} sub-services
                </div>
              </div>
            )}
            {editingName !== main._id && (
              <button className="link-btn" onClick={() => setEditingName(main._id)}>edit</button>
            )}
            <button className="del" onClick={() => delService(main._id)}>✕</button>
          </div>

          {expanded[main._id] && (
            <div className="serviceBody">
              <RequirementBlock
                service={main} scopeLabel="common for all its sub-services"
                list={requirements[main._id] || []} form={reqForm[main._id]}
                onFieldChange={setReqField} onAdd={addRequirement}
                onEdit={editRequirement} onDelete={delRequirement} />

              <div className="subSection">
                <strong>Sub-services</strong>
                {main.subServices.map((sub) => (
                  <div key={sub._id} className="subCard">
                    <div className="subHead">
                      {editingName === sub._id ? (
                        <NameEditor initName={sub.name} initBangla={sub.nameBangla}
                          onSave={(b) => editService(sub._id, b)} onCancel={() => setEditingName(null)} />
                      ) : (
                        <span className="subName">
                          {sub.nameBangla} <span className="muted">({sub.name})</span>
                        </span>
                      )}
                      <div>
                        {editingName !== sub._id && (
                          <button className="link-btn" onClick={() => setEditingName(sub._id)}>edit</button>
                        )}
                        <button className="del" onClick={() => delService(sub._id)}>✕</button>
                      </div>
                    </div>

                    <PricingEditor sub={sub} onSave={savePricing} />

                    <RequirementBlock
                      service={sub} scopeLabel="specific to this sub-service"
                      list={requirements[sub._id] || []} form={reqForm[sub._id]}
                      onFieldChange={setReqField} onAdd={addRequirement}
                      onEdit={editRequirement} onDelete={delRequirement} />
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