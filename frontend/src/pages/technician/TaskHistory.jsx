import { useEffect, useState } from "react";
import { History as HistoryIcon, Leaf, MapPin, CheckCircle2, RefreshCw, Calendar } from "lucide-react";
import { api } from "../../api/client";

export default function TaskHistory() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.farms();
      // Only show completed tasks (service_requested = false)
      setFarms((data || []).filter((f) => !f.service_requested));
    } catch {
      setError("Could not load history.");
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
            Task History
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Jobs you have completed.
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
          Loading history…
        </div>
      ) : farms.length === 0 ? (
        <div
          className="card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
        >
          <HistoryIcon size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            No completed jobs yet
          </div>
          <div style={{ fontSize: 13 }}>
            Finished tasks will appear here.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              {farms.length} completed {farms.length === 1 ? "job" : "jobs"}
            </div>
          </div>
          {farms.map((f, i) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 20px",
                borderBottom: i < farms.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--accent-soft)",
                  color: "var(--good)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                    {f.farm_name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--accent-soft)",
                      color: "var(--good)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Completed
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Leaf size={12} /> {f.farmer_name}
                  </span>
                  {f.location_desc && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} /> {f.location_desc}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} /> {formatAgo(f.updated_at)}
                  </span>
                </div>
                {f.service_notes && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: "var(--surface-alt)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {f.service_notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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