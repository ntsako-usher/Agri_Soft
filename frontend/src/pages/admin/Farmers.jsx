import { useEffect, useMemo, useState } from "react";
import {
  Users, Mail, Phone, RefreshCw, Search, CheckCircle2,
  XCircle, Clock, Sprout, ChevronRight,
} from "lucide-react";
import { api } from "../../api/client";

const STATUS_META = {
  approved: {
    label: "Approved",
    fg: "var(--good)",
    bg: "var(--accent-soft)",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    fg: "var(--warn)",
    bg: "var(--warn-soft)",
    icon: Clock,
  },
  rejected: {
    label: "Rejected",
    fg: "var(--danger)",
    bg: "var(--danger-soft)",
    icon: XCircle,
  },
};

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [uRes, fRes] = await Promise.all([
        api.farmersList().catch(() => ({ data: [] })),
        api.farms().catch(() => ({ data: [] })),
      ]);
      setFarmers(uRes.data || []);
      setFarms(fRes.data || []);
    } catch {
      setError("Could not load farmers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Farms per farmer
  const farmsByFarmer = useMemo(() => {
    const map = new Map();
    for (const f of farms) {
      map.set(f.farmer, (map.get(f.farmer) || 0) + 1);
    }
    return map;
  }, [farms]);

  const filtered = useMemo(() => {
    let list = farmers;
    if (statusFilter !== "all") {
      list = list.filter((f) => (f.status || "pending") === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(q) ||
          (f.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [farmers, statusFilter, query]);

  const counts = useMemo(() => ({
    all: farmers.length,
    approved: farmers.filter((f) => f.status === "approved").length,
    pending: farmers.filter((f) => f.status === "pending").length,
    rejected: farmers.filter((f) => f.status === "rejected").length,
  }), [farmers]);

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
            Farmers
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            All registered farmers and their farms.
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

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340 }}>
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

        <div
          style={{
            display: "flex",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-pill)",
            padding: 4,
          }}
        >
          {[
            { key: "all", label: `All (${counts.all})` },
            { key: "pending", label: `Pending (${counts.pending})` },
            { key: "approved", label: `Approved (${counts.approved})` },
            { key: "rejected", label: `Rejected (${counts.rejected})` },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: statusFilter === s.key ? "var(--surface)" : "transparent",
                color: statusFilter === s.key ? "var(--text)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: statusFilter === s.key ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
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

      {loading && farmers.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading farmers…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
        >
          <Users size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            {farmers.length === 0 ? "No farmers yet" : "No matches"}
          </div>
          <div style={{ fontSize: 13 }}>
            {farmers.length === 0
              ? "Farmers appear here once they sign up."
              : "Try a different filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((f) => (
            <FarmerRow
              key={f.id}
              farmer={f}
              farmCount={farmsByFarmer.get(f.id) || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FarmerRow({ farmer, farmCount }) {
  const status = farmer.status || "pending";
  const meta = STATUS_META[status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  return (
    <div
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
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
        {(farmer.name || "?").trim()[0]?.toUpperCase() || "?"}
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
            {farmer.name}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
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
            <StatusIcon size={10} /> {meta.label}
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
            <Mail size={12} /> {farmer.email}
          </span>
          {farmer.phone && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={12} /> {farmer.phone}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "6px 12px",
          background: "var(--surface-alt)",
          borderRadius: "var(--radius-pill)",
          flexShrink: 0,
        }}
      >
        <Sprout size={13} color="var(--accent)" />
        {farmCount} {farmCount === 1 ? "farm" : "farms"}
      </div>

      <a
        href={`http://127.0.0.1:8000/admin/farmers/farmer/${farmer.id}/change/`}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in Django admin"
        style={{
          padding: 8,
          color: "var(--text-muted)",
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <ChevronRight size={16} />
      </a>
    </div>
  );
}