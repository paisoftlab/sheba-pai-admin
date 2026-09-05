import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * The admin-side half of "call for price": after a WhatsApp/phone
 * conversation, find the patient, pick a caregiver, and set the
 * negotiated price. This creates a real, targeted request the caregiver
 * still has to accept — see manualBookingRoutes.js for why that matters.
 */
export default function ManualBooking() {
  const [services, setServices] = useState([]);

  const [phone, setPhone] = useState("");
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  const [addressChoice, setAddressChoice] = useState(null); // saved address id, or "manual"
  const [manualAddress, setManualAddress] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const [helperQuery, setHelperQuery] = useState("");
  const [helpers, setHelpers] = useState([]);
  const [helper, setHelper] = useState(null);
  const [searchingHelper, setSearchingHelper] = useState(false);

  const [subServiceId, setSubServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/services/tree");
        if (res.ok) setServices(await res.json());
      } catch (e) {}
    })();
  }, []);

  const allSubServices = services.flatMap((m) =>
    (m.subServices || []).map((s) => ({ ...s, mainName: m.name }))
  );

  async function searchPatient() {
    if (phone.trim().length < 3) return;
    setSearchingPatient(true);
    try {
      const res = await apiFetch(`/api/admin/patients/search?phone=${encodeURIComponent(phone.trim())}`);
      if (res.ok) setPatients(await res.json());
    } catch (e) {} finally { setSearchingPatient(false); }
  }

  function pickPatient(p) {
    setPatient(p);
    setPatients([]);
    setAddressChoice(p.savedAddresses?.length ? p.savedAddresses[0]._id : "manual");
  }

  async function searchHelper(q) {
    setHelperQuery(q);
    if (q.trim().length < 2) { setHelpers([]); return; }
    setSearchingHelper(true);
    try {
      const res = await apiFetch(`/api/admin/helpers/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setHelpers(await res.json());
    } catch (e) {} finally { setSearchingHelper(false); }
  }

  function pickSubService(id) {
    setSubServiceId(id);
    const sub = allSubServices.find((s) => s._id === id);
    if (sub) {
      setServiceName(sub.nameBangla || sub.name);
      if (sub.commissionPercent) setCommissionPercent(String(sub.commissionPercent));
    }
  }

  function resolvedCoords() {
    if (addressChoice === "manual") {
      if (!manualLat || !manualLng) return null;
      return { longitude: manualLng, latitude: manualLat, address: manualAddress };
    }
    const addr = patient?.savedAddresses?.find((a) => a._id === addressChoice);
    if (!addr || addr.latitude == null || addr.longitude == null) return null;
    return { longitude: addr.longitude, latitude: addr.latitude, address: addr.address || addr.label };
  }

  async function submit() {
    if (!patient || !helper || !serviceName.trim() || !price) {
      alert("Patient, caregiver, service name, and price are all required.");
      return;
    }
    const coords = resolvedCoords();
    if (!coords) {
      alert("A location is required — pick a saved address with coordinates, or enter latitude/longitude manually. Without it, the caregiver's app can't find this job.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/manual-bookings", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient._id, helperId: helper._id,
          subServiceId: subServiceId || null,
          serviceName: serviceName.trim(), price: Number(price),
          commissionPercent: Number(commissionPercent) || 0,
          address: coords.address, longitude: coords.longitude, latitude: coords.latitude,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to create booking"); return; }
      setResult({ ...data, helperName: helper.name });
      // reset for the next one
      setPhone(""); setPatient(null); setPatients([]);
      setHelperQuery(""); setHelpers([]); setHelper(null);
      setSubServiceId(""); setServiceName(""); setPrice(""); setCommissionPercent("");
      setAddressChoice(null); setManualAddress(""); setManualLat(""); setManualLng("");
    } catch (err) { alert(err.message); } finally { setSubmitting(false); }
  }

  return (
    <div>
      <div className="panel-head">
        <h2>Manual booking</h2>
        <p className="hint">
          After a "call for price" WhatsApp or phone conversation, create the actual booking here.
          The caregiver still sees it in their incoming requests and has to accept it themselves —
          this doesn't force-assign the job on their behalf.
        </p>
      </div>

      {/* Patient */}
      <section className="panel">
        <div className="section-label">1. Find the patient</div>
        {patient ? (
          <div className="list-item">
            <span><strong>{patient.name}</strong> · {patient.phone}</span>
            <button className="link-btn" onClick={() => { setPatient(null); setAddressChoice(null); }}>Change</button>
          </div>
        ) : (
          <>
            <div className="row">
              <input className="input" placeholder="Patient's phone number" value={phone}
                onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPatient()}
                style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={searchPatient} disabled={searchingPatient}>
                {searchingPatient ? "…" : "Search"}
              </button>
            </div>
            {patients.map((p) => (
              <div key={p._id} className="list-item">
                <span>{p.name} · {p.phone}</span>
                <button className="link-btn" onClick={() => pickPatient(p)}>Select</button>
              </div>
            ))}
            {patients.length === 0 && phone.length >= 3 && !searchingPatient && (
              <p className="muted small">No match yet — search, or the patient may need to sign up first.</p>
            )}
          </>
        )}
      </section>

      {/* Location */}
      {patient && (
        <section className="panel">
          <div className="section-label">2. Delivery location</div>
          <p className="editor-help" style={{ marginTop: -4 }}>
            Required — without a real location, the caregiver's app can't find this job at all.
          </p>
          {patient.savedAddresses?.length > 0 && (
            <div className="col" style={{ marginBottom: 10 }}>
              {patient.savedAddresses.map((a) => (
                <label key={a._id} className={addressChoice === a._id ? "chip on" : "chip"} style={{ marginBottom: 6 }}>
                  <input type="radio" checked={addressChoice === a._id} onChange={() => setAddressChoice(a._id)} />
                  {a.label} {a.address ? `— ${a.address}` : ""} {a.latitude == null && "(no coordinates saved)"}
                </label>
              ))}
              <label className={addressChoice === "manual" ? "chip on" : "chip"}>
                <input type="radio" checked={addressChoice === "manual"} onChange={() => setAddressChoice("manual")} />
                Enter a different location
              </label>
            </div>
          )}
          {(addressChoice === "manual" || !patient.savedAddresses?.length) && (
            <div className="col">
              <input className="input" placeholder="Address (for the caregiver)" value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)} />
              <div className="field-grid">
                <label className="field"><span className="field-label">Latitude</span>
                  <input className="input sm" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="23.7104" /></label>
                <label className="field"><span className="field-label">Longitude</span>
                  <input className="input sm" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="90.4074" /></label>
              </div>
              <p className="hint">Find coordinates: search the address on Google Maps, right-click the exact spot, and the top option shows lat/lng to copy here.</p>
            </div>
          )}
        </section>
      )}

      {/* Service + Helper + Price */}
      {patient && (
        <section className="panel">
          <div className="section-label">3. Service, caregiver, and price</div>

          <label className="field">
            <span className="field-label">Service (optional — for categorization)</span>
            <select className="input sm" value={subServiceId} onChange={(e) => pickSubService(e.target.value)}>
              <option value="">— None / custom —</option>
              {allSubServices.map((s) => (
                <option key={s._id} value={s._id}>{s.mainName} → {s.nameBangla || s.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Service name shown to patient & caregiver *</span>
            <input className="input" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. ৩ মাসের ডে-কেয়ার প্যাকেজ" />
          </label>

          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <span className="field-label">Caregiver *</span>
          </div>
          {helper ? (
            <div className="list-item">
              <span><strong>{helper.name}</strong> · {helper.phone}</span>
              <button className="link-btn" onClick={() => setHelper(null)}>Change</button>
            </div>
          ) : (
            <>
              <input className="input" placeholder="Search caregiver by name or phone" value={helperQuery}
                onChange={(e) => searchHelper(e.target.value)} />
              {helpers.map((h) => (
                <div key={h._id} className="list-item">
                  <span>{h.name} · {h.phone}</span>
                  <button className="link-btn" onClick={() => { setHelper(h); setHelpers([]); setHelperQuery(""); }}>Select</button>
                </div>
              ))}
              {searchingHelper && <p className="muted small">Searching…</p>}
            </>
          )}

          <div className="field-grid" style={{ marginTop: 12 }}>
            <label className="field"><span className="field-label">Agreed price ৳ *</span>
              <input className="input sm" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label className="field"><span className="field-label">Platform commission %</span>
              <input className="input sm" type="number" min="0" max="100" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></label>
          </div>

          <button className="btn" onClick={submit} disabled={submitting} style={{ marginTop: 14 }}>
            {submitting ? "Creating…" : "Create booking"}
          </button>
        </section>
      )}

      {result && (
        <section className="panel">
          <div className="panel-head"><h2>✓ Booking created</h2></div>
          <p>Sent to <strong>{result.helperName || "the caregiver"}</strong> — they'll see it in their incoming requests and need to accept it themselves.</p>
        </section>
      )}
    </div>
  );
}