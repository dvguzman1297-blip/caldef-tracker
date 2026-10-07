"use client";
import { useId } from "react";

type Option<T extends string> = { value: T; label: string };

/**
 * Segmented single-choice control built on native radios (arrow keys and form semantics for free).
 * Each segment is at least 44px tall and the whole segment is the hit area.
 */
export function Segmented<T extends string>({ label, value, onChange, options, className = "" }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly Option<T>[]; className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className="label">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line-strong bg-inset p-1">
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer">
            <input type="radio" name={name} value={o.value} checked={value === o.value}
              onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
