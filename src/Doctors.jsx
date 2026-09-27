import { useState, useEffect, useCallback } from "react";
import { apiFetch, API_URL } from "./api";

/* ---------- shared bits (module-level, so inputs never lose focus) ---------- */

const REASON_LABELS = {
  wrong_phone: "Phone number wrong / not working",
  moved_chamber: "Chamber has changed",
  wrong_schedule: "Schedule is wrong",
  wrong_fee: "Fee is wrong",
  not_practicing: "Doctor no longer sits here",
  other: "Something else",
};

const ICON_CHOICES = [
  "medkit", "heart", "pulse", "female", "male", "happy", "body", "hand-left", "ear", "eye",
  "nutrition", "water", "beaker", "chatbubbles", "leaf", "flask", "ribbon", "sparkles",
  "cut", "walk", "accessibility", "bandage", "fitness", "medical", "thermometer",
];
const TONE_CHOICES = ["helper", "primary", "accent", "warning", "success"];

function SubTabs({ active, onChange, openReports }) {
  const tabs = [
    { key: "doctors", label: "Doctors" },
    { key: "import", label: "Bulk import" },
    { key: "specialties", label: "Specialties" },
    { key: "reports", label: openReports ? `Reports (${openReports})` : "Reports" },
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

function useGeo() {
  const [geo, setGeo] = useState([]);
  useEffect(() => {
    apiFetch("/api/doctors/geo").then((r) => (r.ok ? r.json() : [])).then(setGeo).catch(() => {});
  }, []);
  return geo;
}

function useSpecialties(refreshKey) {
  const [list, setList] = useState([]);
  useEffect(() => {
    apiFetch("/api/admin/specialties").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  }, [refreshKey]);
  return list;
}

function feeText(d) {
  const parts = [];
  if (d.newPatientFee != null) parts.push(`New ৳${d.newPatientFee}`);
  if (d.followUpFee != null) parts.push(`Follow-up ৳${d.followUpFee}${d.followUpWithinDays ? ` (≤${d.followUpWithinDays}d)` : ""}`);
  return parts.join(" · ") || "No fee listed";
}

/* ================================ DOCTOR FORM ================================ */

const EMPTY_DOCTOR = {
  name: "", nameBangla: "", specialty: "", degrees: "", designation: "", workplace: "",
  gender: "", bmdcNumber: "", photoUrl: "",
  chamberName: "", chamberAddress: "", division: "", district: "", area: "",
  phones: "", visitingDays: "", visitingHours: "",
  newPatientFee: "", followUpFee: "", followUpWithinDays: "",
  onlineConsultation: false, priority: 0, isActive: true,
};

function toForm(d) {
  if (!d) return EMPTY_DOCTOR;
  return {
    ...EMPTY_DOCTOR,
    ...d,
    specialty: d.specialty?.name || "",
    phones: (d.phones || []).join(", "),
    newPatientFee: d.newPatientFee ?? "",
    followUpFee: d.followUpFee ?? "",
    followUpWithinDays: d.followUpWithinDays ?? "",
    photoUrl: d.photoUrl || "",
  };
}

function Field({ label, children, width }) {
  return (
    <label className="field" style={width ? { maxWidth: width } : undefined}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function DoctorForm({ initial, specialties, geo, onSave, onCancel }) {
  const [f, setF] = useState(toForm(initial));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const districts = f.division
    ? geo.find((dv) => dv.name === f.division)?.districts || []
    : geo.flatMap((dv) => dv.districts);

  function pickDistrict(name) {
    const d = geo.flatMap((dv) => dv.districts).find((x) => x.name === name);
    setF((p) => ({ ...p, district: name, division: d ? d.division : p.division }));
  }

  async function submit() {
    setSaving(true);
    try { await onSave(f); } finally { setSaving(false); }
  }

  return (
    <div className="editor">
      <div className="section-label">Doctor</div>
      <div className="field-grid">
        <Field label="Name *"><input className="input sm" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Dr. Rahim Uddin" /></Field>
        <Field label="নাম (বাংলা)"><input className="input sm" value={f.nameBangla} onChange={(e) => set("nameBangla", e.target.value)} placeholder="ডা. রহিম উদ্দিন" /></Field>
        <Field label="Specialty *">
          <select className="input sm" value={f.specialty} onChange={(e) => set("specialty", e.target.value)}>
            <option value="">— choose —</option>
            {specialties.map((s) => <option key={s._id} value={s.name}>{s.name}{s.nameBangla ? ` (${s.nameBangla})` : ""}</option>)}
          </select>
        </Field>
      </div>
      <div className="field-grid">
        <Field label="Degrees"><input className="input sm" value={f.degrees} onChange={(e) => set("degrees", e.target.value)} placeholder="MBBS, FCPS (Medicine)" /></Field>
        <Field label="Designation"><input className="input sm" value={f.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Associate Professor" /></Field>
        <Field label="Workplace"><input className="input sm" value={f.workplace} onChange={(e) => set("workplace", e.target.value)} placeholder="Dhaka Medical College Hospital" /></Field>
      </div>
      <div className="field-grid">
        <Field label="Gender" width={140}>
          <select className="input sm" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
          </select>
        </Field>
        <Field label="BMDC reg. no."><input className="input sm" value={f.bmdcNumber} onChange={(e) => set("bmdcNumber", e.target.value)} placeholder="A-12345" /></Field>
        <Field label="Photo URL (optional)"><input className="input sm" value={f.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…" /></Field>
      </div>

      <div className="section-label">Chamber</div>
      <div className="field-grid">
        <Field label="Chamber name"><input className="input sm" value={f.chamberName} onChange={(e) => set("chamberName", e.target.value)} placeholder="Popular Diagnostic Centre" /></Field>
        <Field label="Chamber address"><input className="input sm" value={f.chamberAddress} onChange={(e) => set("chamberAddress", e.target.value)} placeholder="House 16, Road 2" /></Field>
      </div>
      <div className="field-grid">
        <Field label="Division">
          <select className="input sm" value={f.division} onChange={(e) => setF((p) => ({ ...p, division: e.target.value, district: "" }))}>
            <option value="">— any —</option>
            {geo.map((dv) => <option key={dv.name} value={dv.name}>{dv.name} ({dv.bn})</option>)}
          </select>
        </Field>
        <Field label="District *">
          <select className="input sm" value={f.district} onChange={(e) => pickDistrict(e.target.value)}>
            <option value="">— choose —</option>
            {districts.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.bn})</option>)}
          </select>
        </Field>
        <Field label="Area / upazila"><input className="input sm" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="Dhanmondi" /></Field>
      </div>
      <div className="field-grid">
        <Field label="Appointment phone(s) * — separate with commas"><input className="input sm" value={f.phones} onChange={(e) => set("phones", e.target.value)} placeholder="01711000000, 09613787801" /></Field>
        <Field label="Visiting days"><input className="input sm" value={f.visitingDays} onChange={(e) => set("visitingDays", e.target.value)} placeholder="Sat–Wed" /></Field>
        <Field label="Visiting hours"><input className="input sm" value={f.visitingHours} onChange={(e) => set("visitingHours", e.target.value)} placeholder="5 PM – 9 PM" /></Field>
      </div>

      <div className="section-label">Fees</div>
      <p className="hint" style={{ marginTop: -4 }}>
        A returning patient who comes back within the set number of days pays the follow-up fee instead.
        Leave fees empty if the doctor doesn't publish them.
      </p>
      <div className="field-grid">
        <Field label="New patient fee (৳)" width={170}><input className="input sm" type="number" value={f.newPatientFee} onChange={(e) => set("newPatientFee", e.target.value)} placeholder="1000" /></Field>
        <Field label="Follow-up fee (৳)" width={170}><input className="input sm" type="number" value={f.followUpFee} onChange={(e) => set("followUpFee", e.target.value)} placeholder="500" /></Field>
        <Field label="…if back within (days)" width={170}><input className="input sm" type="number" value={f.followUpWithinDays} onChange={(e) => set("followUpWithinDays", e.target.value)} placeholder="14" /></Field>
        <Field label="Priority" width={110}><input className="input sm" type="number" value={f.priority} onChange={(e) => set("priority", e.target.value)} /></Field>
      </div>
      <label className="chip" style={{ display: "inline-flex", marginBottom: 12 }}>
        <input type="checkbox" checked={!!f.onlineConsultation} onChange={(e) => set("onlineConsultation", e.target.checked)} />
        Also offers online consultation
      </label>

      <div className="row">
        <button className="btn sm" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save doctor"}</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ================================ DOCTORS TAB ================================ */

function DoctorsTab({ geo, specialties, onChanged }) {
  const [doctors, setDoctors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", specialty: "", district: "", status: "" });
  const [editing, setEditing] = useState(null); // null | "new" | doctor

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const res = await apiFetch(`/api/admin/doctors?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDoctors((prev) => (p === 1 ? data.doctors : [...prev, ...data.doctors]));
        setTotal(data.total); setHasMore(data.hasMore); setPage(p);
      }
    } catch (e) {} finally { setLoading(false); }
  }, [filters]);

  // Small delay so typing in the search box doesn't fire a request per key.
  useEffect(() => { const h = setTimeout(() => load(1), 300); return () => clearTimeout(h); }, [load]);

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  async function save(form) {
    const isNew = editing === "new";
    const res = await apiFetch(isNew ? "/api/admin/doctors" : `/api/admin/doctors/${editing._id}`, {
      method: isNew ? "POST" : "PUT", body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Could not save"); return; }
    setEditing(null); load(1); onChanged();
  }
  async function toggleActive(d) {
    const res = await apiFetch(`/api/admin/doctors/${d._id}/active`, { method: "PATCH", body: JSON.stringify({ isActive: !d.isActive }) });
    if (res.ok) setDoctors((prev) => prev.map((x) => (x._id === d._id ? { ...x, isActive: !d.isActive } : x)));
  }
  async function remove(d) {
    if (!confirm(`Delete ${d.name} (${d.chamberName || d.district}) permanently? Deactivating is usually better.`)) return;
    const res = await apiFetch(`/api/admin/doctors/${d._id}`, { method: "DELETE" });
    if (res.ok) { load(1); onChanged(); }
  }

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Doctors ({total})</h2>
            <p className="hint">One entry per doctor per chamber. A doctor at two chambers appears twice — the app links them as "other chambers" using the BMDC number.</p>
          </div>
          {!editing && <button className="btn sm" onClick={() => setEditing("new")}>+ Add doctor</button>}
        </div>
        {editing && (
          <DoctorForm
            key={editing === "new" ? "new" : editing._id}
            initial={editing === "new" ? null : editing}
            specialties={specialties} geo={geo}
            onSave={save} onCancel={() => setEditing(null)}
          />
        )}
      </section>

      <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input className="input sm" style={{ flex: 2, minWidth: 200 }} placeholder="Search name, chamber, phone, BMDC…" value={filters.q} onChange={(e) => setFilter("q", e.target.value)} />
        <select className="input sm" style={{ flex: 1, minWidth: 150 }} value={filters.specialty} onChange={(e) => setFilter("specialty", e.target.value)}>
          <option value="">All specialties</option>
          {specialties.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="input sm" style={{ flex: 1, minWidth: 150 }} value={filters.district} onChange={(e) => setFilter("district", e.target.value)}>
          <option value="">All districts</option>
          {geo.flatMap((dv) => dv.districts).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <select className="input sm" style={{ flex: 1, minWidth: 130 }} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="reported">Has open reports</option>
        </select>
      </div>

      {!loading && doctors.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">🩺</div>No doctors match. Add one above, or use Bulk import.</div></div>
      ) : (
        doctors.map((d) => (
          <div key={d._id} className="review">
            <div className="review-head" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>{d.name}</strong>{d.nameBangla && <span className="muted small"> · {d.nameBangla}</span>}
                <div className="muted small" style={{ marginTop: 3 }}>
                  {d.specialty?.name || "—"} · {d.degrees || "no degrees listed"}
                </div>
                <div className="small" style={{ marginTop: 3 }}>
                  📍 {[d.chamberName, d.area, d.district].filter(Boolean).join(", ")} &nbsp; 📞 {(d.phones || []).join(", ")}
                </div>
                <div className="muted small" style={{ marginTop: 3 }}>
                  {feeText(d)}{d.visitingDays || d.visitingHours ? ` · ${[d.visitingDays, d.visitingHours].filter(Boolean).join(" ")}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {d.reportCount > 0 && <span className="pill pill-must">{d.reportCount} report{d.reportCount > 1 ? "s" : ""}</span>}
                <span className="pill" style={d.isActive ? { background: "var(--success-t)", color: "var(--success)" } : { background: "var(--danger-t)", color: "var(--danger)" }}>
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <button className="btn-ghost sm" onClick={() => { setEditing(d); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
              <button className="btn-ghost sm" onClick={() => toggleActive(d)}>{d.isActive ? "Deactivate" : "Activate"}</button>
              <button className="btn-danger" onClick={() => remove(d)}>Delete</button>
            </div>
          </div>
        ))
      )}
      {loading && <div className="center">Loading…</div>}
      {hasMore && !loading && (
        <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
          <button className="btn-ghost" onClick={() => load(page + 1)}>Load more</button>
        </div>
      )}
    </div>
  );
}

/* ================================ IMPORT TAB ================================ */

function ImportTab({ onChanged }) {
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);

  function downloadTemplate() {
    const token = localStorage.getItem("adminToken");
    fetch(`${API_URL}/api/admin/doctors/import/template`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "doctor_import_template.xlsx";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });
  }

  async function runPreview() {
    if (!file) { alert("Choose a .xlsx or .csv file first."); return; }
    setPreviewing(true); setResult(null);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/admin/doctors/import/preview`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData,
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Could not read that file"); return; }
      setPreview(data);
    } catch (err) { alert(err.message); } finally { setPreviewing(false); }
  }

  async function confirmImport() {
    if (!preview?.valid?.length) return;
    setCommitting(true);
    try {
      const res = await apiFetch("/api/admin/doctors/import/commit", { method: "POST", body: JSON.stringify({ rows: preview.valid }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Import failed"); return; }
      setResult(data); setPreview(null); setFile(null); onChanged();
    } catch (err) { alert(err.message); } finally { setCommitting(false); }
  }

  return (
    <div>
      <section className="panel">
        <div className="panel-head">
          <h2>Bulk import doctors</h2>
          <p className="hint">
            Nothing is saved until you check the preview and confirm. The template has two extra sheets listing the
            exact valid specialty names and all 64 districts — copy values from there. Old spellings like
            "Chittagong" or "Jessore" are accepted automatically. Re-importing a corrected sheet updates the
            existing entries (same doctor, same chamber) instead of creating duplicates.
          </p>
        </div>
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn-ghost" onClick={downloadTemplate}>⬇ Download template (.xlsx)</button>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <input type="file" accept=".xlsx,.csv" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); setResult(null); }} />
          <button className="btn" onClick={runPreview} disabled={!file || previewing}>{previewing ? "Checking…" : "Check file"}</button>
        </div>
      </section>

      {preview && (
        <section className="panel">
          <div className="panel-head"><h2>Preview — {preview.totalRows} rows found</h2></div>
          <div className="row" style={{ gap: 14, marginBottom: 14 }}>
            <div className="settings-group" style={{ flex: 1 }}>
              <div className="sg-body" style={{ textAlign: "center" }}>
                <div className="muted small">Ready to import</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)" }}>{preview.validCount}</div>
              </div>
            </div>
            <div className="settings-group" style={{ flex: 1 }}>
              <div className="sg-body" style={{ textAlign: "center" }}>
                <div className="muted small">Have errors</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: preview.invalidCount > 0 ? "var(--danger)" : "var(--body)" }}>{preview.invalidCount}</div>
              </div>
            </div>
          </div>

          {preview.invalid.length > 0 && (
            <>
              <div className="section-label">Rows with errors — fix these in your spreadsheet and re-upload</div>
              <ul className="list" style={{ marginBottom: 16 }}>
                {preview.invalid.map((r) => (
                  <li key={r.rowNum} className="list-item">
                    <span><strong>Row {r.rowNum}</strong> {r.name && <span className="muted small">· {r.name}</span>}</span>
                    <span className="muted small">{r.errors.join("; ")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {preview.valid.length > 0 && (
            <>
              <div className="section-label">Ready to import</div>
              <ul className="list" style={{ marginBottom: 16, maxHeight: 280, overflowY: "auto" }}>
                {preview.valid.slice(0, 100).map((r) => (
                  <li key={r.rowNum} className="list-item">
                    <span>Row {r.rowNum} · <strong>{r.name}</strong> <span className="muted small">{r.specialtyName}</span></span>
                    <span className="muted small">{[r.chamberName, r.district].filter(Boolean).join(", ")} · {feeText(r)}</span>
                  </li>
                ))}
                {preview.valid.length > 100 && <li className="list-item muted small">…and {preview.valid.length - 100} more</li>}
              </ul>
              <button className="btn" onClick={confirmImport} disabled={committing}>
                {committing ? "Importing…" : `Import ${preview.validCount} doctor${preview.validCount === 1 ? "" : "s"}`}
              </button>
              {preview.invalidCount > 0 && <span className="muted small" style={{ marginLeft: 12 }}>Rows with errors will be skipped.</span>}
            </>
          )}
        </section>
      )}

      {result && (
        <section className="panel">
          <div className="panel-head"><h2>Import finished</h2></div>
          <p><strong>{result.created}</strong> created · <strong>{result.updated}</strong> updated{result.errors.length ? ` · ${result.errors.length} failed` : ""}</p>
          {result.errors.length > 0 && (
            <ul className="list">
              {result.errors.map((e) => <li key={e.rowNum} className="list-item"><span>Row {e.rowNum} · {e.name}</span><span className="muted small">{e.error}</span></li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ============================== SPECIALTIES TAB ============================== */

function SpecialtyForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(
    initial
      ? { ...initial, keywords: (initial.keywords || []).join(", ") }
      : { name: "", nameBangla: "", description: "", descriptionBangla: "", keywords: "", icon: "medkit", tone: "helper", sortOrder: 0, isActive: true }
  );
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="editor">
      <div className="field-grid">
        <Field label="Name *"><input className="input sm" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Neurology" /></Field>
        <Field label="নাম (বাংলা)"><input className="input sm" value={f.nameBangla} onChange={(e) => set("nameBangla", e.target.value)} placeholder="নিউরোলজি" /></Field>
      </div>
      <div className="field-grid">
        <Field label="Short description (plain words)"><input className="input sm" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Headache, migraine, stroke" /></Field>
        <Field label="বিবরণ (বাংলা)"><input className="input sm" value={f.descriptionBangla} onChange={(e) => set("descriptionBangla", e.target.value)} placeholder="মাথাব্যথা, মাইগ্রেন, স্ট্রোক" /></Field>
      </div>
      <Field label="Search keywords — symptoms & diseases that should find this specialty (comma separated, English and Bangla)">
        <input className="input sm" value={f.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="migraine, মাইগ্রেন, headache, মাথাব্যথা" />
      </Field>
      <div className="field-grid">
        <Field label="Icon"><select className="input sm" value={f.icon} onChange={(e) => set("icon", e.target.value)}>{ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}</select></Field>
        <Field label="Color"><select className="input sm" value={f.tone} onChange={(e) => set("tone", e.target.value)}>{TONE_CHOICES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Sort order" width={110}><input className="input sm" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></Field>
      </div>
      <label className="chip" style={{ display: "inline-flex", marginBottom: 12 }}>
        <input type="checkbox" checked={f.isActive !== false} onChange={(e) => set("isActive", e.target.checked)} />
        Visible in the app
      </label>
      <div className="row">
        <button className="btn sm" onClick={() => (f.name.trim() ? onSave(f) : alert("Name is required."))}>Save</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function SpecialtiesTab({ onChanged }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | specialty
  const [uploadingId, setUploadingId] = useState(null);

  async function load() {
    setLoading(true);
    try { const res = await apiFetch("/api/admin/specialties"); if (res.ok) setList(await res.json()); }
    catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(body) {
    const isNew = editing === "new";
    const res = await apiFetch(isNew ? "/api/admin/specialties" : `/api/admin/specialties/${editing._id}`, {
      method: isNew ? "POST" : "PUT", body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error || "Failed"); return; }
    setEditing(null); load(); onChanged();
  }
  async function remove(s) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const res = await apiFetch(`/api/admin/specialties/${s._id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { load(); onChanged(); } else alert(d.error || "Failed");
  }
  async function seedDefaults() {
    const res = await apiFetch("/api/admin/specialties/seed-defaults", { method: "POST" });
    const d = await res.json();
    if (!res.ok) { alert(d.error || "Failed"); return; }
    alert(`${d.created} specialties added${d.skipped ? `, ${d.skipped} already existed` : ""}.`);
    load(); onChanged();
  }
  async function uploadImage(s, file) {
    if (!file) return;
    setUploadingId(s._id);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/admin/specialties/${s._id}/image`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData,
      });
      if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Upload failed"); }
    } finally { setUploadingId(null); }
  }
  async function removeImage(s) {
    const res = await apiFetch(`/api/admin/specialties/${s._id}/image`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2>Specialties ({list.length})</h2>
            <p className="hint">
              Named by specialty ("Neurology"), not disease — diseases go in the search keywords, so a patient typing
              "migraine" still lands in Neurology. An uploaded icon image replaces the built-in icon in the app.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn-ghost sm" onClick={seedDefaults}>Add standard specialties</button>
            {!editing && <button className="btn sm" onClick={() => setEditing("new")}>+ Add specialty</button>}
          </div>
        </div>
        {editing && (
          <SpecialtyForm key={editing === "new" ? "new" : editing._id} initial={editing === "new" ? null : editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
      </section>

      {list.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">🩺</div>No specialties yet. Click "Add standard specialties" to start with 20 common ones.</div></div>
      ) : (
        list.map((s) => (
          <div key={s._id} className="review">
            <div className="review-head" style={{ alignItems: "flex-start" }}>
              <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: "contain", background: "#F5F9FF" }} />
                  : <div style={{ width: 44, height: 44, borderRadius: 22, background: "#F5F9FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#1E3A5F" }}>{s.icon}</div>}
                <div>
                  <strong>{s.name}</strong>{s.nameBangla && <span className="muted small"> · {s.nameBangla}</span>}
                  <div className="muted small" style={{ marginTop: 3 }}>{s.descriptionBangla || s.description || "No description"}</div>
                  <div className="muted small" style={{ marginTop: 3 }}>🔎 {(s.keywords || []).join(", ") || "no keywords"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="pill pill-opt">{s.doctorCount} doctor{s.doctorCount === 1 ? "" : "s"}</span>
                {!s.isActive && <span className="pill pill-must">Hidden</span>}
              </div>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, alignItems: "center" }}>
              <button className="btn-ghost sm" onClick={() => { setEditing(s); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
              <label className="btn-ghost sm" style={{ cursor: "pointer" }}>
                {uploadingId === s._id ? "Uploading…" : s.imageUrl ? "Change icon image" : "Upload icon image"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { uploadImage(s, e.target.files[0]); e.target.value = ""; }} />
              </label>
              {s.imageUrl && <button className="link-btn" onClick={() => removeImage(s)}>Remove image</button>}
              <button className="btn-danger" onClick={() => remove(s)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ================================ REPORTS TAB ================================ */

function ReportsTab({ onChanged }) {
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await apiFetch(`/api/admin/doctor-reports?status=${status}`); if (res.ok) setReports(await res.json()); }
    catch (e) {} finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function resolve(r) {
    const res = await apiFetch(`/api/admin/doctor-reports/${r._id}/resolve`, { method: "PATCH" });
    if (res.ok) { load(); onChanged(); }
  }

  return (
    <div>
      <section className="panel">
        <div className="panel-head">
          <h2>Incorrect-info reports</h2>
          <p className="hint">
            Sent by patients from a doctor's page. Verify by calling the chamber, fix the doctor in the Doctors tab
            (or deactivate them), then mark the report resolved.
          </p>
        </div>
        <div className="tabs">
          <button className={status === "open" ? "tab active" : "tab"} onClick={() => setStatus("open")}>Open</button>
          <button className={status === "resolved" ? "tab active" : "tab"} onClick={() => setStatus("resolved")}>Resolved</button>
        </div>
      </section>

      {loading ? <div className="center">Loading…</div> : reports.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">✅</div>No {status} reports.</div></div>
      ) : (
        reports.map((r) => (
          <div key={r._id} className="review">
            <div className="review-head" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>{r.doctor?.name || "(deleted doctor)"}</strong>
                <span className="muted small"> · {r.doctor?.specialty?.name}</span>
                <div className="small" style={{ marginTop: 3 }}>📍 {[r.doctor?.chamberName, r.doctor?.district].filter(Boolean).join(", ")} &nbsp; 📞 {(r.doctor?.phones || []).join(", ")}</div>
                <div style={{ marginTop: 8 }}><span className="pill pill-must">{REASON_LABELS[r.reason] || r.reason}</span></div>
                {r.note && <div className="small" style={{ marginTop: 6 }}>“{r.note}”</div>}
                <div className="muted small" style={{ marginTop: 6 }}>
                  Reported {new Date(r.createdAt).toLocaleString()}{r.reportedBy ? ` by ${r.reportedBy.name} (${r.reportedBy.phone})` : ""}
                </div>
              </div>
              {r.status === "open" && <button className="btn sm" onClick={() => resolve(r)}>Mark resolved</button>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ================================== ROOT ================================== */

export default function Doctors() {
  const [tab, setTab] = useState("doctors");
  const [refreshKey, setRefreshKey] = useState(0);
  const [openReports, setOpenReports] = useState(0);
  const geo = useGeo();
  const specialties = useSpecialties(refreshKey);
  const bump = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    apiFetch("/api/admin/doctor-reports?status=open")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setOpenReports(list.length))
      .catch(() => {});
  }, [refreshKey]);

  return (
    <div>
      <SubTabs active={tab} onChange={setTab} openReports={openReports} />
      {tab === "doctors" && <DoctorsTab geo={geo} specialties={specialties} onChanged={bump} />}
      {tab === "import" && <ImportTab onChanged={bump} />}
      {tab === "specialties" && <SpecialtiesTab onChanged={bump} />}
      {tab === "reports" && <ReportsTab onChanged={bump} />}
    </div>
  );
}