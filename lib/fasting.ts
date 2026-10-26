export const PROTOCOLS = [
  { id: "16:8", label: "16:8", hours: 16 },
  { id: "18:6", label: "18:6", hours: 18 },
  { id: "20:4", label: "20:4", hours: 20 },
  { id: "24", label: "24 h", hours: 24 },
] as const;
export type ProtocolId = (typeof PROTOCOLS)[number]["id"];
export const DEFAULT_PROTOCOL: ProtocolId = "16:8";
export const protocolHours = (id: string) => PROTOCOLS.find((p) => p.id === id)?.hours ?? 16;

/** Longest a fast can run, and how far back a start time may be set (forgot to press Start). */
export const MAX_TARGET_HOURS = 72;
export const MAX_BACKDATE_HOURS = 48;

export type FastRow = { id: string; started_at: string; ended_at: string | null; target_hours: number | string };

const HOUR = 3_600_000, MIN = 60_000;

/** "16h 05m"; under an hour "42m". Negative values clamp to zero. */
export function formatDuration(ms: number) {
  const m = Math.floor(Math.max(ms, 0) / MIN);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

/** "15:42:07" for the live clock. */
export function formatClock(ms: number) {
  const s = Math.floor(Math.max(ms, 0) / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function fastProgress(startMs: number, nowMs: number, targetHours: number) {
  const elapsedMs = Math.max(nowMs - startMs, 0);
  const targetMs = targetHours * HOUR;
  return {
    elapsedMs, targetMs,
    pct: targetMs > 0 ? Math.min(elapsedMs / targetMs, 1) : 0,
    reached: elapsedMs >= targetMs,
    remainingMs: Math.max(targetMs - elapsedMs, 0),
    overMs: Math.max(elapsedMs - targetMs, 0),
  };
}

export const durationOf = (f: FastRow) =>
  f.ended_at ? new Date(f.ended_at).getTime() - new Date(f.started_at).getTime() : null;

export const metGoal = (f: FastRow) => {
  const d = durationOf(f);
  return d !== null && d >= Number(f.target_hours) * HOUR;
};

/** Stats over completed fasts only (a running fast isn't counted). */
export function summarize(rows: FastRow[]) {
  const done = rows.filter((f) => f.ended_at);
  const total = done.reduce((sum, f) => sum + (durationOf(f) ?? 0), 0);
  return { count: done.length, met: done.filter(metGoal).length, avgMs: done.length ? total / done.length : 0 };
}

/** Whether a proposed start time is usable: not in the future, not older than MAX_BACKDATE_HOURS. */
export function checkStart(startMs: number, nowMs: number): string | null {
  if (!Number.isFinite(startMs)) return "That start time isn't valid.";
  if (startMs > nowMs + MIN) return "A fast can't start in the future.";
  if (nowMs - startMs > MAX_BACKDATE_HOURS * HOUR) return `Start times can go back at most ${MAX_BACKDATE_HOURS} hours.`;
  return null;
}
