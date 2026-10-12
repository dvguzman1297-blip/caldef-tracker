import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dateLabel } from "@/lib/date";

const step = "btn btn-ghost !h-11 !w-11 !p-0";

/** Context banner: date navigation. */
export function DayHeader({ date, today }: { date: string; today: string }) {
  const isToday = date === today;
  return (
    <header className="glass flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3">
      <div className="flex items-center gap-1">
        <Link href={`/?date=${addDays(date, -1)}`} className={step} aria-label="Previous day">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h2 className="min-w-44 text-center text-xl font-bold" aria-live="polite">{dateLabel(date, today)}</h2>
        {isToday ? (
          <span className={`${step} pointer-events-none opacity-30`} aria-hidden="true">
            <ChevronRight className="size-5" />
          </span>
        ) : (
          <Link href={`/?date=${addDays(date, 1)}`} className={step} aria-label="Next day">
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        )}
        {!isToday && <Link href="/" className="ml-1 text-sm font-medium text-accent-fg underline">Back to today</Link>}
      </div>
    </header>
  );
}
