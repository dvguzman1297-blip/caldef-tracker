"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { openLogMeal } from "./quick-fab";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

export type MacroStat = {
  id: string; label: string; value: number; target: number;
  /** Going past the target is a problem (carbs, fat) rather than a bonus (protein, fiber). */
  overIsBad?: boolean;
};

type Props = { calories: { value: number; target: number }; macros: MacroStat[]; isEmpty: boolean };

/** Hero calorie gauge + compact macro bars. Collapses to one inviting CTA when nothing is logged. */
export function MacroSummary({ calories, macros, isEmpty }: Props) {
  return (
    <section className="glass space-y-5 p-4 sm:p-6" aria-label="Daily nutrition summary">
      {isEmpty ? <EmptyHero target={calories.target} macros={macros} /> : (
        <>
          <CalorieHero {...calories} />
          <ul className="grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
            {macros.map((m) => <MacroBar key={m.id} {...m} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function EmptyHero({ target, macros }: { target: number; macros: MacroStat[] }) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Daily goal</p>
        <p className="text-3xl font-bold">{n(target)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="mt-1 text-sm text-muted">Nothing logged yet. Your first meal starts today&apos;s tracking.</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Macro goals">
          {macros.map((m) => (
            <li key={m.id} className="pill">{m.label} <b className="text-fg">{n(m.target)}g</b></li>
          ))}
        </ul>
      </div>
      <button className="btn shrink-0 !px-5 !py-3" onClick={openLogMeal}>
        <Plus className="size-4" aria-hidden="true" />Log first meal
      </button>
    </div>
  );
}

function CalorieHero({ value, target }: { value: number; target: number }) {
  const reduce = useReducedMotion();
  const r = 52, c = 2 * Math.PI * r;
  const pct = target > 0 ? value / target : 0;
  const left = Math.round(target - value);
  const over = left < 0;
  const stroke = over ? "var(--danger)" : "var(--accent)";
  const dur = reduce ? 0 : 0.9;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <svg width="168" height="168" viewBox="0 0 128 128" className="shrink-0" role="img"
        aria-label={`Calories: ${n(value)} of ${n(target)} kcal`}>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" stroke="var(--track)" />
        <motion.circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={stroke} strokeDasharray={c} transform="rotate(-90 64 64)"
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(pct, 1)) }}
          transition={{ duration: dur, ease: "easeOut" }} />
        <text x="64" y="62" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--fg)">{n(Math.abs(left))}</text>
        <text x="64" y="80" textAnchor="middle" fontSize="11" fill="var(--fg-muted)">{over ? "kcal over" : "kcal left"}</text>
      </svg>
      <dl className="grid w-full flex-1 grid-cols-3 gap-3 text-center sm:text-left">
        <Stat label="Eaten" value={n(value)} />
        <Stat label="Goal" value={n(target)} />
        <Stat label="Progress" value={`${Math.round(pct * 100)}%`} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

function MacroBar({ label, value, target, overIsBad = false }: MacroStat) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? value / target : 0;
  const left = Math.round(target - value);
  const over = left < 0;
  const bad = over && overIsBad;
  const status = !over ? `${n(left)}g left` : overIsBad ? `${n(-left)}g over` : "Goal reached";

  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted"><b className="text-fg">{n(value)}</b> / {n(target)}g</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-track" role="progressbar" aria-label={`${label} progress`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.round(pct * 100), 100)}
        aria-valuetext={`${n(value)} of ${n(target)} grams, ${status}`}>
        <motion.div className="h-full rounded-full" style={{ background: bad ? "var(--danger)" : "var(--accent)" }}
          initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 1) * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }} />
      </div>
      <p className={`mt-1 text-xs ${bad ? "font-semibold text-danger" : "text-muted"}`}>{status}</p>
    </li>
  );
}
