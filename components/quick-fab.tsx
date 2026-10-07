"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChefHat, Plus, UtensilsCrossed, X } from "lucide-react";
import { AddMealForm } from "./add-meal-form";

const EVENT = "caldef:log-meal";

/** Opens the dashboard's log-meal modal from anywhere (e.g. the empty-state CTA). */
export const openLogMeal = () => window.dispatchEvent(new Event(EVENT));

/**
 * Desktop floating "+" (mobile has the centre button in the bottom nav) plus the
 * log-meal modal it opens. The modal is mounted on all sizes so other CTAs can use it.
 */
export function QuickFab({ date }: { date: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false); // mount the form lazily

  const showLog = () => { setMenu(false); setOpen(true); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();

  useEffect(() => {
    window.addEventListener(EVENT, showLog);
    return () => window.removeEventListener(EVENT, showLog);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [menu]);

  const item = "btn !justify-start !px-4 !py-2.5 shadow-lg";
  return (
    <>
      <div ref={root} className="fixed bottom-6 right-6 z-20 hidden flex-col items-end gap-2 md:flex">
        {menu && (
          <div id="quick-fab-menu" className="flex flex-col items-end gap-2">
            <Link href="/recipes" className={`${item} !bg-surface-2 !text-fg hover:!bg-line`}>
              <ChefHat className="size-4" aria-hidden="true" />Generate recipe
            </Link>
            <button className={item} onClick={showLog}>
              <UtensilsCrossed className="size-4" aria-hidden="true" />Log meal
            </button>
          </div>
        )}
        <button aria-label={menu ? "Close quick actions" : "Quick actions"} aria-expanded={menu}
          aria-controls="quick-fab-menu" onClick={() => setMenu((m) => !m)}
          className="btn !size-14 !rounded-full !p-0 shadow-xl">
          {menu ? <X className="size-6" aria-hidden="true" /> : <Plus className="size-7" aria-hidden="true" />}
        </button>
      </div>

      <dialog ref={dialog} className="sheet" aria-label="Log a meal" onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <div className="glass max-h-[90vh] overflow-y-auto p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Log a meal</h2>
            <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={close}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {open && <AddMealForm date={date} onDone={close} />}
        </div>
      </dialog>
    </>
  );
}
