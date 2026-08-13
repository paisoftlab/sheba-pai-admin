import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/* Defined at module level so inputs never lose focus on re-render. */
function NumberSetting({ label, hint, value, unit, min, max, onChange }) {
  return (
    <div className="settings-group">
      <div className="sg-head">
        <span className="sg-title">{label}</span>
      </div>
      <div className="sg-body">
        <div className="row" style={{ alignItems: "center" }}>
          <input
            className="input sm"
            type="number"
            min={min}
            max={max}
            style={{ maxWidth: 100 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {unit && <span className="muted small">{unit}</span>}
        </div>
        <p className="sg-note">{hint}</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/settings");
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        setDraft({
          commissionGraceDays: s.commissionGraceDays,
          maxConcurrentJobs: s.maxConcurrentJobs,
          searchRadiusKm: s.searchRadiusKm,
          browsePageSize: s.browsePageSize,
        });
      }
    } catch (e) {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function setField(key, val) {
    setDraft((d) => ({ ...d, [key]: val }));
    setSaved(false);
  }

  const dirty = settings && Object.keys(draft).some(
    (k) => String(draft[k]) !== String(settings[k])
  );

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        setDraft({
          commissionGraceDays: s.commissionGraceDays,
          maxConcurrentJobs: s.maxConcurrentJobs,
          searchRadiusKm: s.searchRadiusKm,
          browsePageSize: s.browsePageSize,
        });
        setSaved(true);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save");
      }
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  if (loading) return <div className="center">Loading settings…</div>;
  if (!settings) return <div className="center">Could not load settings.</div>;

  return (
    <div>
      <section className="panel">
        <div className="panel-head">
          <h2>Platform settings</h2>
          <p className="hint">
            Platform-wide rules that apply to every caregiver and patient.
            Changes take effect immediately — no app update needed.
          </p>
        </div>

        <div className="section-label">Caregiver workload</div>
        <NumberSetting
          label="Jobs at the same time"
          hint="How many jobs one caregiver may hold at once. When they reach this limit, they can't accept another until one is finished or cancelled."
          value={draft.maxConcurrentJobs}
          unit="jobs"
          min={1} max={20}
          onChange={(v) => setField("maxConcurrentJobs", v)}
        />

        <div className="section-label" style={{ marginTop: 20 }}>Commission</div>
        <NumberSetting
          label="Payment window"
          hint="After a job completes, how many days a caregiver has to pay their commission before their account is automatically restricted from going online."
          value={draft.commissionGraceDays}
          unit="days"
          min={1} max={90}
          onChange={(v) => setField("commissionGraceDays", v)}
        />

        <div className="section-label" style={{ marginTop: 20 }}>Patient search</div>
        <NumberSetting
          label="Search radius"
          hint="How far from the patient we look for available caregivers. A larger radius finds more caregivers but they'll take longer to arrive."
          value={draft.searchRadiusKm}
          unit="km"
          min={1} max={100}
          onChange={(v) => setField("searchRadiusKm", v)}
        />
        <NumberSetting
          label="Caregivers per page"
          hint="How many caregivers a patient sees at once when browsing, before tapping 'See more'."
          value={draft.browsePageSize}
          unit="per page"
          min={3} max={50}
          onChange={(v) => setField("browsePageSize", v)}
        />

        <div className="row" style={{ marginTop: 22, alignItems: "center" }}>
          <button className="btn" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="muted small">✓ Saved</span>}
          {dirty && !saving && <span className="muted small">You have unsaved changes</span>}
        </div>
      </section>
    </div>
  );
}