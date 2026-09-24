import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Leaf, Lock, CheckCircle2, AlertTriangle, ArrowLeft, Eye, EyeOff,
} from "lucide-react";
import { api } from "../api/client";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const nav = useNavigate();

  // "checking" | "valid" | "invalid" | "success"
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Validate the token when the page loads
  useEffect(() => {
    let cancelled = false;
    api
      .validatePasswordReset({ uid, token })
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(data?.valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [uid, token]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.confirmPasswordReset({ uid, token, new_password: password });
      setStatus("success");
      // Optional: auto-redirect after 3 seconds
      setTimeout(() => nav("/login", { replace: true }), 3000);
    } catch (e) {
      const detail =
        e.response?.data?.detail ||
        e.response?.data?.new_password?.[0] ||
        "Could not reset your password. The link may have expired.";
      setErr(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left: hero panel — same as Login/ForgotPassword */}
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
            Set a new<br />password.
          </h1>
          <p style={{
            marginTop: 16,
            fontSize: 15,
            opacity: 0.9,
            maxWidth: 380,
            lineHeight: 1.6,
          }}>
            Choose something strong and memorable. You'll use it to sign in next time.
          </p>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 12, opacity: 0.7 }}>
          © {new Date().getFullYear()} Soft-Agri · Empowering farmers
        </div>
      </div>

      {/* Right: state-driven content */}
      <div style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        padding: 40,
      }}>
        {/* CHECKING */}
        {status === "checking" && (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{ fontSize: 14 }}>Checking your reset link…</div>
          </div>
        )}

        {/* INVALID */}
        {status === "invalid" && (
          <div style={{
            width: "100%", maxWidth: 420,
            textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--danger-soft)",
              display: "grid", placeItems: "center",
              margin: "0 auto 20px",
              color: "var(--danger)",
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{
              margin: 0, fontSize: 24, fontWeight: 500,
              letterSpacing: "-0.4px", color: "var(--text)",
            }}>
              Link expired or invalid
            </h2>

            <p style={{
              color: "var(--text-muted)", fontSize: 14,
              marginTop: 12, lineHeight: 1.6,
            }}>
              This password reset link is invalid or has expired. Reset links are only
              valid for 30 minutes.
            </p>

            <Link to="/forgot-password" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)", color: "white",
              textDecoration: "none", fontWeight: 600, fontSize: 14,
            }}>
              Request a new link
            </Link>

            <div style={{
              marginTop: 16, fontSize: 13,
              color: "var(--text-muted)",
            }}>
              <Link to="/login" style={{
                color: "var(--accent)", fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </div>
        )}

        {/* VALID — show form */}
        {status === "valid" && (
          <form onSubmit={submit} style={{
            width: "100%", maxWidth: 420,
            display: "grid", gap: 16,
          }}>
            <div>
              <h2 style={{
                margin: 0, fontSize: 26, fontWeight: 500,
                letterSpacing: "-0.4px", color: "var(--text)",
              }}>
                Choose a new password
              </h2>
              <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
                Make sure it's at least 6 characters.
              </div>
            </div>

            <PasswordField
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
            />

            <PasswordField
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              show={showPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
            />

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
              padding: "13px 16px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)", color: "white",
              border: "none", fontWeight: 600, fontSize: 14,
              marginTop: 4,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "wait" : "pointer",
              transition: "background 0.15s",
            }}>
              {busy ? "Resetting password…" : "Reset password"}
            </button>
          </form>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <div style={{
            width: "100%", maxWidth: 420,
            textAlign: "center",
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

            <h2 style={{
              margin: 0, fontSize: 24, fontWeight: 500,
              letterSpacing: "-0.4px", color: "var(--text)",
            }}>
              Password reset
            </h2>

            <p style={{
              color: "var(--text-muted)", fontSize: 14,
              marginTop: 12, lineHeight: 1.6,
            }}>
              Your password has been changed. Redirecting you to sign in…
            </p>

            <Link to="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)", color: "white",
              textDecoration: "none", fontWeight: 600, fontSize: 14,
            }}>
              Go to sign in now
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-hero { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 14, top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)", pointerEvents: "none",
          display: "flex",
        }}>
          <Lock size={14} />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          style={{
            width: "100%",
            padding: "12px 42px 12px 40px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)", fontSize: 14,
            outline: "none", boxSizing: "border-box",
            transition: "border 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute", right: 10, top: "50%",
            transform: "translateY(-50%)",
            background: "transparent", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            padding: 6, display: "flex",
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}