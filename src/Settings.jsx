import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/* Defined at module level so inputs never lose focus on re-render. */
function TextSetting({ label, hint, value, placeholder, onChange }) {
  return (
    <div className="settings-group">
      <div className="sg-head">
        <span className="sg-title">{label}</span>
      </div>
      <div className="sg-body">
        <input
          className="input sm"
          type="text"
          placeholder={placeholder}
          style={{ maxWidth: 240 }}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="sg-note">{hint}</p>
      </div>
    </div>
  );
}

/** Two clearly explained choices, not a bare dropdown — this switch changes how every order is taken. */
function OrderModeSetting({ value, onChange }) {
  const options = [
    {
      key: "form",
      title: "Order form — recommended for launch",
      note: "The customer fills in name, phone, district, thana and address, and picks inside or outside Dhaka. No location access is needed, and every order comes to your admin team. Simple and dependable.",
    },
    {
      key: "smart",
      title: "Smart routing (location-based)",
      note: "Uses the customer's GPS location to find the nearest partner pharmacy with the medicines in stock, and a nearby rider; falls back to your admin team if none is found. Worth switching on once you have enough partner pharmacies and riders.",
    },
  ];
  const current = value || "form";
  return (
    <div className="settings-group">
      <div className="sg-head"><span className="sg-title">How orders are taken</span></div>
      <div className="sg-body">
        {options.map((o) => (
          <label key={o.key} className="chip" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, padding: 12, cursor: "pointer", borderColor: current === o.key ? "var(--primary)" : undefined }}>
            <input type="radio" name="orderMode" checked={current === o.key} onChange={() => onChange(o.key)} style={{ marginTop: 3 }} />
            <span>
              <strong>{o.title}</strong>
              <span className="sg-note" style={{ display: "block", marginTop: 3 }}>{o.note}</span>
            </span>
          </label>
        ))}
        <p className="sg-note">Takes effect immediately, with no app update. Orders already placed are not affected, and you can switch back and forth safely.</p>
      </div>
    </div>
  );
}

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
          supportWhatsAppNumber: s.supportWhatsAppNumber,
          emergencyContactNumber: s.emergencyContactNumber,
          orderMode: s.orderMode || "form",
          courierFeeInsideDhaka: s.courierFeeInsideDhaka,
          courierFeeOutsideDhaka: s.courierFeeOutsideDhaka,
          localDeliveryFee: s.localDeliveryFee,
          privacyPolicyUrl: s.privacyPolicyUrl,
          termsUrl: s.termsUrl,
          accountDeletionUrl: s.accountDeletionUrl,
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
          supportWhatsAppNumber: s.supportWhatsAppNumber,
          emergencyContactNumber: s.emergencyContactNumber,
          orderMode: s.orderMode || "form",
          courierFeeInsideDhaka: s.courierFeeInsideDhaka,
          courierFeeOutsideDhaka: s.courierFeeOutsideDhaka,
          localDeliveryFee: s.localDeliveryFee,
          privacyPolicyUrl: s.privacyPolicyUrl,
          termsUrl: s.termsUrl,
          accountDeletionUrl: s.accountDeletionUrl,
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

        <div className="section-label" style={{ marginTop: 20 }}>Call for price</div>
        <TextSetting
          label="Support WhatsApp number"
          hint="The number 'Call for price' buttons open a chat to, in international format (e.g. 8801XXXXXXXXX). Leave blank to disable the button in the app."
          value={draft.supportWhatsAppNumber}
          placeholder="8801XXXXXXXXX"
          onChange={(v) => setField("supportWhatsAppNumber", v)}
        />

        <div className="section-label" style={{ marginTop: 20 }}>Emergency</div>
        <TextSetting
          label="Emergency contact number"
          hint="The number the app's emergency 'Call Now' button dials directly. Use your own dispatch/support line, not a personal number. Leave blank to hide the emergency button in the app."
          value={draft.emergencyContactNumber}
          placeholder="01XXXXXXXXX"
          onChange={(v) => setField("emergencyContactNumber", v)}
        />

        <div className="section-label" style={{ marginTop: 20 }}>Medicine ordering</div>
        <OrderModeSetting value={draft.orderMode} onChange={(v) => setField("orderMode", v)} />
        <NumberSetting
          label="Delivery fee — inside Dhaka"
          hint="Charged when the customer picks Inside Dhaka on the order form. Shown to the customer before they place the order."
          value={draft.courierFeeInsideDhaka} unit="৳" min={0} max={2000}
          onChange={(v) => setField("courierFeeInsideDhaka", v)}
        />
        <NumberSetting
          label="Delivery fee — outside Dhaka"
          hint="Charged when the customer picks Outside Dhaka. Courier companies typically charge more for outside-Dhaka parcels and often add about 1% for cash on delivery, so keep that in mind when setting this."
          value={draft.courierFeeOutsideDhaka} unit="৳" min={0} max={2000}
          onChange={(v) => setField("courierFeeOutsideDhaka", v)}
        />
        <NumberSetting
          label="Delivery fee — local shop and rider (smart routing only)"
          hint="Only used when 'Smart routing' is selected above and a nearby partner pharmacy fulfils the order."
          value={draft.localDeliveryFee} unit="৳" min={0} max={2000}
          onChange={(v) => setField("localDeliveryFee", v)}
        />

        <div className="section-label" style={{ marginTop: 20 }}>Legal pages (required for the Play Store)</div>
        <TextSetting
          label="Privacy policy link"
          hint="The public web address of your privacy policy page (e.g. your Google Site). Shown in the app on sign-up and profile screens. Google Play requires this, and it must be the SAME address you enter in Play Console."
          value={draft.privacyPolicyUrl}
          placeholder="https://sites.google.com/view/…"
          onChange={(v) => setField("privacyPolicyUrl", v)}
        />
        <TextSetting
          label="Terms & conditions link"
          hint="The public web address of your terms page. Shown next to the privacy policy link."
          value={draft.termsUrl}
          placeholder="https://sites.google.com/view/…"
          onChange={(v) => setField("termsUrl", v)}
        />
        <TextSetting
          label="Account deletion page link"
          hint="The public web page explaining how to delete an account (including by contacting you). Google Play asks for this separately. Shown on the in-app Delete Account screen as an alternative."
          value={draft.accountDeletionUrl}
          placeholder="https://sites.google.com/view/…"
          onChange={(v) => setField("accountDeletionUrl", v)}
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