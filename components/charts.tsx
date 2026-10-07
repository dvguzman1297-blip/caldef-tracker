import { formatDate, formatDay } from "@/lib/date";
import { dayStatus, movingAverage, ON_TARGET_RANGE, type DayStatus } from "@/lib/progress";

// Charts are plain SVG (no chart library in this repo): server-rendered, no JS, readable by assistive tech via
// the summary label and per-bar <title>. Text lives in HTML so it stays 12px+ at any width.

const BAR_FILL: Record<DayStatus, string> = {
  on_target: "var(--accent)", over: "var(--warn)", under: "var(--fg-subtle)", very_low: "var(--fg-subtle)", no_data: "transparent",
};
const STATUS_TEXT: Record<DayStatus, string> = {
  on_target: "in your target range", over: "over your target range", under: "below your target range",
  very_low: "well below your target range", no_data: "no data",
};

export function KcalBarChart({ days, target, today }: {
  days: { date: string; cal: number | null }[]; target: number; today: string;
}) {
  const W = 600, H = 160, n = days.length;
  const max = Math.max(target * 1.3, ...days.map((d) => d.cal ?? 0)) * 1.02;
  const y = (v: number) => H - (v / max) * H;
  const slot = W / n, bw = Math.max(slot * 0.68, 1.5);
  const [lo, hi] = ON_TARGET_RANGE;
  const logged = days.filter((d) => d.cal !== null).length;

  return (
    <figure>
      <div className="relative pl-14">
        <span className="absolute left-0 top-0 text-xs tabular-nums text-muted">{Math.round(max).toLocaleString("en-US")}</span>
        <span className="absolute bottom-0 left-0 text-xs tabular-nums text-muted">0</span>
        <span className="absolute left-0 -translate-y-1/2 text-xs font-semibold tabular-nums text-fg"
          style={{ top: `${(y(target) / H) * 100}%` }}>Goal</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full" role="img"
          aria-label={`Daily calories for the last ${n} days against a goal of ${target} kcal. ${logged} days logged.`}>
          <rect x="0" y={y(target * hi)} width={W} height={y(target * lo) - y(target * hi)} fill="var(--accent)" opacity=".16" />
          <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--fg-muted)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          {days.map((d, i) => {
            const st = d.cal === null ? "no_data" : dayStatus(true, d.cal, target);
            return d.cal === null ? (
              <rect key={d.date} x={i * slot + (slot - bw) / 2} y={H - 3} width={bw} height="3" fill="var(--track)">
                <title>{`${formatDate(d.date, today)}: no data`}</title>
              </rect>
            ) : (
              <rect key={d.date} x={i * slot + (slot - bw) / 2} y={y(d.cal)} width={bw} height={H - y(d.cal)} rx="1.5" fill={BAR_FILL[st]}>
                <title>{`${formatDate(d.date, today)}: ${Math.round(d.cal).toLocaleString("en-US")} kcal, ${STATUS_TEXT[st]}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between pl-14 pt-1 text-xs text-muted">
        <span>{formatDay(days[0].date, today)}</span><span>{formatDay(days[n - 1].date, today)}</span>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-14 text-xs text-muted">
        <Key color="var(--accent)" label={`In range (${Math.round(lo * 100)}–${Math.round(hi * 100)}% of goal)`} />
        <Key color="var(--warn)" label="Over" />
        <Key color="var(--fg-subtle)" label="Below range" />
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-accent/20" aria-hidden="true" />Target range</span>
      </figcaption>
    </figure>
  );
}

const Key = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: color }} aria-hidden="true" />{label}</span>
);

/** Weight: faint raw weigh-ins with a 7-day moving average line on top. */
export function WeightLineChart({ points, today }: { points: { date: string; kg: number }[]; today: string }) {
  const W = 600, H = 160, P = 12;
  const ma = movingAverage(points);
  const all = [...points.map((p) => p.kg), ...ma.map((p) => p.kg)];
  const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  const day = (s: string) => new Date(`${s}T12:00:00Z`).getTime();
  const t0 = day(points[0].date), t1 = day(points[points.length - 1].date);
  const x = (s: string) => (t1 === t0 ? W / 2 : P + ((day(s) - t0) / (t1 - t0)) * (W - 2 * P));
  const y = (kg: number) => H - P - ((kg - lo) / (hi - lo)) * (H - 2 * P);
  const last = ma[ma.length - 1];

  return (
    <figure>
      <p className="mb-2 text-sm text-muted">
        7-day average now <b className="text-fg tabular-nums">{last.kg.toFixed(1)} kg</b> · range {Math.min(...all).toFixed(1)}–{Math.max(...all).toFixed(1)} kg
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`Weight from ${points[0].kg} kg to ${points[points.length - 1].kg} kg, with a 7-day moving average ending at ${last.kg.toFixed(1)} kg`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)} stroke="var(--border)" strokeWidth="1" />
        ))}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="3.5" fill="var(--fg-subtle)" opacity=".45">
            <title>{`${formatDate(p.date, today)}: ${p.kg} kg`}</title>
          </circle>
        ))}
        {ma.length > 1 && (
          <polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
            points={ma.map((p) => `${x(p.date)},${y(p.kg)}`).join(" ")} />
        )}
      </svg>
      <div className="flex justify-between pt-1 text-xs text-muted">
        <span>{formatDay(points[0].date, today)}</span><span>{formatDay(points[points.length - 1].date, today)}</span>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-accent" aria-hidden="true" />7-day average</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-fg-subtle opacity-60" aria-hidden="true" />Weigh-ins</span>
      </figcaption>
    </figure>
  );
}

/** Placeholder shown before there is any weight data. */
export function WeightChartSkeleton() {
  return (
    <svg viewBox="0 0 600 160" className="h-auto w-full" aria-hidden="true">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="12" x2="588" y1={12 + f * 136} y2={12 + f * 136} stroke="var(--border)" strokeDasharray="4 6" />)}
      <polyline fill="none" stroke="var(--track)" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round"
        points="12,50 120,62 230,70 340,92 450,100 588,118" />
    </svg>
  );
}
