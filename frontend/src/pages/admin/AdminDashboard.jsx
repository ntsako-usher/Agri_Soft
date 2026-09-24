import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, Users, Wrench, Bell, Cpu, ChevronRight, RefreshCw,
} from "lucide-react";
import { api, currentUser } from "../../api/client";

export default function AdminDashboard() {
  const nav = useNavigate();
  const user = currentUser();

  const [stats, setStats] = useState({
    farmers: 0,
    technicians: 0,
    pendingService: 0,
    devices: 0,
    activeAlerts: 0,
  });
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [fRes, tRes, pRes, dRes, aRes] = await Promise.all([
        api.farms().catch(() => ({ data: [] })),
        api.technicians().catch(() => ({ data: [] })),
        api.pendingService().catch(() => ({ data: [] })),
        api.devices().catch(() => ({ data: [] })),
        api.alerts().catch(() => ({ data: [] })),
      ]);
      const farmers = (fRes.data || []).map((f) => f.farmer);
      const uniqueFarmers = new Set(farmers).size;
      const activeAlerts = (aRes.data || []).filter((a) => !a.is_resolved).length;

      setStats({
        farmers: uniqueFarmers,
        technicians: (tRes.data || []).length,
        pendingService: (pRes.data || []).length,
        devices: (dRes.data || []).length,
        activeAlerts,
      });
      setPending((pRes.data || []).slice(0, 5));
    } catch (err) {
      console.error("dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.5px",
              color: "var(--text)",
            }}
          >
            Admin Dashboard
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Welcome back, {user?.name || "Admin"}.
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={14}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon={<ClipboardList size={18} />}
          label="Pending Service"
          value={stats.pendingService}
          tone={stats.pendingService > 0 ? "warn" : "neutral"}
          onClick={() => nav("/admin/requests")}
        />
        <StatCard
          icon={<Users size={18} />}
          label="Farmers"
          value={stats.farmers}
          tone="neutral"
          onClick={() => nav("/admin/farmers")}
        />
        <StatCard
          icon={<Wrench size={18} />}
          label="Technicians"
          value={stats.technicians}
          tone="neutral"
          onClick={() => nav("/admin/technicians")}
        />
        <StatCard
          icon={<Cpu size={18} />}
          label="Devices"
          value={stats.devices}
          tone="neutral"
          onClick={() => nav("/admin/devices")}
        />
        <StatCard
          icon={<Bell size={18} />}
          label="Active Alerts"
          value={stats.activeAlerts}
          tone={stats.activeAlerts > 0 ? "danger" : "good"}
          onClick={() => nav("/admin/alerts")}
        />
      </div>

      {/* Pending service queue */}
      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              Service queue
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Farms waiting for a technician
            </div>
          </div>
          <button
            onClick={() => nav("/admin/requests")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View all <ChevronRight size={14} />
          </button>
        </div>

        {loading && pending.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : pending.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No pending service requests.
          </div>
        ) : (
          pending.map((f, i) => (
            <div
              key={f.id}
              style={{
                padding: "14px 20px",
                borderBottom: i < pending.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--warn-soft)",
                  color: "var(--warn)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <ClipboardList size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                  {f.farm_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Farmer: {f.farmer_name} ·{" "}
                  {f.technician_name ? `Assigned to ${f.technician_name}` : "Unassigned"}
                </div>
              </div>
              <button
                onClick={() => nav("/admin/requests")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Manage
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "neutral", onClick }) {
  const colors = {
    warn:   { fg: "var(--warn)",   bg: "var(--warn-soft)" },
    danger: { fg: "var(--danger)", bg: "var(--danger-soft)" },
    good:   { fg: "var(--good)",   bg: "var(--accent-soft)" },
    neutral:{ fg: "var(--accent)", bg: "var(--accent-soft)" },
  }[tone] || { fg: "var(--accent)", bg: "var(--accent-soft)" };

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 18,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: colors.bg,
          color: colors.fg,
          display: "grid",
          placeItems: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </span>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: colors.fg,
          marginTop: 4,
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}