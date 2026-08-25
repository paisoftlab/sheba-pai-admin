import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Riders({ onChange }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/riders?status=pending");
      const data = await res.json();
      if (res.ok) setPending(data);
    } catch (err) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    let rejectionReason = null;
    if (decision === "reject") {
      rejectionReason = prompt("Reason for rejection (the rider will see this):");
      if (rejectionReason === null) return;
    }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/riders/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) { setPending((prev) => prev.filter((p) => p._id !== id)); onChange && onChange(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading riders…</div>;

  if (pending.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">🏍️</div>
          No rider applications waiting for review.
          <div style={{ marginTop: 14 }}><button className="btn-ghost" onClick={load}>Refresh</button></div>
        </div>
      </div>
    );
  }

  const VEHICLE_LABEL = { bicycle: "Bicycle", motorcycle: "Motorcycle", on_foot: "On foot" };

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Rider applications ({pending.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {pending.map((r) => (
        <div key={r._id} className="review">
          <div className="review-head">
            <div className="review-who">
              <div className="avatar">{(r.fullName || r.user?.name || "?")[0]}</div>
              <div>
                <div className="review-name">{r.fullName || r.user?.name}</div>
                <div className="review-sub">{r.user?.phone}</div>
              </div>
            </div>
          </div>

          <div className="review-meta">
            <strong>NID #:</strong> {r.nidNumber || "—"} &nbsp;·&nbsp;
            <strong>Vehicle:</strong> {VEHICLE_LABEL[r.vehicleType] || r.vehicleType}
            {r.vehiclePlateNumber && <> &nbsp;·&nbsp; <strong>Plate:</strong> {r.vehiclePlateNumber}</>}
          </div>

          <div className="imgs">
            {r.nidFrontUrl && (
              <div className="img-block">
                <span className="img-label">NID Front</span>
                <a href={r.nidFrontUrl} target="_blank" rel="noreferrer"><img src={r.nidFrontUrl} alt="nid front" className="doc-img" /></a>
              </div>
            )}
            {r.nidBackUrl && (
              <div className="img-block">
                <span className="img-label">NID Back</span>
                <a href={r.nidBackUrl} target="_blank" rel="noreferrer"><img src={r.nidBackUrl} alt="nid back" className="doc-img" /></a>
              </div>
            )}
            {r.selfieUrl && (
              <div className="img-block">
                <span className="img-label">Selfie</span>
                <a href={r.selfieUrl} target="_blank" rel="noreferrer"><img src={r.selfieUrl} alt="selfie" className="doc-img" /></a>
              </div>
            )}
          </div>
          {!r.nidFrontUrl && !r.nidBackUrl && !r.selfieUrl && (
            <p className="muted small">No documents uploaded yet.</p>
          )}

          <div className="review-actions">
            <button className="btn btn-success" disabled={busyId === r._id} onClick={() => decide(r._id, "approve")}>✓ Approve</button>
            <button className="btn-danger" disabled={busyId === r._id} onClick={() => decide(r._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}