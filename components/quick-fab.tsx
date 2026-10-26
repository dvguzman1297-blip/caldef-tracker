"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChefHat, Plus, Scale, UtensilsCrossed, X } from "lucide-react";
import { AddMealForm } from "./add-meal-form";
import { WEIGHT_SAVED } from "./weight-form";

const EVENT = "caldef:log-meal";

/** Opens the dashboard's log-meal modal from anywhere (e.g. the empty-state CTA). */
export const openLogMeal = () => window.dispatchEvent(new Event(EVENT));

const WEIGHT_EVENT = "caldef:log-weight";
/** Opens the log-weight dialog from anywhere (e.g. the weight line in the hero). */
export const openLogWeight = () => window.dispatchEvent(new Event(WEIGHT_EVENT));

/**
 * Desktop floating "+" (mobile has the centre button in the bottom nav) plus the
 * log-meal modal it opens. The modal is mounted on all sizes so other CTAs can use it.
 */
export function QuickFab({ date, weight }: { date: string; weight?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const weightDialog = useRef<HTMLDialogElement>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false); // mount the form lazily

  const showLog = () => { setMenu(false); setOpen(true); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();
  const showWeight = () => { setMenu(false); setWeightOpen(true); weightDialog.current?.showModal(); };
  const closeWeight = () => weightDialog.current?.close();

  useEffect(() => {
    window.addEventListener(WEIGHT_SAVED, closeWeight);
    window.addEventListener(WEIGHT_EVENT, showWeight);
    return () => {
      window.removeEventListener(WEIGHT_SAVED, closeWeight);
      window.removeEventListener(WEIGHT_EVENT, showWeight);
    };
  }, []);

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
            {weight && (
              <button className={`${item} !bg-surface-2 !text-fg hover:!bg-line`} onClick={showWeight}>
                <Scale className="size-4" aria-hidden="true" />Log weight
              </button>
            )}
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

      {weight && (
        <dialog ref={weightDialog} className="sheet" aria-label="Log weight" onClose={() => setWeightOpen(false)}
          onClick={(e) => { if (e.target === weightDialog.current) closeWeight(); }}>
          <div className="glass max-h-[90vh] overflow-y-auto p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Log weight</h2>
              <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={closeWeight}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {weightOpen && weight}
          </div>
        </dialog>
      )}
    </>
  );
}
