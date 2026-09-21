import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Topbar() {
  const { theme, toggle } = useTheme();

  return (
    <div style={{
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    }}>
      {/* Status pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
        fontSize: 13,
        color: "var(--text)",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--good)",
        }} />
        All systems normal
      </div>

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
          gap: 6,
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

      {/* Avatar */}
      <div style={{
        width: 34, height: 34,
        borderRadius: "50%",
        background: "var(--accent-soft)",
        color: "var(--accent)",
        display: "grid", placeItems: "center",
        fontWeight: 600, fontSize: 13,
        border: "1px solid var(--border)",
      }}>
        M
      </div>
    </div>
  );
}