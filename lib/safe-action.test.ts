import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { redirect } from "next/navigation";

vi.mock("server-only", () => ({}));

import { safe } from "./safe-action";
import { unwrap } from "./action-result";

describe("safe", () => {
  it("wraps a return value", async () => {
    expect(await safe(async () => 3)).toEqual({ ok: true, data: 3 });
  });

  it("keeps the message of a thrown Error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await safe(async () => { throw new Error("Can't log meals in the future"); }))
      .toEqual({ ok: false, error: "Can't log meals in the future" });
  });

  it("uses the first zod issue as the message", async () => {
    const r = await safe(async () => z.object({ kg: z.number().min(20, "Too light") }).parse({ kg: 5 }));
    expect(r).toEqual({ ok: false, error: "Too light" });
  });

  it("falls back for non-Error throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await safe(async () => { throw null; })).toEqual({ ok: false, error: "Something went wrong." });
  });

  it("lets Next redirects propagate", async () => {
    await expect(safe(async () => redirect("/login"))).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});

describe("unwrap", () => {
  it("returns data on success", async () => {
    expect(await unwrap(Promise.resolve({ ok: true as const, data: 7 }))).toBe(7);
  });
  it("throws the server's message on failure", async () => {
    await expect(unwrap(Promise.resolve({ ok: false as const, error: "nope" }))).rejects.toThrow("nope");
  });
});
