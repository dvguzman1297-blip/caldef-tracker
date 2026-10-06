"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="glass space-y-3 p-5">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm opacity-80">{error.message || "We couldn't load your data."} Your saved data is not affected.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
