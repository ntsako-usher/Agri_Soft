import Card from './Card';

export default function SummaryMetric({ icon: Icon, label, value, detail, tone = 'healthy' }) {
  return (
    <Card as="div" className="summary-metric">
      <span className={`summary-icon ${tone}`}><Icon size={16} aria-hidden="true" /></span>
      <span className="text-muted text-sm">{label}</span>
      <strong>{value}</strong>
      {detail && <small className="text-muted">{detail}</small>}
    </Card>
  );
}
