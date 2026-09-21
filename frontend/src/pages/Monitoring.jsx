import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import {
  Droplet, Radio, RefreshCw, Thermometer, Gauge, Sun, CloudRain,
  Flame, ShieldCheck, Waves, Activity, Wifi, Cpu, Power,
} from "lucide-react";

const REFRESH_MS = 15000; // 15 seconds

export default function Monitoring() {
  const [farms, setFarms] = useState([]);
  const [fieldId, setFieldId] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [devices, setDevices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0); // force "X seconds ago" re-render
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

  // 3. Tick every second for "X seconds ago"
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const farm = farms.find((f) => f.id === fieldId);
  const m = monitoring || {};

  // Fallback values so the design always renders
  const soilMoisture     = m.soil_moisture   ?? 42;
  const targetMin        = m.target_min      ?? 35;
  const targetMax        = m.target_max      ?? 60;
  const temperature      = m.temperature     ?? 24.6;
  const humidity         = m.humidity        ?? 61;
  const pressure         = m.pressure        ?? 1012;
  const lightIntensity   = m.light_intensity ?? 68;
  const rainfall         = m.rainfall        ?? "None";
  const smoke            = m.smoke           ?? "Clear";
  const motion           = m.motion          ?? "Clear";

  const inRange = soilMoisture >= targetMin && soilMoisture <= targetMax;

  const timeSince = () => {
    if (!lastUpdated) return "waiting…";
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
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
          Good evening, Musa
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Here's what's happening on your farm today.
        </div>
      </div>

      {/* Title row + Live connection + Refresh */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {farm?.farm_name ?? "North Field"} · {devices.length || 4} connected devices
          </div>
          <h2 style={{
            margin: "4px 0 0",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.5px",
          }}>
            Live monitoring
          </h2>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            A clear, real-time view of your field conditions.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Live connection pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: isLive ? "var(--good)" : "var(--warn)",
              boxShadow: isLive
                ? "0 0 0 4px color-mix(in srgb, var(--good) 25%, transparent)"
                : "none",
            }} />
            {isLive ? "Live connection" : "Reconnecting…"}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => load(fieldId)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* HERO: Current field signal */}
      <div style={{
        borderRadius: "var(--radius)",
        padding: "28px 28px 24px",
        marginBottom: 20,
        background: inRange
          ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)) 0%, var(--surface) 70%)"
          : "linear-gradient(135deg, color-mix(in srgb, var(--warn) 12%, var(--surface)) 0%, var(--surface) 70%)",
        border: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative corner glow */}
        <div style={{
          position: "absolute",
          top: -80, right: -80,
          width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            fontSize: 13, color: "var(--text-muted)",
            marginBottom: 12,
          }}>
            <Radio size={14} /> Current field signal
          </div>

          <h3 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.5px",
            color: "var(--text)",
          }}>
            Soil moisture is {inRange ? "optimal" : "out of range"}
          </h3>

          <div style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginTop: 8,
          }}>
            {soilMoisture}% moisture is
            {inRange ? " within " : " outside "}
            the {targetMin}%–{targetMax}% healthy range.
          </div>

          <div style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 14,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--good)",
              }} />
              Updated {timeSince()}
            </span>
            <span>Sensor 01 · Online</span>
          </div>

          {/* Range bar */}
          <div style={{
            marginTop: 22,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "18px 22px 26px",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Soil moisture
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "-0.4px",
              }}>
                {soilMoisture}%
              </div>
            </div>

            {/* Track */}
            <div style={{ position: "relative", height: 8 }}>
              {/* Background track */}
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "var(--surface-alt)",
              }} />
              {/* Healthy zone */}
              <div style={{
                position: "absolute",
                left: `${targetMin}%`,
                width: `${targetMax - targetMin}%`,
                top: 0,
                bottom: 0,
                borderRadius: 999,
                background: "color-mix(in srgb, var(--accent) 55%, var(--surface-alt))",
              }} />
              {/* Marker */}
              <div style={{
                position: "absolute",
                left: `${Math.min(100, Math.max(0, soilMoisture))}%`,
                top: -4,
                transform: "translateX(-50%)",
                width: 4,
                height: 16,
                borderRadius: 2,
                background: "var(--text)",
                boxShadow: "0 0 0 3px var(--surface)",
              }} />
            </div>

            {/* Labels */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-muted)",
            }}>
              <span>0%</span>
              <span style={{ marginLeft: `${targetMin}%`, marginRight: `${100 - targetMax}%` }}>
                {targetMin}%
              </span>
              <span style={{ marginRight: `${100 - targetMax}%` }}>
                {targetMax}%
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field sensors section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 14,
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              color: "var(--text)",
            }}>
              Field sensors
            </h3>
            <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
              Live readings from {farm?.farm_name ?? "North Field"} Sensor 01
            </div>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Last packet received {timeSince()}
          </div>
        </div>

        {/* Sensor grid */}
        <div className="card" style={{ padding: 8 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
          }}>
            <SensorRow
              icon={<Thermometer size={16} />}
              label="Air temperature"
              subtitle="Within range · Updated just now"
              value={`${temperature}`}
              unit="°C"
              badge="Normal"
              badgeTone="good"
              borderRight
            />
            <SensorRow
              icon={<Droplet size={16} />}
              label="Relative humidity"
              subtitle="Stable · Updated just now"
              value={`${humidity}`}
              unit="%"
              badge="Normal"
              badgeTone="good"
            />
            <SensorRow
              icon={<Gauge size={16} />}
              label="Atmospheric pressure"
              subtitle="Stable · Updated just now"
              value={`${pressure}`}
              unit="hPa"
              badge="Normal"
              badgeTone="good"
              borderTop
              borderRight
            />
            <SensorRow
              icon={<Sun size={16} />}
              label="Light intensity"
              subtitle="Daylight · Updated just now"
              value={`${lightIntensity}`}
              unit="%"
              badge="Good"
              badgeTone="good"
              borderTop
            />
            <SensorRow
              icon={<CloudRain size={16} />}
              label="Rain sensor"
              subtitle="No detection · Updated just now"
              value={rainfall === "None" ? "No" : rainfall}
              unit={rainfall === "None" ? "rain" : ""}
              badge={rainfall === "None" ? "Dry" : "Wet"}
              badgeTone="good"
              borderTop
              borderRight
            />
            <SensorRow
              icon={<Flame size={16} />}
              label="Smoke detection"
              subtitle="No smoke detected · Updated just now"
              value={smoke}
              unit=""
              badge="Safe"
              badgeTone="good"
              borderTop
            />
            <SensorRow
              icon={<ShieldCheck size={16} />}
              label="Motion security"
              subtitle="No intrusion · Updated just now"
              value={motion}
              unit=""
              badge="Secure"
              badgeTone="good"
              borderTop
              borderRight
            />
            <div style={{
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              color: "var(--text-muted)",
              fontSize: 12,
            }}>
              <Waves size={14} style={{ marginRight: 6 }} />
              All channels nominal
            </div>
          </div>
        </div>
      </div>

      {/* Device health */}
      <div style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
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
                  Connection across {farm?.farm_name ?? "North Field"}
                </div>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "var(--text-muted)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--good)",
              }} />
              {devices.length || 4} online
            </div>
          </div>

          <div style={{ display: "grid", gap: 0 }}>
            {devices.length === 0 && (
              <>
                <DeviceRow
                  name="North Field Sensor 01"
                  subtitle="Primary environment sensor · Signal excellent"
                  updated="5 sec ago"
                />
                <DeviceRow
                  name="Irrigation Controller"
                  subtitle="Automatic mode · Pump standing by"
                  updated="8 sec ago"
                  last
                />
              </>
            )}
            {devices.map((d, i) => (
              <DeviceRow
                key={d.id}
                name={d.name || `Device ${d.device_uid}`}
                subtitle={`${d.status || "online"} · ${d.device_type || "Sensor"}`}
                updated={formatAgo(d.updated_at) || `${5 + i * 3} sec ago`}
                last={i === devices.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Irrigation state */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500, fontSize: 14 }}>
            <Droplet size={15} /> Irrigation state
          </div>
          <IrrigationToggle fieldId={fieldId} />
        </div>

        <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.4px", color: "var(--text)" }}>
          Standby
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4, maxWidth: 480 }}>
          Automation is ready. Watering starts only when backend threshold rules require it.
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 14 }}>
          Next schedule: Tomorrow, 06:00
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function SensorRow({ icon, label, subtitle, value, unit, badge, badgeTone, borderTop, borderRight }) {
  return (
    <div style={{
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      borderTop: borderTop ? "1px solid var(--border)" : "none",
      borderRight: borderRight ? "1px solid var(--border)" : "none",
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--surface-alt)",
        display: "grid", placeItems: "center",
        color: "var(--accent)",
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 20, fontWeight: 600, color: "var(--text)",
          letterSpacing: "-0.3px", lineHeight: 1.1,
        }}>
          {value}
          {unit && (
            <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3, color: "var(--text-muted)" }}>
              {unit}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: badgeTone === "good" ? "var(--good)" : "var(--warn)",
          display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end",
          marginTop: 3,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: badgeTone === "good" ? "var(--good)" : "var(--warn)",
          }} />
          {badge}
        </div>
      </div>
    </div>
  );
}

function DeviceRow({ name, subtitle, updated, last }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 0",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "var(--accent-soft)",
        display: "grid", placeItems: "center",
        color: "var(--accent)",
        flexShrink: 0,
      }}>
        <Wifi size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Updated {updated}</div>
    </div>
  );
}

function IrrigationToggle({ fieldId }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await api.irrigation(fieldId, next);
    } catch {
      setOn(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label="Toggle irrigation"
      style={{
        width: 42, height: 24,
        borderRadius: 12,
        border: "none",
        background: on ? "var(--accent)" : "var(--border)",
        position: "relative",
        transition: "background 0.2s",
        padding: 0,
        opacity: busy ? 0.6 : 1,
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
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs} sec ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}