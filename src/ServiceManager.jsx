import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/* All sub-components are defined OUTSIDE the main component so inputs keep focus. */

/* ---------- Small building blocks ---------- */

function Pill({ kind, children }) {
  return <span className={`pill pill-${kind}`}>{children}</span>;
}

/* One requirement line (view + inline edit) */
function RequirementRow({ r, serviceId, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [e, setE] = useState({});
  function start() {
    setEditing(true);
    setE({ title: r.title, titleBangla: r.titleBangla, forWhom: r.forWhom, isMandatory: r.isMandatory, maxPhotos: r.maxPhotos });
  }
  async function save() { await onEdit(r._id, serviceId, e); setEditing(false); }

  if (editing) {
    return (
      <div className="req">
        <input className="input sm" value={e.titleBangla} onChange={(ev) => setE({ ...e, titleBangla: ev.target.value })} placeholder="বাংলা" />
        <input className="input sm" value={e.title} onChange={(ev) => setE({ ...e, title: ev.target.value })} placeholder="English" />
        <select className="input sm" value={e.forWhom} onChange={(ev) => setE({ ...e, forWhom: ev.target.value })}>
          <option value="helper">Caregiver</option><option value="patient">Patient</option>
        </select>
        <select className="input sm" value={e.isMandatory ? "y" : "n"} onChange={(ev) => setE({ ...e, isMandatory: ev.target.value === "y" })}>
          <option value="y">Mandatory</option><option value="n">Optional</option>
        </select>
        <select className="input sm" value={e.maxPhotos} onChange={(ev) => setE({ ...e, maxPhotos: Number(ev.target.value) })}>
          <option value={1}>1📷</option><option value={2}>2📷</option><option value={3}>3📷</option>
        </select>
        <button className="btn sm" onClick={save}>Save</button>
        <button className="btn-ghost sm" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="req">
      <Pill kind={r.forWhom === "patient" ? "patient" : "helper"}>{r.forWhom === "patient" ? "Patient" : "Caregiver"}</Pill>
      <span className="req-title">{r.titleBangla} <span className="muted small">· {r.title}</span></span>
      <Pill kind={r.isMandatory ? "must" : "opt"}>{r.isMandatory ? "Must" : "Optional"}</Pill>
      <Pill kind="photos">{r.maxPhotos}📷</Pill>
      <button className="link-btn" onClick={start}>Edit</button>
      <button className="icon-btn" onClick={() => onDelete(r._id, serviceId)}>✕</button>
    </div>
  );
}

/* Documents editor (opens on demand) */
function DocumentsEditor({ service, list, form, onFieldChange, onAdd, onEdit, onDelete, helpText }) {
  const f = form || {};
  return (
    <div className="editor">
      <p className="editor-help">{helpText}</p>
      {list.length === 0 && <p className="muted small" style={{ margin: "6px 0" }}>No documents required yet.</p>}
      <div className="reqs">
        {list.map((r) => <RequirementRow key={r._id} r={r} serviceId={service._id} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
      <div className="req-form">
        <input className="input sm" placeholder="বাংলা নাম" value={f.titleBangla || ""} onChange={(e) => onFieldChange(service._id, "titleBangla", e.target.value)} />
        <input className="input sm" placeholder="English name" value={f.title || ""} onChange={(e) => onFieldChange(service._id, "title", e.target.value)} />
        <select className="input sm" value={f.forWhom || "helper"} onChange={(e) => onFieldChange(service._id, "forWhom", e.target.value)}>
          <option value="helper">For caregiver</option><option value="patient">For patient</option>
        </select>
        <select className="input sm" value={f.isMandatory === false ? "n" : "y"} onChange={(e) => onFieldChange(service._id, "isMandatory", e.target.value === "y")}>
          <option value="y">Mandatory</option><option value="n">Optional</option>
        </select>
        <select className="input sm" value={f.maxPhotos || 3} onChange={(e) => onFieldChange(service._id, "maxPhotos", e.target.value)}>
          <option value={1}>1📷</option><option value={2}>2📷</option><option value={3}>3📷</option>
        </select>
        <button className="btn sm" onClick={() => onAdd(service._id)}>+ Add</button>
      </div>
    </div>
  );
}

/* Pricing editor (opens on demand) */
function PricingEditor({ sub, onSave }) {
  const [chargeType, setChargeType] = useState(sub.chargeType || "hourly");
  const [pricingMode, setPricingMode] = useState(sub.pricingMode || "helper_flexible");
  const [adminAmount, setAdminAmount] = useState(sub.adminAmount ?? "");
  const [commissionPercent, setCommissionPercent] = useState(sub.commissionPercent ?? 0);
  const [dirty, setDirty] = useState(false);
  const needsAmount = pricingMode === "admin_fixed" || pricingMode === "admin_default";
  const mark = (setter) => (v) => { setter(v); setDirty(true); };
  async function save() {
    await onSave(sub._id, {
      chargeType, pricingMode,
      adminAmount: needsAmount ? Number(adminAmount) || 0 : null,
      commissionPercent: Number(commissionPercent) || 0,
    });
    setDirty(false);
  }
  return (
    <div className="editor">
      <div className="field-grid">
        <label className="field">
          <span className="field-label">How it's charged</span>
          <select className="input sm" value={chargeType} onChange={(e) => mark(setChargeType)(e.target.value)}>
            <option value="hourly">Per hour</option><option value="fixed">Per job (fixed)</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Who sets the price</span>
          <select className="input sm" value={pricingMode} onChange={(e) => mark(setPricingMode)(e.target.value)}>
            <option value="helper_flexible">Caregiver decides</option>
            <option value="admin_default">Default, caregiver can change</option>
            <option value="admin_fixed">Fixed by you (locked)</option>
          </select>
        </label>
        {needsAmount && (
          <label className="field">
            <span className="field-label">Amount ৳</span>
            <input className="input sm" type="number" value={adminAmount} onChange={(e) => mark(setAdminAmount)(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span className="field-label">Platform commission %</span>
          <input className="input sm" type="number" min="0" max="100" style={{ maxWidth: 90 }}
            value={commissionPercent} onChange={(e) => mark(setCommissionPercent)(e.target.value)} />
        </label>
      </div>
      <p className="editor-help">
        {pricingMode === "admin_fixed" && "Caregivers cannot change this price. "}
        {pricingMode === "admin_default" && "Caregivers start from your amount but may adjust it. "}
        {pricingMode === "helper_flexible" && "Each caregiver sets their own price. "}
        Charged {chargeType === "hourly" ? "per hour" : "per job"}.
        {Number(commissionPercent) > 0 && <> The platform takes <strong>{commissionPercent}%</strong> of each completed job as commission.</>}
      </p>
      {dirty && <button className="btn sm" onClick={save}>Save price</button>}
    </div>
  );
}

/* Patient check editor (opens on demand) */
function PatientCheckEditor({ service, hasPatientReqs, onSave }) {
  const [mode, setMode] = useState(service.patientVerificationMode || "none");
  const [dirty, setDirty] = useState(false);
  async function save() { await onSave(service._id, { patientVerificationMode: mode }); setDirty(false); }
  return (
    <div className="editor">
      <select className="input sm" value={mode} onChange={(e) => { setMode(e.target.value); setDirty(true); }} style={{ maxWidth: 380 }}>
        <option value="none">No check — patient books in one tap</option>
        <option value="submit">Patient uploads documents before booking</option>
        <option value="approved">Patient must be approved before booking</option>
      </select>
      <p className="editor-help">
        {mode === "none" && "Most services use this. Anyone can request without paperwork."}
        {mode === "submit" && "Patient uploads the 'For patient' documents, then can book right away (you review in parallel)."}
        {mode === "approved" && "Patient must upload AND be approved by you before they can book."}
      </p>
      {mode !== "none" && !hasPatientReqs && (
        <p className="editor-help warn">⚠ You've turned on a patient check but added no “For patient” documents — add one under Documents, or patients will have nothing to upload.</p>
      )}
      {dirty && <button className="btn sm" onClick={save}>Save</button>}
    </div>
  );
}

function NameEditor({ initName, initBangla, onSave, onCancel }) {
  const [name, setName] = useState(initName);
  const [bangla, setBangla] = useState(initBangla);
  return (
    <div className="row" style={{ flex: 1 }}>
      <input className="input sm" value={bangla} onChange={(e) => setBangla(e.target.value)} placeholder="বাংলা" />
      <input className="input sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="English" />
      <button className="btn sm" onClick={() => onSave({ name, nameBangla: bangla })}>Save</button>
      <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

/* A sub-service row: quiet summary + action buttons that open ONE editor */
function SubServiceCard(props) {
  const { sub, reqs, ctx } = props;
  const [open, setOpen] = useState(null); // 'price' | 'docs' | 'patient' | 'name' | null
  const toggle = (k) => setOpen(open === k ? null : k);

  const priceLabel = (() => {
    if (sub.pricingMode === "admin_fixed" || sub.pricingMode === "admin_default") {
      return `৳${sub.adminAmount ?? "?"}${sub.chargeType === "hourly" ? "/hr" : ""}`;
    }
    return sub.chargeType === "hourly" ? "caregiver price/hr" : "caregiver price";
  })();
  const docCount = reqs.length;
  const patientLabel = { none: "off", submit: "upload", approved: "approved" }[sub.patientVerificationMode || "none"];
  const hasPatientReqs = reqs.some((r) => r.forWhom === "patient");

  return (
    <div className="sub2">
      <div className="sub2-head">
        {open === "name" ? (
          <NameEditor initName={sub.name} initBangla={sub.nameBangla}
            onSave={(b) => { ctx.editService(sub._id, b); setOpen(null); }} onCancel={() => setOpen(null)} />
        ) : (
          <div className="sub2-title-wrap">
            <div className="sub2-title">{sub.nameBangla} <span className="muted small">· {sub.name}</span></div>
            <div className="sub2-summary">💵 {priceLabel} · 🏦 {sub.commissionPercent || 0}% comm · 📄 {docCount} docs · 🛡️ {patientLabel}</div>
          </div>
        )}
        <button className="icon-btn" onClick={() => ctx.delService(sub._id)}>✕</button>
      </div>

      <div className="action-row">
        <button className={open === "price" ? "chip-btn on" : "chip-btn"} onClick={() => toggle("price")}>💵 Price</button>
        <button className={open === "docs" ? "chip-btn on" : "chip-btn"} onClick={() => toggle("docs")}>📄 Documents</button>
        <button className={open === "patient" ? "chip-btn on" : "chip-btn"} onClick={() => toggle("patient")}>🛡️ Patient check</button>
        <button className={open === "name" ? "chip-btn on" : "chip-btn"} onClick={() => toggle("name")}>✏️ Rename</button>
      </div>

      {open === "price" && <PricingEditor sub={sub} onSave={ctx.savePricing} />}
      {open === "docs" && (
        <DocumentsEditor service={sub} list={reqs} form={ctx.reqForm[sub._id]}
          onFieldChange={ctx.setReqField} onAdd={ctx.addRequirement} onEdit={ctx.editRequirement} onDelete={ctx.delRequirement}
          helpText="Documents needed only for this sub-service (on top of the main service's common documents)." />
      )}
      {open === "patient" && <PatientCheckEditor service={sub} hasPatientReqs={hasPatientReqs} onSave={ctx.editService} />}
    </div>
  );
}

/* A main service card: quiet by default, sub-services listed, settings behind a button */
function MainServiceCard({ main, ctx }) {
  const isOpen = ctx.expanded[main._id];
  const [settingsOpen, setSettingsOpen] = useState(null); // 'docs' | 'patient' | null
  const mainReqs = ctx.requirements[main._id] || [];
  const hasPatientReqs = mainReqs.some((r) => r.forWhom === "patient");

  return (
    <div className="svc">
      <div className="svc-head">
        <span className="svc-caret" onClick={() => ctx.toggleExpand(main)}>{isOpen ? "▾" : "▸"}</span>
        {ctx.editingName === main._id ? (
          <NameEditor initName={main.name} initBangla={main.nameBangla} onSave={(b) => ctx.editService(main._id, b)} onCancel={() => ctx.setEditingName(null)} />
        ) : (
          <div style={{ flex: 1 }} onClick={() => ctx.toggleExpand(main)}>
            <div className="svc-title">{main.nameBangla} <span className="muted small">· {main.name}</span></div>
            <div className="svc-meta">{main.helperRoles.join(", ") || "no professions"} · {main.subServices.length} sub-services</div>
          </div>
        )}
        {ctx.editingName !== main._id && <button className="link-btn" onClick={() => ctx.setEditingName(main._id)}>Rename</button>}
        <button className="icon-btn" onClick={() => ctx.delService(main._id)}>✕</button>
      </div>

      {isOpen && (
        <div className="svc-body">
          {/* Main-service settings, collapsed behind buttons */}
          <div className="action-row">
            <button className={settingsOpen === "docs" ? "chip-btn on" : "chip-btn"} onClick={() => setSettingsOpen(settingsOpen === "docs" ? null : "docs")}>
              📄 Common documents ({mainReqs.length})
            </button>
            <button className={settingsOpen === "patient" ? "chip-btn on" : "chip-btn"} onClick={() => setSettingsOpen(settingsOpen === "patient" ? null : "patient")}>
              🛡️ Patient check: {{ none: "off", submit: "upload", approved: "approved" }[main.patientVerificationMode || "none"]}
            </button>
          </div>
          {settingsOpen === "docs" && (
            <DocumentsEditor service={main} list={mainReqs} form={ctx.reqForm[main._id]}
              onFieldChange={ctx.setReqField} onAdd={ctx.addRequirement} onEdit={ctx.editRequirement} onDelete={ctx.delRequirement}
              helpText="Common documents apply to every sub-service below. A caregiver uploads them once. Mark a document 'For patient' if the patient must provide it." />
          )}
          {settingsOpen === "patient" && <PatientCheckEditor service={main} hasPatientReqs={hasPatientReqs} onSave={ctx.editService} />}

          {/* Sub-services */}
          <div className="section-label" style={{ marginTop: 18 }}>Sub-services</div>
          {main.subServices.length === 0 && <p className="muted small">None yet. Add one below.</p>}
          {main.subServices.map((sub) => (
            <SubServiceCard key={sub._id} sub={sub} reqs={ctx.requirements[sub._id] || []} ctx={ctx} />
          ))}

          <div className="row" style={{ marginTop: 12 }}>
            <input className="input sm" placeholder="উপ-সেবা (বাংলা)" value={(ctx.subForm[main._id] || {}).bangla || ""} onChange={(e) => ctx.setSubField(main._id, "bangla", e.target.value)} />
            <input className="input sm" placeholder="Sub-service (English)" value={(ctx.subForm[main._id] || {}).name || ""} onChange={(e) => ctx.setSubField(main._id, "name", e.target.value)} />
            <button className="btn sm" onClick={() => ctx.addSub(main._id)}>+ Add sub-service</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceManager() {
  const [tree, setTree] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [requirements, setRequirements] = useState({});
  const [editingName, setEditingName] = useState(null);
  const [mName, setMName] = useState("");
  const [mBangla, setMBangla] = useState("");
  const [mRoles, setMRoles] = useState([]);
  const [subForm, setSubForm] = useState({});
  const [reqForm, setReqForm] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([apiFetch("/api/services/tree"), apiFetch("/api/roles")]);
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
    if (open) { loadRequirements(main._id); main.subServices.forEach((s) => loadRequirements(s._id)); }
  }
  async function addMain(e) {
    e.preventDefault();
    if (!mName || !mBangla || mRoles.length === 0) { alert("Fill both names and pick at least one profession."); return; }
    const res = await apiFetch("/api/services", { method: "POST", body: JSON.stringify({ name: mName, nameBangla: mBangla, helperRoles: mRoles }) });
    if (res.ok) { setMName(""); setMBangla(""); setMRoles([]); load(); } else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function addSub(mainId) {
    const f = subForm[mainId] || {};
    if (!f.name || !f.bangla) { alert("Fill both names"); return; }
    const res = await apiFetch("/api/services", { method: "POST", body: JSON.stringify({ name: f.name, nameBangla: f.bangla, parent: mainId }) });
    if (res.ok) { setSubForm((p) => ({ ...p, [mainId]: {} })); load(); } else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function editService(id, body) {
    const res = await apiFetch(`/api/services/${id}`, { method: "PUT", body: JSON.stringify(body) });
    if (res.ok) { setEditingName(null); load(); } else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function savePricing(subId, pricing) { await editService(subId, pricing); }
  async function delService(id) {
    if (!confirm("Delete this service? Its documents will be removed too.")) return;
    const res = await apiFetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function addRequirement(serviceId) {
    const f = reqForm[serviceId] || {};
    if (!f.title || !f.titleBangla) { alert("Fill the document name in both languages"); return; }
    const res = await apiFetch("/api/requirements", {
      method: "POST",
      body: JSON.stringify({ service: serviceId, forWhom: f.forWhom || "helper", title: f.title, titleBangla: f.titleBangla, isMandatory: f.isMandatory !== false, maxPhotos: Number(f.maxPhotos) || 3 }),
    });
    if (res.ok) { setReqForm((p) => ({ ...p, [serviceId]: {} })); loadRequirements(serviceId); } else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function editRequirement(reqId, serviceId, body) {
    if (body.isMandatory === true) { if (!confirm("Making this mandatory may make some caregivers/patients ineligible until they submit it. Continue?")) return; }
    const res = await apiFetch(`/api/requirements/${reqId}`, { method: "PUT", body: JSON.stringify(body) });
    if (res.ok) loadRequirements(serviceId); else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function delRequirement(reqId, serviceId) {
    if (!confirm("Delete this document requirement?")) return;
    const res = await apiFetch(`/api/requirements/${reqId}`, { method: "DELETE" });
    if (res.ok) loadRequirements(serviceId);
  }
  function setReqField(serviceId, key, val) { setReqForm((p) => ({ ...p, [serviceId]: { ...(p[serviceId] || {}), [key]: val } })); }
  function setSubField(mainId, key, val) { setSubForm((p) => ({ ...p, [mainId]: { ...(p[mainId] || {}), [key]: val } })); }

  const ctx = {
    expanded, requirements, editingName, reqForm, subForm,
    toggleExpand, editService, savePricing, delService,
    addRequirement, editRequirement, delRequirement, setReqField,
    setSubField, addSub, setEditingName,
  };

  if (loading) return <div className="center">Loading services…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head">
          <h2>Add a main service</h2>
          <p className="hint">A main service groups related sub-services. Caregivers only see services matching their profession.</p>
        </div>
        <form className="col" onSubmit={addMain}>
          <div className="row">
            <input className="input" placeholder="নাম (বাংলা)" value={mBangla} onChange={(e) => setMBangla(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input className="input" placeholder="Name (English)" value={mName} onChange={(e) => setMName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          </div>
          <div>
            <div className="section-label">Which professions can do this?</div>
            <div className="chips">
              {roles.map((r) => (
                <label key={r._id} className={mRoles.includes(r.name) ? "chip on" : "chip"}>
                  <input type="checkbox" checked={mRoles.includes(r.name)} onChange={() => setMRoles((p) => p.includes(r.name) ? p.filter((x) => x !== r.name) : [...p, r.name])} />
                  {r.nameBangla}
                </label>
              ))}
              {roles.length === 0 && <span className="muted small">Add a profession first (Professions tab).</span>}
            </div>
          </div>
          <button className="btn" style={{ alignSelf: "flex-start" }}>Add main service</button>
        </form>
      </section>

      {tree.length === 0 && <div className="panel"><div className="empty-state"><div className="big">📋</div>No services yet.</div></div>}
      {tree.map((main) => <MainServiceCard key={main._id} main={main} ctx={ctx} />)}
    </div>
  );
}