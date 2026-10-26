"use client";
import { useRef, useState, useTransition } from "react";
import { CalendarClock, X } from "lucide-react";
import { saveFastingSchedule } from "@/app/actions/fasting";
import { unwrap } from "@/lib/action-result";
import { PROTOCOLS } from "@/lib/fasting";
import { ALL_DAYS, DAY_LABELS, type Schedule } from "@/lib/fasting-schedule";
import { useToast } from "@/components/toast";
import { Segmented } from "@/components/ui/segmented";

const OPTIONS = PROTOCOLS.map((p) => ({ value: p.id, label: p.label }));
const idForHours = (h: number) => PROTOCOLS.find((p) => p.hours === h)?.id ?? "16:8";
const hoursForId = (id: string) => PROTOCOLS.find((p) => p.id === id)?.hours ?? 16;

/** "8:00 PM" from "20:00" (display only; the input itself is a native time field). */
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
/** The end time of a fast starting at `hhmm` and lasting `hours`, with "+1 day" style suffix. */
const endLabel = (hhmm: string, hours: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const dayOffset = Math.floor(total / 1440);
  const t = total % 1440;
  const when = clock(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  return dayOffset === 0 ? `${when} the same day` : dayOffset === 1 ? `${when} the next day` : `${when} (${dayOffset} days later)`;
};

/** Gear button that opens the schedule settings in a dialog. */
export function FastingScheduleButton({ schedule }: { schedule: Schedule | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false); // mount the form lazily so it starts from the latest saved values each time
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className="btn btn-ghost !h-9 !w-9 !p-0" aria-label="Fasting schedule"
        onClick={() => { setOpen(true); ref.current?.showModal(); }}>
        <CalendarClock className="size-4" aria-hidden="true" />
      </button>
      <dialog ref={ref} className="sheet" aria-label="Fasting schedule" onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div className="glass max-h-[90vh] overflow-y-auto p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Fasting schedule</h2>
            <button className="btn btn-ghost !h-11 !w-11 !p-0" aria-label="Close" onClick={close}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {open && <ScheduleForm initial={schedule} onDone={close} />}
        </div>
      </dialog>
    </>
  );
}

function ScheduleForm({ initial, onDone }: { initial: Schedule | null; onDone: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [time, setTime] = useState(initial?.start_time ?? "20:00");
  const [protocol, setProtocol] = useState(idForHours(initial?.hours ?? 16));
  const [days, setDays] = useState<number[]>(initial?.days ?? ALL_DAYS);
  const [error, setError] = useState("");

  const hours = hoursForId(protocol);
  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        await unwrap(saveFastingSchedule({ enabled, startTime: time, hours, days }));
        toast({ message: enabled ? "Fasting schedule saved." : "Automatic fasting is off." });
        onDone();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <label className="flex items-start gap-3 rounded-xl bg-inset p-3">
        <input type="checkbox" className="mt-1 size-4" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="text-sm">
          <b>Start my fast automatically</b>
          <span className="block text-muted">When you open CalDef it catches up: the fast shows as started (and ended) at the scheduled times.</span>
        </span>
      </label>

      <fieldset disabled={!enabled} className="space-y-4 disabled:opacity-50">
        <div>
          <label className="label" htmlFor="fs-time">Fast starts at</label>
          <input id="fs-time" type="time" required className="input !min-h-11 !w-40" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <Segmented label="Fast for" value={protocol} onChange={setProtocol} options={OPTIONS} />
        <p className="text-sm text-muted">
          {time ? <>Starts {clock(time)}, ends {endLabel(time, hours)}.</> : "Pick a start time."}
        </p>
        <fieldset>
          <legend className="label">Days a fast starts</legend>
          <div className="flex flex-wrap gap-1.5" role="group">
            {DAY_LABELS.map((l, d) => (
              <button key={l} type="button" aria-pressed={days.includes(d)} onClick={() => toggle(d)}
                className={`min-h-11 min-w-12 rounded-xl px-2 text-sm font-medium transition-colors ${
                  days.includes(d) ? "bg-accent-soft font-semibold text-accent-fg" : "bg-surface-2 text-fg-muted hover:bg-line"}`}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <p className="text-xs text-muted">
        Starting, ending or deleting a fast yourself always wins over the schedule. Times use this device&apos;s timezone.
      </p>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn !min-h-11 flex-1" disabled={pending || (enabled && (!time || days.length === 0))}>
          {pending ? "Saving…" : "Save schedule"}
        </button>
        <button type="button" className="btn btn-ghost !min-h-11" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
