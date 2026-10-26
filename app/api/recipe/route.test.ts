import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const askJson = vi.hoisted(() => vi.fn());
const consumeAiQuota = vi.hoisted(() => vi.fn());
const profile = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

// from("health_metrics") and from("profiles") each resolve to a canned row through maybeSingle()/single()
const query = (row: unknown) => {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.maybeSingle = async () => ({ data: row, error: null });
  q.single = async () => ({ data: row, error: null });
  return q;
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: (t: string) => query(t === "profiles" ? profile.value : { id: "m" }),
  }),
}));
vi.mock("@/lib/day", () => ({
  getDay: async () => ({ totals: { calories: 500, protein: 30, fiber: 5, netCarbs: 50, fat: 15 } }),
  targetsOf: () => ({ calories: 2000, protein: 150, fiber: 30, netCarbs: 150, fat: 65 }),
}));
vi.mock("@/lib/today", () => ({ getToday: async () => "2026-10-26" }));
vi.mock("@/lib/groq-json", () => ({ askJson }));
vi.mock("@/lib/ai-quota", () => ({ consumeAiQuota, QUOTA_MESSAGE: "limit reached" }));

import { POST } from "./route";

const call = (body: unknown = { pantry: "chicken, rice, broccoli" }) =>
  POST(new Request("http://x/api/recipe", { method: "POST", body: JSON.stringify(body) }));
const recipe = (ingredients: string[]) => ({
  title: "Bowl", prepTimeMinutes: 20,
  macros: { calories: 520, protein: 45, fiber: 6, netCarbs: 40, fat: 18 },
  ingredients, steps: ["Cook everything.", "Serve."], ingredientMatchPct: 90,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  consumeAiQuota.mockResolvedValue(true);
  profile.value = { dietary_preferences: [], allergens: ["peanuts"] };
});

describe("POST /api/recipe", () => {
  it("401s when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await call()).status).toBe(401);
    expect(askJson).not.toHaveBeenCalled();
  });

  it("400s on invalid input", async () => {
    expect((await call({ pantry: "x" })).status).toBe(400);
  });

  it("429s over quota without calling the model", async () => {
    consumeAiQuota.mockResolvedValue(false);
    expect((await call()).status).toBe(429);
    expect(askJson).not.toHaveBeenCalled();
  });

  it("returns a clean recipe on the first try", async () => {
    askJson.mockResolvedValue(recipe(["chicken", "rice"]));
    const res = await call();
    expect(res.status).toBe(200);
    expect(askJson).toHaveBeenCalledTimes(1);
    expect((await res.json()).recipe.title).toBe("Bowl");
  });

  it("retries once, naming the allergen, when the first recipe contains it", async () => {
    askJson
      .mockResolvedValueOnce(recipe(["chicken", "peanut sauce"]))
      .mockResolvedValueOnce(recipe(["chicken", "rice"]));
    const res = await call();
    expect(res.status).toBe(200);
    expect(askJson).toHaveBeenCalledTimes(2);
    expect(askJson.mock.calls[1][1]).toMatch(/allergic/i);
  });

  it("refuses with 422 when the retry still contains the allergen", async () => {
    askJson.mockResolvedValue(recipe(["chicken", "peanut sauce"]));
    const res = await call();
    expect(res.status).toBe(422);
    expect(askJson).toHaveBeenCalledTimes(2);
  });

  it("502s when the model output is not a valid recipe", async () => {
    askJson.mockResolvedValue({ title: "Bowl" });
    expect((await call()).status).toBe(502);
  });
});
