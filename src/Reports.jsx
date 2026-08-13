import { useState, useEffect } from "react";
import { apiFetch } from "./api";

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function AccountabilityTable({ title, rows, subtitle }) {
  if (rows.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head"><h2>{title}</h2><p className="hint">{subtitle}</p></div>
        <div className="empty-state"><div className="big">✅</div>No accounts with cancel/no-show history.</div>
      </div>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2><p className="hint">{subtitle}</p></div>
      <ul className="list">
        {rows.map((r) => (
          <li key={r._id} className="list-item">
            <span><strong>{r.name}</strong> <span className="muted small">· {r.phone}</span></span>
            <span className="row" style={{ gap: 8 }}>
              {r.cancelCount > 0 && <span className="pill pill-opt">{r.cancelCount} cancel{r.cancelCount > 1 ? "s" : ""}</span>}
              {r.noShowCount > 0 && <span className="pill pill-must">{r.noShowCount} no-show{r.noShowCount > 1 ? "s" : ""}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [accountability, setAccountability] = useState({ patients: [], helpers: [] });
  const [commission, setCommission] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        apiFetch("/api/admin/accountability"),
        apiFetch("/api/admin/commission-overview"),
      ]);
      if (aRes.ok) setAccountability(await aRes.json());
      if (cRes.ok) setCommission(await cRes.json());
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="center">Loading reports…</div>;

  return (
    <div>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20 }}>Overview</h2>
        <button className="btn-ghost" onClick={load}>Refresh</button>
      </div>

      {/* Commission summary cards */}
      {commission && (
        <div className="panel">
          <div className="panel-head">
            <h2>Commission overview</h2>
            <p className="hint">Platform-wide earnings and outstanding commission across all caregivers.</p>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="settings-group" style={{ flex: 1, minWidth: 160 }}>
              <div className="sg-body" style={{ textAlign: "center" }}>
                <div className="muted small">Total outstanding</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--danger)" }}>৳{commission.totalOutstanding.toLocaleString()}</div>
              </div>
            </div>
            <div className="settings-group" style={{ flex: 1, minWidth: 160 }}>
              <div className="sg-body" style={{ textAlign: "center" }}>
                <div className="muted small">Total earned (all-time)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--teal)" }}>৳{commission.totalEarnedAll.toLocaleString()}</div>
              </div>
            </div>
            <div className="settings-group" style={{ flex: 1, minWidth: 160 }}>
              <div className="sg-body" style={{ textAlign: "center" }}>
                <div className="muted small">Restricted accounts</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: commission.restrictedCount > 0 ? "var(--warn)" : "var(--body)" }}>{commission.restrictedCount}</div>
              </div>
            </div>
          </div>

          {commission.owing.length > 0 ? (
            <ul className="list" style={{ marginTop: 16 }}>
              {commission.owing.map((o) => (
                <li key={o._id} className="list-item">
                  <span>
                    <strong>{o.name}</strong> <span className="muted small">· {o.phone}</span>
                  </span>
                  <span className="row" style={{ gap: 8 }}>
                    <span className="muted small">due {fmtDate(o.dueDate)}</span>
                    <span className={`pill ${o.overdue ? "pill-must" : "pill-opt"}`}>
                      {o.overdue ? "⛔ restricted" : "৳" + o.commissionBalance}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ marginTop: 12 }}>No caregivers currently owe commission.</p>
          )}
        </div>
      )}

      <AccountabilityTable
        title="Caregiver accountability"
        subtitle="Caregivers with cancellations or no-shows on record, worst first."
        rows={accountability.helpers}
      />
      <AccountabilityTable
        title="Patient accountability"
        subtitle="Patients with cancellations or no-shows on record, worst first."
        rows={accountability.patients}
      />
    </div>
  );
}