import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function askJson(system: string, user: string): Promise<unknown> {
  const ask = (strict: boolean): Promise<any> =>
    groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(strict ? { response_format: { type: "json_object" as const } } : {}),
      temperature: 0.3,
      max_completion_tokens: 2000,
      reasoning_effort: "low",
    } as any);

  let text = "";
  try {
    text = (await ask(true)).choices[0]?.message?.content ?? "";
  } catch (e: any) {
    if (e?.status !== 400) throw e;
  }
  if (!text.trim()) text = (await ask(false)).choices[0]?.message?.content ?? "";

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Model returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}