import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./api";

/**
 * Admin → Caregivers (directory / manual booking mode).
 *
 *   Requests    — every booking request (from the app, phone or WhatsApp) in one
 *                 inbox. Call the family, assign a caregiver, agree the price,
 *                 then move it along: New → Contacted → Confirmed → Ongoing → Completed.
 *   Caregivers  — who is listed, their districts / care types / rates; hide or feature them.
 *   Care types  — the condition-based categories families browse by, with "from" prices.
 */

/* ------------------------------- shared bits ------------------------------- */

const STATUS = {
  new: { label: "New", bg: "#FEF3C7", fg: "#B45309" },
  contacted: { label: "Contacted", bg: "#DBEAFE", fg: "#1E3A5F" },
  confirmed: { label: "Confirmed", bg: "#CCFBF1", fg: "#0F766E" },
  ongoing: { label: "Ongoing", bg: "#DCFCE7", fg: "#047857" },
  completed: { label: "Completed", bg: "#E2E8F0", fg: "#334155" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", fg: "#B91C1C" },
};
const NEXT = { new: "contacted", contacted: "confirmed", confirmed: "ongoing", ongoing: "completed" };
const SHIFTS = { day8: "8h day", day12: "12h day", night12: "12h night", live24: "24h live-in" };
const UNITS = { day8: "per 8 hours", shift12: "per 12-hour shift", live24: "per 24 hours", month: "per month", visit: "per visit" };
const TIERS = { attendant: "Caregiver / attendant", trained: "Trained caregiver", nurse: "Registered nurse" };
const ICON_KEYS = ["stroke", "bedridden", "dementia", "postop", "newborn", "elderly", "night", "hospital", "nursing", "general"];
const SOURCES = { app: "App", phone: "Phone call", whatsapp: "WhatsApp", admin: "Admin" };

function StatusPill({ status }) {
  const m = STATUS[status] || STATUS.new;
  return <span style={{ background: m.bg, color: m.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{m.label}</span>;
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—");
const waLink = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "88" + d;
  return `https://wa.me/${d}`;
};

function Field({ label, children, width }) {
  return (
    <label className="field" style={width ? { maxWidth: width } : undefined}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function useGeo() {
  const [geo, setGeo] = useState([]);
  useEffect(() => { apiFetch("/api/doctors/geo").then((r) => (r.ok ? r.json() : [])).then(setGeo).catch(() => {}); }, []);
  return geo;
}

function useCategories(refreshKey) {
  const [list, setList] = useState([]);
  useEffect(() => { apiFetch("/api/admin/care/categories").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {}); }, [refreshKey]);
  return list;
}

async function send(path, method, body) {
  const res = await apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function SubTabs({ active, onChange, newCount }) {
  const tabs = [
    { key: "requests", label: newCount ? `Requests (${newCount} new)` : "Requests" },
    { key: "caregivers", label: "Caregivers" },
    { key: "types", label: "Care types" },
  ];
  return (
    <div className="tabs" style={{ marginBottom: 18 }}>
      {tabs.map((t) => (
        <button key={t.key} className={active === t.key ? "tab active" : "tab"} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}

/* ================================ REQUESTS ================================ */

const EMPTY_BOOKING = {
  source: "phone", contactName: "", contactPhone: "", district: "", area: "", address: "",
  category: "", planType: "short", shift: "day12", startDate: "", durationDays: "",
  patientName: "", patientAge: "", patientGender: "", conditionNote: "", preferredGender: "any", note: "", adminNotes: "",
};

function BookingForm({ initial, geo, categories, onSave, onCancel, title, saveLabel }) {
  const [f, setF] = useState({ ...EMPTY_BOOKING, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const districts = geo.flatMap((dv) => dv.districts);
  async function submit() {
    setSaving(true);
    try { await onSave(f); } catch (e) { alert(e.message); } finally { setSaving(false); }
  }
  return (
    <div className="editor">
      {title && <div className="section-label">{title}</div>}
      <div className="field-grid">
        {!initial?._id ? (
          <Field label="Came in by" width={160}>
            <select className="input sm" value={f.source} onChange={(e) => set("source", e.target.value)}>
              <option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option><option value="admin">Other</option>
            </select>
          </Field>
        ) : null}
        <Field label="Contact name *"><input className="input sm" value={f.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Karim Ahmed" /></Field>
        <Field label="Contact phone *"><input className="input sm" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="01XXXXXXXXX" /></Field>
      </div>
      <div className="field-grid">
        <Field label="District *">
          <select className="input sm" value={f.district} onChange={(e) => set("district", e.target.value)}>
            <option value="">— choose —</option>
            {districts.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.bn})</option>)}
          </select>
        </Field>
        <Field label="Thana / area"><input className="input sm" value={f.area || ""} onChange={(e) => set("area", e.target.value)} placeholder="Mirpur 10" /></Field>
        <Field label="Address"><input className="input sm" value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></Field>
      </div>
      <div className="field-grid">
        <Field label="Care type">
          <select className="input sm" value={f.category || ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">— not sure —</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Plan" width={150}>
          <select className="input sm" value={f.planType} onChange={(e) => set("planType", e.target.value)}>
            <option value="short">Short-term</option><option value="regular">Regular / monthly</option>
          </select>
        </Field>
        <Field label="Shift" width={150}>
          <select className="input sm" value={f.shift} onChange={(e) => set("shift", e.target.value)}>
            {Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Start date" width={160}><input className="input sm" type="date" value={f.startDate || ""} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="Days (empty = ongoing)" width={150}><input className="input sm" type="number" min={1} value={f.durationDays ?? ""} onChange={(e) => set("durationDays", e.target.value)} /></Field>
      </div>
      <div className="field-grid">
        <Field label="Patient name"><input className="input sm" value={f.patientName || ""} onChange={(e) => set("patientName", e.target.value)} /></Field>
        <Field label="Age" width={90}><input className="input sm" type="number" value={f.patientAge ?? ""} onChange={(e) => set("patientAge", e.target.value)} /></Field>
        <Field label="Patient gender" width={130}>
          <select className="input sm" value={f.patientGender || ""} onChange={(e) => set("patientGender", e.target.value)}>
            <option value="">—</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </Field>
        <Field label="Wants caregiver" width={140}>
          <select className="input sm" value={f.preferredGender} onChange={(e) => set("preferredGender", e.target.value)}>
            <option value="any">Any</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </Field>
      </div>
      <div className="field-grid">
        <Field label="Patient's condition"><textarea className="input sm" rows={2} value={f.conditionNote || ""} onChange={(e) => set("conditionNote", e.target.value)} /></Field>
        <Field label="Family's note"><textarea className="input sm" rows={2} value={f.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
      <div className="row">
        <button className="btn sm" onClick={submit} disabled={saving}>{saving ? "Saving…" : saveLabel || "Save"}</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/** Find a listed caregiver to assign — narrowed to the request's district and care type by default. */
function AssignPicker({ booking, onPick }) {
  const [q, setQ] = useState("");
  const [sameDistrict, setSameDistrict] = useState(true);
  const [sameType, setSameType] = useState(!!booking.category);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ status: "listed", limit: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (sameDistrict && booking.district) p.set("district", booking.district);
    if (sameType && booking.category) p.set("category", booking.category._id || booking.category);
    setLoading(true);
    const timer = setTimeout(() => {
      apiFetch(`/api/admin/care/caregivers?${p}`).then((r) => (r.ok ? r.json() : { caregivers: [] }))
        .then((d) => setRows(d.caregivers || [])).catch(() => {}).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, sameDistrict, sameType, booking.district, booking.category]);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "var(--surface-2)" }}>
      <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input className="input sm" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, phone or ID (SP1234)" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="small"><input type="checkbox" checked={sameDistrict} onChange={(e) => setSameDistrict(e.target.checked)} /> Works in {booking.district}</label>
        {booking.category && <label className="small"><input type="checkbox" checked={sameType} onChange={(e) => setSameType(e.target.checked)} /> Offers {booking.categoryName}</label>}
      </div>
      <div style={{ marginTop: 10, maxHeight: 260, overflowY: "auto" }}>
        {loading && <div className="muted small">Searching…</div>}
        {!loading && rows.length === 0 && <div className="muted small">No listed caregiver matches. Untick a filter to see more.</div>}
        {rows.map((c) => {
          const genderOk = booking.preferredGender === "any" || c.care.gender === booking.preferredGender;
          return (
            <div key={c.userId} className="list-item" style={{ gap: 10 }}>
              <span style={{ flex: 1 }}>
                <strong>{c.name}</strong> <span className="muted small">· {c.care.code} · {c.phone} · {TIERS[c.care.tier]} · {c.care.gender || "?"}</span>
                {!genderOk && <span className="small" style={{ color: "var(--warn)", marginLeft: 6 }}>family asked for {booking.preferredGender}</span>}
                {c.care.available === false && <span className="small" style={{ color: "var(--muted)", marginLeft: 6 }}>· busy</span>}
                <div className="muted small">{(c.care.districts || []).slice(0, 5).join(", ")}{c.care.districts?.length > 5 ? ` +${c.care.districts.length - 5}` : ""} · ★ {c.ratingAvg || "—"} ({c.ratingCount})</div>
              </span>
              <button className="btn sm" onClick={() => onPick(c)}>Assign</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingCard({ b, geo, categories, onChanged }) {
  const [open, setOpen] = useState(b.status === "new");
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [price, setPrice] = useState(b.agreedPrice ?? "");
  const [priceNote, setPriceNote] = useState(b.priceNote || "");
  const [notes, setNotes] = useState(b.adminNotes || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPrice(b.agreedPrice ?? ""); setPriceNote(b.priceNote || ""); setNotes(b.adminNotes || ""); }, [b._id, b.updatedAt]);

  async function patch(body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try { onChanged(await send(`/api/admin/care/bookings/${b._id}`, "PATCH", body)); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  }

  const dirty = String(price ?? "") !== String(b.agreedPrice ?? "") || priceNote !== (b.priceNote || "") || notes !== (b.adminNotes || "");
  const next = NEXT[b.status];
  const closed = ["completed", "cancelled"].includes(b.status);

  return (
    <div className="review" style={{ marginBottom: 12, borderLeft: b.status === "new" ? "4px solid #D97706" : undefined }}>
      <div className="review-head" style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }} onClick={() => setOpen(!open)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15 }}>{b.categoryName || "Caregiver (type not chosen)"}</strong>
            <StatusPill status={b.status} />
            <span className="muted small">{b.code} · {SOURCES[b.source]} · {timeAgo(b.createdAt)}</span>
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            <strong>{b.contactName}</strong> · <a href={`tel:${b.contactPhone}`} onClick={(e) => e.stopPropagation()}>{b.contactPhone}</a>
            {" · "}<a href={waLink(b.contactPhone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>WhatsApp</a>
            {" · "}{[b.area, b.district].filter(Boolean).join(", ")}
          </div>
          <div className="muted small" style={{ marginTop: 2 }}>
            {SHIFTS[b.shift]} · {b.planType === "regular" ? "Regular / monthly" : `Short-term${b.durationDays ? `, ${b.durationDays} days` : ""}`} · starts {fmtDate(b.startDate)}
            {b.requestedCaregiverName && <> · asked for <strong>{b.requestedCaregiverName}</strong> ({b.requestedCaregiverCode})</>}
            {b.assignedCaregiver && <> · assigned: <strong>{b.assignedCaregiver.name}</strong></>}
            {b.agreedPrice != null && <> · ৳{b.agreedPrice} {b.priceNote || ""}</>}
          </div>
        </div>
        <span className="muted">{open ? "▴" : "▾"}</span>
      </div>

      {open && !editing && (
        <div style={{ marginTop: 12 }}>
          <div className="field-grid" style={{ marginBottom: 6 }}>
            <div className="small"><span className="muted">Patient:</span> {[b.patientName, b.patientAge != null ? `${b.patientAge} yrs` : null, b.patientGender].filter(Boolean).join(", ") || "—"}</div>
            <div className="small"><span className="muted">Wants caregiver:</span> {b.preferredGender}</div>
            <div className="small"><span className="muted">Address:</span> {b.address || "—"}</div>
          </div>
          {b.conditionNote && <div className="small" style={{ marginBottom: 6 }}><span className="muted">Condition:</span> {b.conditionNote}</div>}
          {b.note && <div className="small" style={{ marginBottom: 6 }}><span className="muted">Family's note:</span> {b.note}</div>}
          {b.patient ? <div className="muted small">App account: {b.patient.name} ({b.patient.phone}) — they see status updates in the app.</div>
            : <div className="muted small">No app account linked — keep the family updated by phone.</div>}
          {b.review?.stars && <div className="small" style={{ marginTop: 6 }}>Review: {"★".repeat(b.review.stars)}{"☆".repeat(5 - b.review.stars)} {b.review.comment || ""}</div>}

          <div className="section-label" style={{ marginTop: 14 }}>Caregiver</div>
          {b.assignedCaregiver ? (
            <div className="row" style={{ alignItems: "center" }}>
              <span><strong>{b.assignedCaregiver.name}</strong> · <a href={`tel:${b.assignedCaregiver.phone}`}>{b.assignedCaregiver.phone}</a></span>
              {!closed && <button className="btn-ghost sm" onClick={() => setAssigning(!assigning)}>{assigning ? "Close" : "Change"}</button>}
              {!closed && <button className="btn-ghost sm" onClick={() => patch({ assignedCaregiver: null }, "Remove the assigned caregiver?")}>Remove</button>}
            </div>
          ) : (
            !closed && <button className="btn-ghost sm" onClick={() => setAssigning(!assigning)}>{assigning ? "Close" : "Find & assign a caregiver"}</button>
          )}
          {assigning && <div style={{ marginTop: 8 }}><AssignPicker booking={b} onPick={(c) => { setAssigning(false); patch({ assignedCaregiver: c.userId }); }} /></div>}

          <div className="section-label" style={{ marginTop: 14 }}>Price & notes</div>
          <div className="field-grid">
            <Field label="Agreed price (৳)" width={160}><input className="input sm" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Price is…" width={220}><input className="input sm" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="per 12-hour shift / per month" /></Field>
            <Field label="Internal notes (never shown to the family)"><textarea className="input sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          {dirty && <button className="btn sm" disabled={busy} onClick={() => patch({ agreedPrice: price === "" ? null : price, priceNote, adminNotes: notes })}>Save price & notes</button>}

          <div className="section-label" style={{ marginTop: 14 }}>Status</div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {next && (
              <button className="btn sm" disabled={busy} onClick={() => patch({ status: next })}>
                Mark as {STATUS[next].label}{["confirmed", "ongoing", "completed"].includes(next) && !b.assignedCaregiver ? " (assign first)" : ""}
              </button>
            )}
            {!closed && (
              <button className="btn-danger sm" disabled={busy} onClick={() => {
                const reason = window.prompt("Why is this request cancelled? (the family sees this)", "");
                if (reason !== null) patch({ status: "cancelled", cancelReason: reason });
              }}>Cancel request</button>
            )}
            {closed && <button className="btn-ghost sm" disabled={busy} onClick={() => patch({ status: "contacted" }, "Re-open this request?")}>Re-open</button>}
            <select className="input sm" style={{ maxWidth: 170 }} value="" onChange={(e) => e.target.value && patch({ status: e.target.value }, `Set status to ${STATUS[e.target.value].label}?`)}>
              <option value="">Set status…</option>
              {Object.entries(STATUS).filter(([k]) => k !== b.status).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn-ghost sm" onClick={() => setEditing(true)}>Edit details</button>
          </div>

          {b.history?.length > 0 && (
            <div className="muted small" style={{ marginTop: 12 }}>
              {b.history.map((h, i) => (
                <div key={i}>{new Date(h.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} — {STATUS[h.status]?.label} ({h.by}){h.note ? `: ${h.note}` : ""}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {open && editing && (
        <div style={{ marginTop: 12 }}>
          <BookingForm
            initial={{ ...b, category: b.category?._id || b.category || "", startDate: b.startDate ? b.startDate.slice(0, 10) : "", source: undefined }}
            geo={geo} categories={categories} saveLabel="Save details"
            onCancel={() => setEditing(false)}
            onSave={async (f) => {
              const body = { ...f };
              delete body.source; delete body.adminNotes;
              ["_id", "code", "patient", "history", "status", "assignedCaregiver", "requestedCaregiver", "review", "createdAt", "updatedAt", "__v",
                "categoryName", "categoryNameBangla", "requestedCaregiverCode", "requestedCaregiverName", "agreedPrice", "priceNote", "division", "cancelReason", "cancelledBy"].forEach((k) => delete body[k]);
              if (!body.startDate) delete body.startDate;
              onChanged(await send(`/api/admin/care/bookings/${b._id}`, "PATCH", body));
              setEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function RequestsTab({ geo, categories, counts, onCountsChange }) {
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (p = 1, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(p) });
      if (q.trim()) params.set("q", q.trim());
      const res = await apiFetch(`/api/admin/care/bookings?${params}`);
      const d = await res.json();
      if (res.ok) {
        setRows((prev) => (p === 1 ? d.bookings : [...prev, ...d.bookings]));
        setTotal(d.total); setHasMore(d.hasMore); setPage(p);
      }
    } catch (e) {} finally { setLoading(false); }
    onCountsChange();
  }, [status, q]);

  useEffect(() => { const t = setTimeout(() => load(1), q ? 300 : 0); return () => clearTimeout(t); }, [load]);
  // New requests arrive from the app at any time — refresh quietly every minute.
  useEffect(() => { const t = setInterval(() => load(1, true), 60000); return () => clearInterval(t); }, [load]);

  function replace(updated) {
    setRows((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    onCountsChange();
  }

  const filters = [["open", "Open"], ["new", "New"], ["contacted", "Contacted"], ["confirmed", "Confirmed"], ["ongoing", "Ongoing"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["all", "All"]];

  return (
    <>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        {filters.map(([k, label]) => (
          <button key={k} className={status === k ? "btn sm" : "btn-ghost sm"} onClick={() => setStatus(k)}>
            {label}{counts && counts[k] != null && k !== "all" ? ` (${counts[k]})` : ""}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input sm" style={{ flex: 1 }} placeholder="Search booking no., name, phone or area" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn sm" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Record a phone / WhatsApp booking"}</button>
      </div>
      {adding && (
        <BookingForm geo={geo} categories={categories} title="New booking (taken by phone / WhatsApp)" saveLabel="Create booking"
          initial={{}} onCancel={() => setAdding(false)}
          onSave={async (f) => {
            const body = { ...f };
            if (!body.startDate) delete body.startDate;
            await send("/api/admin/care/bookings", "POST", body);
            setAdding(false);
            setStatus("open"); load(1);
          }} />
      )}

      {loading ? <div className="muted">Loading…</div> : rows.length === 0 ? (
        <div className="empty-state"><div className="big">🗂️</div><p>No requests here.</p></div>
      ) : (
        <>
          <p className="muted small">{total} request{total === 1 ? "" : "s"}</p>
          {rows.map((b) => <BookingCard key={b._id} b={b} geo={geo} categories={categories} onChanged={replace} />)}
          {hasMore && <button className="btn-ghost sm" onClick={() => load(page + 1)}>Load more</button>}
        </>
      )}
    </>
  );
}

/* ================================ CAREGIVERS ================================ */

function CaregiverEditor({ row, geo, categories, onSaved, onCancel }) {
  const c = row.care || {};
  const [f, setF] = useState({
    gender: c.gender || "", tier: c.tier || "attendant", bnmcNumber: c.bnmcNumber || "", yearsExperience: c.yearsExperience || 0,
    bio: c.bio || "", categories: (c.categories || []).map((x) => x._id || x), districts: c.districts || [], shifts: c.shifts || [],
    rates: { day8: c.rates?.day8 ?? "", day12: c.rates?.day12 ?? "", night12: c.rates?.night12 ?? "", live24: c.rates?.live24 ?? "", month: c.rates?.month ?? "" },
    available: c.available !== false,
  });
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));
  const divDistricts = division ? geo.find((d) => d.name === division)?.districts || [] : [];

  async function save() {
    setSaving(true);
    try {
      const body = { ...f, gender: f.gender || null, rates: Object.fromEntries(Object.entries(f.rates).map(([k, v]) => [k, v === "" ? null : Number(v)])) };
      onSaved(await send(`/api/admin/care/caregivers/${row.userId}`, "PATCH", body));
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="editor" style={{ marginTop: 10 }}>
      <div className="field-grid">
        <Field label="Gender" width={130}>
          <select className="input sm" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">—</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </Field>
        <Field label="Level" width={200}>
          <select className="input sm" value={f.tier} onChange={(e) => set("tier", e.target.value)}>
            {Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {f.tier === "nurse" && <Field label="BNMC no." width={150}><input className="input sm" value={f.bnmcNumber} onChange={(e) => set("bnmcNumber", e.target.value)} /></Field>}
        <Field label="Years exp." width={100}><input className="input sm" type="number" value={f.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} /></Field>
        <label className="chip" style={{ alignSelf: "flex-end" }}><input type="checkbox" checked={f.available} onChange={(e) => set("available", e.target.checked)} /> Taking new work</label>
      </div>
      <Field label="Intro (shown to families)"><textarea className="input sm" rows={2} maxLength={600} value={f.bio} onChange={(e) => set("bio", e.target.value)} /></Field>

      <div className="section-label">Care types</div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        {categories.map((cat) => (
          <label key={cat._id} className="chip"><input type="checkbox" checked={f.categories.includes(cat._id)} onChange={() => toggle("categories", cat._id)} /> {cat.name}{cat.minTier !== "attendant" ? ` (${cat.minTier}+)` : ""}</label>
        ))}
      </div>

      <div className="section-label">Districts ({f.districts.length})</div>
      <div className="row" style={{ flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {f.districts.map((d) => <span key={d} className="chip" style={{ cursor: "pointer" }} onClick={() => toggle("districts", d)}>{d} ✕</span>)}
        {f.districts.length === 0 && <span className="muted small">None yet</span>}
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        <select className="input sm" style={{ maxWidth: 220 }} value={division} onChange={(e) => setDivision(e.target.value)}>
          <option value="">Add districts from division…</option>
          {geo.map((dv) => <option key={dv.name} value={dv.name}>{dv.name}</option>)}
        </select>
        {division && <button className="btn-ghost sm" onClick={() => setF((p) => ({ ...p, districts: [...new Set([...p.districts, ...divDistricts.map((d) => d.name)])] }))}>Add whole division</button>}
      </div>
      {division && (
        <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {divDistricts.map((d) => (
            <label key={d.name} className="chip"><input type="checkbox" checked={f.districts.includes(d.name)} onChange={() => toggle("districts", d.name)} /> {d.name}</label>
          ))}
        </div>
      )}

      <div className="section-label">Shifts & usual rates (৳)</div>
      <div className="field-grid">
        {Object.entries(SHIFTS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label className="chip"><input type="checkbox" checked={f.shifts.includes(k)} onChange={() => toggle("shifts", k)} /> {v}</label>
            <input className="input sm" type="number" style={{ maxWidth: 100 }} placeholder="rate" value={f.rates[k]} onChange={(e) => setF((p) => ({ ...p, rates: { ...p.rates, [k]: e.target.value } }))} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="small">Monthly</span>
          <input className="input sm" type="number" style={{ maxWidth: 110 }} value={f.rates.month} onChange={(e) => setF((p) => ({ ...p, rates: { ...p.rates, month: e.target.value } }))} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save caregiver"}</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function CaregiversTab({ geo, categories }) {
  const [status, setStatus] = useState("listed");
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ status, limit: "100" });
      if (q.trim()) p.set("q", q.trim());
      if (district) p.set("district", district);
      const res = await apiFetch(`/api/admin/care/caregivers?${p}`);
      const d = await res.json();
      if (res.ok) { setRows(d.caregivers); setTotal(d.total); }
    } catch (e) {} finally { setLoading(false); }
  }, [status, q, district]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load]);

  async function flag(row, body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const updated = await send(`/api/admin/care/caregivers/${row.userId}`, "PATCH", body);
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? updated : r)));
    } catch (e) { alert(e.message); }
  }

  const MISSING = { gender: "gender", districts: "districts", categories: "care types", shifts: "shifts" };

  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>
        A caregiver appears in the app once their identity is approved (Identity checks tab) and their care profile has a
        gender, at least one district, one care type and one shift. Caregivers fill this in themselves in the app; you can edit it here too.
      </p>
      <div className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <select className="input sm" style={{ maxWidth: 230 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="listed">Listed (visible in app)</option>
          <option value="incomplete">Approved — profile incomplete</option>
          <option value="hidden">Hidden by admin</option>
          <option value="pending">Identity check pending</option>
          <option value="all">All</option>
        </select>
        <select className="input sm" style={{ maxWidth: 200 }} value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All districts</option>
          {geo.flatMap((dv) => dv.districts).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <input className="input sm" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? <div className="muted">Loading…</div> : rows.length === 0 ? (
        <div className="empty-state"><div className="big">👩‍⚕️</div><p>No caregivers here.</p></div>
      ) : (
        <>
          <p className="muted small">{total} caregiver{total === 1 ? "" : "s"}</p>
          {rows.map((r) => (
            <div key={r.userId} className="review" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                {r.care?.photoUrl ? <img src={r.care.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover" }} />
                  : <div className="avatar" style={{ width: 48, height: 48 }}>{(r.name || "?")[0]}</div>}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{r.name}</strong>
                    <span className="muted small">{r.care?.code || "no ID yet"} · <a href={`tel:${r.phone}`}>{r.phone}</a></span>
                    {r.listed ? <span className="pill" style={{ background: "#DCFCE7", color: "#047857" }}>Listed</span>
                      : <span className="pill" style={{ background: "#FEF3C7", color: "#B45309" }}>Not listed</span>}
                    {r.care?.featured && <span className="pill" style={{ background: "#FFEDE9", color: "#C2410C" }}>Featured</span>}
                    {r.care?.adminHidden && <span className="pill" style={{ background: "#FEE2E2", color: "#B91C1C" }}>Hidden</span>}
                  </div>
                  <div className="small" style={{ marginTop: 3 }}>
                    {TIERS[r.care?.tier || "attendant"]} · {r.care?.gender || "gender?"} · {r.care?.yearsExperience || 0} yrs · ★ {r.ratingAvg || "—"} ({r.ratingCount}) · {r.care?.completedBookings || 0} jobs
                    {r.care?.available === false && " · paused"}
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {(r.care?.districts || []).join(", ") || "no districts"} — {(r.care?.categories || []).map((c) => c.name).join(", ") || "no care types"}
                  </div>
                  {r.missing?.length > 0 && <div className="small" style={{ color: "var(--warn)", marginTop: 2 }}>Missing: {r.missing.map((m) => MISSING[m]).join(", ")}</div>}
                  {r.care?.tier !== "attendant" && r.care?.tier && !r.hasCertificate && (
                    <div className="small" style={{ color: "var(--danger)", marginTop: 2 }}>Claims "{TIERS[r.care.tier]}" but uploaded no certificate — check before confirming.</div>
                  )}
                  {!r.hasPoliceClearance && <div className="muted small">No police clearance uploaded.</div>}
                </div>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <button className="btn-ghost sm" onClick={() => setEditing(editing === r.userId ? null : r.userId)}>{editing === r.userId ? "Close" : "Edit"}</button>
                  <button className="btn-ghost sm" onClick={() => flag(r, { featured: !r.care?.featured })}>{r.care?.featured ? "Unfeature" : "Feature"}</button>
                  <button className={r.care?.adminHidden ? "btn sm" : "btn-danger sm"} onClick={() => flag(r, { adminHidden: !r.care?.adminHidden },
                    r.care?.adminHidden ? null : "Hide this caregiver from the app? They will see a 'temporarily not shown' notice.")}>
                    {r.care?.adminHidden ? "Show again" : "Hide"}
                  </button>
                </div>
              </div>
              {editing === r.userId && (
                <CaregiverEditor row={r} geo={geo} categories={categories} onCancel={() => setEditing(null)}
                  onSaved={(u) => { setRows((prev) => prev.map((x) => (x.userId === u.userId ? u : x))); setEditing(null); }} />
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* ================================ CARE TYPES ================================ */

const EMPTY_TYPE = { name: "", nameBangla: "", iconKey: "general", description: "", descriptionBangla: "", fromPrice: "", priceUnit: "shift12", minTier: "attendant", keywords: "", sortOrder: 0, isActive: true };

function TypeForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...EMPTY_TYPE, ...initial, fromPrice: initial?.fromPrice ?? "", keywords: (initial?.keywords || []).join?.(", ") ?? initial?.keywords ?? "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  async function submit() {
    setSaving(true);
    try { await onSave({ ...f, fromPrice: f.fromPrice === "" ? null : f.fromPrice }); } catch (e) { alert(e.message); } finally { setSaving(false); }
  }
  return (
    <div className="editor">
      <div className="field-grid">
        <Field label="Name (English) *"><input className="input sm" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Stroke & paralysis" /></Field>
        <Field label="নাম (বাংলা) *"><input className="input sm" value={f.nameBangla} onChange={(e) => set("nameBangla", e.target.value)} placeholder="স্ট্রোক ও প্যারালাইসিস" /></Field>
        <Field label="Icon" width={150}>
          <select className="input sm" value={f.iconKey} onChange={(e) => set("iconKey", e.target.value)}>
            {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
      </div>
      <div className="field-grid">
        <Field label="Short description (English)"><input className="input sm" value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Short description (বাংলা)"><input className="input sm" value={f.descriptionBangla || ""} onChange={(e) => set("descriptionBangla", e.target.value)} /></Field>
      </div>
      <div className="field-grid">
        <Field label="'From' price (৳) — empty = not shown" width={200}><input className="input sm" type="number" value={f.fromPrice} onChange={(e) => set("fromPrice", e.target.value)} placeholder="900" /></Field>
        <Field label="Price is" width={200}>
          <select className="input sm" value={f.priceUnit} onChange={(e) => set("priceUnit", e.target.value)}>
            {Object.entries(UNITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Who may offer it" width={210}>
          <select className="input sm" value={f.minTier} onChange={(e) => set("minTier", e.target.value)}>
            <option value="attendant">Any caregiver</option><option value="trained">Trained caregivers & nurses</option><option value="nurse">Registered nurses only</option>
          </select>
        </Field>
        <Field label="Order" width={90}><input className="input sm" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
      </div>
      <Field label="Search words, comma separated (English or বাংলা)"><input className="input sm" value={f.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="paralysis, প্যারালাইসিস" /></Field>
      <label className="chip" style={{ display: "inline-flex", margin: "8px 0 12px" }}>
        <input type="checkbox" checked={!!f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Shown in app
      </label>
      <div className="row">
        <button className="btn sm" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save care type"}</button>
        <button className="btn-ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function TypesTab({ categories, onChanged }) {
  const [editing, setEditing] = useState(null); // id | "new" | null
  const [seeding, setSeeding] = useState(false);

  async function seed() {
    setSeeding(true);
    try {
      const d = await send("/api/admin/care/categories/seed", "POST");
      alert(d.added ? `Added ${d.added} standard care type(s).` : "All standard care types are already there.");
      onChanged();
    } catch (e) { alert(e.message); } finally { setSeeding(false); }
  }
  async function remove(c) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await send(`/api/admin/care/categories/${c._id}`, "DELETE"); onChanged(); } catch (e) { alert(e.message); }
  }

  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>
        Families browse caregivers by the patient's condition. Set a transparent "from" price for each type — it is shown in the app
        as "From ৳900 / 12 hrs" (a caregiver's own rate, when lower, is shown on their card instead). The picture comes from the app's
        <code> assets/icons/care/&lt;icon&gt;.png</code> file.
      </p>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={() => setEditing(editing === "new" ? null : "new")}>{editing === "new" ? "Close" : "+ Add care type"}</button>
        <button className="btn-ghost sm" onClick={seed} disabled={seeding}>{seeding ? "Adding…" : "Add standard care types"}</button>
      </div>
      {editing === "new" && (
        <TypeForm initial={{}} onCancel={() => setEditing(null)}
          onSave={async (f) => { await send("/api/admin/care/categories", "POST", f); setEditing(null); onChanged(); }} />
      )}
      {categories.length === 0 ? (
        <div className="empty-state"><div className="big">🧩</div><p>No care types yet — click "Add standard care types" to start.</p></div>
      ) : (
        <ul className="list">
          {categories.map((c) => (
            <li key={c._id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ flex: 1 }}>
                  <strong>{c.nameBangla}</strong> <span className="muted">· {c.name}</span>
                  {!c.isActive && <span className="pill" style={{ marginLeft: 8, background: "#E2E8F0" }}>Hidden</span>}
                  <div className="muted small">
                    icon: {c.iconKey} · {c.fromPrice != null ? `from ৳${c.fromPrice} ${UNITS[c.priceUnit]}` : "no price shown"} ·
                    {" "}{c.minTier === "nurse" ? "nurses only" : c.minTier === "trained" ? "trained+" : "any caregiver"} · {c.caregiverCount} listed caregiver(s)
                  </div>
                </span>
                <button className="btn-ghost sm" onClick={() => setEditing(editing === c._id ? null : c._id)}>{editing === c._id ? "Close" : "Edit"}</button>
                <button className="icon-btn" title="Delete" onClick={() => remove(c)}>✕</button>
              </div>
              {editing === c._id && (
                <div style={{ marginTop: 10 }}>
                  <TypeForm initial={c} onCancel={() => setEditing(null)}
                    onSave={async (f) => { await send(`/api/admin/care/categories/${c._id}`, "PATCH", f); setEditing(null); onChanged(); }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ================================ PAGE ================================ */

export default function Caregivers({ onChange }) {
  const [tab, setTab] = useState("requests");
  const [typesKey, setTypesKey] = useState(0);
  const [counts, setCounts] = useState(null);
  const geo = useGeo();
  const categories = useCategories(typesKey);

  const loadCounts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/care/bookings/counts");
      if (res.ok) setCounts(await res.json());
    } catch (e) {}
    onChange?.();
  }, [onChange]);
  useEffect(() => { loadCounts(); }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Caregivers</h2>
        <p className="hint">
          Booking requests from families, the caregiver directory, and care types. Switch between this directory mode and the
          live dispatch system in Settings → "How caregiver bookings work".
        </p>
      </div>
      <SubTabs active={tab} onChange={setTab} newCount={counts?.new || 0} />
      {tab === "requests" && <RequestsTab geo={geo} categories={categories} counts={counts} onCountsChange={loadCounts} />}
      {tab === "caregivers" && <CaregiversTab geo={geo} categories={categories} />}
      {tab === "types" && <TypesTab categories={categories} onChanged={() => setTypesKey((k) => k + 1)} />}
    </section>
  );
}
