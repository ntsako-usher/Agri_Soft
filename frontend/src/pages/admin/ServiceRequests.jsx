import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Leaf, MapPin, User, Wrench, CheckCircle2,
  RefreshCw, X, AlertCircle, MessageSquare, Send,
} from "lucide-react";
import { api } from "../../api/client";

const STATUS_META = {
  requested: {
    label: "Requested",
    fg: "var(--warn)",
    bg: "var(--warn-soft)",
    icon: AlertCircle,
  },
  assigned: {
    label: "Assigned",
    fg: "var(--accent)",
    bg: "var(--accent-soft)",
    icon: Wrench,
  },
  completed: {
    label: "Awaiting feedback",
    fg: "var(--danger)",
    bg: "var(--danger-soft)",
    icon: MessageSquare,
  },
  confirmed: {
    label: "Confirmed",
    fg: "var(--good)",
    bg: "var(--accent-soft)",
    icon: CheckCircle2,
  },
};

const FILTERS = [
  { key: "all",       label: "All" },
  { key: "requested", label: "Requested" },
  { key: "assigned",  label: "In progress" },
  { key: "completed", label: "Awaiting feedback" },
  { key: "confirmed", label: "Confirmed" },
];

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [assigning, setAssigning] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rRes, tRes] = await Promise.all([
        api.pendingService().catch(() => ({ data: [] })),
        api.technicians().catch(() => ({ data: [] })),
      ]);
      setRequests(rRes.data || []);
      setTechnicians(tRes.data || []);
    } catch {
      setError("Could not load service requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => (r.service_status || "none") === filter);
  }, [requests, filter]);

  const counts = useMemo(() => {
    const c = { all: requests.length, requested: 0, assigned: 0, completed: 0, confirmed: 0 };
    for (const r of requests) {
      const s = r.service_status || "none";
      if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [requests]);

  const handleAssign = async (farmId, technicianId, notes) => {
    try {
      await api.assignTechnician(farmId, {
        technician: technicianId,
        service_notes: notes,
      });
      setAssigning(null);
      await load();
    } catch (err) {
      const d = err.response?.data;
      alert(d?.detail || "Could not assign technician.");
    }
  };

  const handleUnassign = async (farmId) => {
    if (!confirm("Remove the technician from this job? It will go back to 'Requested'.")) return;
    try {
      await api.assignTechnician(farmId, { technician: null, service_notes: "" });
      await load();
    } catch {
      alert("Could not unassign.");
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.5px",
              color: "var(--text)",
            }}
          >
            Service Requests
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Assign technicians and track the full service workflow.
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

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <MiniStat label="Requested" value={counts.requested} tone="warn" />
        <MiniStat label="In progress" value={counts.assigned} tone="neutral" />
        <MiniStat label="Awaiting feedback" value={counts.completed} tone="danger" />
        <MiniStat label="Confirmed" value={counts.confirmed} tone="good" />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "var(--surface-alt)",
          padding: 4,
          borderRadius: "var(--radius-pill)",
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: filter === f.key ? "var(--surface)" : "transparent",
              color: filter === f.key ? "var(--text)" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: filter === f.key ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {f.label} ({counts[f.key] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading && requests.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading requests…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
        >
          <CheckCircle2 size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Nothing to show
          </div>
          <div style={{ fontSize: 13 }}>
            {filter === "all"
              ? "No service requests right now."
              : "No requests with this status."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onAssign={() => setAssigning(r)}
              onUnassign={() => handleUnassign(r.id)}
            />
          ))}
        </div>
      )}

      {assigning && (
        <AssignModal
          request={assigning}
          technicians={technicians}
          onClose={() => setAssigning(null)}
          onConfirm={(techId, notes) => handleAssign(assigning.id, techId, notes)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const colors = {
    warn:    { fg: "var(--warn)",   bg: "var(--warn-soft)" },
    good:    { fg: "var(--good)",   bg: "var(--accent-soft)" },
    danger:  { fg: "var(--danger)", bg: "var(--danger-soft)" },
    neutral: { fg: "var(--text)",   bg: "var(--surface-alt)" },
  }[tone] || { fg: "var(--text)", bg: "var(--surface-alt)" };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: colors.fg,
          marginTop: 6,
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RequestRow({ request, onAssign, onUnassign }) {
  const status = request.service_status || "none";
  const meta = STATUS_META[status] || STATUS_META.requested;
  const Icon = meta.icon;

  const canAssign = status === "requested" || status === "assigned";
  const showReassign = status === "assigned";

  return (
    <div
      className="card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: 18,
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: meta.bg,
          color: meta.fg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
            {request.farm_name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "var(--radius-pill)",
              background: meta.bg,
              color: meta.fg,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Meta row */}
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <User size={12} /> {request.farmer_name}
          </span>
          {request.location_desc && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} /> {request.location_desc}
            </span>
          )}
          {request.technician_name && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              <Wrench size={12} /> {request.technician_name}
            </span>
          )}
        </div>

        {/* Service notes */}
        {request.service_notes && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--surface-alt)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.5,
              maxHeight: 90,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              marginBottom: 8,
            }}
          >
            {request.service_notes}
          </div>
        )}

        {/* Farmer feedback (for completed + confirmed) */}
        {(status === "completed" || status === "confirmed") && request.farmer_feedback && (
          <div
            style={{
              padding: "10px 12px",
              background:
                request.farmer_satisfied === false
                  ? "var(--danger-soft)"
                  : "var(--accent-soft)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color:
                request.farmer_satisfied === false
                  ? "var(--danger)"
                  : "var(--good)",
              lineHeight: 1.5,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <MessageSquare size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontWeight: 600 }}>
                Farmer{" "}
                {request.farmer_satisfied === false ? "requested redo" : "confirmed"}:
              </strong>{" "}
              {request.farmer_feedback}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {canAssign && (
          <>
            <button
              onClick={onAssign}
              style={{
                padding: showReassign ? "8px 14px" : "8px 16px",
                borderRadius: "var(--radius-pill)",
                border: showReassign ? "1px solid var(--border)" : "none",
                background: showReassign ? "var(--surface)" : "var(--accent)",
                color: showReassign ? "var(--text)" : "white",
                fontSize: showReassign ? 12 : 13,
                fontWeight: showReassign ? 500 : 600,
                cursor: "pointer",
              }}
            >
              {showReassign ? "Reassign" : "Assign technician"}
            </button>
            {showReassign && (
              <button
                onClick={onUnassign}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--danger)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Unassign
              </button>
            )}
          </>
        )}
        {status === "completed" && (
          <span
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-alt)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Waiting on farmer
          </span>
        )}
        {status === "confirmed" && (
          <span
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-soft)",
              color: "var(--good)",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={12} /> Done
          </span>
        )}
      </div>
    </div>
  );
}

function AssignModal({ request, technicians, onClose, onConfirm }) {
  const [selected, setSelected] = useState(request.technician || "");
  const [notes, setNotes] = useState(request.service_notes || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await onConfirm(Number(selected), notes.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "grid",
          gap: 16,
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.4px",
              color: "var(--text)",
            }}
          >
            Assign technician
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Farm: <strong style={{ color: "var(--text)" }}>{request.farm_name}</strong>
          <br />
          Farmer: {request.farmer_name}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            Technician
          </span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required
            style={{
              padding: "11px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="">— Select a technician —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>
          {technicians.length === 0 && (
            <span style={{ fontSize: 12, color: "var(--warn)" }}>
              No technicians registered yet. Create one first.
            </span>
          )}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            Instructions for the technician
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Install 3 soil moisture sensors in the north block. Bring a 12V pump relay."
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
              color: "var(--text)",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !selected}
            style={{
              flex: 2,
              padding: "12px 20px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              opacity: busy || !selected ? 0.6 : 1,
              cursor: busy || !selected ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Assigning…" : "Assign"}
          </button>
        </div>
      </form>
    </div>
  );
}