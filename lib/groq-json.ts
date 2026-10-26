import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Options = { temperature?: number; maxTokens?: number };

/** Pulls the outermost {...} object out of a model reply that may carry prose or code fences. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Model returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}

export async function askJson(system: string, user: string, { temperature = 0.3, maxTokens = 2000 }: Options = {}): Promise<unknown> {
  const ask = (strict: boolean) =>
    groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(strict ? { response_format: { type: "json_object" as const } } : {}),
      temperature,
      max_completion_tokens: maxTokens,
      reasoning_effort: "low",
    } as Parameters<typeof groq.chat.completions.create>[0]) as Promise<Groq.Chat.ChatCompletion>;

  let text = "";
  try {
    text = (await ask(true)).choices[0]?.message?.content ?? "";
  } catch (e) {
    // Groq's JSON validator can reject reasoning-model output; retry once without it
    if ((e as { status?: number })?.status !== 400) throw e;
  }
  if (!text.trim()) text = (await ask(false)).choices[0]?.message?.content ?? "";
  return extractJson(text);
}
