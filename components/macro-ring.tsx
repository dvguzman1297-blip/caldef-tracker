"use client";
import { motion } from "framer-motion";

export function MacroRing({ label, value, target, unit, color }:
  { label: string; value: number; target: number; unit: string; color: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const left = Math.round(target - value);
  return (
    <div className="glass flex flex-col items-center p-4">
      <svg width="92" height="92" viewBox="0 0 88 88" role="img"
        aria-label={`${label}: ${Math.round(value)} of ${target} ${unit}`}>
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" stroke="currentColor" opacity=".1" />
        <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={color} strokeDasharray={c} transform="rotate(-90 44 44)"
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
        <text x="44" y="49" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
          {Math.round(value)}
        </text>
      </svg>
      <div className="mt-2 text-sm font-semibold">{label}</div>
      <div className="text-xs opacity-70">
        {left >= 0 ? `${left}${unit} left` : `${-left}${unit} over`} · goal {target}{unit}
      </div>
    </div>
  );
}
