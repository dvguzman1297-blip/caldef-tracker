"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { openLogMeal } from "./quick-fab";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

export type MacroStat = {
  id: "protein" | "carbs" | "fat" | "fiber"; label: string; value: number; target: number;
  /** Going past the target is a problem (carbs, fat) rather than a bonus (protein, fiber). */
  overIsBad?: boolean;
};

const COLOR = { protein: "var(--m-protein)", carbs: "var(--m-carbs)", fat: "var(--m-fat)", fiber: "var(--m-fiber)" } as const;

type Props = { calories: { value: number; target: number }; macros: MacroStat[]; isEmpty: boolean };

/** Hero calorie gauge (remaining is the headline number) with per-macro progress bars. */
export function MacroSummary({ calories, macros, isEmpty }: Props) {
  return (
    <section className="hero-card space-y-5 p-4 sm:p-6" aria-label="Daily nutrition summary">
      <CalorieHero {...calories} isEmpty={isEmpty} />
      <ul className="grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
        {macros.map((m) => <MacroBar key={m.id} {...m} />)}
      </ul>
    </section>
  );
}

function CalorieHero({ value, target, isEmpty }: { value: number; target: number; isEmpty: boolean }) {
  const reduce = useReducedMotion();
  const r = 52, c = 2 * Math.PI * r;
  const pct = target > 0 ? value / target : 0;
  const left = Math.round(target - value);
  const over = left < 0;
  const stroke = over ? "var(--danger)" : "var(--accent)";

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <svg width="176" height="176" viewBox="0 0 128 128" className="shrink-0" role="img"
        aria-label={`${n(Math.abs(left))} kilocalories ${over ? "over" : "left"} of ${n(target)}`}>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" stroke="var(--track)" />
        <motion.circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={stroke} strokeDasharray={c} transform="rotate(-90 64 64)"
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(pct, 1)) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }} />
        <text x="64" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--fg)">{n(Math.abs(left))}</text>
        <text x="64" y="82" textAnchor="middle" fontSize="12" fill="var(--fg-muted)">{over ? "kcal over" : "kcal left"}</text>
      </svg>
      <div className="w-full flex-1 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Calories remaining</p>
        <p className="text-4xl font-bold tabular-nums sm:text-5xl" aria-live="polite" aria-atomic="true">
          {n(Math.abs(left))}<span className="ml-1 text-base font-medium text-muted">{over ? "kcal over" : "kcal"}</span>
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Eaten" value={n(value)} />
          <Stat label="Goal" value={n(target)} />
          <Stat label="Progress" value={`${Math.round(pct * 100)}%`} />
        </dl>
        {isEmpty && (
          <button className="btn mt-4 w-full sm:w-auto" onClick={openLogMeal}>
            <Plus className="size-4" aria-hidden="true" />Log your first meal
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function MacroBar({ id, label, value, target, overIsBad = false }: MacroStat) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? value / target : 0;
  const left = Math.round(target - value);
  const over = left < 0;
  const bad = over && overIsBad;
  const status = !over ? `${n(left)}g left` : overIsBad ? `${n(-left)}g over` : "Goal reached";
  const color = bad ? "var(--danger)" : COLOR[id];

  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
          {label}
          {id === "carbs" && (
            <InfoTip label="What are net carbs?">
              Net carbs are total carbs minus fiber: the carbs your body actually digests. CalDef tracks net carbs, so
              the carb number on a nutrition label will look higher than what you see here.
            </InfoTip>
          )}
        </span>
        <span className="text-muted"><b className="text-fg tabular-nums">{n(value)}</b> / {n(target)}g</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-label={`${label} progress`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.round(pct * 100), 100)}
        aria-valuetext={`${n(value)} of ${n(target)} grams, ${status}`}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 1) * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }} />
      </div>
      <p className={`mt-1 text-xs ${bad ? "font-semibold text-danger" : "text-muted"}`}>{status}</p>
    </li>
  );
}
