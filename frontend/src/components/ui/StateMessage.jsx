import { AlertTriangle, Inbox } from 'lucide-react';
import Card from './Card';

// One component for the three non-happy states of any data view.
export function LoadingState({ label = 'Loading' }) {
  return (
    <Card className="state-message" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}…</p>
    </Card>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Card className="state-message error" role="alert">
      <span className="state-icon"><AlertTriangle size={18} /></span>
      <div>
        <strong>We couldn't load this data</strong>
        <p>{error?.message || 'Check your connection and try again.'}</p>
      </div>
      {onRetry && <button type="button" className="button secondary" onClick={onRetry}>Try again</button>}
    </Card>
  );
}

export function EmptyState({ title, description }) {
  return (
    <Card className="state-message empty">
      <span className="state-icon"><Inbox size={18} /></span>
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
    </Card>
  );
}

// Handy wrapper: renders the right state or the children once data is ready.
export function AsyncBoundary({ loading, error, data, onRetry, label, children }) {
  if (error && !data) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !data) return <LoadingState label={label} />;
  if (!data) return null;
  return children(data);
}
