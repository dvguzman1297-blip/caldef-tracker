"use client";

/** Last-resort boundary: renders when the root layout itself fails, so it brings its own <html>. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0b0f19", color: "#e8ecf5", margin: 0 }}>
        <main id="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}>
          <div role="alert" style={{ maxWidth: 440, background: "#161c2e", border: "1px solid #2a3350", borderRadius: 16, padding: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>CalDef hit a problem</h1>
            <p style={{ margin: "0 0 16px", color: "#a3aec2", fontSize: 15, lineHeight: 1.5 }}>
              Something went wrong on our side. Your saved data is safe. Please try again.
            </p>
            <button onClick={reset} style={{ background: "#10b981", color: "#04231a", border: 0, borderRadius: 12, padding: "12px 20px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
