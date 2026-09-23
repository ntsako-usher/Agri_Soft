import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, MapPin, Ruler, Sprout, LogOut, Compass, Clock, CheckCircle2 } from "lucide-react";
import { api, currentUser } from "../api/client";

export default function NewFarm() {
  const nav = useNavigate();
  const user = currentUser();
  const [form, setForm] = useState({
    farm_name: "",
    location_address: "",
    location_description: "",
    size_hectares: "",
    timezone: "Africa/Johannesburg",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("access")) nav("/login", { replace: true });
  }, [nav]);

  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.farm_name.trim()) {
      setErr("Farm name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        farm_name: form.farm_name.trim(),
        location_address: form.location_address.trim(),
        location_description: form.location_description.trim(),
        size_hectares: form.size_hectares ? Number(form.size_hectares) : null,
        timezone: form.timezone || "Africa/Johannesburg",
      };
      await api.createFarm(payload);

      // Notify admin — best effort
      try {
        await api.createAlert({
          type: "system",
          severity: "info",
          message: `New farm registered: ${payload.farm_name} by ${user?.name ?? "farmer"}`,
        });
      } catch (err) {
        console.warn("Could not notify admin:", err?.response?.status);
      }

      // Full reload → Overview picks up the new farm for THIS user
      window.location.href = "/";
    } catch (e) {
      const d = e.response?.data;
      setErr(
        d
          ? typeof d === "string"
            ? d
            : Object.values(d).flat().join(" ")
          : "Could not create farm"
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "40px 24px",
      display: "grid",
      placeItems: "flex-start center",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "var(--accent-soft)",
              display: "grid", placeItems: "center",
            }}>
              <Leaf size={16} color="var(--accent)" />
            </div>
            <strong style={{ letterSpacing: 1, color: "var(--text)" }}>SOFT-AGRI</strong>
          </div>
          <button onClick={signOut} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none",
            color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
          }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: "var(--radius-pill)",
            background: "var(--accent-soft)", color: "var(--accent)",
            fontSize: 12, fontWeight: 500, marginBottom: 14,
          }}>
            <Sprout size={13} /> Register a farm
          </div>
          <h1 style={{
            margin: 0, fontSize: 32, fontWeight: 500,
            letterSpacing: "-0.6px", color: "var(--text)", lineHeight: 1.15,
          }}>
            Welcome, {user?.name?.split(" ")[0] ?? "farmer"}.
            <br />Let's register your farm.
          </h1>
          <div style={{
            color: "var(--text-muted)", fontSize: 14, marginTop: 12,
            maxWidth: 480, lineHeight: 1.6,
          }}>
            Tell us about your farm so we can set up monitoring and irrigation.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28, display: "grid", gap: 16,
          boxShadow: "var(--shadow-sm)",
        }}>
          <Field
            label="Farm name"
            placeholder="e.g. North Field"
            value={form.farm_name}
            onChange={change("farm_name")}
            icon={<Leaf size={14} />}
            required
          />
         
         
          <Field
            label="Specific Address"
            placeholder="e.g. 123 Farm Road, Pretoria"
            value={form.location_address}
            onChange={change("location_address")}
            icon={<MapPin size={14} />}
          />
          <Field
            label="Location Description"
            placeholder="e.g. Near the R101, next to the river"
            value={form.location_description}
            onChange={change("location_description")}
            icon={<Compass size={14} />}
          />
          <Field
            label="Size (hectares)"
            placeholder="e.g. 12.4"
            type="number"
            step="0.01"
            value={form.size_hectares}
            onChange={change("size_hectares")}
            icon={<Ruler size={14} />}
          />
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Timezone
            </span>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)", pointerEvents: "none",
                display: "flex",
              }}>
                <Clock size={14} />
              </span>
              <select
                value={form.timezone}
                onChange={change("timezone")}
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 40px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                  appearance: "none",
                }}
              >
                <option value="Africa/Johannesburg">Africa/Johannesburg — South Africa</option>
                <option value="Africa/Harare">Africa/Harare — Zimbabwe</option>
                <option value="Africa/Gaborone">Africa/Gaborone — Botswana</option>
                <option value="Africa/Maputo">Africa/Maputo — Mozambique</option>
                <option value="Africa/Windhoek">Africa/Windhoek — Namibia</option>
                <option value="Africa/Lusaka">Africa/Lusaka — Zambia</option>
                <option value="Africa/Lagos">Africa/Lagos — Nigeria</option>
                <option value="Africa/Cairo">Africa/Cairo — Egypt</option>
                <option value="Europe/London">Europe/London — United Kingdom</option>
                <option value="UTC">UTC — UTC</option>
              </select>
            </div>
          </label>

          {err && (
            <div style={{
              fontSize: 13, color: "var(--danger)",
              background: "var(--danger-soft)",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
            }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={busy} style={{
            padding: "13px 20px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)", color: "white",
            border: "none", fontWeight: 600, fontSize: 14,
            marginTop: 4, opacity: busy ? 0.6 : 1,
            cursor: busy ? "wait" : "pointer",
          }}>
            {busy ? "Registering farm…" : "Register my farm"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = "text", step, value, onChange, icon, required }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)", pointerEvents: "none",
            display: "flex",
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          style={{
            width: "100%",
            padding: icon ? "11px 14px 11px 40px" : "11px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            color: "var(--text)", fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>
    </label>
  );
}