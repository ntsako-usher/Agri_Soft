import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, MapPin, Ruler, Sprout, LogOut, CheckCircle2 } from "lucide-react";
import { api, currentUser, decodeJWT } from "../api/client";

export default function NewFarm() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    farm_name: "",
    location: "",
    size_hectares: "",
    description: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const user = currentUser();

  // If not authed, bounce to login
  useEffect(() => {
    if (!localStorage.getItem("access")) {
      nav("/login", { replace: true });
    }
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
        farm_name: form.farm_name,
        location: form.location,
        size_hectares: form.size_hectares ? Number(form.size_hectares) : null,
        description: form.description,
      };

      // 1. Create the farm
      const { data: farm } = await api.createFarm(payload);

      // 2. Alert the admin — best-effort
      try {
        await api.createAlert({
          type: "farm_registration",
          severity: "info",
          message: `New farm registered: ${form.farm_name} by ${user?.name ?? "farmer"}`,
          farm: farm?.id,
        });
      } catch (err) {
        console.warn("Could not notify admin:", err?.response?.status);
      }

      setDone(true);
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
    nav("/login", { replace: true });
  };

  if (done) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          textAlign: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 40,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "grid", placeItems: "center",
            margin: "0 auto 20px",
            color: "var(--accent)",
          }}>
            <CheckCircle2 size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: "-0.4px" }}>
            Farm submitted
          </h1>
          <p style={{
            color: "var(--text-muted)",
            fontSize: 14,
            marginTop: 12,
            lineHeight: 1.6,
          }}>
            We've notified an admin to review <strong>{form.farm_name}</strong>. You'll be able
            to sign in and access your dashboard once your account and farm are approved.
          </p>
          <button onClick={signOut} style={{
            marginTop: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "40px 24px",
      display: "grid",
      placeItems: "flex-start center",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Top bar: brand + sign out */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 40,
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
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 28, textAlign: "left" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 14,
          }}>
            <Sprout size={13} /> One last step
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.6px",
            color: "var(--text)",
            lineHeight: 1.15,
          }}>
            Welcome, {user?.name?.split(" ")[0] ?? "farmer"}.
            <br />Let's register your farm.
          </h1>
          <div style={{
            color: "var(--text-muted)",
            fontSize: 14,
            marginTop: 12,
            maxWidth: 480,
            lineHeight: 1.6,
          }}>
            Tell us about your farm so we can set up monitoring and irrigation. You can add
            more farms later from your dashboard.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "grid",
          gap: 16,
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
            label="Location"
            placeholder="e.g. Polokwane, Limpopo"
            value={form.location}
            onChange={change("location")}
            icon={<MapPin size={14} />}
          />
          <Field
            label="Size (hectares)"
            placeholder="e.g. 12.4"
            type="number"
            step="0.1"
            value={form.size_hectares}
            onChange={change("size_hectares")}
            icon={<Ruler size={14} />}
          />

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Description <span style={{ fontWeight: 400 }}>(optional)</span>
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={change("description")}
              placeholder="What do you grow here?"
              style={{
                padding: "11px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface-alt)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          {err && (
            <div style={{
              fontSize: 13,
              color: "var(--danger)",
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
            background: "var(--accent)",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 4,
            opacity: busy ? 0.6 : 1,
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
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
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
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
    </label>
  );
}