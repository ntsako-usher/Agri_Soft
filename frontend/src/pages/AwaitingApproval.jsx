import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";

export default function AwaitingApproval() {
  const nav = useNavigate();

  const signOut = () => {
    localStorage.clear();
    nav("/login", { replace: true });
  };

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
          background: "var(--warn-soft)",
          display: "grid", placeItems: "center",
          margin: "0 auto 20px",
          color: "var(--warn)",
        }}>
          <Clock size={28} />
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: "-0.4px",
          color: "var(--text)",
        }}>
          Awaiting approval
        </h1>

        <p style={{
          color: "var(--text-muted)",
          fontSize: 14,
          marginTop: 12,
          lineHeight: 1.6,
        }}>
          Your account hasn't been approved by an admin yet. You'll be able to sign in once
          approval is complete.
        </p>

        <button onClick={signOut} style={{
          marginTop: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 24px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface-alt)",
          color: "var(--text)",
          fontWeight: 500,
          fontSize: 14,
          cursor: "pointer",
        }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}