import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Shops({ onChange }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/shops?status=pending");
      const data = await res.json();
      if (res.ok) setPending(data);
    } catch (err) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    let rejectionReason = null;
    if (decision === "reject") {
      rejectionReason = prompt("Reason for rejection (the shop owner will see this):");
      if (rejectionReason === null) return;
    }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/shops/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) { setPending((prev) => prev.filter((p) => p._id !== id)); onChange && onChange(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading shops…</div>;

  if (pending.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">🏪</div>
          No shop applications waiting for review.
          <div style={{ marginTop: 14 }}><button className="btn-ghost" onClick={load}>Refresh</button></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Shop applications ({pending.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {pending.map((s) => (
        <div key={s._id} className="review">
          <div className="review-head">
            <div className="review-who">
              <div className="avatar">{(s.name || "?")[0]}</div>
              <div>
                <div className="review-name">{s.name}</div>
                <div className="review-sub">{s.owner?.name} · {s.owner?.phone}</div>
              </div>
            </div>
          </div>

          <div className="review-meta">
            <strong>Address:</strong> {s.address}<br />
            <strong>Contact:</strong> {s.contactPhone}
          </div>

          {s.licenseUrl ? (
            <div className="imgs">
              <div className="img-block">
                <span className="img-label">Trade / pharmacy license</span>
                <a href={s.licenseUrl} target="_blank" rel="noreferrer"><img src={s.licenseUrl} alt="license" className="doc-img" /></a>
              </div>
            </div>
          ) : (
            <p className="muted small" style={{ marginTop: 8 }}>No license photo uploaded yet.</p>
          )}

          <div className="review-actions">
            <button className="btn btn-success" disabled={busyId === s._id} onClick={() => decide(s._id, "approve")}>✓ Approve</button>
            <button className="btn-danger" disabled={busyId === s._id} onClick={() => decide(s._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}