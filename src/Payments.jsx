import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const METHOD_LABEL = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

export default function Payments({ onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const pRes = await apiFetch("/api/admin/payments?status=pending");
      if (pRes.ok) setItems(await pRes.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    let rejectionReason = null;
    if (decision === "reject") {
      rejectionReason = prompt("Reason for rejection (the caregiver will see this):");
      if (rejectionReason === null) return;
    }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) { setItems((prev) => prev.filter((p) => p._id !== id)); onChange && onChange(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading payments…</div>;

  return (
    <div>
      {/* Pending payment submissions */}
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Commission payments ({items.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {items.length === 0 && (
        <div className="panel">
          <div className="empty-state">
            <div className="big">✅</div>
            No payments waiting for review.
          </div>
        </div>
      )}

      {items.map((p) => (
        <div key={p._id} className="review">
          <div className="review-head">
            <div className="review-who">
              <div className="avatar">{(p.helper?.name || "?")[0]}</div>
              <div>
                <div className="review-name">{p.helper?.name || "Unknown"}</div>
                <div className="review-sub">{p.helper?.phone}</div>
              </div>
            </div>
            <span className="pill pill-must">৳{p.amount}</span>
          </div>

          <div className="review-meta">
            <strong>Method:</strong> {METHOD_LABEL[p.method] || p.method} &nbsp;·&nbsp;
            <strong>Sender phone:</strong> {p.senderPhone} &nbsp;·&nbsp;
            <strong>Transaction ID:</strong> {p.transactionId}
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>
            Cross-check this transaction ID and phone number in your {METHOD_LABEL[p.method] || p.method} merchant panel before approving.
          </p>

          <div className="review-actions">
            <button className="btn btn-success" disabled={busyId === p._id} onClick={() => decide(p._id, "approve")}>✓ Approve</button>
            <button className="btn-danger" disabled={busyId === p._id} onClick={() => decide(p._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}