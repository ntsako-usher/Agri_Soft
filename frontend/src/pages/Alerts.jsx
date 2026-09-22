import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import {
  Bell, AlertTriangle, CheckCircle2, RotateCcw, Trash2,
  Search, RefreshCw, Flame, Info,
} from "lucide-react";

const SEVERITY = {
  critical: { label: "Critical", color: "var(--danger)", bg: "var(--danger-soft)", icon: Flame },
  warning:  { label: "Warning",  color: "var(--warn)",   bg: "var(--warn-soft)",   icon: AlertTriangle },
  info:     { label: "Info",     color: "var(--accent)", bg: "var(--accent-soft)", icon: Info },
};

const TABS = [
  { key: "unresolved", label: "Unresolved" },
  { key: "resolved",   label: "Resolved"   },
  { key: "all",        label: "All"        },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("unresolved");
  const [severity, setSeverity] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.alerts().catch(() => ({ data: [] }));
      setAlerts(data || []);
    } catch {
      setError("Could not load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Real backend shape:
  // { id, device, device_name, farm_name, type, severity, message,
  //   is_resolved, resolved_at, created_at }
  const normalised = useMemo(() => {
    return alerts.map((a) => {
      const sev = (a.severity || "info").toString().toLowerCase();
      const severityKey = SEVERITY[sev] ? sev : "info";
      return {
        raw: a,
        id: a.id,
        message: a.message || a.type || "Alert",
        type: a.type,
        severity: severityKey,
        resolved: a.is_resolved === true,
        createdAt: a.created_at,
        resolvedAt: a.resolved_at,
        deviceName: a.device_name || (a.device ? `Device ${a.device}` : "—"),
        farmName: a.farm_name || null,
      };
    });
  }, [alerts]);

  const filtered = useMemo(() => {
    let list = normalised;
    if (tab === "unresolved") list = list.filter((a) => !a.resolved);
    if (tab === "resolved")   list = list.filter((a) => a.resolved);
    if (severity !== "all")   list = list.filter((a) => a.severity === severity);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.message.toLowerCase().includes(q) ||
          a.deviceName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0;
      const tb = new Date(b.createdAt).getTime() || 0;
      return tb - ta;
    });
  }, [normalised, tab, severity, query]);

  const stats = useMemo(() => {
    const unresolved = normalised.filter((a) => !a.resolved).length;
    const critical   = normalised.filter((a) => a.severity === "critical" && !a.resolved).length;
    const warning    = normalised.filter((a) => a.severity === "warning"  && !a.resolved).length;
    const resolved   = normalised.filter((a) => a.resolved).length;
    return { total: normalised.length, unresolved, critical, warning, resolved };
  }, [normalised]);

  const resolve = async (id) => {
    try {
      await api.resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() }
            : a
        )
      );
    } catch {
      alert("Could not resolve alert.");
    }
  };

  const reopen = async (id) => {
    try {
      await api.reopenAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, is_resolved: false, resolved_at: null }
            : a
        )
      );
    } catch {
      alert("Could not reopen alert.");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this alert? This cannot be undone.")) return;
    try {
      await api.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Could not delete alert.");
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: 24,
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 30, fontWeight: 500,
            letterSpacing: "-0.5px", color: "var(--text)",
          }}>
            Alerts
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Everything your farm has flagged — resolve or reopen as you go.
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)", fontSize: 13, fontWeight: 500,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16, marginBottom: 20,
      }}>
        <StatCard icon={<Bell size={16} />} label="Unresolved" value={stats.unresolved} tone="warn" />
        <StatCard icon={<Flame size={16} />} label="Critical" value={stats.critical} tone="danger" />
        <StatCard icon={<AlertTriangle size={16} />} label="Warnings" value={stats.warning} tone="warn" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Resolved" value={stats.resolved} tone="good" />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20,
        flexWrap: "wrap", alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340 }}>
          <Search size={14} style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "var(--text-muted)",
          }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search message or device"
            style={{
              width: "100%", padding: "10px 14px 10px 38px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{
          display: "flex", background: "var(--surface-alt)",
          borderRadius: "var(--radius-pill)", padding: 4,
        }}>
          {[
            { key: "all", label: "All" },
            { key: "critical", label: "Critical" },
            { key: "warning", label: "Warning" },
            { key: "info", label: "Info" },
          ].map((s) => (
            <button key={s.key} onClick={() => setSeverity(s.key)} style={{
              padding: "6px 14px", borderRadius: "var(--radius-pill)",
              border: "none",
              background: severity === s.key ? "var(--surface)" : "transparent",
              color: severity === s.key ? "var(--text)" : "var(--text-muted)",
              fontSize: 12, fontWeight: severity === s.key ? 600 : 500,
              cursor: "pointer",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{
          display: "flex", background: "var(--surface-alt)",
          borderRadius: "var(--radius-pill)", padding: 4,
          marginLeft: "auto",
        }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "6px 16px", borderRadius: "var(--radius-pill)",
              border: "none",
              background: tab === t.key ? "var(--surface)" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--text-muted)",
              fontSize: 12, fontWeight: tab === t.key ? 600 : 500,
              cursor: "pointer",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "var(--danger-soft)",
          color: "var(--danger)",
          borderRadius: "var(--radius-sm)",
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading && normalised.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Loading alerts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <CheckCircle2 size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
            {tab === "unresolved" ? "You're all caught up" : "Nothing to show"}
          </div>
          <div style={{ fontSize: 13 }}>
            {query || severity !== "all"
              ? "No alerts match your filters."
              : tab === "unresolved"
              ? "No unresolved alerts right now."
              : "No alerts in this view."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              onResolve={() => resolve(a.id)}
              onReopen={() => reopen(a.id)}
              onDelete={() => remove(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onResolve, onReopen, onDelete }) {
  const meta = SEVERITY[alert.severity] || SEVERITY.info;
  const Icon = meta.icon;

  return (
    <div className="card" style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: 16, opacity: alert.resolved ? 0.72 : 1,
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 12,
        background: meta.bg, color: meta.color,
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <Icon size={17} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: 10, flexWrap: "wrap", marginBottom: 4,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            {alert.message}
          </span>
          <span style={{
            padding: "3px 8px", borderRadius: "var(--radius-pill)",
            background: meta.bg, color: meta.color,
            fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            {meta.label}
          </span>
          {alert.resolved && (
            <span style={{
              padding: "3px 8px", borderRadius: "var(--radius-pill)",
              background: "var(--accent-soft)", color: "var(--accent)",
              fontSize: 10, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 0.4,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <CheckCircle2 size={10} /> Resolved
            </span>
          )}
        </div>

        <div style={{
          fontSize: 12, color: "var(--text-muted)",
          display: "flex", gap: 12, flexWrap: "wrap",
        }}>
          <span>{alert.deviceName}</span>
          {alert.farmName && <span>· {alert.farmName}</span>}
          <span>· {formatAgo(alert.createdAt)}</span>
          {alert.resolved && alert.resolvedAt && (
            <span>· resolved {formatAgo(alert.resolvedAt)}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {!alert.resolved ? (
          <ActionButton icon={<CheckCircle2 size={13} />} label="Resolve" onClick={onResolve} tone="good" />
        ) : (
          <ActionButton icon={<RotateCcw size={13} />} label="Reopen" onClick={onReopen} tone="neutral" />
        )}
        <ActionButton icon={<Trash2 size={13} />} onClick={onDelete} tone="danger" iconOnly />
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, tone = "neutral", iconOnly }) {
  const colors = {
    good:    { fg: "var(--good)",    bg: "var(--accent-soft)" },
    danger:  { fg: "var(--danger)",  bg: "var(--danger-soft)" },
    neutral: { fg: "var(--text)",    bg: "var(--surface-alt)" },
  }[tone] || { fg: "var(--text)", bg: "var(--surface-alt)" };

  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: iconOnly ? 8 : "7px 12px",
      borderRadius: "var(--radius-pill)",
      border: "1px solid var(--border)",
      background: colors.bg, color: colors.fg,
      fontSize: 12, fontWeight: 600, cursor: "pointer",
    }}>
      {icon}{!iconOnly && label}
    </button>
  );
}

function StatCard({ icon, label, value, tone }) {
  const colors = {
    good:    { fg: "var(--good)",   bg: "var(--accent-soft)" },
    warn:    { fg: "var(--warn)",   bg: "var(--warn-soft)" },
    danger:  { fg: "var(--danger)", bg: "var(--danger-soft)" },
  }[tone] || { fg: "var(--text)", bg: "var(--surface-alt)" };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: colors.bg, color: colors.fg,
          display: "grid", placeItems: "center",
        }}>
          {icon}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 600, color: colors.fg,
        letterSpacing: "-0.5px", lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  );
}

function formatAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}