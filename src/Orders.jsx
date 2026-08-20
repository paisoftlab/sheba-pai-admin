import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const STATUS_FLOW = ["pending", "confirmed", "out_for_delivery", "delivered"];
const STATUS_LABEL = {
  pending: "Pending", confirmed: "Confirmed",
  out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled",
};
const NEXT_STATUS = { pending: "confirmed", confirmed: "out_for_delivery", out_for_delivery: "delivered" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/orders${filter ? `?status=${filter}` : ""}`);
      if (res.ok) setOrders(await res.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]);

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyId(order._id);
    try {
      const res = await apiFetch(`/api/admin/orders/${order._id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  }

  async function cancelOrder(order) {
    if (!confirm(`Cancel this order for ${order.patient?.name}? Stock will be restored.`)) return;
    setBusyId(order._id);
    try {
      const res = await apiFetch(`/api/admin/orders/${order._id}/status`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      if (res.ok) load(); else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20 }}>Orders</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {["pending", "confirmed", "out_for_delivery", "delivered", "cancelled", ""].map((s) => (
          <button key={s || "all"} className={filter === s ? "tab active" : "tab"} onClick={() => setFilter(s)}>
            {s ? STATUS_LABEL[s] : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="center">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="panel"><div className="empty-state"><div className="big">📦</div>No orders here.</div></div>
      ) : (
        orders.map((o) => (
          <div key={o._id} className="review">
            <div className="review-head">
              <div className="review-who">
                <div className="avatar">{(o.patient?.name || "?")[0]}</div>
                <div>
                  <div className="review-name">{o.patient?.name || "Unknown"}</div>
                  <div className="review-sub">{o.patient?.phone} · {o.contactPhone}</div>
                </div>
              </div>
              <span className={`pill ${o.status === "cancelled" ? "pill-must" : "pill-opt"}`}>{STATUS_LABEL[o.status]}</span>
            </div>

            <div className="review-meta">
              <strong>Address:</strong> {o.address || "—"}<br />
              <strong>Items:</strong>
              <ul className="list" style={{ marginTop: 6 }}>
                {o.items.map((it, i) => (
                  <li key={i} className="list-item">
                    <span>{it.brandName} {it.strength} × {it.quantity}</span>
                    <span className="muted small">৳{it.lineTotal}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 8 }}><strong>Total: ৳{o.total}</strong> · {o.paymentMethod === "cod" ? "Cash on delivery" : o.paymentMethod}</div>
            </div>

            {o.prescriptionUrl && (
              <div className="imgs">
                <div className="img-block">
                  <span className="img-label">Prescription</span>
                  <a href={o.prescriptionUrl} target="_blank" rel="noreferrer"><img src={o.prescriptionUrl} alt="prescription" className="doc-img" /></a>
                </div>
              </div>
            )}

            <div className="review-actions">
              {NEXT_STATUS[o.status] && (
                <button className="btn btn-success" disabled={busyId === o._id} onClick={() => advance(o)}>
                  Mark {STATUS_LABEL[NEXT_STATUS[o.status]]}
                </button>
              )}
              {o.status !== "cancelled" && o.status !== "delivered" && (
                <button className="btn-danger" disabled={busyId === o._id} onClick={() => cancelOrder(o)}>Cancel order</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}