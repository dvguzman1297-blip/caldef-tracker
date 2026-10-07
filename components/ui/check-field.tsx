"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";

/** Styled checkbox where the whole row is the label and the hit area (min 44px). */
export const CheckField = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & { children: ReactNode }>(
  function CheckField({ children, ...rest }, ref) {
    return (
      <label className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-inset px-3 py-2 text-sm hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
        <input ref={ref} type="checkbox" className="peer sr-only" {...rest} />
        <span aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-md border-2 border-line-strong bg-surface text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">{children}</span>
      </label>
    );
  },
);
