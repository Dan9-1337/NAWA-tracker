type HistorySparklineProps = {
  values: number[];
  width?: number;
  height?: number;
};

export function HistorySparkline({ values, width = 72, height = 28 }: HistorySparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * innerWidth;
      const y = padding + innerHeight - ((value - min) / range) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const last = values[values.length - 1];
  const lastX = padding + innerWidth;
  const lastY = padding + innerHeight - ((last - min) / range) * innerHeight;

  return (
    <svg
      className="history-sparkline shrink-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="3" fill="var(--color-accent)" />
    </svg>
  );
}
