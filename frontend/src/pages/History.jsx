import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, Hash, RotateCcw, TrendingUp } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { useAsync } from '../hooks/useAsync';
import { getHistory } from '../services/farmService';
import { average, formatDate, formatTime } from '../utils/format';
import Card, { CardHeading } from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Dropdown from '../components/ui/Dropdown';
import Segmented from '../components/ui/Segmented';
import SummaryMetric from '../components/ui/SummaryMetric';
import { AsyncBoundary, EmptyState } from '../components/ui/StateMessage';
import LineChart from '../components/charts/LineChart';

const RANGES = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const METRICS = {
  soilMoisture: { label: 'Soil moisture', unit: '%', color: 'var(--green)' },
  temperature: { label: 'Temperature', unit: '°C', color: 'var(--amber)' },
  humidity: { label: 'Humidity', unit: '%', color: 'var(--blue)' },
};

// When "All fields" is selected there are several readings per timestamp: average them.
function toSeries(records, metric) {
  const byTime = new Map();
  records.forEach((r) => {
    if (!byTime.has(r.timestamp)) byTime.set(r.timestamp, []);
    byTime.get(r.timestamp).push(r[metric]);
  });
  return [...byTime.entries()].map(([timestamp, values]) => ({
    label: `${formatDate(timestamp, { day: 'numeric', month: 'short' })} ${formatTime(timestamp)}`,
    value: Number(average(values).toFixed(1)),
  }));
}

export default function History() {
  const { fields } = useFarm();
  const [range, setRange] = useState('7d');
  const [field, setField] = useState('all');
  const [metric, setMetric] = useState('soilMoisture');
  const history = useAsync(() => getHistory({ range, field }), [range, field]);

  const fieldName = (id) => fields.find((f) => f.id === id)?.name ?? id;
  const config = METRICS[metric];
  const series = useMemo(() => (history.data ? toSeries(history.data, metric) : []), [history.data, metric]);
  const values = series.map((p) => p.value);
  const latestRows = useMemo(() => (history.data ? [...history.data].reverse().slice(0, 12) : []), [history.data]);

  const reset = () => {
    setRange('7d');
    setField('all');
    setMetric('soilMoisture');
  };

  return (
    <div className="stack">
      <PageHeader eyebrow="Sensor history" title="History and trends" description="Compare readings over time to spot patterns before they become problems." />

      <Card className="filters">
        <Segmented label="Time range" value={range} options={RANGES} onChange={setRange} />
        <div className="filter-group">
          <Dropdown label="Field" value={field} onChange={setField} options={[{ value: 'all', label: 'All fields' }, ...fields.map((f) => ({ value: f.id, label: f.name }))]} />
          <Dropdown label="Metric" value={metric} onChange={setMetric} options={Object.entries(METRICS).map(([value, m]) => ({ value, label: m.label }))} />
          <button type="button" className="button secondary" onClick={reset}><RotateCcw size={14} aria-hidden="true" />Reset</button>
        </div>
      </Card>

      <AsyncBoundary {...history} onRetry={history.reload} label="Loading history">
        {(records) =>
          records.length === 0 ? (
            <EmptyState title="No readings for these filters" description="Try a longer time range or choose all fields." />
          ) : (
            <>
              <div className="summary-grid">
                <SummaryMetric icon={TrendingUp} label="Average" value={`${average(values).toFixed(1)}${config.unit}`} detail={config.label} />
                <SummaryMetric icon={ArrowUp} tone="warning" label="Highest" value={`${Math.max(...values)}${config.unit}`} detail="Peak in this period" />
                <SummaryMetric icon={ArrowDown} tone="neutral" label="Lowest" value={`${Math.min(...values)}${config.unit}`} detail="Low in this period" />
                <SummaryMetric icon={Hash} tone="neutral" label="Readings" value={records.length} detail="Data points" />
              </div>

              <Card>
                <CardHeading icon={BarChart3} title={`${config.label} over time`} subtitle={field === 'all' ? 'Average across all fields' : fieldName(field)} />
                <LineChart points={series} unit={config.unit} color={config.color} label={`${config.label} over time`} />
              </Card>

              <Card>
                <CardHeading title="Latest readings" subtitle="Most recent 12 records" />
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Date</th><th>Time</th><th>Field</th><th>Device</th><th>Soil moisture</th><th>Temperature</th><th>Humidity</th><th>Rainfall</th></tr>
                    </thead>
                    <tbody>
                      {latestRows.map((r) => (
                        <tr key={r.id}>
                          <td>{formatDate(r.timestamp, { day: 'numeric', month: 'short' })}</td>
                          <td>{formatTime(r.timestamp)}</td>
                          <td>{fieldName(r.field)}</td>
                          <td>{r.device}</td>
                          <td>{r.soilMoisture}%</td>
                          <td>{r.temperature}°C</td>
                          <td>{r.humidity}%</td>
                          <td>{r.rainfall} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )
        }
      </AsyncBoundary>
    </div>
  );
}
