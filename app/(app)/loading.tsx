/** Shown while any signed-in page streams in: same shell as PageShell so nothing jumps. */
export default function Loading() {
  const bar = "rounded bg-track";
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className={`h-8 w-56 ${bar}`} />
        <div className={`h-4 w-80 max-w-full ${bar}`} />
      </div>
      <div className="glass h-16" />
      <div className="hero-card space-y-4 p-6">
        <div className="flex items-center gap-6">
          <div className="size-40 shrink-0 rounded-full bg-track" />
          <div className="flex-1 space-y-3"><div className={`h-4 w-40 ${bar}`} /><div className={`h-12 w-48 ${bar}`} /><div className={`h-4 w-full ${bar}`} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-10 ${bar}`} />)}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="glass h-28" />)}</div>
    </div>
  );
}
