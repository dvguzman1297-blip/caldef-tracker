"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export const rowMenuItem =
  "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50";

/** Small "more actions" popover for list rows: closes on Escape, outside tap, or after choosing an item. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" className="grid size-11 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2 aria-expanded:text-fg" aria-label={label} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} onClick={() => setOpen(false)}
          className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}
