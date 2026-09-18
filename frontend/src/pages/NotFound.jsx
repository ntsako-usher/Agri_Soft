import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/StateMessage';

export default function NotFound() {
  return (
    <div className="stack">
      <EmptyState title="Page not found" description="The page you're looking for doesn't exist or has moved." />
      <Link to="/" className="button secondary" style={{ justifySelf: 'start' }}>Back to overview</Link>
    </div>
  );
}
