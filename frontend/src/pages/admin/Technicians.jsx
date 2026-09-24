import { useEffect, useMemo, useState } from "react";
import { Wrench, Mail, Phone, RefreshCw, Search, UserPlus, ExternalLink } from "lucide-react";
import { api } from "../../api/client";

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.technicians();
      setTechnicians(data || []);
    } catch {
      setError(
        "Could not load technicians. The /api/farmers/technicians/ endpoint may not exist yet."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return technicians;
    const q = query.toLowerCase();
    return technicians.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q)
    );
  }, [technicians, query]);

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
            Technicians
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Field technicians who service farms.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="http://127.0.0.1:8000/admin/farmers/farmer/add/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <UserPlus size={14} /> Add technician
          </a>
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
      </div>

      {/* Info note about Django admin */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 20,
          background: "var(--surface-alt)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        <ExternalLink size={14} color="var(--accent)" />
        <span>
          Creating technicians is done through the{" "}
          <a
            href="http://127.0.0.1:8000/admin/farmers/farmer/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", fontWeight: 500 }}
          >
            Django admin
          </a>
          . Set <strong>role = technician</strong> and <strong>status = approved</strong>.
        </span>
      </div>

      {/* Search */}
      <div
        style={{
          position: "relative",
          marginBottom: 20,
          maxWidth: 360,
        }}
      >
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
          }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          style={{
            width: "100%",
            padding: "10px 14px 10px 38px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
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

      {loading && technicians.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading technicians…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
        >
          <Wrench size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            {technicians.length === 0 ? "No technicians yet" : "No matches"}
          </div>
          <div style={{ fontSize: 13 }}>
            {technicians.length === 0
              ? "Use the button above to create the first one."
              : "Try a different search term."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((t) => (
            <div className="card" key={t.id} style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
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
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {(t.name || "?").trim()[0]?.toUpperCase() || "?"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Technician #{t.id}
                  </div>
                </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail size={12} />
                  <span
                    style={{
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.email}
                  </span>
                </div>
                {t.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone size={12} />
                    <span style={{ color: "var(--text)" }}>{t.phone}</span>
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