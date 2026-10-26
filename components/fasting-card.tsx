"use client";
import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { Check, Play, Square, Trash2 } from "lucide-react";
import { deleteFast, endFast, startFast } from "@/app/actions/fasting";
import { unwrap } from "@/lib/action-result";
import {
  DEFAULT_PROTOCOL, MAX_BACKDATE_HOURS, PROTOCOLS, durationOf, fastProgress, formatClock, formatDuration,
  metGoal, protocolHours, summarize, type FastRow, type ProtocolId,
} from "@/lib/fasting";
import { useToast } from "@/components/toast";
import { InfoTip } from "@/components/ui/info-tip";
import { Segmented } from "@/components/ui/segmented";

const STORE_KEY = "caldef.fast.protocol";
const OPTIONS = PROTOCOLS.map((p) => ({ value: p.id, label: p.label }));
const R = 52, C = 2 * Math.PI * R;

// Browser-only values go through useSyncExternalStore: the server (and hydration) sees the fallback, then the client's value.
const protocolListeners = new Set<() => void>();
const readProtocol = (): ProtocolId => {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return PROTOCOLS.some((p) => p.id === v) ? (v as ProtocolId) : DEFAULT_PROTOCOL;
  } catch { return DEFAULT_PROTOCOL; }
};
const subscribeProtocol = (cb: () => void) => { protocolListeners.add(cb); return () => { protocolListeners.delete(cb); }; };
function useProtocol() {
  const value = useSyncExternalStore(subscribeProtocol, readProtocol, () => DEFAULT_PROTOCOL);
  const set = useCallback((p: ProtocolId) => {
    try { localStorage.setItem(STORE_KEY, p); } catch { /* storage blocked: the choice just won't persist */ }
    protocolListeners.forEach((l) => l());
  }, []);
  return [value, set] as const;
}

let clock = 0;
/** The current time, refreshed every second while `ticking`; null on the server so nothing time-based is rendered there. */
function useNow(ticking: boolean): number | null {
  const subscribe = useCallback((cb: () => void) => {
    // Every second while a fast runs; every 30s otherwise, so the "started earlier" limits don't go stale
    const t = setInterval(() => { clock = Date.now(); cb(); }, ticking ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [ticking]);
  return useSyncExternalStore(subscribe, () => clock || (clock = Date.now()), () => null);
}

/** "Mon 8:30 PM" in the viewer's timezone. */
const when = (iso: string | number) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
/** Value for <input type="datetime-local"> (local time, minute precision). */
const localInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

/** Fasting timer: start a fast with a protocol, watch the ring fill, end it; recent fasts below. */
export function FastingCard({ fasts }: { fasts: FastRow[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [protocol, choose] = useProtocol();
  const [earlier, setEarlier] = useState("");
  const [error, setError] = useState("");
  const active = fasts.find((f) => !f.ended_at) ?? null;
  // null on the server: the clock and local-time labels depend on the viewer's device
  const now = useNow(!!active);
  const done = fasts.filter((f) => f.ended_at);
  const recent = done.slice(0, 7);
  const stats = summarize(recent);


  const run = (fn: () => Promise<unknown>, ok?: string) => start(async () => {
    setError("");
    try { await fn(); if (ok) toast({ message: ok }); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
  });

  const begin = () => run(() => unwrap(startFast({
    targetHours: protocolHours(protocol),
    startedAt: earlier ? new Date(earlier).toISOString() : undefined,
  })).then(() => setEarlier("")), "Fast started.");

  function finish(f: FastRow) {
    const p = now === null ? null : fastProgress(Date.parse(f.started_at), now, Number(f.target_hours));
    run(() => unwrap(endFast(f.id)),
      p ? (p.reached ? `Fast complete: ${formatDuration(p.elapsedMs)}.` : `Fast ended early at ${formatDuration(p.elapsedMs)}.`) : "Fast ended.");
  }

  const p = active && now !== null ? fastProgress(Date.parse(active.started_at), now, Number(active.target_hours)) : null;

  return (
    <section className="glass space-y-4 p-4 sm:p-5" aria-label="Fasting">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Fasting</h2>
        <InfoTip label="About fasting">
          Fasting isn&apos;t right for everyone. Skip it if you&apos;re pregnant or nursing, underweight, have diabetes or a
          history of disordered eating, or take medication with food. If in doubt, ask a clinician first. End a fast any
          time you feel unwell.
        </InfoTip>
      </div>

      {active ? (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 128 128" className="size-32 shrink-0" role="img"
            aria-label={p ? `${formatDuration(p.elapsedMs)} fasted of ${Number(active.target_hours)} hours` : "Fast in progress"}>
            <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" stroke="var(--track)" />
            <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" strokeLinecap="round" stroke="var(--accent-fill)"
              strokeDasharray={C} strokeDashoffset={C * (1 - (p?.pct ?? 0))} transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset .6s ease-out" }} />
            <text x="64" y="64" textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--fg)" className="tabular-nums">
              {p ? formatClock(p.elapsedMs) : "–:––:––"}
            </text>
            <text x="64" y="82" textAnchor="middle" fontSize="11" fill="var(--fg-muted)">
              of {Number(active.target_hours)}h goal
            </text>
          </svg>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm" aria-live="polite">
              {p ? (p.reached
                ? <b className="text-accent-fg">Goal reached · +{formatDuration(p.overMs)}</b>
                : <><b className="tabular-nums">{formatDuration(p.remainingMs)}</b> <span className="text-muted">to go</span></>) : " "}
            </p>
            <p className="text-xs text-muted">
              {now !== null && <>Started {when(active.started_at)}<br />Goal {when(Date.parse(active.started_at) + Number(active.target_hours) * 3_600_000)}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn !min-h-11" disabled={pending} onClick={() => finish(active)}>
                <Square className="size-4" aria-hidden="true" />End fast
              </button>
              <button className="btn btn-ghost !min-h-11 !w-11 !p-0" aria-label="Discard this fast" disabled={pending}
                onClick={() => run(() => unwrap(deleteFast(active.id)), "Fast discarded.")}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Segmented label="Fasting window" value={protocol} onChange={choose} options={OPTIONS} />
          <p className="text-sm text-muted">
            {protocol === "24" ? "24 hours, e.g. dinner to dinner." : `Fast ${protocolHours(protocol)} hours, eat within ${24 - protocolHours(protocol)}.`}
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Started earlier?</summary>
            <div className="mt-2">
              <label className="label" htmlFor="fast-start">Start time (up to {MAX_BACKDATE_HOURS} hours ago)</label>
              <input id="fast-start" type="datetime-local" className="input !min-h-11" value={earlier}
                max={now ? localInput(now) : undefined} min={now ? localInput(now - MAX_BACKDATE_HOURS * 3_600_000) : undefined}
                onChange={(e) => setEarlier(e.target.value)} />
            </div>
          </details>
          <button className="btn !min-h-12 w-full" disabled={pending} onClick={begin}>
            <Play className="size-4" aria-hidden="true" />{pending ? "Starting…" : "Start fast"}
          </button>
        </div>
      )}

      {error && <p className="err" role="alert">{error}</p>}

      {now !== null && recent.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="eyebrow">Recent fasts</span>
            <span className="text-xs text-muted">{stats.met} of {stats.count} goals · avg {formatDuration(stats.avgMs)}</span>
          </div>
          <ul className="space-y-1">
            {recent.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-muted">{when(f.started_at)}</span>
                <span className="flex items-center gap-2">
                  <b className="tabular-nums">{formatDuration(durationOf(f) ?? 0)}</b>
                  {metGoal(f)
                    ? <Check className="size-4 text-accent-fg" role="img" aria-label="Goal met" />
                    : <span className="w-4 text-center text-subtle" role="img" aria-label="Ended before goal">–</span>}
                  <button className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
                    aria-label={`Delete fast from ${when(f.started_at)}`} disabled={pending}
                    onClick={() => run(() => unwrap(deleteFast(f.id)), "Fast deleted.")}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
