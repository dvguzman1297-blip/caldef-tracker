import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const askJson = vi.hoisted(() => vi.fn());
const consumeAiQuota = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/groq-json", () => ({ askJson }));
vi.mock("@/lib/ai-quota", () => ({ consumeAiQuota, QUOTA_MESSAGE: "limit reached" }));

import { POST } from "./route";

const call = (body: unknown) =>
  POST(new Request("http://x/api/estimate-meal", { method: "POST", body: JSON.stringify(body) }));
const good = { title: "Chicken rice", calories: 600, protein: 40, fiber: 4, netCarbs: 60, fat: 18 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  consumeAiQuota.mockResolvedValue(true);
});

describe("POST /api/estimate-meal", () => {
  it("401s when signed out, without spending quota or calling the model", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await call({ description: "chicken rice" })).status).toBe(401);
    expect(consumeAiQuota).not.toHaveBeenCalled();
    expect(askJson).not.toHaveBeenCalled();
  });

  it("400s on a too-short description before spending quota", async () => {
    expect((await call({ description: "hi" })).status).toBe(400);
    expect(consumeAiQuota).not.toHaveBeenCalled();
  });

  it("429s when over the daily quota and never calls the model", async () => {
    consumeAiQuota.mockResolvedValue(false);
    const res = await call({ description: "chicken rice" });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("limit reached");
    expect(askJson).not.toHaveBeenCalled();
  });

  it("returns the estimate", async () => {
    askJson.mockResolvedValue(good);
    const res = await call({ description: "chicken rice" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meal.title).toBe("Chicken rice");
    expect(json.source).toBe("ai_estimate");
  });

  it("502s when the model returns an implausible estimate", async () => {
    askJson.mockResolvedValue({ ...good, calories: 90000 });
    expect((await call({ description: "chicken rice" })).status).toBe(502);
  });

  it("502s when the model output has the wrong shape", async () => {
    askJson.mockResolvedValue({ title: "x" });
    expect((await call({ description: "chicken rice" })).status).toBe(502);
  });
});
