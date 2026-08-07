import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Submissions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/submissions?status=pending");
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    let rejectionReason = null;
    if (decision === "reject") {
      rejectionReason = prompt("Reason (the person will see this):");
      if (rejectionReason === null) return;
    }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) setItems((p) => p.filter((x) => x._id !== id));
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading submissions...</div>;

  if (items.length === 0) {
    return (
      <div className="panel">
        <h2>Requirement submissions</h2>
        <p className="muted">Nothing waiting for review. 🎉</p>
        <button className="btn-ghost" onClick={load} style={{ marginTop: 12 }}>Refresh</button>
      </div>
    );
  }

  return (
    <div>
      <div className="verify-head">
        <h2>Requirement submissions ({items.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {items.map((s) => (
        <div key={s._id} className="verify-card">
          <div className="verify-info">
            <h3>{s.user?.name || "Unknown"}</h3>
            <p className="muted">
              {s.user?.phone} · <span className={`tag ${s.user?.role}`}>{s.user?.role}</span>
            </p>
            <p className="muted">
              Service: <strong>{s.service?.nameBangla}</strong> ({s.service?.name})
            </p>
            <p className="muted">
              Requirement: <strong>{s.requirement?.titleBangla}</strong> ({s.requirement?.title})
              {s.requirement?.isMandatory
                ? <span className="must" style={{ marginLeft: 8 }}>must</span>
                : <span className="opt" style={{ marginLeft: 8 }}>optional</span>}
            </p>
          </div>

          <div className="selfie-row" style={{ margin: "14px 0" }}>
            {(s.imageUrls || []).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`proof ${i}`} className="verify-img" />
              </a>
            ))}
            {(!s.imageUrls || s.imageUrls.length === 0) && (
              <span className="muted">No images uploaded</span>
            )}
          </div>

          <div className="verify-actions">
            <button className="btn" disabled={busyId === s._id}
              onClick={() => decide(s._id, "approve")}>✓ Approve</button>
            <button className="btn-reject" disabled={busyId === s._id}
              onClick={() => decide(s._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}