import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sprout, ChevronRight, LogOut, Clock, XCircle } from "lucide-react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";

export default function Settings() {
  const nav = useNavigate();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = currentUser();

  useEffect(() => {
    api.farms()
      .then(({ data }) => setFarms(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <Topbar />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: 30, fontWeight: 500,
          letterSpacing: "-0.5px", color: "var(--text)",
        }}>
          Settings
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Manage your account and farms.
        </div>
      </div>

      {/* Account */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 14 }}>Account</div>
        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row
            label="Status"
            value={
              user?.status
                ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
                : "—"
            }
          />
        </div>
        <button onClick={signOut} style={{
          marginTop: 18,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 18px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface-alt)",
          color: "var(--danger)", fontWeight: 500, fontSize: 13,
          cursor: "pointer",
        }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Farms */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Your farms</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {loading
                ? "Loading…"
                : `${farms.length} ${farms.length === 1 ? "farm" : "farms"} registered`}
            </div>
          </div>
          <button onClick={() => nav("/farms/new")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)", color: "white",
            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <Plus size={14} /> Add farm
          </button>
        </div>

        {!loading && farms.length === 0 && (
          <div style={{
            padding: 20,
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13, color: "var(--text-muted)",
            textAlign: "center",
          }}>
            No farms yet. Click "Add farm" to register your first one.
          </div>
        )}

        {farms.map((f) => {
          const isApproved = !f.status || f.status === "approved";
          const isPending = f.status === "pending";
          const isRejected = f.status === "rejected";

          return (
            <button
              key={f.id}
              onClick={() => isApproved && nav(`/?field=${f.id}`)}
              disabled={!isApproved}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 0",
                borderTop: "1px solid var(--border)",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: "none",
                background: "transparent",
                width: "100%",
                textAlign: "left",
                cursor: isApproved ? "pointer" : "not-allowed",
                opacity: isApproved ? 1 : 0.85,
                fontFamily: "inherit",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => {
                if (isApproved) e.currentTarget.style.opacity = 0.75;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = isApproved ? 1 : 0.85;
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: isApproved
                  ? "var(--accent-soft)"
                  : isPending
                  ? "var(--warn-soft)"
                  : "var(--danger-soft)",
                display: "grid", placeItems: "center",
                color: isApproved
                  ? "var(--accent)"
                  : isPending
                  ? "var(--warn)"
                  : "var(--danger)",
                flexShrink: 0,
              }}>
                {isApproved ? (
                  <Sprout size={16} />
                ) : isPending ? (
                  <Clock size={16} />
                ) : (
                  <XCircle size={16} />
                )}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center",
                  gap: 8, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                    {f.farm_name}
                  </span>

                  {isPending && (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--warn-soft)",
                      color: "var(--warn)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}>
                      Pending approval
                    </span>
                  )}

                  {isRejected && (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}>
                      Rejected
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {isPending
                    ? "Awaiting admin review — dashboard access locked"
                    : isRejected
                    ? "Contact support for more information"
                    : `${f.location_desc || "No location set"} · ${
                        f.size_hectares
                          ? `${Number(f.size_hectares).toFixed(2)} ha`
                          : "—"
                      }`}
                </div>
              </div>

              {isApproved && <ChevronRight size={16} color="var(--text-muted)" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}