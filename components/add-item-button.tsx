"use client";
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { AddMealForm } from "./add-meal-form";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";

/** "+ Add item" for a meal card: opens a modal with the log form preset to this slot and day. */
export function AddItemButton({ slot, date }: { slot: Slot; date: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false); // mount the form lazily so closed dialogs cost no requests
  const close = () => ref.current?.close();
  return (
    <>
      <button className="btn btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => { setOpen(true); ref.current?.showModal(); }}
        aria-label={`Add item to ${slot}`}>
        <Plus className="size-3.5" aria-hidden="true" />Add item
      </button>
      {/* showModal() gives focus trapping, Esc to close and an inert background for free */}
      <dialog ref={ref} className="sheet" onClose={() => setOpen(false)} aria-label={`Add item to ${slot}`}
        onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div className="glass max-h-[90vh] overflow-y-auto p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold capitalize">Add to {slot}</h2>
            <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={close}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {open && <AddMealForm slot={slot} date={date} onDone={close} />}
        </div>
      </dialog>
    </>
  );
}
