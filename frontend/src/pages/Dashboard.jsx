import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Check, ChevronRight, Droplets, Leaf, LayoutDashboard, ShieldCheck, Wifi } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { useAsync } from '../hooks/useAsync';
import { getAlerts, getHistory, getOverview, setIrrigation } from '../services/farmService';
import { sensorIcons } from '../utils/icons';
import { formatDate, formatTime, timeAgo } from '../utils/format';
import Card, { CardHeading } from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Toggle from '../components/ui/Toggle';
import StatusDot from '../components/ui/StatusDot';
import { AsyncBoundary, LoadingState } from '../components/ui/StateMessage';
import Sparkline from '../components/charts/Sparkline';
import LineChart from '../components/charts/LineChart';
import Dropdown from '../components/ui/Dropdown';
import FieldSelector from '../components/FieldSelector';

const alertTone = { critical: 'critical', warning: 'warning', informational: 'neutral' };

function MoistureCard({ soil, fieldName }) {
  return (
    <Card className="moisture-card">
      <CardHeading
        icon={Leaf}
        title="Soil moisture"
        subtitle={fieldName}
        actions={<span className="pill">Target {soil.targetMin}–{soil.targetMax}%</span>}
      />
      <div className="moisture-body">
        <div>
          <strong className="hero-metric">{soil.value}<span>{soil.unit}</span></strong>
          <p className="metric-status"><StatusDot tone="healthy" />Optimal</p>
        </div>
        <div className="moisture-chart"><Sparkline values={soil.trend} label="Soil moisture over the last 24 hours" /></div>
      </div>
    </Card>
  );
}

function StatusCard({ status }) {
  const items = [
    { icon: ShieldCheck, text: `${status.devicesOnline} of ${status.devicesTotal} devices online` },
    { icon: Droplets, text: 'Irrigation on schedule' },
    { icon: Activity, text: `${status.activeAlerts} active alerts` },
  ];
  return (
    <Card className="status-card">
      <CardHeading icon={ShieldCheck} title="Farm status" />
      <p className="status-title"><span className="status-ring"><Check size={15} /></span>All systems normal</p>
      <ul className="status-list">
        {items.map(({ icon: Icon, text }) => (
          <li key={text}><Icon size={14} aria-hidden="true" />{text}</li>
        ))}
      </ul>
    </Card>
  );
}

function FieldCard({ field }) {
  const navigate = useNavigate();
  return (
    <Card className="field-card">
      <div className="field-image">
        <div className="field-overlay">
          <strong>{field.name}</strong>
          <span>{field.hectares} ha</span>
        </div>
        <button type="button" className="field-action" onClick={() => navigate('/monitoring')} aria-label={`Open live monitoring for ${field.name}`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </Card>
  );
}

function EnvironmentCard({ items }) {
  return (
    <Card className="environment">
      <CardHeading icon={Leaf} title="Environmental conditions" />
      <div className="environment-grid">
        {items.map(({ key, label, value, unit, note }) => {
          const Icon = sensorIcons[key];
          return (
            <div className="environment-item" key={key}>
              <span className="sensor-icon"><Icon size={17} aria-hidden="true" /></span>
              <div>
                <span className="text-muted text-sm">{label}</span>
                <strong>{value}{unit}</strong>
                <small className="text-muted">{note}</small>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const ranges = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

function TrendCard({ fieldId }) {
  const [range, setRange] = useState('7d');
  const { data, loading, error } = useAsync(() => getHistory({ range, field: fieldId }), [range, fieldId]);
  const points = (data ?? []).map((r) => ({
    label: formatDate(r.timestamp, { day: 'numeric', month: 'short' }) + ' ' + formatTime(r.timestamp),
    value: r.soilMoisture,
  }));
  return (
    <Card className="trend-card">
      <CardHeading icon={Leaf} title="Soil moisture trend" actions={<Dropdown label="Trend range" value={range} options={ranges} onChange={setRange} />} />
      {error && !data ? <p className="text-muted text-sm">Couldn't load the trend.</p> : loading && !data ? <p className="text-muted text-sm">Loading trend…</p> : <LineChart points={points} unit="%" height={190} label="Soil moisture trend" />}
    </Card>
  );
}

function IrrigationCard({ irrigation, onToggle }) {
  return (
    <Card className="irrigation-card">
      <CardHeading icon={Droplets} title="Irrigation control" actions={<Toggle checked={irrigation.on} onChange={onToggle} label="Irrigation" />} />
      <p className="irrigation-state">{irrigation.on ? 'Running' : 'Off'}</p>
      <p className="text-muted text-sm">{irrigation.on ? 'Manual override' : 'Automatic mode'}</p>
      <p className="text-muted text-sm">
        Next scheduled run: {formatDate(irrigation.nextRun, { day: 'numeric', month: 'short' })}, {formatTime(irrigation.nextRun)}
      </p>
      <Link to="/settings" className="button secondary">Settings</Link>
    </Card>
  );
}

function RecentAlerts() {
  const { data, loading, error } = useAsync(getAlerts, []);
  const recent = [...(data ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  return (
    <Card className="side-card">
      <CardHeading title="Recent alerts" actions={<Link to="/alerts" className="text-link">View all</Link>} />
      {loading && !data && <p className="text-muted text-sm">Loading alerts…</p>}
      {error && !data && <p className="text-muted text-sm">Couldn't load alerts.</p>}
      <ul className="alert-list">
        {recent.map((alert) => (
          <li key={alert.id}>
            <StatusDot tone={alertTone[alert.severity]} />
            <div>
              <strong>{alert.title}</strong>
              <small className="text-muted">{alert.field}, {timeAgo(alert.createdAt)}</small>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Check device status', to: '/devices', icon: Wifi },
    { label: 'View history reports', to: '/history', icon: LayoutDashboard },
    { label: 'Open live monitoring', to: '/monitoring', icon: Activity },
  ];
  return (
    <Card className="side-card">
      <CardHeading title="Quick actions" />
      <div className="quick-actions">
        {actions.map(({ label, to, icon: Icon }) => (
          <Link key={to} to={to} className="quick-action">
            <Icon size={15} aria-hidden="true" />
            {label}
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { selectedField } = useFarm();
  const overview = useAsync(() => getOverview(selectedField?.id), [selectedField?.id]);
  const [busy, setBusy] = useState(false);

  async function toggleIrrigation(on) {
    setBusy(true);
    overview.setData((d) => ({ ...d, irrigation: { ...d.irrigation, on } })); // optimistic
    try {
      await setIrrigation(selectedField.id, on);
    } catch {
      overview.reload(); // roll back to whatever the server says
    } finally {
      setBusy(false);
    }
  }

  if (!selectedField) return <LoadingState label="Loading your farm" />;

  return (
    <>
      <PageHeader eyebrow={selectedField.cluster} title="Farm overview" description={`${selectedField.name}, ${selectedField.hectares} hectares`} actions={<FieldSelector />} />
      <div className="dashboard-grid">
        <div className="main-column">
          <AsyncBoundary {...overview} onRetry={overview.reload} label="Loading overview">
            {(data) => (
              <>
                <div className="hero-grid">
                  <MoistureCard soil={data.soilMoisture} fieldName={selectedField.name} />
                  <StatusCard status={data.farmStatus} />
                  <FieldCard field={selectedField} />
                </div>
                <EnvironmentCard items={data.environment} />
                <div className="lower-grid">
                  <TrendCard fieldId={selectedField.id} />
                  <IrrigationCard irrigation={data.irrigation} onToggle={busy ? () => {} : toggleIrrigation} />
                </div>
              </>
            )}
          </AsyncBoundary>
        </div>
        <aside className="side-column">
          <RecentAlerts />
          <QuickActions />
        </aside>
      </div>
    </>
  );
}
