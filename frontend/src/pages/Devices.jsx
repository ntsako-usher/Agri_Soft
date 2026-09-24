import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import {
  Cpu, Wifi, WifiOff, Plus, X, Search, Trash2, RefreshCw,
} from "lucide-react";

export default function Devices() {
  const [farms, setFarms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [farmFilter, setFarmFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [fRes, dRes] = await Promise.all([
        api.farms().catch(() => ({ data: [] })),
        api.devices().catch(() => ({ data: [] })),
      ]);
      setFarms(fRes.data || []);
      setDevices(dRes.data || []);
    } catch {
      setError("Could not load devices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const normalised = useMemo(() => {
    return devices.map((d) => ({
      raw: d,
      id: d.id,
      name: d.name || `Device ${d.device_uid}`,
      uid: d.device_uid,
      farmId: d.farm,
      farmName: d.farm_name || "—",
      location: d.location || "—",
      firmware: d.firmware_version || "—",
      status: (d.status || "offline").toLowerCase(),
      lastSeen: d.updated_at,
    }));
  }, [devices]);

  const filtered = useMemo(() => {
    let list = normalised;
    if (farmFilter !== "all") {
      list = list.filter((d) => String(d.farmId) === String(farmFilter));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.uid.toLowerCase().includes(q)
      );
    }
    return list;
  }, [normalised, farmFilter, query]);

  const stats = useMemo(() => {
    const online = normalised.filter((d) => d.status === "online").length;
    const offline = normalised.filter((d) => d.status !== "online").length;
    return { total: normalised.length, online, offline };
  }, [normalised]);

  const onDelete = async (dev) => {
    if (!confirm(`Delete ${dev.name}? This cannot be undone.`)) return;
    try {
      await api.deleteDevice(dev.id);
      setDevices((prev) => prev.filter((d) => d.id !== dev.id));
      if (selected?.id === dev.id) setSelected(null);
    } catch {
      alert("Could not delete device.");
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440 }}>
      <Topbar />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: 30, fontWeight: 500,
          letterSpacing: "-0.5px", color: "var(--text)",
        }}>
          Devices
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Monitor and manage every connected sensor and controller.
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16, marginBottom: 20,
      }}>
        <StatCard label="Total devices" value={stats.total} />
        <StatCard label="Online" value={stats.online} tone="good" />
        <StatCard label="Offline" value={stats.offline} />
      </div>

      <div style={{
        display: "flex", alignItems: "center",
        gap: 12, marginBottom: 20, flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340 }}>
          <Search size={14} style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "var(--text-muted)",
          }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or UID"
            style={{
              width: "100%", padding: "10px 14px 10px 38px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={farmFilter}
          onChange={(e) => setFarmFilter(e.target.value)}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)", fontSize: 13,
            cursor: "pointer", outline: "none", minWidth: 160,
          }}
        >
          <option value="all">All farms</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>{f.farm_name}</option>
          ))}
        </select>

        <button onClick={load} disabled={loading} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)", fontSize: 13, fontWeight: 500,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}>
          <RefreshCw size={14}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>

       
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "var(--danger-soft)", color: "var(--danger)",
          borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading && normalised.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Loading devices…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Cpu size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
            No devices yet
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            {query || farmFilter !== "all"
              ? "No devices match your filters."
              : "Register your first device to start collecting data."}
          </div>
         
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              onClick={() => setSelected(d)}
              onDelete={() => onDelete(d)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddDeviceModal
          farms={farms}
          onClose={() => setShowAdd(false)}
          onCreated={(device) => {
            setDevices((prev) => [device, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {selected && (
        <DeviceDetail
          device={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const colors = {
    good: { fg: "var(--good)", bg: "var(--accent-soft)" },
  }[tone] || { fg: "var(--text)", bg: "var(--surface-alt)" };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 600, color: colors.fg,
        marginTop: 6, letterSpacing: "-0.5px",
      }}>
        {value}
      </div>
    </div>
  );
}

function DeviceCard({ device, onClick, onDelete }) {
  const online = device.status === "online";
  return (
    <div className="card" onClick={onClick} style={{
      cursor: "pointer",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12,
          background: "var(--surface-alt)",
          display: "grid", placeItems: "center",
          color: online ? "var(--good)" : "var(--text-muted)",
          flexShrink: 0,
        }}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 500, color: "var(--text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {device.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            UID · {device.uid}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
          background: "transparent", border: "none", padding: 6,
          borderRadius: 8, color: "var(--text-muted)", cursor: "pointer",
        }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{
        display: "grid", gap: 6, fontSize: 12,
        color: "var(--text-muted)", paddingTop: 12,
        borderTop: "1px solid var(--border)",
      }}>
        <Row label="Farm" value={device.farmName} />
        <Row label="Location" value={device.location} />
        <Row label="Firmware" value={device.firmware} />
        <Row label="Last seen" value={formatAgo(device.lastSeen)} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function AddDeviceModal({ farms, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    device_uid: "",
    farm: farms[0]?.id ?? "",
    location: "",
    firmware_version: "v1.0.0",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.device_uid.trim() || !form.farm) {
      setErr("Name, UID and farm are required.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.createDevice({
        name: form.name,
        device_uid: form.device_uid,
        farm: Number(form.farm),
        location: form.location,
        firmware_version: form.firmware_version,
        status: "offline",
      });
      onCreated(data);
    } catch (e) {
      const d = e.response?.data;
      setErr(d ? Object.values(d).flat().join(" ") : "Could not create device.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "grid", placeItems: "center", padding: 20, zIndex: 1000,
    }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{
        width: "100%", maxWidth: 440,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 28,
        display: "grid", gap: 14,
        boxShadow: "var(--shadow)",
      }}>
        

        <Field label="Device name" value={form.name} onChange={change("name")}
               placeholder="e.g. North Field Sensor 02" />
        <Field label="Device UID" value={form.device_uid} onChange={change("device_uid")}
               placeholder="e.g. 002" />

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Farm</span>
          <select value={form.farm} onChange={change("farm")} style={selectStyle}>
            {farms.length === 0 && <option value="">No farms registered</option>}
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.farm_name}</option>
            ))}
          </select>
        </label>

        <Field label="Location (optional)" value={form.location} onChange={change("location")}
               placeholder="e.g. North field, near pump" />
        <Field label="Firmware version" value={form.firmware_version}
               onChange={change("firmware_version")} placeholder="v1.0.0" />

        {err && (
          <div style={{
            fontSize: 13, color: "var(--danger)",
            background: "var(--danger-soft)",
            padding: "10px 12px", borderRadius: "var(--radius-sm)",
          }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: "12px 20px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            color: "var(--text)", fontWeight: 500, fontSize: 14, cursor: "pointer",
          }}>
            Cancel
          </button>
        
        </div>
      </form>
    </div>
  );
}

function DeviceDetail({ device, onClose }) {
  const [tab, setTab] = useState("overview");
  const [readings, setReadings] = useState([]);
  const [loadingR, setLoadingR] = useState(false);

  useEffect(() => {
    if (tab !== "readings") return;
    setLoadingR(true);
    api.readings(device.id, "24h")
      .then(({ data }) => setReadings(data || []))
      .catch(() => setReadings([]))
      .finally(() => setLoadingR(false));
  }, [tab, device.id]);

  const online = device.status === "online";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)", zIndex: 999,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 480,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 1000, padding: 28, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {device.farmName}
            </div>
            <h2 style={{
              margin: 0, fontSize: 22, fontWeight: 500,
              letterSpacing: "-0.4px", color: "var(--text)",
            }}>
              {device.name}
            </h2>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              UID · {device.uid}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none",
            color: "var(--text-muted)", cursor: "pointer", padding: 6,
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: "var(--radius-pill)",
          background: online ? "var(--accent-soft)" : "var(--surface-alt)",
          color: online ? "var(--good)" : "var(--text-muted)",
          fontSize: 12, fontWeight: 500, alignSelf: "flex-start",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: online ? "var(--good)" : "var(--text-muted)",
          }} />
          {online ? "Online" : "Offline"}
          <span style={{ opacity: 0.7 }}> · Last seen {formatAgo(device.lastSeen)}</span>
        </div>

        <div style={{
          display: "flex", gap: 4, padding: 4,
          background: "var(--surface-alt)",
          borderRadius: "var(--radius-sm)",
        }}>
          {["overview", "readings"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 12px",
              borderRadius: 8, border: "none",
              background: tab === t ? "var(--surface)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
              fontSize: 13, fontWeight: tab === t ? 600 : 500,
              cursor: "pointer", textTransform: "capitalize",
            }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ display: "grid", gap: 12 }}>
            <DetailRow label="Device name" value={device.name} />
            <DetailRow label="UID" value={device.uid} />
            <DetailRow label="Farm" value={device.farmName} />
            <DetailRow label="Location" value={device.location} />
            <DetailRow label="Firmware" value={device.firmware} />
            <DetailRow label="Last seen" value={formatAgo(device.lastSeen)} />
          </div>
        )}

        {tab === "readings" && (
          <div>
            {loadingR ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 20, textAlign: "center" }}>
                Loading readings…
              </div>
            ) : readings.length === 0 ? (
              <div style={{
                fontSize: 13, color: "var(--text-muted)",
                padding: 20, textAlign: "center",
                background: "var(--surface-alt)",
                borderRadius: "var(--radius-sm)",
              }}>
                No readings in the last 24 hours.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {readings.slice(0, 20).map((r, i) => (
                  <div key={r.id ?? i} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "10px 12px",
                    background: "var(--surface-alt)",
                    borderRadius: 10, fontSize: 12,
                  }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      {new Date(r.recorded_at).toLocaleString()}
                    </span>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      {r.moisture != null ? `${Number(r.moisture).toFixed(1)}%` : "—"} ·{" "}
                      {r.temp_c != null ? `${Number(r.temp_c).toFixed(1)}°C` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid var(--border)",
      fontSize: 13,
    }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        style={{
          padding: "11px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-alt)",
          color: "var(--text)", fontSize: 14, outline: "none",
        }}
      />
    </label>
  );
}

const selectStyle = {
  padding: "11px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--surface-alt)",
  color: "var(--text)", fontSize: 14, outline: "none",
};

function formatAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}