import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export default function Verifications() {
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
      rejectionReason = prompt("Reason for rejection (helper will see this):");
      if (rejectionReason === null) return;
    }
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      if (res.ok) setPending((prev) => prev.filter((p) => p._id !== id));
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  if (loading) return <div className="center">Loading verifications...</div>;

  if (pending.length === 0) {
    return (
      <div className="panel">
        <h2>Pending Verifications</h2>
        <p className="muted">No helpers waiting for review. 🎉</p>
        <button className="btn-ghost" onClick={load} style={{ marginTop: 12 }}>Refresh</button>
      </div>
    );
  }

  const Img = ({ url, label }) =>
    url ? (
      <div className="img-block">
        <span className="img-label">{label}</span>
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="verify-img" />
        </a>
      </div>
    ) : null;

  return (
    <div>
      <div className="verify-head">
        <h2>Pending Verifications ({pending.length})</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {pending.map((p) => (
        <div key={p._id} className="verify-card">
          <div className="verify-info">
            <h3>{p.fullName || p.user?.name || "Unknown"}</h3>
            <p className="muted">Phone: {p.user?.phone}</p>
            <p className="muted">NID #: {p.nidNumber || "—"}</p>
            <p className="muted">Roles: {p.roles?.join(", ") || "—"}</p>
            <p className="muted">Consent: {p.consentAccepted ? "✓ accepted" : "✗ not accepted"}</p>
          </div>

          <div className="verify-images">
            <Img url={p.nidFrontUrl} label="NID Front" />
            <Img url={p.nidBackUrl} label="NID Back" />

            <div className="img-block">
              <span className="img-label">Selfies ({p.selfieUrls?.length || 0})</span>
              <div className="selfie-row">
                {(p.selfieUrls || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`selfie ${i}`} className="verify-img sm" />
                  </a>
                ))}
              </div>
            </div>

            <Img url={p.policeClearanceUrl} label="Police Clearance" />

            {p.certificateUrls?.length > 0 && (
              <div className="img-block">
                <span className="img-label">Certificates ({p.certificateUrls.length})</span>
                <div className="selfie-row">
                  {p.certificateUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`cert ${i}`} className="verify-img sm" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="verify-actions">
            <button className="btn" disabled={busyId === p._id} onClick={() => decide(p._id, "approve")}>✓ Approve</button>
            <button className="btn-reject" disabled={busyId === p._id} onClick={() => decide(p._id, "reject")}>✕ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}