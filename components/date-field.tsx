"use client";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/date";

/** Native date picker (ISO value) with a readable label ("Wed, Oct 7"). Navigates on change; no submit button. */
export function DateField({ value, today, basePath }: { value: string; today: string; basePath: string }) {
  const router = useRouter();
  return (
    <div>
      <label className="label" htmlFor="date-field">Jump to date</label>
      <div className="flex items-center gap-2">
        <input id="date-field" type="date" value={value} max={today} className="input !w-auto"
          onChange={(e) => { if (e.target.value) router.push(`${basePath}?date=${e.target.value}`); }} />
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays className="size-4" aria-hidden="true" />{formatDate(value, today)}
        </span>
      </div>
    </div>
  );
}
