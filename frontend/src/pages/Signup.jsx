import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Sprout, Droplets, Sun, Check } from "lucide-react";
import { api } from "../api/client";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirm: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) {
      setErr("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await api.register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
        confirm_password: form.confirm,
      });
      // Do NOT auto-login — account needs admin approval
      nav("/signup-success", { replace: true });
    } catch (e) {
      const data = e.response?.data;
      setErr(
        data
          ? typeof data === "string"
            ? data
            : Object.values(data).flat().join(" ")
          : "Could not create account"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left: benefits panel */}
      <div style={{
        flex: 1,
        display: "none",
        position: "relative",
        background: "linear-gradient(150deg, #3f5a44 0%, #6f9174 50%, #a8c4a8 100%)",
        color: "white",
        padding: 48,
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }} className="auth-hero">
        <svg style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }}
             viewBox="0 0 600 900" preserveAspectRatio="none">
          {[...Array(18)].map((_, i) => (
            <line key={i}
              x1={i * 40} y1={500}
              x2={i * 40 + 60} y2={900}
              stroke="white" strokeWidth="1" />
          ))}
        </svg>

        <div style={{ position: "relative", zIndex: 1, display:"flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "rgba(255,255,255,0.18)",
            display: "grid", placeItems: "center",
            backdropFilter: "blur(6px)",
          }}>
            <Leaf size={18} color="white" />
          </div>
          <strong style={{ letterSpacing: 2, fontSize: 14 }}>SOFT-AGRI</strong>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "-1px",
            lineHeight: 1.15,
          }}>
            Every field.<br />One dashboard.
          </h1>
          <p style={{
            marginTop: 16,
            fontSize: 15,
            opacity: 0.9,
            maxWidth: 380,
            lineHeight: 1.6,
          }}>
            Join farmers using Soft-Agri to monitor soil, automate irrigation, and protect their crops.
          </p>

          <ul style={{ listStyle: "none", padding: 0, marginTop: 28, display: "grid", gap: 12 }}>
            <Benefit text="Live soil and weather readings" />
            <Benefit text="Automated irrigation rules" />
            <Benefit text="Instant alerts on your phone" />
            <Benefit text="Manage unlimited farms" />
          </ul>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 12, opacity: 0.7 }}>
          © {new Date().getFullYear()} Soft-Agri
        </div>
      </div>

      {/* Right: signup form */}
      <div style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: 40,
        overflowY: "auto",
      }}>
        <form onSubmit={submit} style={{
          width: "100%",
          maxWidth: 420,
          display: "grid",
          gap: 14,
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: "-0.4px",
              color: "var(--text)",
            }}>
              Create your account
            </h2>
            <div style={{ color: "var(--text-muted)", fontSize:14, marginTop: 6 }}>
              Takes less than a minute.
            </div>
          </div>

          <Field label="Full name" value={form.name} onChange={change("name")} required />
          <Field label="Email" type="email" value={form.email} onChange={change("email")} required />
          <Field label="Phone number" value={form.phone} onChange={change("phone")} required />
          <Field label="Address" value={form.address} onChange={change("address")} />
          <Field label="Password" type="password" value={form.password} onChange={change("password")} required />
          <Field label="Confirm password" type="password" value={form.confirm} onChange={change("confirm")} required />

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

          <div style={{
            fontSize: 12,
            color: "var(--text-muted)",
            background: "var(--accent-soft)",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            lineHeight: 1.55,
          }}>
            After signing up, you'll register your first farm. An admin will review and approve your account before you can sign in.
          </div>

          <button type="submit" disabled={busy} style={{
            padding: "13px 16px",
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
            {busy ? "Creating account…" : "Create account"}
          </button>

          <div style={{
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
          }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-hero { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14,
          outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
      />
    </label>
  );
}

function Benefit({ text }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "rgba(255,255,255,0.22)",
        display: "grid", placeItems: "center",
        flexShrink: 0,
      }}>
        <Check size={12} color="white" />
      </span>
      {text}
    </li>
  );
}