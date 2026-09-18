import { Battery, CheckCircle2, Cpu, SignalHigh, WifiOff, Wrench } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { getDevices } from '../services/farmService';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import SummaryMetric from '../components/ui/SummaryMetric';
import { AsyncBoundary } from '../components/ui/StateMessage';

const statusMeta = {
  online: { label: 'Online', tone: 'healthy' },
  attention: { label: 'Needs attention', tone: 'warning' },
  offline: { label: 'Offline', tone: 'critical' },
};

function Meter({ label, value, icon: Icon }) {
  const tone = value === null ? 'neutral' : value < 25 ? 'critical' : value < 50 ? 'warning' : 'healthy';
  return (
    <div className="meter">
      <span className="meter-label"><Icon size={13} aria-hidden="true" />{label}</span>
      {value === null ? <span className="text-muted text-sm">Mains powered</span> : (
        <>
          <span className="meter-track"><span className={`meter-fill ${tone}`} style={{ width: `${value}%` }} /></span>
          <span className="text-sm">{value}%</span>
        </>
      )}
    </div>
  );
}

function DeviceCard({ device }) {
  const meta = statusMeta[device.status];
  return (
    <Card as="article" className="device-card">
      <div className="device-card-top">
        <span className="sensor-icon"><Cpu size={17} aria-hidden="true" /></span>
        <div>
          <h3>{device.name}</h3>
          <p className="text-muted text-sm">{device.type}, {device.field}</p>
        </div>
        <span className={`badge ${meta.tone}`}>{meta.label}</span>
      </div>
      <div className="meters">
        <Meter label="Signal" value={device.signal} icon={SignalHigh} />
        <Meter label="Battery" value={device.battery} icon={Battery} />
      </div>
      <ul className="chips">
        {device.capabilities.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className="text-muted text-sm">{device.notes}</p>
      <p className="text-muted text-sm">Last seen {device.lastSeen}. ID {device.id}</p>
    </Card>
  );
}

export default function Devices() {
  const devices = useAsync(getDevices, []);
  const list = devices.data ?? [];
  const count = (status) => list.filter((d) => d.status === status).length;

  return (
    <div className="stack">
      <PageHeader eyebrow="Devices" title="Devices and connectivity" description="Check that every sensor and controller is online and powered." />
      <div className="summary-grid">
        <SummaryMetric icon={Cpu} tone="neutral" label="Total devices" value={list.length} detail="Registered" />
        <SummaryMetric icon={CheckCircle2} tone="healthy" label="Online" value={count('online')} detail="Reporting normally" />
        <SummaryMetric icon={Wrench} tone="warning" label="Needs attention" value={count('attention')} detail="Low battery or signal" />
        <SummaryMetric icon={WifiOff} tone="critical" label="Offline" value={count('offline')} detail="Not reporting" />
      </div>
      <AsyncBoundary {...devices} onRetry={devices.reload} label="Loading devices">
        {(data) => (
          <div className="device-grid">
            {data.map((device) => <DeviceCard key={device.id} device={device} />)}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
