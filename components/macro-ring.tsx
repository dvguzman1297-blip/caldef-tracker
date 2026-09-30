"use client";
import { motion } from "framer-motion";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

type Props = {
  label: string; value: number; target: number; unit: "kcal" | "g";
  color: string; overIsBad?: boolean; hero?: boolean;
};

export function MacroRing({ label, value, target, unit, color, overIsBad = false, hero = false }: Props) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = target > 0 ? value / target : 0;
  const left = Math.round(target - value);
  const over = left < 0;
  const stroke = over && overIsBad ? "#f43f5e" : color;
  const fmt = (v: number) => (unit === "g" ? `${n(v)}g` : `${n(v)} kcal`);
  const status = !over ? `${fmt(left)} left` : overIsBad ? `${fmt(-left)} over` : "Goal reached";
  const size = hero ? 136 : 84;

  return (
    <div className={`glass p-4 ${hero ? "sm:p-6" : ""}`}>
      <div className={`flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left ${hero ? "sm:gap-8" : "sm:gap-4"}`}>
        <svg width={size} height={size} viewBox="0 0 88 88" className="shrink-0" role="img"
          aria-label={`${label}: ${fmt(value)} of ${fmt(target)}`}>
          <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" stroke="currentColor" opacity=".1" />
          <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
            stroke={stroke} strokeDasharray={c} transform="rotate(-90 44 44)"
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(pct, 1)) }}
            transition={{ duration: 0.9, ease: "easeOut" }} />
          <text x="44" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{n(value)}</text>
          <text x="44" y="59" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".65">{unit}</text>
        </svg>

        <div className="w-full min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
          <div className={`font-bold ${hero ? "text-3xl" : "text-lg"}`}>
            {fmt(value)}<span className="text-sm font-medium opacity-70"> eaten</span>
          </div>
          <div className="mt-0.5 text-xs opacity-80 sm:text-sm">{status} · {fmt(target)} goal</div>

          {hero && (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={Math.min(Math.round(pct * 100), 100)}>
                <motion.div className="h-full rounded-full" style={{ background: stroke }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 1) * 100}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }} />
              </div>
              <div className="mt-1 text-right text-xs opacity-70">{Math.round(pct * 100)}%</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}