// Multi-provider LLM client used by the editorial agent.
// Chain: NVIDIA NIM → OpenRouter → Lovable AI → OpenAI → DeepSeek → Gemini
// Every provider speaks the OpenAI chat-completions shape except Gemini.
import type { KeyResolver } from "./ai-key-resolver.ts";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

export function stripFences(s: string) {
  return String(s || "").replace(/^\uFEFF/, "").trim()
    .replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function openAiShape(
  url: string, key: string, model: string, messages: ChatMsg[], json: boolean,
  extraHeaders: Record<string, string> = {}, timeout = 120000,
): Promise<string> {
  const res = await withTimeout(fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  }), timeout);
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const NVIDIA_MODEL = Deno.env.get("NVIDIA_MODEL") || "meta/llama-3.3-70b-instruct";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") || "deepseek/deepseek-chat";

export type LLMFn = (m: ChatMsg[], json: boolean, key: string) => Promise<string>;

export const PROVIDERS: Record<string, LLMFn> = {
  nvidia: (m, j, k) =>
    openAiShape("https://integrate.api.nvidia.com/v1/chat/completions", k, NVIDIA_MODEL, m, j),
  openrouter: (m, j, k) =>
    openAiShape("https://openrouter.ai/api/v1/chat/completions", k, OPENROUTER_MODEL, m, j, {
      "HTTP-Referer": "https://gyandootnova.in",
      "X-Title": "GyandootNova Editorial Agent",
    }),
  lovable: (m, j, k) =>
    openAiShape("https://ai.gateway.lovable.dev/v1/chat/completions", k, "google/gemini-2.5-flash", m, j),
  openai: (m, j, k) =>
    openAiShape("https://api.openai.com/v1/chat/completions", k, "gpt-4o", m, j),
  deepseek: (m, j, k) =>
    openAiShape("https://api.deepseek.com/chat/completions", k, "deepseek-chat", m, j),
  gemini: async (m, j, k) => {
    const sys = m.filter(x => x.role === "system").map(x => x.content).join("\n\n");
    const user = m.filter(x => x.role !== "system").map(x => x.content).join("\n\n");
    const res = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys + (j ? "\n\nReturn ONLY valid JSON." : "") }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: j ? { responseMimeType: "application/json" } : {},
        }),
      }), 120000);
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  },
};

// Writer prefers NVIDIA/OpenRouter; reviewer runs on a *different* provider so
// the audit is not the writer grading its own homework.
export const WRITER_CHAIN = ["nvidia", "openrouter", "lovable", "openai", "deepseek", "gemini"];
export const REVIEWER_CHAIN = ["openrouter", "nvidia", "lovable", "gemini", "openai", "deepseek"];

export type CallResult = { text: string; provider: string };

export async function callChain(
  chain: string[], messages: ChatMsg[], json: boolean,
  resolveKey: KeyResolver, log: any, step: string, exclude?: string,
): Promise<CallResult> {
  log.llm_attempts = log.llm_attempts || [];
  const errors: string[] = [];
  for (const name of chain) {
    if (exclude && name === exclude) continue;
    const key = await resolveKey(name);
    if (!key) { log.llm_attempts.push({ step, provider: name, ok: false, skipped: "no-key" }); continue; }
    try {
      const out = await PROVIDERS[name](messages, json, key);
      if (!out || !out.trim()) throw new Error("empty response");
      log.llm_attempts.push({ step, provider: name, ok: true });
      return { text: json ? stripFences(out) : out, provider: name };
    } catch (e) {
      const msg = String((e as Error)?.message || e).slice(0, 200);
      log.llm_attempts.push({ step, provider: name, ok: false, error: msg });
      errors.push(`${name}: ${msg}`);
    }
  }
  throw new Error(`All LLM providers failed at ${step} — ${errors.join(" | ")}`);
}

/** Tolerant JSON parse for LLM output. */
export function parseJson(raw: string): any | null {
  const direct = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  let out = direct(raw);
  if (out) return out;
  const cleaned = stripFences(raw);
  out = direct(cleaned);
  if (out) return out;
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  const slice = cleaned.slice(first, last + 1);
  out = direct(slice);
  if (out) return out;
  return direct(slice.replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001F]+/g, " "));
}
