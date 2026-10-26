import "server-only";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";

/** Runs a server action body and turns a thrown error into `{ ok: false, error }`. */
export async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    unstable_rethrow(e); // redirect()/notFound() and other Next control flow must keep propagating
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message || "Invalid input." };
    const message = (e as { message?: unknown } | null)?.message;
    if (typeof message !== "string" || !message) return { ok: false, error: "Something went wrong." };
    console.error("server action failed:", e);
    return { ok: false, error: message };
  }
}
