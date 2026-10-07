"use client";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";

export function PrivacyPanel() {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="glass space-y-4 p-5 text-sm" aria-labelledby="privacy-h">
      <h2 id="privacy-h" className="text-lg font-bold">Privacy &amp; your data</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Meal descriptions and pantry lists you submit for AI estimates or recipes are sent to a third-party AI provider (Groq) to generate the result. Your name and email are not sent; your dietary preferences and allergens are included with recipe requests.</li>
        <li>Administrators of this app can view user profiles and logged meals for support and operations.</li>
        <li>Health-check answers on the profile form (pregnancy, eating-disorder risk, medical conditions) are never stored, only the targets calculated from them.</li>
        <li>CalDef gives general estimates, not medical advice.</li>
      </ul>
      <div>
        <a className="btn btn-ghost" href="/api/export" download>Download my data (JSON)</a>
      </div>
      <details className="rounded-xl border border-rose-500/40 p-3">
        <summary className="cursor-pointer font-semibold text-rose-600 dark:text-rose-400">Delete my account</summary>
        <p className="mt-2 text-muted">This permanently deletes your account and all your data. It can&apos;t be undone. Download your data first if you want a copy.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div><label className="label" htmlFor="confirmDelete">Type DELETE to confirm</label>
            <input id="confirmDelete" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" /></div>
          <button className="btn !bg-rose-600" disabled={text !== "DELETE" || pending}
            onClick={() => start(async () => {
              setErr("");
              try { await deleteAccount(text); } catch (e: any) {
                if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
                setErr(e.message || "Could not delete account.");
              }
            })}>{pending ? "Deleting…" : "Delete account"}</button>
        </div>
        {err && <p className="err mt-2" role="alert">{err}</p>}
      </details>
    </section>
  );
}
