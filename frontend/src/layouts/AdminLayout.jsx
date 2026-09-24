import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Users, Wrench, ClipboardList, Bell, Cpu,
  Settings, Leaf, LogOut, MessageSquare,
} from "lucide-react";
import { currentUser } from "../api/client";

const items = [
  { to: "/admin",             label: "Dashboard",       icon: LayoutGrid, end: true },
  { to: "/admin/requests",    label: "Service Requests", icon: ClipboardList },
  { to: "/admin/technicians", label: "Technicians",     icon: Wrench },
  { to: "/admin/farmers",     label: "Farmers",         icon: Users },
  { to: "/admin/devices",     label: "Devices",         icon: Cpu },
  { to: "/admin/alerts",      label: "Alerts",          icon: Bell },
  { to: "/messages",          label: "Messages",        icon: MessageSquare },
  { to: "/settings",          label: "Settings",        icon: Settings },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const user = currentUser();

  const signOut = () => {
    localStorage.clear();
    nav("/login", { replace: true });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <aside
        style={{
          width: 240,
          padding: 20,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--accent-soft)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Leaf size={16} color="var(--accent)" />
          </div>
          <div style={{ display: "grid" }}>
            <strong style={{ letterSpacing: 1 }}>SOFT-AGRI</strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Admin Console</span>
          </div>
        </div>

        {/* Nav */}
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              textDecoration: "none",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              background: isActive ? "var(--accent-soft)" : "transparent",
              fontWeight: isActive ? 600 : 500,
              fontSize: 14,
            })}
          >
            <Icon size={17} /> {label}
          </NavLink>
        ))}

        {/* User footer */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
              fontWeight: 600,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {(user?.name || "?").trim()[0]?.toUpperCase() || "?"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name || "Admin"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Administrator</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}