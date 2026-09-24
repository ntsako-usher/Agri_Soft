import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Leaf, MapPin, Ruler, Calendar, CheckCircle2,
  Cpu, AlertTriangle, Send, MessageSquare,
} from "lucide-react";
import { api } from "../../api/client";

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [farm, setFarm] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.farms();
      const match = (data || []).find((f) => String(f.id) === String(id));
      if (!match) {
        setError("Task not found, or it is not assigned to you.");
        setFarm(null);
      } else {
        setFarm(match);
        const dRes = await api.devices(match.id).catch(() => ({ data: [] }));
        setDevices(dRes.data || []);
      }
    } catch {
      setError("Could not load this task.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.markServiceDone(farm.id, {
        service_notes: notes.trim(),
        clear_technician: false,
      });
      setSuccess(true);
      setTimeout(() => nav("/tech/tasks"), 1500);
    } catch (err) {
      const d = err.response?.data;
      setError(
        d?.detail ||
          (d ? Object.values(d).flat().join(" ") : "Could not submit. Try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
        Loading task…
      </div>
    );
  }

  if (!farm) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 900 }}>
        <button
          onClick={() => nav("/tech/tasks")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={14} /> Back to tasks
        </button>
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--danger)",
            background: "var(--danger-soft)",
            border: "1px solid var(--border)",
          }}
        >
          <AlertTriangle size={28} style={{ opacity: 0.6, marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            Task unavailable
          </div>
          <div style={{ fontSize: 13 }}>{error || "Task not found."}</div>
        </div>
      </div>
    );
  }

  const status = farm.service_status || "none";
  const isAssigned = status === "assigned";
  const isCompleted = status === "completed";
  const isConfirmed = status === "confirmed";
  const isRedo = status === "requested" && farm.technician_id === farm.technician;

  // Status badge label/colour
  const statusBadge =
    status === "assigned"
      ? { label: "In progress", fg: "var(--accent)", bg: "var(--accent-soft)" }
      : status === "completed"
      ? { label: "Awaiting farmer feedback", fg: "var(--warn)", bg: "var(--warn-soft)" }
      : status === "confirmed"
      ? { label: "Confirmed by farmer", fg: "var(--good)", bg: "var(--accent-soft)" }
      : status === "requested"
      ? { label: "Requested", fg: "var(--warn)", bg: "var(--warn-soft)" }
      : { label: "No service", fg: "var(--text-muted)", bg: "var(--surface-alt)" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      {/* Back */}
      <button
        onClick={() => nav("/tech/tasks")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-muted)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          marginBottom: 24,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <ArrowLeft size={14} /> Back to tasks
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Leaf size={20} />
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: statusBadge.bg,
              color: statusBadge.fg,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {statusBadge.label}
          </span>
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
          {farm.farm_name}
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Farmer: {farm.farmer_name}
        </div>
      </div>

      {/* Farm info grid */}
      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <InfoRow icon={<MapPin size={15} />} label="Location" value={farm.location_desc || "—"} />
        <InfoRow
          icon={<Ruler size={15} />}
          label="Size"
          value={farm.size_hectares ? `${Number(farm.size_hectares).toFixed(2)} ha` : "—"}
        />
        <InfoRow icon={<Calendar size={15} />} label="Assigned" value={formatAgo(farm.updated_at)} />
      </div>

      {/* Service notes from admin */}
      {farm.service_notes && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 10,
            }}
          >
            Instructions from admin
          </div>
          <pre
            style={{
              margin: 0,
              fontFamily: "inherit",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {farm.service_notes}
          </pre>
        </div>
      )}

      {/* Devices on this farm */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 12,
          }}
        >
          Devices on this farm ({devices.length})
        </div>
        {devices.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No devices registered yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {devices.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--surface-alt)",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                <Cpu size={15} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "var(--text)" }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    UID {d.device_uid} · {d.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Action form or state ---- */}

      {success ? (
        <div
          className="card"
          style={{
            padding: 32,
            textAlign: "center",
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
          }}
        >
          <CheckCircle2 size={32} color="var(--accent)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
            Task marked complete
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Waiting for the farmer to confirm. Redirecting…
          </div>
        </div>
      ) : isConfirmed ? (
        <div
          className="card"
          style={{
            padding: 24,
            textAlign: "center",
            background: "var(--accent-soft)",
            color: "var(--good)",
            fontSize: 13,
          }}
        >
          <CheckCircle2 size={22} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 500 }}>
            The farmer confirmed this job is done. Great work!
          </div>
        </div>
      ) : isCompleted ? (
        <div
          className="card"
          style={{
            padding: 24,
            background: "var(--warn-soft)",
            color: "var(--warn)",
            fontSize: 13,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <MessageSquare size={15} /> Awaiting farmer feedback
          </div>
          <div style={{ color: "var(--text-muted)" }}>
            You've submitted your completion notes. The farmer needs to confirm
            the work before it's fully closed.
          </div>
        </div>
      ) : isAssigned ? (
        <form className="card" onSubmit={submit}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 12,
            }}
          >
            Complete this task
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              What did you do? (required)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. Installed 3 soil moisture sensors, tested all readings, calibrated, all working."
              required
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

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--danger-soft)",
                color: "var(--danger)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !notes.trim()}
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting || !notes.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !notes.trim() ? 0.6 : 1,
            }}
          >
            <Send size={14} />
            {submitting ? "Submitting…" : "Mark as done"}
          </button>
        </form>
      ) : (
        <div
          className="card"
          style={{
            padding: 24,
            textAlign: "center",
            background: "var(--surface-alt)",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          This task isn't currently in your active list.
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--surface-alt)",
          color: "var(--accent)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text)",
            marginTop: 2,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function formatAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}