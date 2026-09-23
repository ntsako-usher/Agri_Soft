import { NavLink } from "react-router-dom";
import {
  LayoutGrid, Activity, History, Bell, Cpu, Settings, Leaf, MessageSquare,
} from "lucide-react";

const items = [
  { to: "/",          label: "Overview",   icon: LayoutGrid, end: true },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/history",    label: "History",    icon: History },
  { to: "/alerts",     label: "Alerts",     icon: Bell },
  { to: "/devices",    label: "Devices",    icon: Cpu },
  { to: "/messages",   label: "Messages",   icon: MessageSquare },
  { to: "/settings",   label: "Settings",   icon: Settings },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 240, padding: 20, borderRight: "1px solid var(--border)",
      background: "var(--surface)", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "var(--accent-soft)", display: "grid", placeItems: "center",
          overflow: "hidden",
        }}>
          <img
            src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=120&q=80"
            alt="SOFT-AGRI"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <strong style={{ letterSpacing: 1 }}>SOFT-AGRI</strong>
      </div>

      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10, textDecoration: "none",
            color: isActive ? "var(--accent)" : "var(--text-muted)",
            background: isActive ? "var(--accent-soft)" : "transparent",
            fontWeight: isActive ? 600 : 500, fontSize: 14,
          })}
        >
          <Icon size={17} /> {label}
        </NavLink>
      ))}

      <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50" }} />
          <div>
            <div style={{ fontWeight: 600 }}>Farm Online</div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>All systems operational</div>
          </div>
        </div>
      </div>
    </aside>
  );
}