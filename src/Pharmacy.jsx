import { useState, useEffect } from "react";
import { apiFetch, API_URL } from "./api";

/* ---------- shared bits (module-level, so inputs never lose focus) ---------- */

function SubTabs({ active, onChange }) {
  const tabs = [
    { key: "medicines", label: "Medicines" },
    { key: "categories", label: "Categories" },
    { key: "generics", label: "Generics" },
    { key: "manufacturers", label: "Manufacturers" },
    { key: "classes", label: "Drug classes" },
  ];
  return (
    <div className="tabs" style={{ marginBottom: 18 }}>
      {tabs.map((t) => (
        <button key={t.key} className={active === t.key ? "tab active" : "tab"} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}


const ICON_CHOICES = [
  "medkit", "flask", "heart", "body", "eye", "fitness", "nutrition",
  "leaf", "bandage", "medical", "pulse", "happy", "male-female",
  "male", "female", "school", "cart", "flame", "star", "gift",
];
const TONE_CHOICES = ["primary", "accent", "helper", "warning", "success"];

function CategoryForm({ onSave, onCancel, initial }) {
  const [f, setF] = useState(initial || { name: "", nameBangla: "", icon: "medkit", tone: "primary", sortOrder: 0, isFeatured: false });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) { alert("Category name is required."); return; }
    await onSave(f);
  }

  return (
    <div className="editor">
      <div className="field-grid">
        <label className="field"><span className="field-label">Name *</span>
          <input className="input sm" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Diabetic Care" /></label>
        <label className="field"><span className="field-label">নাম (বাংলা)</span>
          <input className="input sm" value={f.nameBangla} onChange={(e) => set("nameBangla", e.target.value)} placeholder="ডায়াবেটিক কেয়ার" /></label>
      </div>
      <div className="field-grid">
        <label className="field"><span className="field-label">Icon</span>
          <select className="input sm" value={f.icon} onChange={(e) => set("icon", e.target.value)}>
            {ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Color</span>
          <select className="input sm" value={f.tone} onChange={(e) => set("tone", e.target.value)}>
            {TONE_CHOICES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Sort order</span>
          <input className="input sm" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} style={{ maxWidth: 90 }} /></label>
      </div>
      <label className="chip" style={{ display: "inline-flex", marginBottom: 10 }}>
        <input type="checkbox" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
        Featured (shown in the compact home-screen row)
      </label>
      <div className="row">
        <button className="btn sm" onClick={submit}>Save</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try { const res = await apiFetch("/api/admin/categories"); if (res.ok) setList(await res.json()); }
    catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(body) {
    const url = editing ? `/api/admin/categories/${editing._id}` : "/api/admin/categories";
    const res = await apiFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { setShowForm(false); setEditing(null); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function remove(id) {
    if (!confirm("Delete this category?")) return;
    const res = await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Categories ({list.length})</h2>
            <p className="hint">
              What patients actually browse by on the store's home screen — "Diabetic Care", "Baby & Mom" —
              not clinical drug classes. Keep this list short and easy to scan.
            </p>
          </div>
          {!showForm && <button className="btn sm" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add category</button>}
        </div>
        {showForm && <CategoryForm initial={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      </section>

      <ul className="list">
        {list.map((c) => (
          <li key={c._id} className="list-item">
            <span>
              <strong>{c.name}</strong> {c.nameBangla && <span className="muted small">· {c.nameBangla}</span>}
              <span className="muted small"> · {c.icon} / {c.tone}</span>
              {c.isFeatured && <span className="pill pill-must" style={{ marginLeft: 8 }}>Featured</span>}
            </span>
            <span className="row" style={{ gap: 8 }}>
              <button className="link-btn" onClick={() => { setEditing(c); setShowForm(true); }}>Edit</button>
              <button className="icon-btn" onClick={() => remove(c._id)}>✕</button>
            </span>
          </li>
        ))}
        {list.length === 0 && <li className="muted small">No categories yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- MEDICINES (brand products + stock) ---------- */

function MedicineForm({ generics, manufacturers, categories, onSave, onCancel, initial }) {
  const [f, setF] = useState(initial || {
    brandName: "", brandNameBangla: "", generic: "", manufacturer: "",
    strength: "", dosageForm: "Tablet", mrp: "", price: "",
    sellUnit: "strip", unitsPerSellUnit: "", packSizeLabel: "",
    prescriptionRequired: false, stock: "", categories: [],
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleCategory = (id) => {
    const current = f.categories?.map((c) => (typeof c === "string" ? c : c._id)) || [];
    set("categories", current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };
  const selectedCategoryIds = (f.categories || []).map((c) => (typeof c === "string" ? c : c._id));

  async function submit() {
    if (!f.brandName || !f.generic || !f.manufacturer || !f.mrp || !f.price) {
      alert("Brand name, generic, manufacturer, MRP, and price are required.");
      return;
    }
    await onSave({
      ...f,
      mrp: Number(f.mrp), price: Number(f.price),
      unitsPerSellUnit: Number(f.unitsPerSellUnit) || 1,
      stock: Number(f.stock) || 0,
      categories: selectedCategoryIds,
    });
  }

  return (
    <div className="editor">
      <div className="field-grid">
        <label className="field"><span className="field-label">Brand name *</span>
          <input className="input sm" value={f.brandName} onChange={(e) => set("brandName", e.target.value)} /></label>
        <label className="field"><span className="field-label">নাম (বাংলা)</span>
          <input className="input sm" value={f.brandNameBangla} onChange={(e) => set("brandNameBangla", e.target.value)} /></label>
        <label className="field"><span className="field-label">Strength</span>
          <input className="input sm" placeholder="500 mg" value={f.strength} onChange={(e) => set("strength", e.target.value)} /></label>
        <label className="field"><span className="field-label">Dosage form</span>
          <select className="input sm" value={f.dosageForm} onChange={(e) => set("dosageForm", e.target.value)}>
            {["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Suspension"].map((d) => <option key={d}>{d}</option>)}
          </select></label>
      </div>

      <div className="field-grid">
        <label className="field"><span className="field-label">Generic *</span>
          <select className="input sm" value={f.generic} onChange={(e) => set("generic", e.target.value)}>
            <option value="">Select…</option>
            {generics.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Manufacturer *</span>
          <select className="input sm" value={f.manufacturer} onChange={(e) => set("manufacturer", e.target.value)}>
            <option value="">Select…</option>
            {manufacturers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select></label>
      </div>

      <div className="field-grid">
        <label className="field"><span className="field-label">MRP (৳) *</span>
          <input className="input sm" type="number" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} /></label>
        <label className="field"><span className="field-label">Our price (৳) *</span>
          <input className="input sm" type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></label>
        <label className="field"><span className="field-label">Sell unit</span>
          <select className="input sm" value={f.sellUnit} onChange={(e) => set("sellUnit", e.target.value)}>
            {["piece", "strip", "bottle", "box", "tube", "pack"].map((u) => <option key={u}>{u}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Pack size label</span>
          <input className="input sm" placeholder="10 x 10" value={f.packSizeLabel} onChange={(e) => set("packSizeLabel", e.target.value)} /></label>
      </div>

      <div className="field-grid">
        <label className="field"><span className="field-label">Stock (units)</span>
          <input className="input sm" type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></label>
        <label className="chip" style={{ alignSelf: "flex-end" }}>
          <input type="checkbox" checked={f.prescriptionRequired} onChange={(e) => set("prescriptionRequired", e.target.checked)} />
          Prescription required
        </label>
      </div>

      <div className="section-label" style={{ marginTop: 10 }}>Shopping categories</div>
      <p className="editor-help" style={{ marginTop: -4 }}>Where this appears in the store's category grid — pick one or more.</p>
      <div className="chips" style={{ marginBottom: 10 }}>
        {categories.map((c) => (
          <label key={c._id} className={selectedCategoryIds.includes(c._id) ? "chip on" : "chip"}>
            <input type="checkbox" checked={selectedCategoryIds.includes(c._id)} onChange={() => toggleCategory(c._id)} />
            {c.name}
          </label>
        ))}
        {categories.length === 0 && <span className="muted small">No categories yet — add some in the Categories tab.</span>}
      </div>

      {f.price && f.mrp && Number(f.price) > Number(f.mrp) && (
        <p className="editor-help warn">⚠ Price cannot exceed MRP.</p>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={submit}>Save</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}


function ImageManager({ medicine, onChanged }) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(medicine.images || []);

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/admin/medicines/${medicine._id}/images`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) { setImages(data.images); onChanged(medicine._id, data.images); }
      else alert(data.error || "Upload failed");
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  }

  async function removeImage(url) {
    if (!confirm("Remove this photo?")) return;
    try {
      const res = await apiFetch(`/api/admin/medicines/${medicine._id}/images`, { method: "DELETE", body: JSON.stringify({ url }) });
      const data = await res.json();
      if (res.ok) { setImages(data.images); onChanged(medicine._id, data.images); }
      else alert(data.error || "Failed");
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="editor">
      <p className="editor-help">The first photo is used as the primary image everywhere in the store.</p>
      <div className="imgs">
        {images.map((url, i) => (
          <div key={url} className="img-block">
            <span className="img-label">{i === 0 ? "Primary" : `Photo ${i + 1}`}</span>
            <div style={{ position: "relative" }}>
              <img src={url} alt="" className="doc-img sm" />
              <button className="icon-btn" style={{ position: "absolute", top: -6, right: -6, background: "#fff", borderRadius: "50%" }} onClick={() => removeImage(url)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <label className="btn sm" style={{ display: "inline-block", cursor: "pointer" }}>
        {uploading ? "Uploading…" : "+ Add photo"}
        <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
          onChange={(e) => { uploadImage(e.target.files[0]); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function MedicinesTab() {
  const [medicines, setMedicines] = useState([]);
  const [generics, setGenerics] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockEdit, setStockEdit] = useState({}); // id -> draft value
  const [imageEditorId, setImageEditorId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [mRes, gRes, manRes, catRes] = await Promise.all([
        apiFetch(`/api/admin/medicines${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        apiFetch("/api/admin/generics"),
        apiFetch("/api/admin/manufacturers"),
        apiFetch("/api/admin/categories"),
      ]);
      if (mRes.ok) setMedicines((await mRes.json()).medicines);
      if (gRes.ok) setGenerics(await gRes.json());
      if (manRes.ok) setManufacturers(await manRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function saveMedicine(body) {
    const url = editing ? `/api/admin/medicines/${editing._id}` : "/api/admin/medicines";
    const res = await apiFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { setShowForm(false); setEditing(null); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  async function saveStock(id) {
    const val = stockEdit[id];
    if (val === undefined) return;
    const res = await apiFetch(`/api/admin/medicines/${id}/stock`, { method: "PATCH", body: JSON.stringify({ setTo: Number(val) }) });
    if (res.ok) { setStockEdit((p) => { const n = { ...p }; delete n[id]; return n; }); load(); }
  }

  async function discontinue(id) {
    if (!confirm("Discontinue this medicine? It will stop showing to patients.")) return;
    const res = await apiFetch(`/api/admin/medicines/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading && medicines.length === 0) return <div className="center">Loading medicines…</div>;

  if (generics.length === 0 || manufacturers.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">📋</div>
          Add at least one <strong>generic</strong> and one <strong>manufacturer</strong> first —
          every medicine needs both.
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Medicines ({medicines.length})</h2>
            <p className="hint">Brand products for sale, with stock and pricing.</p>
          </div>
          {!showForm && <button className="btn sm" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add medicine</button>}
        </div>

        {!showForm && (
          <div className="row" style={{ marginBottom: 14 }}>
            <input className="input sm" placeholder="Search brand name…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} style={{ flex: 1 }} />
            <button className="btn-ghost sm" onClick={load}>Search</button>
          </div>
        )}

        {showForm && (
          <MedicineForm
            generics={generics} manufacturers={manufacturers} categories={categories}
            initial={editing}
            onSave={saveMedicine}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </section>

      {medicines.map((m) => {
        const low = m.stock <= (m.lowStockThreshold || 10);
        const showImages = imageEditorId === m._id;
        return (
          <div key={m._id} className="sub2">
            <div className="sub2-head">
              {m.images?.[0] ? (
                <img src={m.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", marginRight: 10 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface-2)", marginRight: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💊</div>
              )}
              <div className="sub2-title-wrap">
                <div className="sub2-title">{m.brandName} {m.strength && <span className="muted small">· {m.strength}</span>}</div>
                <div className="sub2-summary">
                  {m.generic?.name} · {m.manufacturer?.name} · ৳{m.price} (MRP ৳{m.mrp})
                  {m.prescriptionRequired && " · 🩺 Rx"}
                  {" · "}📷 {m.images?.length || 0}
                </div>
              </div>
              <button className="icon-btn" onClick={() => discontinue(m._id)}>✕</button>
            </div>

            <div className="action-row">
              <button className="chip-btn" onClick={() => { setEditing(m); setShowForm(true); }}>✏️ Edit</button>
              <button className={showImages ? "chip-btn on" : "chip-btn"} onClick={() => setImageEditorId(showImages ? null : m._id)}>📷 Photos</button>
              <span className={`pill ${low ? "pill-must" : "pill-opt"}`}>
                {low ? "⚠ " : ""}Stock: {m.stock}
              </span>
              <input
                className="input sm" type="number" placeholder="Set stock" style={{ maxWidth: 110 }}
                value={stockEdit[m._id] ?? ""} onChange={(e) => setStockEdit((p) => ({ ...p, [m._id]: e.target.value }))}
              />
              {stockEdit[m._id] !== undefined && stockEdit[m._id] !== "" && (
                <button className="btn sm" onClick={() => saveStock(m._id)}>Update stock</button>
              )}
            </div>

            {showImages && (
              <ImageManager
                medicine={m}
                onChanged={(id, images) => setMedicines((prev) => prev.map((x) => x._id === id ? { ...x, images } : x))}
              />
            )}
          </div>
        );
      })}
      {medicines.length === 0 && !showForm && <div className="panel"><div className="empty-state"><div className="big">💊</div>No medicines yet.</div></div>}
    </div>
  );
}

/* ---------- GENERICS (clinical content) ---------- */

function GenericForm({ classes, onSave, onCancel, initial }) {
  const [f, setF] = useState(initial || {
    name: "", nameBangla: "", drugClasses: [],
    indications: "", indicationsBangla: "",
    simpleSummary: "", simpleSummaryBangla: "",
    dosage: "", sideEffects: "", sideEffectsBangla: "",
    contraindications: "", pharmacology: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleClass = (id) => set("drugClasses", f.drugClasses.includes(id) ? f.drugClasses.filter((x) => x !== id) : [...f.drugClasses, id]);

  async function submit() {
    if (!f.name) { alert("Generic name is required."); return; }
    await onSave(f);
  }

  return (
    <div className="editor">
      <div className="field-grid">
        <label className="field"><span className="field-label">Generic name *</span>
          <input className="input sm" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Paracetamol" /></label>
        <label className="field"><span className="field-label">নাম (বাংলা)</span>
          <input className="input sm" value={f.nameBangla} onChange={(e) => set("nameBangla", e.target.value)} placeholder="প্যারাসিটামল" /></label>
      </div>

      <div className="section-label" style={{ marginTop: 10 }}>Drug classes</div>
      <div className="chips" style={{ marginBottom: 10 }}>
        {classes.map((c) => (
          <label key={c._id} className={f.drugClasses.includes(c._id) ? "chip on" : "chip"}>
            <input type="checkbox" checked={f.drugClasses.includes(c._id)} onChange={() => toggleClass(c._id)} />
            {c.name}
          </label>
        ))}
      </div>

      <label className="field"><span className="field-label">Simple summary (for patients)</span>
        <textarea className="input sm" rows={2} value={f.simpleSummary} onChange={(e) => set("simpleSummary", e.target.value)}
          placeholder="Plain-language explanation, not clinical jargon" /></label>
      <label className="field"><span className="field-label">সহজ সারাংশ (বাংলা)</span>
        <textarea className="input sm" rows={2} value={f.simpleSummaryBangla} onChange={(e) => set("simpleSummaryBangla", e.target.value)} /></label>

      <label className="field"><span className="field-label">Indications (what it's used for)</span>
        <textarea className="input sm" rows={2} value={f.indications} onChange={(e) => set("indications", e.target.value)} /></label>
      <label className="field"><span className="field-label">নির্দেশনা (বাংলা)</span>
        <textarea className="input sm" rows={2} value={f.indicationsBangla} onChange={(e) => set("indicationsBangla", e.target.value)} /></label>

      <label className="field"><span className="field-label">Dosage</span>
        <textarea className="input sm" rows={2} value={f.dosage} onChange={(e) => set("dosage", e.target.value)} /></label>

      <label className="field"><span className="field-label">Side effects</span>
        <textarea className="input sm" rows={2} value={f.sideEffects} onChange={(e) => set("sideEffects", e.target.value)} /></label>
      <label className="field"><span className="field-label">পার্শ্বপ্রতিক্রিয়া (বাংলা)</span>
        <textarea className="input sm" rows={2} value={f.sideEffectsBangla} onChange={(e) => set("sideEffectsBangla", e.target.value)} /></label>

      <label className="field"><span className="field-label">Contraindications</span>
        <textarea className="input sm" rows={2} value={f.contraindications} onChange={(e) => set("contraindications", e.target.value)} /></label>

      <label className="field"><span className="field-label">Pharmacology (how it works)</span>
        <textarea className="input sm" rows={2} value={f.pharmacology} onChange={(e) => set("pharmacology", e.target.value)} /></label>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={submit}>Save</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function GenericsTab() {
  const [generics, setGenerics] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        apiFetch(`/api/admin/generics${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        apiFetch("/api/admin/drug-classes"),
      ]);
      if (gRes.ok) setGenerics(await gRes.json());
      if (cRes.ok) setClasses(await cRes.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(body) {
    const url = editing ? `/api/admin/generics/${editing._id}` : "/api/admin/generics";
    const res = await apiFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { setShowForm(false); setEditing(null); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function remove(id) {
    if (!confirm("Delete this generic?")) return;
    const res = await apiFetch(`/api/admin/generics/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  if (loading && generics.length === 0) return <div className="center">Loading…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Generics ({generics.length})</h2>
            <p className="hint">The clinical content that powers search rankings — what a medicine is, what it treats, side effects.</p>
          </div>
          {!showForm && <button className="btn sm" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add generic</button>}
        </div>
        {!showForm && (
          <div className="row" style={{ marginBottom: 14 }}>
            <input className="input sm" placeholder="Search generics…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} style={{ flex: 1 }} />
            <button className="btn-ghost sm" onClick={load}>Search</button>
          </div>
        )}
        {showForm && <GenericForm classes={classes} initial={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      </section>

      <ul className="list">
        {generics.map((g) => (
          <li key={g._id} className="list-item">
            <span>
              <strong>{g.name}</strong> {g.nameBangla && <span className="muted small">· {g.nameBangla}</span>}
              {g.drugClasses?.length > 0 && <span className="muted small"> · {g.drugClasses.map((c) => c.name).join(", ")}</span>}
            </span>
            <span className="row" style={{ gap: 8 }}>
              <button className="link-btn" onClick={() => { setEditing(g); setShowForm(true); }}>Edit</button>
              <button className="icon-btn" onClick={() => remove(g._id)}>✕</button>
            </span>
          </li>
        ))}
        {generics.length === 0 && <li className="muted small">No generics yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- MANUFACTURERS ---------- */

function ManufacturersTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameBangla, setNameBangla] = useState("");

  async function load() {
    setLoading(true);
    try { const res = await apiFetch("/api/admin/manufacturers"); if (res.ok) setList(await res.json()); }
    catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await apiFetch("/api/admin/manufacturers", { method: "POST", body: JSON.stringify({ name: name.trim(), nameBangla: nameBangla.trim() }) });
    if (res.ok) { setName(""); setNameBangla(""); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function remove(id) {
    if (!confirm("Delete this manufacturer?")) return;
    const res = await apiFetch(`/api/admin/manufacturers/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head"><h2>Add a manufacturer</h2></div>
        <form className="row" onSubmit={add}>
          <input className="input" placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <input className="input" placeholder="নাম (বাংলা)" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button className="btn">Add</button>
        </form>
      </section>
      <ul className="list">
        {list.map((m) => (
          <li key={m._id} className="list-item">
            <span><strong>{m.name}</strong> {m.nameBangla && <span className="muted small">· {m.nameBangla}</span>}</span>
            <button className="icon-btn" onClick={() => remove(m._id)}>✕</button>
          </li>
        ))}
        {list.length === 0 && <li className="muted small">No manufacturers yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- DRUG CLASSES ---------- */

function ClassesTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameBangla, setNameBangla] = useState("");

  async function load() {
    setLoading(true);
    try { const res = await apiFetch("/api/admin/drug-classes"); if (res.ok) setList(await res.json()); }
    catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await apiFetch("/api/admin/drug-classes", { method: "POST", body: JSON.stringify({ name: name.trim(), nameBangla: nameBangla.trim() }) });
    if (res.ok) { setName(""); setNameBangla(""); load(); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }
  async function remove(id) {
    if (!confirm("Delete this drug class?")) return;
    const res = await apiFetch(`/api/admin/drug-classes/${id}`, { method: "DELETE" });
    if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head"><h2>Add a drug class</h2><p className="hint">e.g. Analgesics, Antibiotics, Antihistamines.</p></div>
        <form className="row" onSubmit={add}>
          <input className="input" placeholder="Class name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <input className="input" placeholder="নাম (বাংলা)" value={nameBangla} onChange={(e) => setNameBangla(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button className="btn">Add</button>
        </form>
      </section>
      <ul className="list">
        {list.map((c) => (
          <li key={c._id} className="list-item">
            <span><strong>{c.name}</strong> {c.nameBangla && <span className="muted small">· {c.nameBangla}</span>}</span>
            <button className="icon-btn" onClick={() => remove(c._id)}>✕</button>
          </li>
        ))}
        {list.length === 0 && <li className="muted small">No drug classes yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- ROOT ---------- */

export default function Pharmacy() {
  const [sub, setSub] = useState("medicines");
  return (
    <div>
      <SubTabs active={sub} onChange={setSub} />
      {sub === "medicines" && <MedicinesTab />}
      {sub === "categories" && <CategoriesTab />}
      {sub === "generics" && <GenericsTab />}
      {sub === "manufacturers" && <ManufacturersTab />}
      {sub === "classes" && <ClassesTab />}
    </div>
  );
}