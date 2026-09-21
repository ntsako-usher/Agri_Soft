import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sprout, MapPin, Trash2, ChevronRight } from "lucide-react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";

export default function Settings() {
  const nav = useNavigate();
  const [farms, setFarms] = useState([]);
  const user = currentUser();

  useEffect(() => {
    api.farms().then(({ data }) => setFarms(data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <Topbar />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.5px",
          color: "var(--text)",
        }}>
          Settings
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Manage your account and farms.
        </div>
      </div>

      {/* Account card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 14 }}>Account</div>
        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Status" value={user?.status ?? "—"} />
        </div>
      </div>

      {/* Farms card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Your farms</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {farms.length} {farms.length === 1 ? "farm" : "farms"} registered
            </div>
          </div>
          <button
            onClick={() => nav("/farms/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)",
              color: "white",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add farm
          </button>
        </div>

        {farms.length === 0 && (
          <div style={{
            padding: 20,
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            color: "var(--text-muted)",
            textAlign: "center",
          }}>
            No farms yet. Click "Add farm" to register your first one.
          </div>
        )}

        {farms.map((f) => (
          <div key={f.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 0",
            borderTop: "1px solid var(--border)",
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--accent-soft)",
              display: "grid", placeItems: "center",
              color: "var(--accent)",
              flexShrink: 0,
            }}>
              <Sprout size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.farm_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {f.location || "No location set"} · {f.size_hectares ?? "—"} ha
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>
        ))}
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