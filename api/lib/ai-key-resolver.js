// AI key resolver — ported from _shared/ai-key-resolver.ts
import { decryptKey } from "./ai-crypto.js";

const ENV_MAP = {
  lovable: "LOVABLE_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  tavily: "TAVILY_API_KEY",
  exa: "EXA_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
  serpapi: "SERPAPI_API_KEY",
};

export async function buildKeyResolver(sb) {
  const cache = new Map();
  let rows = [];
  try {
    const { data } = await sb.from("ai_provider_settings")
      .select("provider, enabled, encrypted_key")
      .eq("enabled", true);
    rows = data || [];
  } catch { rows = []; }

  const dbMap = new Map();
  for (const r of rows) if (r.encrypted_key) dbMap.set(r.provider, r.encrypted_key);

  return async (provider) => {
    if (cache.has(provider)) return cache.get(provider);
    const enc = dbMap.get(provider);
    if (enc) {
      try {
        const pt = await decryptKey(enc);
        cache.set(provider, pt);
        return pt;
      } catch (e) {
        console.error(`decrypt failed for ${provider}`, e);
      }
    }
    const envName = ENV_MAP[provider];
    const envVal = envName ? (process.env[envName] || null) : null;
    cache.set(provider, envVal);
    return envVal;
  };
}
