"use client";
import { Check } from "lucide-react";
import { openLogMeal } from "@/components/quick-fab";

type Step = 1 | 2 | 3;

/** Three-step first-run guide: details -> target -> first log. `done` steps are ticked, `current` is highlighted. */
export function OnboardingSteps({ current, targetKcal }: { current: Step; targetKcal?: number }) {
  const steps = [
    { n: 1 as Step, title: "Your details", body: "Tell us about you so we can calculate your targets." },
    { n: 2 as Step, title: "Your daily target", body: targetKcal ? `${targetKcal.toLocaleString("en-US")} kcal a day, with protein, fiber and carb goals.` : "We calculate this from your details." },
    { n: 3 as Step, title: "Log your first meal", body: "Describe what you ate and we'll estimate it." },
  ];
  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label="Getting started">
      {steps.map((s) => {
        const done = s.n < current, active = s.n === current;
        return (
          <li key={s.n} aria-current={active ? "step" : undefined}
            className={`rounded-xl border p-3 text-sm ${active ? "border-accent bg-accent-soft" : "border-line bg-inset"}`}>
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <span className={`grid size-6 place-items-center rounded-full text-xs ${done ? "bg-accent text-on-accent" : active ? "border-2 border-accent" : "border border-line-strong text-fg-muted"}`}>
                {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : s.n}
              </span>
              {s.title}{done && <span className="sr-only"> (done)</span>}
            </div>
            <p className="text-muted">{s.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Dashboard welcome for a user who has a profile but has never logged a meal. */
export function OnboardingCard({ targetKcal }: { targetKcal: number }) {
  return (
    <section className="glass space-y-4 p-4 sm:p-5" aria-label="Welcome">
      <div>
        <h2 className="text-lg font-bold">Welcome to CalDef</h2>
        <p className="text-sm text-muted">You&apos;re set up. One step left: log your first meal and your day starts adding up.</p>
      </div>
      <OnboardingSteps current={3} targetKcal={targetKcal} />
      <button className="btn" onClick={openLogMeal}>Log your first meal</button>
    </section>
  );
}
