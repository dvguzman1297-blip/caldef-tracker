/** Shown while any signed-in page streams in: same shell as PageShell so nothing jumps. */
export default function Loading() {
  const bar = "rounded bg-track";
  return (
    <div className="mx-auto max-w-page animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className={`h-8 w-56 ${bar}`} />
          <div className={`h-4 w-80 max-w-full ${bar}`} />
        </div>
        <div className={`h-11 w-64 ${bar}`} />
      </div>
      {/* Mirrors the dashboard grid: hero | log, then meals | fasting from lg up */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="hero-card grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center lg:col-span-7 xl:col-span-8">
          <div className="flex items-center gap-6 md:flex-col">
            <div className="size-40 shrink-0 rounded-full bg-track" />
            <div className="flex-1 space-y-3"><div className={`h-4 w-40 ${bar}`} /><div className={`h-12 w-48 ${bar}`} /><div className={`h-4 w-full ${bar}`} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-10 ${bar}`} />)}</div>
        </div>
        <div className="glass h-56 max-lg:hidden lg:col-span-5 lg:h-auto xl:col-span-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-7 xl:col-span-8">{[0, 1].map((i) => <div key={i} className="glass h-28" />)}</div>
        <div className="glass h-40 max-lg:hidden lg:col-span-5 xl:col-span-4" />
      </div>
    </div>
  );
}
