import { useCallback, useEffect, useRef, useState } from "react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";
import {
  Droplet, Radio, RefreshCw, Activity, Wifi,
} from "lucide-react";

const REFRESH_MS = 15000;

export default function Monitoring() {
  const user = currentUser();
  const firstName = user?.name?.split(" ")[0] ?? "farmer";

  const [farms, setFarms] = useState([]);
  const [fieldId, setFieldId] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [devices, setDevices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const pollRef = useRef(null);

  // 1. Load farms
  useEffect(() => {
    api.farms()
      .then(({ data }) => {
        setFarms(data);
        if (data.length) setFieldId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // 2. Load monitoring + devices
  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [mon, devs] = await Promise.all([
        api.monitoring(id).catch(() => null),
        api.devices(id).catch(() => ({ data: [] })),
      ]);
      if (mon) setMonitoring(mon.data);
      setDevices(devs.data || []);
      setLastUpdated(new Date());
      setIsLive(true);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fieldId) return;
    load(fieldId);
    pollRef.current = setInterval(() => load(fieldId), REFRESH_MS);
    return () => clearInterval(pollRef.current);
  }, [fieldId, load]);

  // Tick for "Xs ago"
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const farm = farms.find((f) => f.id === fieldId);
  const m = monitoring || {};

  const soilValue = m.soil?.value ?? null;
  const soilSensor = m.soil?.sensor ?? null;
  const sensors = m.sensors || [];
  const updatedAt = m.updatedAt;

  const timeSince = () => {
    if (!lastUpdated) return "waiting…";
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const getSensor = (key) => sensors.find((s) => s.key === key);

  const tempSensor = getSensor("temperature");
  const humiditySensor = getSensor("humidity");
  const pressureSensor = getSensor("pressure");
  const lightSensor = getSensor("light");
  const rainSensor = getSensor("rain");
  const smokeSensor = getSensor("smoke");
  const motionSensor = getSensor("motion");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
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

      {/* Title row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: 20,
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {farm?.farm_name ?? "—"} · {devices.length} connected device{devices.length === 1 ? "" : "s"}
          </div>
          <h2 style={{
            margin: "4px 0 0", fontSize: 26,
            fontWeight: 500, letterSpacing: "-0.5px",
          }}>
            Live monitoring
          </h2>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            A clear, real-time view of your field conditions.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "var(--text)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: isLive ? "var(--good)" : "var(--warn)",
            }} />
            {isLive ? "Live connection" : "Reconnecting…"}
          </div>

          <button
            onClick={() => load(fieldId)}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)", fontSize: 13, fontWeight: 500,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={14}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero: current field signal */}
      <div style={{
        borderRadius: "var(--radius)",
        padding: "28px 28px 24px", marginBottom: 20,
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 70%)",
        border: "1px solid var(--border)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            fontSize: 13, color: "var(--text-muted)", marginBottom: 12,
          }}>
            <Radio size={14} /> Current field signal
          </div>

          <h3 style={{
            margin: 0, fontSize: 28, fontWeight: 500,
            letterSpacing: "-0.5px", color: "var(--text)",
          }}>
            Soil moisture is{" "}
            {soilValue == null ? "—" : soilValue >= 20 && soilValue <= 80 ? "optimal" : "out of range"}
          </h3>

          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>
            {soilValue != null
              ? `${soilValue.toFixed(1)}% moisture reading from ${soilSensor ?? "sensor"}.`
              : "Waiting for first reading…"}
          </div>

          <div style={{
            display: "flex", gap: 20, alignItems: "center",
            fontSize: 12, color: "var(--text-muted)", marginTop: 14,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isLive ? "var(--good)" : "var(--warn)",
              }} />
              Updated {timeSince()}
            </span>
            {soilSensor && <span>{soilSensor}</span>}
          </div>

          {/* Soil bar */}
          <div style={{
            marginTop: 22,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "18px 22px",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12,
            }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Soil moisture
              </div>
              <div style={{
                fontSize: 22, fontWeight: 600,
                color: "var(--text)", letterSpacing: "-0.4px",
              }}>
                {soilValue != null ? `${soilValue.toFixed(1)}%` : "—"}
              </div>
            </div>

            <div style={{ position: "relative", height: 8 }}>
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: 999, background: "var(--surface-alt)",
              }} />
              {soilValue != null && (
                <div style={{
                  position: "absolute",
                  left: `${Math.min(100, Math.max(0, soilValue))}%`,
                  top: -4, transform: "translateX(-50%)",
                  width: 4, height: 16, borderRadius: 2,
                  background: "var(--text)",
                  boxShadow: "0 0 0 3px var(--surface)",
                }} />
              )}
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 10, fontSize: 11, color: "var(--text-muted)",
            }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field sensors */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 14,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--text)" }}>
              Field sensors
            </h3>
            <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
              Live readings from {soilSensor ?? "your devices"}
            </div>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {updatedAt ? `Last packet ${formatAgo(updatedAt)}` : ""}
          </div>
        </div>

        <div className="card" style={{ padding: 8 }}>
          {sensors.length === 0 ? (
            <div style={{
              padding: 32, textAlign: "center",
              color: "var(--text-muted)", fontSize: 13,
            }}>
              No sensor data yet
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {sensors.map((s, i) => (
                <SensorRow
                  key={s.key}
                  label={s.label}
                  value={s.value}
                  unit={s.unit}
                  borderTop={i >= 2}
                  borderRight={i % 2 === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Device health */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--surface-alt)",
              display: "grid", placeItems: "center",
              color: "var(--accent)",
            }}>
              <Activity size={16} />
            </span>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text)" }}>
                Device health
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Connection across {farm?.farm_name ?? "your farms"}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {devices.filter((d) => d.status === "online").length} of {devices.length} online
          </div>
        </div>

        {devices.length === 0 ? (
          <div style={{
            padding: 20, textAlign: "center",
            color: "var(--text-muted)", fontSize: 13,
          }}>
            No devices registered
          </div>
        ) : (
          <div>
            {devices.map((d, i) => (
              <DeviceRow
                key={d.id}
                name={d.name}
                subtitle={`UID ${d.device_uid} · ${d.status}`}
                updated={formatAgo(d.updated_at)}
                last={i === devices.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SensorRow({ label, value, unit, borderTop, borderRight }) {
  return (
    <div style={{
      padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14,
      borderTop: borderTop ? "1px solid var(--border)" : "none",
      borderRight: borderRight ? "1px solid var(--border)" : "none",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{label}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: "var(--text)",
          letterSpacing: "-0.3px", lineHeight: 1.1,
        }}>
          {typeof value === "number" ? value.toFixed(unit === "%" ? 0 : 1) : value}
          {unit && (
            <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3, color: "var(--text-muted)" }}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceRow({ name, subtitle, updated, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 0",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "var(--accent-soft)",
        display: "grid", placeItems: "center",
        color: "var(--accent)", flexShrink: 0,
      }}>
        <Wifi size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {updated ? `Updated ${updated}` : ""}
      </div>
    </div>
  );
}

function formatAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}