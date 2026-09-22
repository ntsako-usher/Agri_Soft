import { useEffect, useState } from "react";
import { Sun, Moon, LogOut, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { api, currentUser } from "../api/client";

export default function Topbar() {
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const user = currentUser();
  const initial = (user?.name || user?.email || "?").trim()[0]?.toUpperCase() || "?";

  const [alerts, setAlerts] = useState(null); // null = loading

  // Load alerts on mount + poll every 30 seconds
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.alerts()
        .then(({ data }) => {
          if (!cancelled) setAlerts(data || []);
        })
        .catch(() => {
          if (!cancelled) setAlerts([]);
        });

    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const signOut = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Compute status from unresolved alerts
  const unresolved = (alerts || []).filter((a) => !a.is_resolved);
  const critical = unresolved.filter((a) => a.severity === "critical").length;
  const warnings = unresolved.filter((a) => a.severity === "warning").length;
  const total = unresolved.length;

  let statusPill = null;
  if (alerts === null) {
    statusPill = {
      color: "var(--text-muted)",
      bg: "var(--surface)",
      label: "Checking…",
      icon: null,
    };
  } else if (total === 0) {
    statusPill = {
      color: "var(--good)",
      bg: "var(--accent-soft)",
      label: "All systems normal",
      icon: <CheckCircle2 size={12} />,
    };
  } else if (critical > 0) {
    statusPill = {
      color: "var(--danger)",
      bg: "var(--danger-soft)",
      label: `${critical} critical alert${critical === 1 ? "" : "s"}`,
      icon: <AlertTriangle size={12} />,
    };
  } else {
    statusPill = {
      color: "var(--warn)",
      bg: "var(--warn-soft)",
      label: `${warnings} warning${warnings === 1 ? "" : "s"} active`,
      icon: <AlertTriangle size={12} />,
    };
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    }}>
      {/* Status pill — clickable to /alerts */}
      <button
        onClick={() => nav("/alerts")}
        title={total === 0 ? "No active alerts" : "View alerts"}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          background: statusPill.bg,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          fontSize: 13,
          color: statusPill.color,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = 0.85}
        onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: statusPill.color,
        }} />
        {statusPill.label}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        style={{
          width: 56, height: 34,
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: theme === "light" ? "flex-start" : "flex-end",
          padding: 3,
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <span style={{
          width: 26, height: 26,
          borderRadius: "50%",
          background: theme === "light" ? "var(--surface-alt)" : "var(--accent-soft)",
          display: "grid", placeItems: "center",
          transition: "all 0.2s",
        }}>
          {theme === "light"
            ? <Sun size={14} color="var(--text)" />
            : <Moon size={14} color="var(--accent)" />
          }
        </span>
      </button>

      {/* Sign out */}
      <button
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        style={{
          width: 34, height: 34,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-muted)",
          display: "grid", placeItems: "center",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
      >
        <LogOut size={15} />
      </button>

      {/* Avatar → /settings */}
      <button
        onClick={() => nav("/settings")}
        aria-label="Open settings"
        title={user?.name || user?.email || "Account"}
        style={{
          width: 34, height: 34,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "grid", placeItems: "center",
          fontWeight: 600, fontSize: 13,
          border: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        {initial}
      </button>
    </div>
  );
}