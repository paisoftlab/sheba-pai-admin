import { useState, useEffect } from "react";
import { apiFetch, API_URL } from "./api";

const LINK_TYPES = [
  { value: "none", label: "None — decorative only" },
  { value: "category", label: "A medicine category" },
  { value: "medicine", label: "A specific medicine" },
  { value: "deals", label: "The deals page" },
];

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/banners");
      if (res.ok) setBanners(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function createBanner(file) {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);
      formData.append("linkType", "none");
      const res = await fetch(`${API_URL}/api/admin/banners`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) load();
      else alert(data.error || "Upload failed");
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  }

  async function updateBanner(id, patch) {
    try {
      const res = await apiFetch(`/api/admin/banners/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      const data = await res.json();
      if (res.ok) setBanners((prev) => prev.map((b) => (b._id === id ? data : b)));
      else alert(data.error || "Failed to update");
    } catch (err) { alert(err.message); }
  }

  async function deleteBanner(id) {
    if (!confirm("Delete this banner permanently?")) return;
    try {
      const res = await apiFetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (res.ok) setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch (err) { alert(err.message); }
  }

  if (loading) return <div className="center">Loading banners…</div>;

  return (
    <div>
      <div className="panel-head">
        <h2>Promotional banners</h2>
        <p className="hint">
          Shown as an auto-advancing slider on the medicine store's home screen, right below the
          search bar. Order here (top to bottom) controls the order shown there.
        </p>
      </div>

      <section className="panel">
        <div className="section-label">Add a new banner</div>
        <p className="editor-help" style={{ marginTop: -4 }}>
          Recommended: a wide image, roughly 3:1 (e.g. 1200×400px), so it isn't stretched or cropped oddly.
        </p>
        <label className="btn" style={{ display: "inline-block", cursor: "pointer", marginTop: 10 }}>
          {uploading ? "Uploading…" : "+ Upload banner image"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
            onChange={(e) => { createBanner(e.target.files[0]); e.target.value = ""; }} />
        </label>
      </section>

      {banners.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">🖼️</div>No banners yet — upload one above.</div></div>
      ) : (
        banners.map((b) => <BannerRow key={b._id} banner={b} onUpdate={updateBanner} onDelete={deleteBanner} />)
      )}
    </div>
  );
}

function BannerRow({ banner, onUpdate, onDelete }) {
  const [linkType, setLinkType] = useState(banner.linkType);
  const [linkValue, setLinkValue] = useState(banner.linkValue || "");
  const [sortOrder, setSortOrder] = useState(banner.sortOrder);
  const [dirty, setDirty] = useState(false);

  function mark(setter) { return (v) => { setter(v); setDirty(true); }; }

  async function save() {
    await onUpdate(banner._id, { linkType, linkValue: linkType === "none" ? null : linkValue, sortOrder: Number(sortOrder) || 0 });
    setDirty(false);
  }

  return (
    <div className="review">
      <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
        <img src={banner.imageUrl} alt="" style={{ width: 160, borderRadius: 10, objectFit: "cover" }} />
        <div style={{ flex: 1 }}>
          <div className="review-head" style={{ marginBottom: 10 }}>
            <span className="pill" style={banner.isActive ? { background: "var(--success-t)", color: "var(--success)" } : { background: "var(--danger-t)", color: "var(--danger)" }}>
              {banner.isActive ? "Active" : "Inactive"}
            </span>
            <button className="link-btn" onClick={() => onUpdate(banner._id, { isActive: !banner.isActive })}>
              {banner.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Tapping this banner opens</span>
              <select className="input sm" value={linkType} onChange={(e) => mark(setLinkType)(e.target.value)}>
                {LINK_TYPES.map((lt) => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
              </select>
            </label>
            {linkType !== "none" && linkType !== "deals" && (
              <label className="field">
                <span className="field-label">{linkType === "category" ? "Category slug" : "Medicine slug"}</span>
                <input className="input sm" value={linkValue} onChange={(e) => mark(setLinkValue)(e.target.value)} placeholder={linkType === "category" ? "e.g. diabetic-care" : "e.g. napa-500mg"} />
              </label>
            )}
            <label className="field" style={{ maxWidth: 100 }}>
              <span className="field-label">Order</span>
              <input className="input sm" type="number" value={sortOrder} onChange={(e) => mark(setSortOrder)(e.target.value)} />
            </label>
          </div>

          <div className="row" style={{ marginTop: 10, gap: 10 }}>
            {dirty && <button className="btn sm" onClick={save}>Save changes</button>}
            <button className="btn-danger" onClick={() => onDelete(banner._id)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}