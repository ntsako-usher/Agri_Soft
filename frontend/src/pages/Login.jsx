import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Sprout, Droplets, Sun } from "lucide-react";
import { api, decodeJWT } from "../api/client";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.login(email, password);
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // Decide where to go based on JWT role + status
      const user = decodeJWT(data.access);

      if (user?.is_staff || user?.role === "admin") {
        nav("/admin", { replace: true });
      } else if (user?.role === "technician") {
        if (user?.status === "pending") {
          nav("/awaiting-approval", { replace: true });
        } else {
          nav("/tech/tasks", { replace: true });
        }
      } else if (user?.status === "pending") {
        nav("/awaiting-approval", { replace: true });
      } else if (user?.status === "rejected") {
        setErr("Your account was rejected. Contact support.");
        localStorage.clear();
      } else {
        nav("/", { replace: true });
      }
    } catch (e) {
      if (!e.response) {
        setErr("Cannot reach server.");
      } else {
        setErr(e.response.data?.detail || "Invalid email or password");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left: farm illustration panel */}
      <div style={{
        flex: 1,
        display: "none",
        position: "relative",
        background: `
          linear-gradient(150deg, rgba(63,90,68,0.72) 0%, rgba(111,145,116,0.6) 50%, rgba(168,196,168,0.5) 100%),
          url("/images/overview.jpg") center/cover no-repeat
        `,
        color: "white",
        padding: 48,
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }} className="auth-hero">
        {/* Field-line pattern */}
        <svg style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }}
             viewBox="0 0 600 900" preserveAspectRatio="none">
          {[...Array(18)].map((_, i) => (
            <line key={i}
              x1={i * 40} y1={500}
              x2={i * 40 + 60} y2={900}
              stroke="white" strokeWidth="1" />
          ))}
        </svg>

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
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
            Grow smarter.<br />Water wiser.
          </h1>
          <p style={{
            marginTop: 16,
            fontSize: 15,
            opacity: 0.9,
            maxWidth: 380,
            lineHeight: 1.6,
          }}>
            Real-time soil, weather, and irrigation data — from every field, on one dashboard.
          </p>

          <div style={{ display: "flex", gap: 20, marginTop: 32, flexWrap: "wrap" }}>
            <HeroChip icon={<Sprout size={14} />} label="Soil monitoring" />
            <HeroChip icon={<Droplets size={14} />} label="Smart irrigation" />
            <HeroChip icon={<Sun size={14} />} label="Weather tracking" />
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 12, opacity: 0.7 }}>
          © {new Date().getFullYear()} Soft-Agri · Empowering farmers
        </div>
      </div>

      {/* Right: form */}
      <div style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: 40,
      }}>
        <form onSubmit={submit} style={{
          width: "100%",
          maxWidth: 400,
          display: "grid",
          gap: 16,
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: "-0.4px",
              color: "var(--text)",
            }}>
              Welcome back
            </h2>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              Sign in to your Soft-Agri dashboard.
            </div>
          </div>

          <Field label="Email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} />

          <Field label="Password" type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)} />

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
            transition: "background 0.15s",
          }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div style={{
            fontSize: 13,
            textAlign: "center",
            marginTop: -4,
          }}>
            <Link to="/forgot-password" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>

          <div style={{
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 4,
          }}>
            New to Soft-Agri?{" "}
            <Link to="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Create an account
            </Link>
          </div>
        </form>
      </div>

      {/* Media query to show the hero on desktop */}
      <style>{`
        @media (min-width: 900px) {
          .auth-hero { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14,
          outline: "none",
          transition: "border 0.15s",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
      />
    </label>
  );
}

function HeroChip({ icon, label }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)",
      background: "rgba(255,255,255,0.14)",
      backdropFilter: "blur(6px)",
      fontSize: 12,
      fontWeight: 500,
    }}>
      {icon} {label}
    </div>
  );
}