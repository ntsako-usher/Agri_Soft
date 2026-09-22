import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import {
  History as HistoryIcon, Download, RefreshCw, Search,
  Droplet, Thermometer, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const RANGES = [
  { key: "24h", label: "Last 24 hours" },
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

export default function History() {
  const [farms, setFarms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);

  const [farmFilter, setFarmFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [range, setRange] = useState("24h");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Load farms + devices on mount
  useEffect(() => {
    Promise.all([
      api.farms().catch(() => ({ data: [] })),
      api.devices().catch(() => ({ data: [] })),
    ]).then(([fRes, dRes]) => {
      setFarms(fRes.data || []);
      setDevices(dRes.data || []);
    });
  }, []);

  // 2. Load readings whenever device or range changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    // If a specific device is picked, use it. Otherwise, fetch readings for every
    // device in the selected farm (or all devices if no farm is selected).
    const deviceIds = (() => {
      if (deviceFilter !== "all") return [Number(deviceFilter)];
      const farmDevices = devices.filter((d) => {
        const fId = d.farm ?? d.farm_id;
        return farmFilter === "all" || String(fId) === String(farmFilter);
      });
      return farmDevices.map((d) => d.id);
    })();

    if (deviceIds.length === 0) {
      setReadings([]);
      setLoading(false);
      return;
    }

    Promise.all(
      deviceIds.map((id) =>
        api.readings(id, range)
          .then(({ data }) => (data || []).map((r) => ({ ...r, _deviceId: id })))
          .catch(() => [])
      )
    )
      .then((chunks) => {
        if (cancelled) return;
        const all = chunks.flat().sort((a, b) => {
          const ta = new Date(a.recorded_at || a.created_at || a.timestamp).getTime();
          const tb = new Date(b.recorded_at || b.created_at || b.timestamp).getTime();
          return tb - ta; // newest first
        });
        setReadings(all);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load readings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [deviceFilter, farmFilter, range, devices]);

  // 3. Devices visible under the current farm filter (for the device dropdown)
  const visibleDevices = useMemo(() => {
    if (farmFilter === "all") return devices;
    return devices.filter((d) => {
      const fId = d.farm ?? d.farm_id;
      return String(fId) === String(farmFilter);
    });
  }, [devices, farmFilter]);

  // Reset device filter if it's no longer under the selected farm
  useEffect(() => {
    if (deviceFilter === "all") return;
    const stillValid = visibleDevices.some((d) => String(d.id) === String(deviceFilter));
    if (!stillValid) setDeviceFilter("all");
  }, [visibleDevices, deviceFilter]);

  // 4. Normalise readings into a stable shape
  const normalised = useMemo(() => {
    return readings.map((r) => ({
      raw: r,
      id: r.id,
      time: r.recorded_at || r.created_at || r.timestamp,
      deviceId: r._deviceId ?? r.device ?? r.device_id,
      soilMoisture: r.soil_moisture ?? r.moisture ?? null,
      temperature: r.temperature ?? r.temp ?? null,
      humidity: r.humidity ?? r.relative_humidity ?? null,
    }));
  }, [readings]);

  // 5. Client-side search filter (device name or timestamp)
  const filtered = useMemo(() => {
    if (!query.trim()) return normalised;
    const q = query.toLowerCase();
    return normalised.filter((r) => {
      const dev = devices.find((d) => d.id === r.deviceId);
      const name = (dev?.name || dev?.device_name || "").toLowerCase();
      const ts = new Date(r.time).toLocaleString().toLowerCase();
      return name.includes(q) || ts.includes(q);
    });
  }, [normalised, query, devices]);

  // 6. Aggregate stats
  const stats = useMemo(() => {
    const vals = filtered;
    const moistures = vals.map((r) => r.soilMoisture).filter((v) => v != null);
    const temps = vals.map((r) => r.temperature).filter((v) => v != null);

    const avg = (arr) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    return {
      total: vals.length,
      avgMoisture: avg(moistures),
      minMoisture: moistures.length ? Math.min(...moistures) : null,
      maxMoisture: moistures.length ? Math.max(...moistures) : null,
      avgTemp: avg(temps),
      minTemp: temps.length ? Math.min(...temps) : null,
      maxTemp: temps.length ? Math.max(...temps) : null,
    };
  }, [filtered]);

  // 7. Chart data — oldest → newest for the x-axis
  const chartData = useMemo(() => {
    return [...filtered]
      .reverse()
      .map((r) => ({
        time:
          range === "24h"
            ? new Date(r.time).toLocaleTimeString([], {
                hour: "numeric",
                hour12: true,
              })
            : new Date(r.time).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              }),
        moisture: r.soilMoisture,
        temperature: r.temperature,
      }));
  }, [filtered, range]);

  const refresh = () => {
    // re-trigger the readings effect by toggling a dummy dependency
    setRange((r) => r);
    setDeviceFilter((d) => d);
    // simplest: hit the same fetch logic by mutating devices state
    Promise.all([
      api.farms().catch(() => ({ data: [] })),
      api.devices().catch(() => ({ data: [] })),
    ]).then(([fRes, dRes]) => {
      setFarms(fRes.data || []);
      setDevices(dRes.data || []);
    });
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = ["time", "device", "soil_moisture", "temperature", "humidity"];
    const rows = filtered.map((r) => {
      const dev = devices.find((d) => d.id === r.deviceId);
      const name = dev?.name || dev?.device_name || `Device ${r.deviceId}`;
      return [
        new Date(r.time).toISOString(),
        name,
        r.soilMoisture ?? "",
        r.temperature ?? "",
        r.humidity ?? "",
      ];
    });
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soft-agri-history-${range}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      {/* Title */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.5px",
            color: "var(--text)",
          }}>
            History
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Every reading from your sensors, over time.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13, fontWeight: 500,
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
          <button
            onClick={exportCSV}
            disabled={!filtered.length}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 13, fontWeight: 600,
              cursor: filtered.length ? "pointer" : "not-allowed",
              opacity: filtered.length ? 1 : 0.5,
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 20,
      }}>
        <StatCard
          icon={<Activity size={16} />}
          label="Readings"
          value={stats.total}
          tone="neutral"
        />
        <StatCard
          icon={<Droplet size={16} />}
          label="Avg. soil moisture"
          value={stats.avgMoisture != null ? `${stats.avgMoisture}%` : "—"}
          hint={
            stats.minMoisture != null
              ? `${stats.minMoisture}% – ${stats.maxMoisture}%`
              : null
          }
          tone="good"
        />
        <StatCard
          icon={<Thermometer size={16} />}
          label="Avg. temperature"
          value={stats.avgTemp != null ? `${stats.avgTemp}°C` : "—"}
          hint={
            stats.minTemp != null ? `${stats.minTemp}°C – ${stats.maxTemp}°C` : null
          }
          tone="warn"
        />
        <StatCard
          icon={<HistoryIcon size={16} />}
          label="Range"
          value={RANGES.find((r) => r.key === range)?.label.replace("Last ", "") || ""}
          tone="neutral"
        />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 14, top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by device or date"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={farmFilter}
          onChange={(e) => { setFarmFilter(e.target.value); setDeviceFilter("all"); }}
          style={selectStyle}
        >
          <option value="all">All farms</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>{f.farm_name}</option>
          ))}
        </select>

        <select
          value={deviceFilter}
          onChange={(e) => setDeviceFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All devices</option>
          {visibleDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || d.device_name || `Device ${d.device_uid || d.id}`}
            </option>
          ))}
        </select>

        {/* Range pills */}
        <div style={{
          display: "flex",
          background: "var(--surface-alt)",
          borderRadius: "var(--radius-pill)",
          padding: 4,
        }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: range === r.key ? "var(--surface)" : "transparent",
                color: range === r.key ? "var(--text)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: range === r.key ? 600 : 500,
                cursor: "pointer",
                boxShadow: range === r.key ? "var(--shadow-sm)" : "none",
              }}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "var(--danger-soft)",
          color: "var(--danger)",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
            <Droplet size={15} /> Soil moisture over time
          </div>
          <div style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            gap: 16,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: "var(--accent)",
              }} />
              Moisture
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: "var(--warn)",
              }} />
              Temperature
            </span>
          </div>
        </div>

        <div style={{ height: 280 }}>
          {loading && chartData.length === 0 ? (
            <div style={{
              height: "100%",
              display: "grid", placeItems: "center",
              color: "var(--text-muted)", fontSize: 13,
            }}>
              Loading readings…
            </div>
          ) : chartData.length === 0 ? (
            <div style={{
              height: "100%",
              display: "grid", placeItems: "center",
              color: "var(--text-muted)", fontSize: 13,
            }}>
              No readings in this range.
            </div>
          ) : (
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="histMoistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="histTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--warn)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--warn)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                  fill="url(#histMoistGrad)"
                  dot={false}
                  name="Moisture (%)"
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="var(--warn)"
                  strokeWidth={2}
                  fill="url(#histTempGrad)"
                  dot={false}
                  name="Temperature (°C)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>
            Recent readings
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}>
            No readings match your filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border)",
                  textAlign: "left",
                }}>
                  <Th>Time</Th>
                  <Th>Device</Th>
                  <Th align="right">Soil moisture</Th>
                  <Th align="right">Temperature</Th>
                  <Th align="right">Humidity</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((r, i) => {
                  const dev = devices.find((d) => d.id === r.deviceId);
                  const devName = dev?.name || dev?.device_name || `Device ${r.deviceId}`;
                  return (
                    <tr
                      key={r.id ?? i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <Td muted>
                        {new Date(r.time).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </Td>
                      <Td>{devName}</Td>
                      <Td align="right" strong>
                        {r.soilMoisture != null ? `${r.soilMoisture}%` : "—"}
                      </Td>
                      <Td align="right">
                        {r.temperature != null ? `${r.temperature}°C` : "—"}
                      </Td>
                      <Td align="right">
                        {r.humidity != null ? `${r.humidity}%` : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <div style={{
                padding: "12px 0",
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}>
                Showing 50 of {filtered.length} readings — export CSV for full history.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function StatCard({ icon, label, value, hint, tone }) {
  const meta = {
    neutral: { fg: "var(--text)", bg: "var(--surface-alt)" },
    good:    { fg: "var(--good)", bg: "var(--accent-soft)" },
    warn:    { fg: "var(--warn)", bg: "var(--warn-soft)" },
  }[tone] || { fg: "var(--text)", bg: "var(--surface-alt)" };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: meta.bg,
          color: meta.fg,
          display: "grid", placeItems: "center",
        }}>
          {icon}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div style={{
        fontSize: 24, fontWeight: 600,
        color: meta.fg, letterSpacing: "-0.5px",
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th style={{
      padding: "10px 12px",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: "var(--text-muted)",
      fontWeight: 600,
      textAlign: align,
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", muted, strong }) {
  return (
    <td style={{
      padding: "12px",
      textAlign: align,
      color: muted
        ? "var(--text-muted)"
        : strong
        ? "var(--text)"
        : "var(--text)",
      fontWeight: strong ? 600 : 400,
      whiteSpace: "nowrap",
    }}>
      {children}
    </td>
  );
}

/* ---------- Styles ---------- */

const selectStyle = {
  padding: "10px 16px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 13,
  cursor: "pointer",
  outline: "none",
  minWidth: 150,
};