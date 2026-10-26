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
      {/* Mirrors the dashboard grid: hero + meals beside a rail from lg up */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <div className="hero-card grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="flex items-center gap-6 md:flex-col">
              <div className="size-40 shrink-0 rounded-full bg-track" />
              <div className="flex-1 space-y-3"><div className={`h-4 w-40 ${bar}`} /><div className={`h-12 w-48 ${bar}`} /><div className={`h-4 w-full ${bar}`} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-10 ${bar}`} />)}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="glass h-28" />)}</div>
        </div>
        <div className="space-y-6 max-lg:hidden lg:col-span-5 xl:col-span-4">
          <div className="glass h-56" />
          <div className="glass h-32" />
        </div>
      </div>
    </div>
  );
}
