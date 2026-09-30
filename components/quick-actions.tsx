"use client";
import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";

export function QuickActions() {
  function openLog() {
    const d = document.getElementById("add-meal") as HTMLDetailsElement | null;
    if (!d) return;
    d.open = true;
    d.scrollIntoView({ behavior: "smooth", block: "center" });
    (d.querySelector("input") as HTMLInputElement | null)?.focus({ preventScroll: true });
  }
  return (
    <section className="glass p-4" aria-label="Quick actions">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-70">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={openLog}><Plus className="size-4" />Log meal</button>
        <Link href="/recipes" className="btn btn-ghost"><ChefHat className="size-4" />Generate recipe</Link>
      </div>
    </section>
  );
}