import { Link } from "react-router-dom";
import { MailCheck, Leaf } from "lucide-react";

export default function SignupSuccess() {
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
          Account created
        </h1>

        <p style={{
          color: "var(--text-muted)",
          fontSize: 14,
          marginTop: 12,
          lineHeight: 1.6,
        }}>
          Your account is now pending admin review. Once approved, you'll be able to sign in
          and start monitoring your farm.
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
          Approval usually takes less than 24 hours.
        </div>

        <Link to="/login" style={{
          display: "inline-block",
          marginTop: 24,
          padding: "12px 24px",
          borderRadius: "var(--radius-pill)",
          background: "var(--accent)",
          color: "white",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
        }}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}