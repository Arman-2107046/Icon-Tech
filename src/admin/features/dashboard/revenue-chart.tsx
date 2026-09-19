import { formatMoney, money } from "@/src/lib/money";

type Point = { day: string; revenue: number; orders: number };

/**
 * Daily revenue bars, rendered as plain SVG on the server: no chart library,
 * no client JS. Colours come from the admin theme tokens via currentColor.
 */
export function RevenueChart({ series }: { series: Point[] }) {
  const width = 600;
  const height = 160;
  const pad = { top: 8, bottom: 22, left: 0, right: 0 };
  const max = Math.max(1, ...series.map((p) => p.revenue));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const slot = innerW / series.length;
  const barW = Math.max(2, slot * 0.6);
  const label = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const ticks = series.length > 10 ? [0, Math.floor(series.length / 2), series.length - 1] : series.map((_, i) => i);

  return (
    <figure data-testid="revenue-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full text-primary" role="img" aria-label="Revenue per day">
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} className="stroke-border" strokeWidth={1} />
        {series.map((p, i) => {
          const h = Math.round((p.revenue / max) * innerH);
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={p.day}>
              <rect x={x} y={y} width={barW} height={h} rx={2} fill="currentColor" opacity={p.revenue ? 0.9 : 0.15}>
                <title>{`${label(p.day)}: ${formatMoney(money(p.revenue))} · ${p.orders} order${p.orders === 1 ? "" : "s"}`}</title>
              </rect>
              {p.revenue === 0 ? <rect x={x} y={pad.top + innerH - 2} width={barW} height={2} rx={1} fill="currentColor" opacity={0.25} /> : null}
            </g>
          );
        })}
        {ticks.map((i) => (
          <text key={i} x={pad.left + i * slot + slot / 2} y={height - 6} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} className="fill-muted-foreground" fontSize={11}>
            {label(series[i]?.day ?? "")}
          </text>
        ))}
      </svg>
      <figcaption className="sr-only">Daily revenue for the last {series.length} days; peak {formatMoney(money(max))}.</figcaption>
    </figure>
  );
}
