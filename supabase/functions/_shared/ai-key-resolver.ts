// Resolves an API key for a given provider.
// Precedence: enabled DB-stored encrypted key → env var fallback → null.
// Caches the result per-request to avoid re-decrypting on every call.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decryptKey } from "./ai-crypto.ts";

const ENV_MAP: Record<string, string> = {
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

export type KeyResolver = (provider: string) => Promise<string | null>;

export async function buildKeyResolver(sb: SupabaseClient): Promise<KeyResolver> {
  const cache = new Map<string, string | null>();
  let rows: any[] = [];
  try {
    const { data } = await sb.from("ai_provider_settings")
      .select("provider, enabled, encrypted_key")
      .eq("enabled", true);
    rows = data || [];
  } catch { rows = []; }

  const dbMap = new Map<string, string>();
  for (const r of rows) if (r.encrypted_key) dbMap.set(r.provider, r.encrypted_key);

  return async (provider: string) => {
    if (cache.has(provider)) return cache.get(provider)!;
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
    const envVal = envName ? (Deno.env.get(envName) || null) : null;
    cache.set(provider, envVal);
    return envVal;
  };
}
