// tone: healthy | warning | critical | neutral
export default function StatusDot({ tone = 'healthy', label }) {
  return <span className={`status-dot ${tone}`} role={label ? 'img' : undefined} aria-label={label} />;
}
