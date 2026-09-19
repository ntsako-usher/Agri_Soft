import { useId } from 'react';

// Smooth area line with no axes. values: number[]
export default function Sparkline({ values, height = 72, label = 'Trend chart' }) {
  const id = useId();
  const width = 300;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);

  // Smooth the line by using midpoints as bezier control points.
  const line = points.reduce((path, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    return `${path} C${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }, '');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--green)" stopOpacity=".24" />
          <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--green)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
