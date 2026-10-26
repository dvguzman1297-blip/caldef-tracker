"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

const POPOVER_PX = 256; // w-64

/** Small "i" button that toggles an explanatory popover. Closes on Escape or an outside click. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Which edge of the button the popover lines up with; chosen when it opens so it never runs off the screen
  const [align, setAlign] = useState<"left" | "right">("left");
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <span ref={root} className="relative inline-flex">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={(e) => {
          const room = window.innerWidth - e.currentTarget.getBoundingClientRect().left;
          setAlign(room < POPOVER_PX + 16 ? "right" : "left");
          setOpen((o) => !o);
        }}
        className="grid size-6 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg">
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <span id={id} role="note"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line-strong bg-surface-2 p-3 text-sm font-normal normal-case tracking-normal text-fg shadow-xl`}>
          {children}
        </span>
      )}
    </span>
  );
}
