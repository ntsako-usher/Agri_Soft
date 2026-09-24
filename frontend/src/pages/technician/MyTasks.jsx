import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, MapPin, Calendar, Ruler, ChevronRight, RefreshCw, ClipboardList } from "lucide-react";
import { api, currentUser } from "../../api/client";

export default function MyTasks() {
  const nav = useNavigate();
  const user = currentUser();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.farms();
      // Only show farms where the technician still has active work
      setFarms(
        (data || []).filter((f) => (f.service_status || "none") === "assigned")
      );
    } catch {
      setError("Could not load your tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
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
            My Tasks
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Hello {user?.name?.split(" ")[0] || "there"}, these are the jobs assigned to you.
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

      {loading && farms.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading your tasks…
        </div>
      ) : farms.length === 0 ? (
        <div
          className="card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
        >
          <ClipboardList size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            No tasks assigned
          </div>
          <div style={{ fontSize: 13 }}>
            When an admin assigns you a farm, it will show up here.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {farms.map((f) => (
            <TaskCard key={f.id} farm={f} onClick={() => nav(`/tech/tasks/${f.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ farm, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "border-color 0.15s",
        padding: 20,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Leaf size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {farm.farm_name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Farmer: {farm.farmer_name}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            whiteSpace: "nowrap",
          }}
        >
          In progress
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          fontSize: 12,
          color: "var(--text-muted)",
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
        }}
      >
        {farm.location_desc && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={13} />
            {farm.location_desc}
          </div>
        )}
        {farm.size_hectares && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ruler size={13} />
            {Number(farm.size_hectares).toFixed(2)} ha
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={13} />
          Assigned {formatAgo(farm.updated_at)}
        </div>
      </div>

      {farm.service_notes && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
            maxHeight: 70,
            overflow: "hidden",
          }}
        >
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>Instructions:</strong>{" "}
          {farm.service_notes.split("---")[0].trim()}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--accent)",
          gap: 4,
        }}
      >
        Open task <ChevronRight size={14} />
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