// Lightweight inline-SVG sparkline (no chart library needed for tiny trends).
export function Sparkline({
  data,
  className,
  width = 76,
  height = 26,
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = pad + (i * (width - pad * 2)) / (data.length - 1);
      const y = pad + (height - pad * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
