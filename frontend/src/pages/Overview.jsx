import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";
import { getPlan } from "../constants/plans";
import {
  Droplet, Radio, CheckCircle2, ChevronRight,
  Thermometer, CloudRain, Wind, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";

export default function Overview() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const user = currentUser();
  const firstName = user?.name?.split(" ")[0] ?? "farmer";

  const [farms, setFarms] = useState([]);
  const [fieldId, setFieldId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derived: approved farms only (backward compatible — no status = approved)
  const approvedFarms = farms.filter((f) => !f.status || f.status === "approved");

  // 1. Load farms → pick approved one from URL or first
  useEffect(() => {
    api.farms()
      .then(({ data }) => {
        setFarms(data);
        const approved = data.filter((f) => !f.status || f.status === "approved");

        if (approved.length) {
          const requested = Number(searchParams.get("field"));
          const match = approved.find((f) => f.id === requested);
          setFieldId(match ? match.id : approved[0].id);
        } else {
          setFieldId(null);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  // 2. Load farm-specific data when field changes
  useEffect(() => {
    if (!fieldId) return;
    setLoading(true);
    setOverview(null);
    setAlerts([]);
    setTrend([]);

    Promise.all([
      api.overview(fieldId).catch(() => null),
      api.alerts().catch(() => ({ data: [] })),
      api.devices(fieldId).catch(() => ({ data: [] })),
    ]).then(([oRes, aRes, dRes]) => {
      if (oRes) setOverview(oRes.data);
      setAlerts((aRes.data || []).slice(0, 4));

      const firstDevice = (dRes.data || [])[0];
      if (firstDevice) {
        api.readings(firstDevice.id, "24h")
          .then(({ data }) => {
            setTrend(
              (data || []).map((r) => ({
                time: new Date(r.recorded_at).toLocaleTimeString([], {
                  hour: "numeric",
                  hour12: true,
                }),
                moisture: Number(r.moisture),
              }))
            );
          })
          .catch(() => {});
      }
      setLoading(false);
    });
  }, [fieldId]);

  const farm = approvedFarms.find((f) => f.id === fieldId);

  // Derived values — all null-safe
  const soilValue = overview?.soilMoisture?.value ?? null;
  const targetMin = overview?.soilMoisture?.targetMin ?? null;
  const targetMax = overview?.soilMoisture?.targetMax ?? null;
  const inRange =
    soilValue != null && targetMin != null && targetMax != null
      ? soilValue >= targetMin && soilValue <= targetMax
      : null;

  const temp = overview?.environment?.temperature;
  const humidity = overview?.environment?.humidity;
  const pressure = overview?.environment?.pressure;
  const rainDetected = overview?.environment?.rain_detected;

  const devicesOnline = overview?.farmStatus?.devicesOnline ?? null;
  const devicesTotal = overview?.farmStatus?.devicesTotal ?? null;

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
          margin: 0, fontSize: 30, fontWeight: 500,
          letterSpacing: "-0.5px", color: "var(--text)",
        }}>
          Good evening, {firstName}
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Here's what's happening on your farm today.
        </div>
      </div>

      {/* Empty state: no farms at all */}
      {!loading && farms.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            No farms yet
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            Register your first farm to start monitoring.
          </div>
          <button
            onClick={() => nav("/farms/new")}
            style={{
              padding: "12px 24px", borderRadius: "var(--radius-pill)",
              background: "var(--accent)", color: "white",
              border: "none", fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Register a farm
          </button>
        </div>
      )}

      {/* Empty state: farms exist but none approved */}
      {!loading && farms.length > 0 && approvedFarms.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            No approved farms yet
          </div>
          <div style={{
            color: "var(--text-muted)", fontSize: 13,
            marginBottom: 20, maxWidth: 460, margin: "0 auto 20px",
            lineHeight: 1.6,
          }}>
            Your farms are awaiting admin approval. You'll get access to their dashboards
            once they're approved.
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px",
            background: "var(--warn-soft)", color: "var(--warn)",
            borderRadius: "var(--radius-pill)",
            fontSize: 13, fontWeight: 500, marginBottom: 20,
          }}>
            {farms.length} {farms.length === 1 ? "farm" : "farms"} pending review
          </div>
          <div>
            <button
              onClick={() => nav("/farms/new")}
              style={{
                padding: "12px 24px", borderRadius: "var(--radius-pill)",
                background: "var(--accent)", color: "white",
                border: "none", fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Register another farm
            </button>
          </div>
        </div>
      )}

      {/* Main dashboard — only for approved farms */}
      {approvedFarms.length > 0 && (
        <>
          {/* Section title + dropdown + add farm */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", marginBottom: 18,
            gap: 12, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {farm?.farm_name ?? "—"} · Device cluster 01
              </div>
              <h2 style={{
                margin: "4px 0 0", fontSize: 26,
                fontWeight: 500, letterSpacing: "-0.5px",
              }}>
                Farm overview
              </h2>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                value={fieldId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setFieldId(id);
                  nav(`/?field=${id}`, { replace: true });
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13, cursor: "pointer", outline: "none",
                  minWidth: 160,
                }}
              >
                {approvedFarms.map((f) => (
                  <option key={f.id} value={f.id}>{f.farm_name}</option>
                ))}
              </select>

              <button
                onClick={() => nav("/farms/new")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                <Plus size={14} /> Add farm
              </button>
            </div>
          </div>

          {/* Green hero banner — with purple.jpg background */}
          <div style={{
            borderRadius: "var(--radius)",
            color: "white",
            background: `
              linear-gradient(120deg, rgba(63,90,68,0.78) 0%, rgba(78,111,82,0.68) 55%, rgba(52,76,56,0.62) 100%),
              url("/images/purple.jpg") center/cover no-repeat
            `,
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 28px", marginBottom: 16,
            position: "relative", overflow: "hidden", minHeight: 120,
          }}>
            <svg
              style={{ position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none" }}
              viewBox="0 0 800 200" preserveAspectRatio="none"
            >
              {[...Array(20)].map((_, i) => (
                <line key={i}
                  x1={i * 42} y1="40"
                  x2={i * 42 + 30} y2="200"
                  stroke="white" strokeWidth="1" />
              ))}
            </svg>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Active field
              </div>
              <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px" }}>
                {farm?.farm_name ?? "—"}
              </div>
              <div style={{
                opacity: 0.9, fontSize: 13, marginTop: 4,
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                <span>
                  {farm?.size_hectares ? `${Number(farm.size_hectares).toFixed(2)} ha` : "—"} ·{" "}
                  {devicesOnline != null && devicesTotal != null
                    ? `${devicesOnline} of ${devicesTotal} devices online`
                    : "—"}
                </span>
                {farm?.plan && (
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(255,255,255,0.22)",
                    fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    backdropFilter: "blur(6px)",
                  }}>
                    {getPlan(farm.plan).name} plan
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{
            marginBottom: 16,
            padding: "18px 20px",
            background: "linear-gradient(135deg, rgba(117, 163, 122, 0.12), rgba(70, 109, 84, 0.04))",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 10,
            }}>
              <div style={{
                display: "flex", gap: 8, alignItems: "center",
                fontSize: 14, fontWeight: 600, color: "var(--text)",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--accent)", display: "inline-block",
                }} />
                AI Farm Advice
              </div>
              <span style={{
                fontSize: 11, padding: "5px 10px",
                borderRadius: "var(--radius-pill)",
                background: "var(--warn-soft)", color: "var(--warn)",
                fontWeight: 600,
              }}>
                Heat Wave Detected
              </span>
            </div>
            <div style={{
              color: "var(--text)", fontSize: 14, lineHeight: 1.7,
            }}>
              Temperatures are high today. Check your soil moisture and consider watering your crops more frequently.
            </div>
          </div>

          {/* Top row: 3 cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1.2fr",
            gap: 16, marginBottom: 16,
          }}>
            {/* Soil Moisture */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{
                    display: "flex", gap: 8, alignItems: "center",
                    fontSize: 13, color: "var(--text)", fontWeight: 500,
                  }}>
                    <Droplet size={15} /> Soil moisture
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {farm?.farm_name ?? "—"}
                  </div>
                </div>
                {targetMin != null && targetMax != null && (
                  <span style={{
                    fontSize: 11, padding: "5px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--surface-alt)",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}>
                    Target {targetMin}% — {targetMax}%
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                <span style={{
                  fontSize: 48, fontWeight: 500, letterSpacing: "-1.5px",
                  color: "var(--text)", lineHeight: 1,
                }}>
                  {soilValue != null ? soilValue.toFixed(1) : "—"}
                </span>
                {soilValue != null && (
                  <span style={{ fontSize: 20, color: "var(--text)", fontWeight: 400 }}>%</span>
                )}
              </div>

              {inRange != null && (
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
              )}

              <div style={{ height: 50, marginTop: -4 }}>
                <ResponsiveContainer>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="moisture"
                      stroke="var(--accent)" strokeWidth={1.5}
                      fill="url(#moistGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Farm Status */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                display: "flex", gap: 8, alignItems: "center",
                fontSize: 13, color: "var(--text)", fontWeight: 500,
              }}>
                <Radio size={15} /> Farm status
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
                  {devicesOnline != null && devicesTotal != null
                    ? `${devicesOnline} of ${devicesTotal} devices online`
                    : "—"}
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-muted)" }} />
                  {overview?.farmStatus?.activeAlerts != null
                    ? `${overview.farmStatus.activeAlerts} active alert${overview.farmStatus.activeAlerts === 1 ? "" : "s"}`
                    : "—"}
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

            {/* Recent Alerts */}
            <div className="card">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 16,
              }}>
                <strong style={{ fontSize: 14, fontWeight: 500 }}>Recent alerts</strong>
                <span
                  onClick={() => nav("/alerts")}
                  style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}
                >
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
                      {a.message}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {a.device_name} · {formatAgo(a.created_at)}
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
              <Droplet size={15} /> Environmental conditions
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
            }}>
              <MetricCard
                icon={<Thermometer size={16} />}
                label="Temperature"
                value={temp != null ? `${Number(temp).toFixed(1)}°C` : "—"}
              />
              <MetricCard
                icon={<Droplet size={16} />}
                label="Humidity"
                value={humidity != null ? `${Number(humidity).toFixed(0)}%` : "—"}
              />
              <MetricCard
                icon={<Wind size={16} />}
                label="Pressure"
                value={pressure != null ? `${Number(pressure).toFixed(0)} hPa` : "—"}
              />
              <MetricCard
                icon={<CloudRain size={16} />}
                label="Rainfall"
                value={rainDetected === true ? "Detected" : rainDetected === false ? "None" : "—"}
              />
            </div>
          </div>

          {/* Soil Trend */}
          <div className="card">
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
                <Droplet size={15} /> Soil moisture trend
              </div>
              <span style={{
                fontSize: 12, padding: "5px 12px",
                borderRadius: "var(--radius-pill)",
                background: "var(--surface-alt)",
                color: "var(--text-muted)",
              }}>
                Last 24 hours
              </span>
            </div>
            <div style={{ height: 220 }}>
              {trend.length === 0 ? (
                <div style={{
                  height: "100%", display: "grid", placeItems: "center",
                  color: "var(--text-muted)", fontSize: 13,
                }}>
                  No readings yet
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="var(--text-muted)"
                      fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)"
                      fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10, fontSize: 12,
                    }} />
                    <Area type="monotone" dataKey="moisture"
                      stroke="var(--accent)" strokeWidth={2}
                      fill="url(#trendGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div style={{
      padding: 16, borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 6,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--surface-alt)",
        display: "grid", placeItems: "center",
        color: "var(--accent)", marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{value}</div>
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