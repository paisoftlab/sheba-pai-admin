import { useState, useEffect } from "react";
import { apiFetch, API_URL } from "./api";

/* ---------- MY SHOP: profile + license + open/closed ---------- */

function ProfileTab({ shop, onSaved }) {
  const [f, setF] = useState({
    name: shop?.name || "", address: shop?.address || "", contactPhone: shop?.contactPhone || "",
    longitude: shop?.location?.coordinates?.[0] || "", latitude: shop?.location?.coordinates?.[1] || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!f.name || !f.address || !f.contactPhone || !f.longitude || !f.latitude) {
      alert("Please fill in every field, including coordinates.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/shop/profile", { method: "POST", body: JSON.stringify(f) });
      const data = await res.json();
      if (res.ok) onSaved(data);
      else alert(data.error || "Failed to save");
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  }

  async function uploadLicense(file) {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/shop/license`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) onSaved(data);
      else alert(data.error || "Upload failed");
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  }

  const statusPill = {
    unsubmitted: <span className="pill pill-opt">Not submitted yet</span>,
    pending: <span className="pill pill-must">Pending review</span>,
    approved: <span className="pill" style={{ background: "var(--success-t)", color: "var(--success)" }}>Approved ✓</span>,
    rejected: <span className="pill" style={{ background: "var(--danger-t)", color: "var(--danger)" }}>Rejected</span>,
  }[shop?.verificationStatus || "unsubmitted"];

  return (
    <div>
      <section className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>My shop</h2>
          {statusPill}
        </div>
        {shop?.verificationStatus === "rejected" && shop.rejectionReason && (
          <p className="editor-help warn">Reason: {shop.rejectionReason} — fix and resubmit below.</p>
        )}
        <form className="col" onSubmit={save}>
          <label className="field"><span className="field-label">Shop name</span>
            <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="field"><span className="field-label">Address</span>
            <input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} /></label>
          <label className="field"><span className="field-label">Contact phone</span>
            <input className="input" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></label>

          <div className="field-grid">
            <label className="field"><span className="field-label">Latitude</span>
              <input className="input sm" value={f.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="23.7104" /></label>
            <label className="field"><span className="field-label">Longitude</span>
              <input className="input sm" value={f.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="90.4074" /></label>
          </div>
          <p className="hint">
            Find your coordinates: search your shop on Google Maps, right-click your exact location,
            and the top option shows the latitude, longitude to copy here.
          </p>

          <button className="btn" disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Saving…" : "Save shop details"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Trade / pharmacy license</h2></div>
        {shop?.licenseUrl && (
          <div className="imgs" style={{ marginBottom: 12 }}>
            <div className="img-block">
              <span className="img-label">Current license</span>
              <img src={shop.licenseUrl} alt="license" className="doc-img" />
            </div>
          </div>
        )}
        <label className="btn sm" style={{ display: "inline-block", cursor: "pointer" }}>
          {uploading ? "Uploading…" : shop?.licenseUrl ? "Replace license photo" : "Upload license photo"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
            onChange={(e) => { uploadLicense(e.target.files[0]); e.target.value = ""; }} />
        </label>
      </section>
    </div>
  );
}

/* ---------- MY STOCK ---------- */

function StockTab({ shop }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qtyDraft, setQtyDraft] = useState({});

  async function loadStock() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/shop/stock");
      if (res.ok) setStock(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { loadStock(); }, []);

  async function search() {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/medicines/search?q=${encodeURIComponent(query.trim())}&limit=15`);
      const data = await res.json();
      setResults(data.medicines || []);
    } catch (e) {} finally { setSearching(false); }
  }

  async function addToStock(medicineId, qty) {
    if (!qty || Number(qty) <= 0) { alert("Enter a quantity greater than 0."); return; }
    try {
      const res = await apiFetch("/api/shop/stock", { method: "POST", body: JSON.stringify({ medicineId, stock: Number(qty) }) });
      if (res.ok) { loadStock(); setQtyDraft((p) => ({ ...p, [medicineId]: "" })); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); }
  }

  async function removeStock(medicineId) {
    if (!confirm("Stop carrying this medicine?")) return;
    try {
      const res = await apiFetch(`/api/shop/stock/${medicineId}`, { method: "DELETE" });
      if (res.ok) loadStock();
    } catch (err) { alert(err.message); }
  }

  if (shop?.verificationStatus !== "approved") {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">⏳</div>
          Your shop needs to be approved before you can manage stock. Check the "My Shop" tab for status.
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="panel">
        <div className="panel-head"><h2>Add a medicine to your stock</h2></div>
        <div className="row" style={{ marginBottom: 14 }}>
          <input className="input" placeholder="Search medicine by name…" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={search} disabled={searching}>{searching ? "…" : "Search"}</button>
        </div>
        {results.map((m) => (
          <div key={m._id} className="list-item">
            <span><strong>{m.brandName}</strong> {m.strength && <span className="muted small">· {m.strength}</span>}
              <span className="muted small"> · ৳{m.price}</span></span>
            <span className="row" style={{ gap: 8 }}>
              <input className="input sm" type="number" placeholder="Qty" style={{ width: 80 }}
                value={qtyDraft[m._id] || ""} onChange={(e) => setQtyDraft((p) => ({ ...p, [m._id]: e.target.value }))} />
              <button className="btn sm" onClick={() => addToStock(m._id, qtyDraft[m._id])}>Add</button>
            </span>
          </div>
        ))}
      </section>

      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>My stock ({stock.length})</h2>
        <button className="btn-ghost" onClick={loadStock}>Refresh</button>
      </div>
      {loading ? <div className="center">Loading…</div> : (
        <ul className="list">
          {stock.map((s) => (
            <li key={s._id} className="list-item">
              <span><strong>{s.medicine?.brandName}</strong> {s.medicine?.strength && <span className="muted small">· {s.medicine.strength}</span>}</span>
              <span className="row" style={{ gap: 10 }}>
                <span className={`pill ${s.stock <= 5 ? "pill-must" : "pill-opt"}`}>Stock: {s.stock}</span>
                <button className="icon-btn" onClick={() => removeStock(s.medicine._id)}>✕</button>
              </span>
            </li>
          ))}
          {stock.length === 0 && <li className="muted small">You haven't added any medicines yet.</li>}
        </ul>
      )}
    </div>
  );
}

/* ---------- ORDERS / PICKUPS ---------- */

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeDraft, setCodeDraft] = useState({});
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/shop/orders");
      if (res.ok) setOrders(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function confirmPickup(id) {
    const pickupCode = codeDraft[id];
    if (!pickupCode) { alert("Enter the pickup code the rider gives you."); return; }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/shop/orders/${id}/confirm-pickup`, { method: "PATCH", body: JSON.stringify({ pickupCode }) });
      const data = await res.json();
      if (res.ok) { load(); }
      else alert(data.error || "That code doesn't match");
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  const STATUS_LABEL = { pending: "Waiting for a rider", rider_assigned: "Rider on the way to you", picked_up: "Picked up" };

  if (loading) return <div className="center">Loading orders…</div>;

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Orders for my shop ({orders.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>
      {orders.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">📦</div>No orders right now.</div></div>
      ) : (
        orders.map((o) => (
          <div key={o._id} className="review">
            <div className="review-head">
              <div className="review-name">Order …{String(o._id).slice(-6).toUpperCase()}</div>
              <span className="pill pill-opt">{STATUS_LABEL[o.status] || o.status}</span>
            </div>
            <div className="review-meta">
              <ul className="list" style={{ marginTop: 6 }}>
                {o.items.map((it, i) => (
                  <li key={i} className="list-item"><span>{it.brandName} {it.strength}</span><span className="muted small">× {it.quantity}</span></li>
                ))}
              </ul>
            </div>
            {o.status === "rider_assigned" && (
              <div className="row" style={{ marginTop: 10 }}>
                <input className="input sm" placeholder="6-digit pickup code" style={{ maxWidth: 160 }}
                  value={codeDraft[o._id] || ""} onChange={(e) => setCodeDraft((p) => ({ ...p, [o._id]: e.target.value }))} />
                <button className="btn sm" disabled={busyId === o._id} onClick={() => confirmPickup(o._id)}>Confirm pickup</button>
              </div>
            )}
            {o.status === "pending" && <p className="muted small" style={{ marginTop: 8 }}>Waiting for a rider to accept this delivery.</p>}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------- ROOT ---------- */

export default function ShopDashboard({ onLogout }) {
  const [tab, setTab] = useState("profile");
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadShop() {
    try {
      const res = await apiFetch("/api/shop/profile");
      if (res.ok) setShop(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { loadShop(); }, []);

  const tabs = [
    { key: "profile", label: "My Shop" },
    { key: "stock", label: "My Stock" },
    { key: "orders", label: "Orders" },
  ];

  if (loading) return <div className="center">Loading…</div>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="mark">সে</div>
          <div>
            <h1>সেবা পাই</h1>
            <div className="tag">Shop Console</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={onLogout}>Sign out</button>
      </header>
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? "tab active" : "tab"} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </nav>

      {tab === "profile" && <ProfileTab shop={shop} onSaved={setShop} />}
      {tab === "stock" && <StockTab shop={shop} />}
      {tab === "orders" && <OrdersTab />}
    </div>
  );
}