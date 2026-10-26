import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
vi.mock("groq-sdk", () => ({
  default: class { chat = { completions: { create } }; },
}));

import { askJson, extractJson } from "./groq-json";

const reply = (content: string) => ({ choices: [{ message: { content } }] });

describe("extractJson", () => {
  it("pulls the object out of prose and code fences", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow("no JSON");
  });
});

describe("askJson", () => {
  beforeEach(() => create.mockReset());

  it("uses strict JSON mode first", async () => {
    create.mockResolvedValueOnce(reply('{"ok":true}'));
    expect(await askJson("s", "u")).toEqual({ ok: true });
    expect(create.mock.calls[0][0].response_format).toEqual({ type: "json_object" });
  });

  it("retries without strict mode when Groq rejects it with a 400", async () => {
    create.mockRejectedValueOnce(Object.assign(new Error("bad"), { status: 400 }));
    create.mockResolvedValueOnce(reply('{"ok":true}'));
    expect(await askJson("s", "u")).toEqual({ ok: true });
    expect(create.mock.calls[1][0].response_format).toBeUndefined();
  });

  it("retries without strict mode when the strict reply is empty", async () => {
    create.mockResolvedValueOnce(reply("  "));
    create.mockResolvedValueOnce(reply('{"ok":true}'));
    expect(await askJson("s", "u")).toEqual({ ok: true });
  });

  it("does not swallow non-400 errors", async () => {
    create.mockRejectedValueOnce(Object.assign(new Error("down"), { status: 503 }));
    await expect(askJson("s", "u")).rejects.toThrow("down");
  });

  it("passes temperature and token limit through", async () => {
    create.mockResolvedValueOnce(reply("{}"));
    await askJson("s", "u", { temperature: 0.4, maxTokens: 3000 });
    expect(create.mock.calls[0][0]).toMatchObject({ temperature: 0.4, max_completion_tokens: 3000 });
  });
});
