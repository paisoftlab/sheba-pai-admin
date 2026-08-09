import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Submissions({ onChange }) {
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
      if (res.ok) { setItems((p) => p.filter((x) => x._id !== id)); onChange && onChange(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading document proofs…</div>;

  if (items.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">✅</div>
          No document proofs waiting for review.
          <div style={{ marginTop: 14 }}><button className="btn-ghost" onClick={load}>Refresh</button></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Document proofs ({items.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {items.map((s) => (
        <div key={s._id} className="review">
          <div className="review-head">
            <div className="review-who">
              <div className="avatar">{(s.user?.name || "?")[0]}</div>
              <div>
                <div className="review-name">{s.user?.name || "Unknown"}</div>
                <div className="review-sub">
                  {s.user?.phone} · <span className={`pill pill-${s.user?.role === "patient" ? "patient" : "helper"}`}>{s.user?.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="review-meta">
            <strong>Service:</strong> {s.service?.nameBangla} <span className="muted small">· {s.service?.name}</span><br />
            <strong>Document:</strong> {s.requirement?.titleBangla} <span className="muted small">· {s.requirement?.title}</span>
            {" "}{s.requirement?.isMandatory
              ? <span className="pill pill-must">Must</span>
              : <span className="pill pill-opt">Optional</span>}
          </div>

          <div className="thumbs" style={{ margin: "14px 0" }}>
            {(s.imageUrls || []).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`proof ${i}`} className="doc-img" /></a>
            ))}
            {(!s.imageUrls || s.imageUrls.length === 0) && <span className="muted">No images uploaded</span>}
          </div>

          <div className="review-actions">
            <button className="btn btn-success" disabled={busyId === s._id} onClick={() => decide(s._id, "approve")}>✓ Approve</button>
            <button className="btn-danger" disabled={busyId === s._id} onClick={() => decide(s._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}