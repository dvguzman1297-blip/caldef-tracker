"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

/** Disclosure menu for account actions. Log out lives here, away from the theme toggle. */
export function AccountMenu({ trigger, label, children, onSignOut, align = "right" }: {
  trigger: ReactNode; label: string; children: ReactNode; onSignOut: () => void; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const path = usePathname();

  // Close when navigating to another route
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button className="btn btn-ghost !min-h-11 !gap-1.5 !px-3" aria-label={label} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        {trigger}<ChevronDown className="size-4 text-fg-muted" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className={`absolute top-full z-30 mt-2 w-56 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
          {children}
          <div className="my-1 h-px bg-line" role="separator" />
          <button onClick={onSignOut}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-soft">
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />Log out
          </button>
        </div>
      )}
    </div>
  );
}

export const menuItemClass =
  "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface";
