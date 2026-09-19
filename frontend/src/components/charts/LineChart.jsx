// Simple responsive line chart with a y-axis and a few x labels.
// points: [{ label: string, value: number }]
export default function LineChart({ points, unit = '', color = 'var(--green)', height = 220, label = 'Line chart' }) {
  if (points.length < 2) return null;
  const width = 700;
  const padL = 42;
  const padR = 12;
  const padT = 12;
  const padB = 8;
  const values = points.map((p) => p.value);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const span = max - min || 1;
  const x = (i) => padL + (i / (points.length - 1)) * (width - padL - padR);
  const y = (v) => padT + (1 - (v - min) / span) * (height - padT - padB);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * span);
  const xLabels = [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end" className="chart-tick">
              {Math.round(t)}
              {unit}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="line-chart-labels">
        {xLabels.map((i) => (
          <span key={i}>{points[i].label}</span>
        ))}
      </div>
    </div>
  );
}
