import { useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { useAsync } from '../hooks/useAsync';
import { getAlerts, updateAlertStatus } from '../services/farmService';
import { formatDate, formatTime } from '../utils/format';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Dropdown from '../components/ui/Dropdown';
import Segmented from '../components/ui/Segmented';
import SummaryMetric from '../components/ui/SummaryMetric';
import { AsyncBoundary, EmptyState } from '../components/ui/StateMessage';

const severityMeta = {
  critical: { label: 'Critical', tone: 'critical', icon: AlertOctagon },
  warning: { label: 'Warning', tone: 'warning', icon: AlertTriangle },
  informational: { label: 'Info', tone: 'neutral', icon: Info },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

function AlertItem({ alert, onToggle, pending }) {
  const meta = severityMeta[alert.severity];
  const Icon = meta.icon;
  const resolved = alert.status === 'resolved';
  return (
    <Card as="article" className={`alert-item ${resolved ? 'is-resolved' : ''}`}>
      <span className={`summary-icon ${meta.tone}`}><Icon size={17} aria-hidden="true" /></span>
      <div className="alert-item-body">
        <div className="alert-item-top">
          <h3>{alert.title}</h3>
          <span className={`badge ${meta.tone}`}>{meta.label}</span>
          <span className={`badge ${resolved ? 'healthy' : 'neutral'}`}>{resolved ? 'Resolved' : 'Active'}</span>
        </div>
        <p className="text-muted text-sm">{alert.field}, {alert.device}, {formatDate(alert.createdAt, { day: 'numeric', month: 'short' })} at {formatTime(alert.createdAt)}</p>
        <p>{alert.description}</p>
        <p className="alert-action"><strong>Recommended:</strong> {alert.action}</p>
      </div>
      <button type="button" className="button secondary" disabled={pending} onClick={() => onToggle(alert)}>
        {resolved ? <><RotateCcw size={14} aria-hidden="true" />Reopen</> : <><CheckCircle2 size={14} aria-hidden="true" />Mark resolved</>}
      </button>
    </Card>
  );
}

export default function Alerts() {
  const { fields } = useFarm();
  const alerts = useAsync(getAlerts, []);
  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [field, setField] = useState('all');
  const [pendingId, setPendingId] = useState(null);

  const list = alerts.data ?? [];
  const counts = useMemo(() => ({
    active: list.filter((a) => a.status === 'active').length,
    critical: list.filter((a) => a.status === 'active' && a.severity === 'critical').length,
    warning: list.filter((a) => a.status === 'active' && a.severity === 'warning').length,
    resolved: list.filter((a) => a.status === 'resolved').length,
  }), [list]);

  const visible = list
    .filter((a) => (status === 'all' || a.status === status) && (severity === 'all' || a.severity === severity) && (field === 'all' || a.field === field))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  async function toggle(alert) {
    const next = alert.status === 'resolved' ? 'active' : 'resolved';
    setPendingId(alert.id);
    try {
      const updated = await updateAlertStatus(alert.id, next);
      alerts.setData((current) => current.map((a) => (a.id === alert.id ? { ...a, ...updated } : a)));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="stack">
      <PageHeader eyebrow="Alerts" title="Alerts and notifications" description="Review what needs attention and mark issues as resolved." />

      <div className="summary-grid">
        <SummaryMetric icon={AlertTriangle} tone="warning" label="Active" value={counts.active} detail="Need attention" />
        <SummaryMetric icon={AlertOctagon} tone="critical" label="Critical" value={counts.critical} detail="Act now" />
        <SummaryMetric icon={Info} tone="warning" label="Warnings" value={counts.warning} detail="Keep an eye on these" />
        <SummaryMetric icon={CheckCircle2} tone="healthy" label="Resolved" value={counts.resolved} detail="Handled" />
      </div>

      <Card className="filters">
        <Segmented label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <div className="filter-group">
          <Dropdown label="Severity" value={severity} onChange={setSeverity} options={[{ value: 'all', label: 'All severities' }, { value: 'critical', label: 'Critical' }, { value: 'warning', label: 'Warning' }, { value: 'informational', label: 'Info' }]} />
          <Dropdown label="Field" value={field} onChange={setField} options={[{ value: 'all', label: 'All fields' }, ...fields.map((f) => ({ value: f.name, label: f.name }))]} />
        </div>
      </Card>

      <AsyncBoundary {...alerts} onRetry={alerts.reload} label="Loading alerts">
        {() =>
          visible.length === 0 ? (
            <EmptyState title="No alerts match these filters" description="Change the filters to see more alerts." />
          ) : (
            <div className="alert-feed">
              {visible.map((alert) => <AlertItem key={alert.id} alert={alert} onToggle={toggle} pending={pendingId === alert.id} />)}
            </div>
          )
        }
      </AsyncBoundary>
    </div>
  );
}
