/**
 * Server actions return their outcome instead of throwing: in production Next replaces the message of
 * any error thrown from a server action with a generic one, so the user would never see why it failed.
 * Server side wraps with `safe` (lib/safe-action.ts); client side unwraps with `unwrap` and keeps its try/catch.
 */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Awaits a server action's result; returns its data, or throws an Error carrying the server's message. */
export async function unwrap<T>(result: Promise<ActionResult<T>>): Promise<T> {
  const r = await result;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
