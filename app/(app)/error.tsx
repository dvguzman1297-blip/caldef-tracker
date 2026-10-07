"use client";
import Link from "next/link";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="glass mx-auto max-w-lg space-y-3 p-6">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted">
        We couldn&apos;t load this page. Your saved data is not affected, and trying again usually works.
      </p>
      {error.message && <p className="rounded-lg bg-inset p-3 text-sm text-muted">Details: {error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={reset}>Try again</button>
        <Link href="/" className="btn btn-ghost">Back to dashboard</Link>
      </div>
    </div>
  );
}
