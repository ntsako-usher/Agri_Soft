import { useEffect, useState } from "react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";
import {
  Droplet, Radio, CheckCircle2, ChevronRight,
  Thermometer, CloudRain, Wind, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";

export default function Overview() {
  const nav = useNavigate();
  const user = currentUser();
  const firstName = user?.name?.split(" ")[0] ?? "farmer";

  const [farms, setFarms] = useState([]);
  const [fieldId, setFieldId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState([]);

  // 1. Load farms → pick first
  useEffect(() => {
    api.farms()
      .then(({ data }) => {
        setFarms(data);
        if (data.length) setFieldId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // 2. Load overview + alerts + trend when the selected farm changes
  useEffect(() => {
    if (!fieldId) return;
    setOverview(null);
    setAlerts([]);
    setTrend([]);

    api.overview(fieldId).then(({ data }) => setOverview(data)).catch(() => {});
    api.alerts().then(({ data }) => setAlerts(data.slice(0, 4))).catch(() => {});

    api.devices(fieldId).then(({ data }) => {
      const dev = data.find((d) => d.farm === fieldId) || data[0];
      if (dev) {
        api.readings(dev.id, "24h").then(({ data }) => {
          setTrend(
            data.map((r) => ({
              time: new Date(r.recorded_at).toLocaleTimeString([], {
                hour: "numeric",
                hour12: true,
              }),
              moisture: r.soil_moisture,
            }))
          );
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [fieldId]);

  const farm = farms.find((f) => f.id === fieldId);
  const soilMoisture = overview?.soil_moisture ?? 42;
  const targetMin = 35;
  const targetMax = 60;
  const inRange = soilMoisture >= targetMin && soilMoisture <= targetMax;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.5px",
          color: "var(--text)",
        }}>
          Good evening, {firstName}
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Here's what's happening on your farm today.
        </div>
      </div>

      {/* Section title + field dropdown + add farm */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 18,
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {farm?.farm_name ?? "North Field"} · Device cluster 01
          </div>
          <h2 style={{
            margin: "4px 0 0",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.5px",
          }}>
            Farm overview
          </h2>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={fieldId ?? ""}
            onChange={(e) => setFieldId(Number(e.target.value))}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
              minWidth: 160,
            }}
          >
            {farms.length === 0 && <option>North Field</option>}
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.farm_name}</option>
            ))}
          </select>

          <button
            onClick={() => nav("/farms/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add farm
          </button>
        </div>
      </div>

      {/* Full-width green hero banner */}
      <div style={{
        borderRadius: "var(--radius)",
        color: "white",
        background: "linear-gradient(120deg, #a8c4a8 0%, #6f9174 55%, #4e6f52 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 28px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
        minHeight: 120,
      }}>
        <svg
          style={{ position: "absolute", inset: 0, opacity: 0.16, pointerEvents: "none" }}
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
        >
          {[...Array(20)].map((_, i) => (
            <line
              key={i}
              x1={i * 42} y1="40"
              x2={i * 42 + 30} y2="200"
              stroke="white" strokeWidth="1"
            />
          ))}
        </svg>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
            {farm?.farm_name ?? "North Field"} · Active field
          </div>
          <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px" }}>
            {farm?.farm_name ?? "North Field"}
          </div>
          <div style={{ opacity: 0.9, fontSize: 13, marginTop: 4 }}>
            {farm?.size_hectares ?? "12.4"} ha · {overview?.devices_online ?? 4} connected devices · All systems operational
          </div>
        </div>

        <div style={{
          position: "relative", zIndex: 1,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.22)",
          display: "grid", placeItems: "center",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.3)",
          cursor: "pointer",
        }}>
          <ChevronRight size={18} color="white" />
        </div>
      </div>

      {/* Top row: 3 cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1.2fr",
        gap: 16,
        marginBottom: 16,
      }}>
        {/* Card 1: Soil Moisture */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{
                display: "flex", gap: 8, alignItems: "center",
                fontSize: 13, color: "var(--text)", fontWeight: 500,
              }}>
                <Droplet size={15} /> Soil
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginTop: 2 }}>
                Moisture
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {farm?.farm_name ?? "North Field"}
              </div>
            </div>
            <span style={{
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-alt)",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}>
              Target {targetMin}% — {targetMax}%
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
            <span style={{
              fontSize: 48, fontWeight: 500, letterSpacing: "-1.5px",
              color: "var(--text)", lineHeight: 1,
            }}>
              {soilMoisture}
            </span>
            <span style={{ fontSize: 20, color: "var(--text)", fontWeight: 400 }}>%</span>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            color: inRange ? "var(--good)" : "var(--warn)",
            fontSize: 13, fontWeight: 500,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: inRange ? "var(--good)" : "var(--warn)",
            }} />
            {inRange ? "Optimal" : "Out of range"}
          </div>

          <div style={{ height: 50, marginTop: -4 }}>
            <ResponsiveContainer>
              <AreaChart data={trend.length ? trend : [{ time: "", moisture: soilMoisture }]}>
                <defs>
                  <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="moisture"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  fill="url(#moistGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Farm Status */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            fontSize: 13, color: "var(--text)", fontWeight: 500,
          }}>
            <Radio size={15} /> Farm Status
          </div>

          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            color: "var(--good)", fontSize: 15, fontWeight: 500,
          }}>
            <CheckCircle2 size={18} /> All systems normal
          </div>

          <ul style={{
            listStyle: "none", padding: 0, margin: 0,
            fontSize: 13, color: "var(--text-muted)",
            display: "grid", gap: 10,
          }}>
            <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-muted)" }} />
              {overview?.devices_online ?? 4} devices online
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-muted)" }} />
              No active threats
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-muted)" }} />
                Irrigation system: Off
              </span>
              <ChevronRight size={14} />
            </li>
          </ul>
        </div>

        {/* Card 3: Recent Alerts */}
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16,
          }}>
            <strong style={{ fontSize: 14, fontWeight: 500 }}>Recent Alerts</strong>
            <span style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
              View all
            </span>
          </div>

          {alerts.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
              No recent alerts
            </div>
          )}

          {alerts.map((a, i) => (
            <div key={a.id} style={{
              padding: "12px 0",
              borderBottom: i < alerts.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                background:
                  a.severity === "critical" ? "var(--danger)" :
                  a.severity === "warning" ? "var(--warn)" : "var(--good)",
              }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: "var(--text)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {a.message || a.alert_type || a.type || "Alert"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {a.device_name ?? "North Field"} · {formatAgo(a.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Environmental Conditions */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          fontSize: 14, fontWeight: 500, marginBottom: 18,
        }}>
          <Droplet size={15} /> Environmental Conditions
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}>
          <MetricCard
            icon={<Thermometer size={16} />}
            label="Temperature"
            value={`${overview?.temperature ?? "24.6"}°C`}
            status="Normal"
          />
          <MetricCard
            icon={<Droplet size={16} />}
            label="Humidity"
            value={`${overview?.humidity ?? "61"}%`}
            status="Normal"
          />
          <MetricCard
            icon={<Wind size={16} />}
            label="Pressure"
            value={`${overview?.pressure ?? "1012"} hPa`}
            status="Normal"
          />
          <MetricCard
            icon={<CloudRain size={16} />}
            label="Rainfall"
            value="None"
            status="Last 24h"
          />
        </div>
      </div>

      {/* Soil Trend + Irrigation Control */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.8fr 1fr",
        gap: 16,
      }}>
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
              <Droplet size={15} /> Soil Moisture Trend
            </div>
            <span style={{
              fontSize: 12, padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-alt)",
              color: "var(--text-muted)",
            }}>
              Last 7 days
            </span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="moisture"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
              <Droplet size={15} /> Irrigation Control
            </div>
            <ToggleSwitch fieldId={fieldId} initial={false} />
          </div>

          <div style={{ fontSize: 26, fontWeight: 500, color: "var(--text)" }}>
            OFF
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            Automatic mode
          </div>

          <div style={{
            marginTop: 16,
            fontSize: 12,
            color: "var(--text-muted)",
          }}>
            Next scheduled run: Apr 25, 06:00
          </div>

          <button style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            color: "var(--text)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function MetricCard({ icon, label, value, status }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--surface-alt)",
        display: "grid", placeItems: "center",
        color: "var(--accent)",
        marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{status}</div>
    </div>
  );
}

function ToggleSwitch({ fieldId, initial }) {
  const [on, setOn] = useState(initial);
  const toggle = async () => {
    const next = !on;
    setOn(next);
    try {
      await api.irrigation(fieldId, next);
    } catch {
      setOn(!next);
    }
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle irrigation"
      style={{
        width: 42, height: 24,
        borderRadius: 12,
        border: "none",
        background: on ? "var(--accent)" : "var(--border)",
        position: "relative",
        transition: "background 0.2s",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <span style={{
        position: "absolute",
        top: 2,
        left: on ? 20 : 2,
        width: 20, height: 20,
        borderRadius: "50%",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

/* ---------- Helpers ---------- */

function formatAgo(iso) {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}