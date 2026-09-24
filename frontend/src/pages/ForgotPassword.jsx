import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, MailCheck, ArrowLeft } from "lucide-react";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api.requestPasswordReset({ email });
      setSent(true);
    } catch (e) {
      // Show the same success state even on error, to prevent email enumeration.
      // But if there's a network error, tell the user.
      if (!e.response) {
        setErr("Cannot reach server. Please try again.");
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  // Success state — same card layout as SignupSuccess
  if (sent) {
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
            <MailCheck size={28} />
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-0.4px",
            color: "var(--text)",
          }}>
            Check your email
          </h1>

          <p style={{
            color: "var(--text-muted)",
            fontSize: 14,
            marginTop: 12,
            lineHeight: 1.6,
          }}>
            If an account exists for <strong style={{ color: "var(--text)" }}>{email}</strong>,
            we've sent a link to reset your password. The link expires in 30 minutes.
          </p>

          <div style={{
            marginTop: 24,
            padding: "14px 16px",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}>
            <Leaf size={14} color="var(--accent)" />
            Didn't get it? Check your spam folder.
          </div>

          <Link to="/login" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 24,
            padding: "12px 24px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)",
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Request form
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left: hero panel */}
      <div style={{
        flex: 1,
        display: "none",
        position: "relative",
        background: "linear-gradient(150deg, #a8c4a8 0%, #6f9174 50%, #3f5a44 100%)",
        color: "white",
        padding: 48,
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }} className="auth-hero">
        <svg
          style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }}
          viewBox="0 0 600 900" preserveAspectRatio="none"
        >
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
            Forgot your<br />password?
          </h1>
          <p style={{
            marginTop: 16,
            fontSize: 15,
            opacity: 0.9,
            maxWidth: 380,
            lineHeight: 1.6,
          }}>
            No problem. Enter your email and we'll send you a link to set a new one.
          </p>
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
              Reset your password
            </h2>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              Enter the email you used to sign up.
            </div>
          </div>

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

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

          <button type="submit" disabled={busy || !email} style={{
            padding: "13px 16px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 4,
            opacity: busy || !email ? 0.6 : 1,
            cursor: busy || !email ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}>
            {busy ? "Sending link…" : "Send reset link"}
          </button>

          <div style={{
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 4,
          }}>
            <Link to="/login" style={{
              color: "var(--accent)",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>
              <ArrowLeft size={13} /> Back to sign in
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
        required
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
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </label>
  );
}