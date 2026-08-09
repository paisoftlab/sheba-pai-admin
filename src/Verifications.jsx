import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Verifications({ onChange }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/verifications?status=pending");
      const data = await res.json();
      if (res.ok) setPending(data);
    } catch (err) {} finally { setLoading(false); }
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
      const res = await apiFetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) { setPending((prev) => prev.filter((p) => p._id !== id)); onChange && onChange(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading identity checks…</div>;

  if (pending.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="big">✅</div>
          No identity checks waiting for review.
          <div style={{ marginTop: 14 }}><button className="btn-ghost" onClick={load}>Refresh</button></div>
        </div>
      </div>
    );
  }

  const Img = ({ url, label }) =>
    url ? (
      <div className="img-block">
        <span className="img-label">{label}</span>
        <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="doc-img" /></a>
      </div>
    ) : null;

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Identity checks ({pending.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {pending.map((p) => (
        <div key={p._id} className="review">
          <div className="review-head">
            <div className="review-who">
              <div className="avatar">{(p.fullName || p.user?.name || "?")[0]}</div>
              <div>
                <div className="review-name">{p.fullName || p.user?.name || "Unknown"}</div>
                <div className="review-sub">{p.user?.phone}</div>
              </div>
            </div>
          </div>

          <div className="review-meta">
            <strong>NID #:</strong> {p.nidNumber || "—"} &nbsp;·&nbsp;
            <strong>Profession:</strong> {p.profession || p.roles?.join(", ") || "—"} &nbsp;·&nbsp;
            <strong>Consent:</strong> {p.consentAccepted ? "✓ accepted" : "✗ not accepted"}
          </div>

          <div className="imgs">
            <Img url={p.nidFrontUrl} label="NID Front" />
            <Img url={p.nidBackUrl} label="NID Back" />
            <div className="img-block">
              <span className="img-label">Selfies ({p.selfieUrls?.length || 0})</span>
              <div className="thumbs">
                {(p.selfieUrls || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`selfie ${i}`} className="doc-img sm" /></a>
                ))}
              </div>
            </div>
            <Img url={p.policeClearanceUrl} label="Police Clearance" />
            {p.certificateUrls?.length > 0 && (
              <div className="img-block">
                <span className="img-label">Certificates ({p.certificateUrls.length})</span>
                <div className="thumbs">
                  {p.certificateUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`cert ${i}`} className="doc-img sm" /></a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="review-actions">
            <button className="btn btn-success" disabled={busyId === p._id} onClick={() => decide(p._id, "approve")}>✓ Approve</button>
            <button className="btn-danger" disabled={busyId === p._id} onClick={() => decide(p._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}