import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/today", () => ({ getToday: async () => "2026-10-26" }));

import { insertMealRows } from "./meal-store";

const inserted = vi.fn();
const upserted = vi.fn();
const supabase = {
  from: (t: string) => t === "daily_logs"
    ? { upsert: (row: unknown) => { upserted(row); return { select: () => ({ single: async () => ({ data: { id: "log1" }, error: null }) }) }; } }
    : { insert: async (rows: unknown) => { inserted(rows); return { error: null }; } },
} as never;

const meal = (title: string) => ({ slot: "lunch", title, calories: 400, protein: 30, fiber: 5, netCarbs: 30, fat: 10 });

beforeEach(() => { inserted.mockClear(); upserted.mockClear(); });

describe("insertMealRows", () => {
  it("creates the day's log once and inserts every meal in one statement", async () => {
    await insertMealRows(supabase, "u1", "2026-10-25", [meal("a"), meal("b")]);
    expect(upserted).toHaveBeenCalledTimes(1);
    expect(inserted).toHaveBeenCalledTimes(1);
    const rows = inserted.mock.calls[0][0] as { title: string; daily_log_id: string; user_id: string }[];
    expect(rows.map((r) => r.title)).toEqual(["a", "b"]);
    expect(rows.every((r) => r.daily_log_id === "log1" && r.user_id === "u1")).toBe(true);
  });

  it("does nothing for an empty list", async () => {
    await insertMealRows(supabase, "u1", "2026-10-25", []);
    expect(upserted).not.toHaveBeenCalled();
  });

  it("rejects future dates before touching the database", async () => {
    await expect(insertMealRows(supabase, "u1", "2026-10-27", [meal("a")])).rejects.toThrow("future");
    expect(upserted).not.toHaveBeenCalled();
  });

  it("writes nothing if any meal is invalid", async () => {
    await expect(insertMealRows(supabase, "u1", "2026-10-25", [meal("a"), { ...meal("b"), calories: -1 }])).rejects.toThrow();
    expect(inserted).not.toHaveBeenCalled();
  });
});
