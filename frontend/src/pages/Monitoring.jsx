import { useEffect } from 'react';
import { Droplets, Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { useAsync } from '../hooks/useAsync';
import { getMonitoring } from '../services/farmService';
import { sensorIcons } from '../utils/icons';
import { formatTime } from '../utils/format';
import Card, { CardHeading } from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import StatusDot from '../components/ui/StatusDot';
import { AsyncBoundary, LoadingState } from '../components/ui/StateMessage';
import FieldSelector from '../components/FieldSelector';

const REFRESH_MS = 30_000;

function Hero({ soil, updatedAt }) {
  const inRange = soil.value >= soil.targetMin && soil.value <= soil.targetMax;
  return (
    <section className="live-hero">
      <div>
        <span className="live-kicker"><Radio size={14} aria-hidden="true" />Current field signal</span>
        <p className="live-headline">Soil moisture is <strong>{inRange ? 'optimal' : 'outside the target range'}</strong></p>
        <p className="text-muted">
          {soil.value}% moisture {inRange ? 'is within' : 'is outside'} the {soil.targetMin}–{soil.targetMax}% healthy range.
        </p>
        <p className="live-meta">
          <span><StatusDot tone="healthy" />Updated {formatTime(updatedAt)}</span>
          <span>{soil.sensor} is online</span>
        </p>
      </div>
      <div className="gauge">
        <div className="gauge-caption"><span>Soil moisture</span><strong>{soil.value}{soil.unit}</strong></div>
        <div className="gauge-track" role="img" aria-label={`Soil moisture ${soil.value}%, target ${soil.targetMin} to ${soil.targetMax}%`}>
          <span className="gauge-safe" style={{ left: `${soil.targetMin}%`, right: `${100 - soil.targetMax}%` }} />
          <span className="gauge-value" style={{ left: `${soil.value}%` }} />
        </div>
        <div className="gauge-labels"><span>Dry</span><span>Target {soil.targetMin}–{soil.targetMax}%</span><span>Wet</span></div>
      </div>
    </section>
  );
}

function SensorRow({ sensor }) {
  const Icon = sensorIcons[sensor.key];
  return (
    <li className="sensor-row">
      <span className={`sensor-icon ${sensor.tone}`}><Icon size={17} aria-hidden="true" /></span>
      <div>
        <strong>{sensor.label}</strong>
        <small className="text-muted">{sensor.detail}</small>
      </div>
      <div className="sensor-value">
        <strong>{sensor.value}<small>{sensor.unit}</small></strong>
        <span className={`badge ${sensor.tone}`}>{sensor.status}</span>
      </div>
    </li>
  );
}

export default function Monitoring() {
  const { selectedField } = useFarm();
  const monitoring = useAsync(() => getMonitoring(selectedField?.id), [selectedField?.id]);
  const { reload } = monitoring;

  useEffect(() => {
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  if (!selectedField) return <LoadingState label="Loading your farm" />;

  return (
    <>
      <PageHeader
        eyebrow={selectedField.cluster}
        title="Live monitoring"
        description="A real-time view of conditions in this field. Refreshes every 30 seconds."
        actions={
          <>
            <FieldSelector />
            <button type="button" className="button secondary" onClick={reload} disabled={monitoring.loading}>
              <RefreshCw size={14} aria-hidden="true" className={monitoring.loading ? 'spin' : ''} />
              Refresh
            </button>
          </>
        }
      />

      <AsyncBoundary {...monitoring} onRetry={reload} label="Loading live data">
        {(data) => (
          <div className="stack">
            <Hero soil={data.soil} updatedAt={data.updatedAt} />

            <Card className="sensor-matrix">
              <CardHeading title="Sensor readings" subtitle={`${data.sensors.length} sensors reporting`} />
              <ul className="sensor-list">
                {data.sensors.map((sensor) => <SensorRow key={sensor.key} sensor={sensor} />)}
              </ul>
            </Card>

            <div className="lower-grid">
              <Card>
                <CardHeading icon={Wifi} title="Device health" />
                <ul className="device-list">
                  {data.deviceHealth.map((device) => (
                    <li key={device.id}>
                      <span className="sensor-icon">{device.status === 'online' ? <Wifi size={16} /> : <WifiOff size={16} />}</span>
                      <div>
                        <strong>{device.name}</strong>
                        <small className="text-muted">Last seen {device.lastSeen}</small>
                      </div>
                      <span className={`badge ${device.status === 'online' ? 'healthy' : 'critical'}`}>{device.status === 'online' ? 'Online' : 'Offline'}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="live-irrigation">
                <CardHeading icon={Droplets} title="Irrigation" />
                <p className="irrigation-state">Standing by</p>
                <p className="text-muted text-sm">Soil moisture is in range, so the schedule is running normally. Control irrigation from the Overview page.</p>
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
