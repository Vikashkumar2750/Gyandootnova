// Autonomous SEO Publishing Agent v4
// - LLM chain: Anthropic (primary) → OpenAI → DeepSeek → Gemini
// - Intelligent per-task search routing with retry-once + auto fallback
//   • trending  : Tavily → Exa → SerpAPI
//   • semantic  : Exa → Tavily → SerpAPI
//   • crawl     : Firecrawl → Exa → Tavily
//   • google    : SerpAPI → Tavily → Exa
// - Load-balanced multi-provider research merge (dedup + authority filter)
// - Similarity check, revisions, JSON-LD, TOC, internal/external links, full logs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  sendAlert, sendRecovery, isProviderPaused, recordProviderFailure,
  recordProviderSuccess, classifyError,
} from "../_shared/seo-alerts.ts";
import { buildKeyResolver, KeyResolver } from "../_shared/ai-key-resolver.ts";

const NICHE = "Books, Spirituality, Meditation, Self Growth, Mindfulness, Consciousness";
const SITE = "https://gyandootnova.in";
const AUTHOR = "GyandootNova Editorial";
const DEFAULT_TZ = "Asia/Kolkata";
const SIMILARITY_THRESHOLD = 0.7;
const CONTENT_SCORE_THRESHOLD = Number(Deno.env.get("SEO_CONTENT_SCORE_MIN") || "55");

// Suggested IST publishing slots for a Hindi spiritual audience.
// Alternates a morning devotion slot and an evening reading slot.
const IST_SLOTS: [number, number][] = [[7, 0], [19, 30]]; // 07:00 and 19:30 IST
function suggestSchedule(batchIndex: number): { date: string; time: string; iso: string } {
  const slot = IST_SLOTS[batchIndex % IST_SLOTS.length];
  const dayOffset = Math.floor(batchIndex / IST_SLOTS.length) + 1; // start tomorrow
  // IST = UTC+5:30 → UTC hour = slot.hour - 5, minute = slot.minute - 30 (mod)
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, slot[0] - 5, slot[1] - 30, 0));
  const iso = utc.toISOString();
  // Format date/time as seen in the target tz (IST) for display fields.
  const istDate = new Date(utc.getTime() + 5.5 * 3600 * 1000);
  const date = istDate.toISOString().slice(0, 10);
  const time = `${String(slot[0]).padStart(2, "0")}:${String(slot[1]).padStart(2, "0")}`;
  return { date, time, iso };
}




// ─── helpers ─────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
const STOP = new Set("the a an and or but if of to in on for with from by as is are was were be been being this that these those it its at we our you your they them he she his her hai hain ka ke ki ko me mein se par or aur ya bhi wo woh yeh ye kya kyun kaise".split(/\s+/));
function tokenize(s: string): Set<string> {
  return new Set((s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function readingTime(text: string) {
  const w = text.split(/\s+/).filter(Boolean).length;
  return { words: w, minutes: Math.max(1, Math.round(w / 200)) };
}
function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e: any) {
    const msg = String(e?.message || e).toLowerCase();
    // Don't retry on hard failures
    if (msg.includes("no-key") || msg.includes("401") || msg.includes("403")) throw e;
    await new Promise(r => setTimeout(r, 400));
    return await fn();
  }
}

// ─── LLM providers ───────────────────────────────────────────────────
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// Lovable AI Gateway (primary) — uses auto-provisioned LOVABLE_API_KEY.
// No user-supplied key, no quota alerts, no invalid-key errors.
async function llmLovable(messages: ChatMsg[], json: boolean, key: string): Promise<string> {
  const sysExtra = json ? "\n\nReturn ONLY valid JSON. No markdown fences, no commentary." : "";
  const patchedMessages = messages.map((m, i) =>
    i === 0 && m.role === "system" ? { ...m, content: m.content + sysExtra } : m
  );
  const res = await withTimeout(fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: patchedMessages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  }), 90000);
  if (!res.ok) throw new Error(`lovable ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function llmOpenRouter(messages: ChatMsg[], json: boolean, key: string): Promise<string> {
  const res = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat", messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  }), 90000);
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
async function llmOpenAI(messages: ChatMsg[], json: boolean, key: string): Promise<string> {
  const res = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o", messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  }), 90000);
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
async function llmDeepSeek(messages: ChatMsg[], json: boolean, key: string): Promise<string> {
  const res = await withTimeout(fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "deepseek-chat", messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  }), 90000);
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
async function llmGemini(messages: ChatMsg[], json: boolean, key: string): Promise<string> {
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const user = messages.filter(m => m.role !== "system").map(m => m.content).join("\n\n");
  const res = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys + (json ? "\n\nReturn ONLY valid JSON. No markdown fences." : "") }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: json ? { responseMimeType: "application/json" } : {},
    }),
  }), 90000);
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

type LLMFn = (m: ChatMsg[], j: boolean, key: string) => Promise<string>;
// Lovable AI Gateway is tried first — LOVABLE_API_KEY is auto-provisioned and
// covered by workspace credits, so no quota / invalid-key alerts.
// External providers remain as fallback only if their keys are configured.
const LLM_CHAIN: [string, LLMFn][] = [
  ["lovable", llmLovable],
  ["openrouter", llmOpenRouter], ["openai", llmOpenAI], ["deepseek", llmDeepSeek], ["gemini", llmGemini],
];

function parseStatus(msg: string): number | null {
  const m = msg.match(/\b(\d{3})\b/);
  return m ? Number(m[1]) : null;
}


async function callLLM(messages: ChatMsg[], json: boolean, log: any, sb: any, step: string, resolveKey: KeyResolver): Promise<string> {
  log.llm_attempts = log.llm_attempts || [];
  const errors: string[] = [];
  const failedProviders: { name: string; error: string; status: number | null }[] = [];
  for (const [name, fn] of LLM_CHAIN) {
    if (await isProviderPaused(sb, name)) {
      log.llm_attempts.push({ provider: name, ok: false, skipped: "paused" });
      continue;
    }
    const key = await resolveKey(name);
    if (!key) {
      log.llm_attempts.push({ provider: name, ok: false, skipped: "no-key" });
      continue;
    }
    try {
      const out = await retryOnce(() => fn(messages, json, key));
      if (!out) throw new Error("empty");
      log.llm_attempts.push({ provider: name, ok: true });
      log.llm_used = log.llm_used || name;
      const wasFailing = await recordProviderSuccess(sb, name);
      if (failedProviders.length > 0) {
        const first = failedProviders[0];
        const cls = classifyError(first.name, first.error, first.status);
        await sendRecovery(sb, {
          errorType: cls.errorType, provider: first.name, message: first.error,
          httpStatus: first.status, step, recoveryMethod: "LLM fallback chain", switchedTo: name,
          originalError: `${first.name}: ${first.error}`,
        });
      } else if (wasFailing) {
        await sendRecovery(sb, {
          errorType: `${name} recovered`, provider: name, step,
          recoveryMethod: "provider became healthy", switchedTo: name,
        });
      }
      return json ? stripFences(out) : out;
    } catch (e: any) {
      const msg = String(e?.message || e);
      const status = parseStatus(msg);
      log.llm_attempts.push({ provider: name, ok: false, error: msg.slice(0, 200) });
      errors.push(`${name}: ${msg}`);
      failedProviders.push({ name, error: msg, status });
      const { consecutive, paused } = await recordProviderFailure(sb, name, msg, status);
      const cls = classifyError(name, msg, status);
      await sendAlert(sb, {
        errorType: cls.errorType, provider: name, message: msg.slice(0, 500),
        httpStatus: status, step, retryCount: 1, suggestion: cls.suggestion,
        severity: paused || consecutive >= 3 ? "high" : cls.severity,
      });
    }
  }
  throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
}



// ─── Search providers ────────────────────────────────────────────────
type Source = { url: string; title: string; snippet: string; provider?: string };

async function searchTavily(query: string, key: string, opts: { topic?: "news" | "general" } = {}): Promise<Source[]> {
  const res = await withTimeout(fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, max_results: 6, search_depth: "advanced", topic: opts.topic || "general" }),
  }), 30000);
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({ url: r.url, title: r.title || "", snippet: r.content || "", provider: "tavily" })).filter((s: Source) => s.url);
}
async function searchExa(query: string, key: string, opts: { type?: "neural" | "keyword" } = {}): Promise<Source[]> {
  const res = await withTimeout(fetch("https://api.exa.ai/search", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query, numResults: 6, type: opts.type || "neural", contents: { text: { maxCharacters: 800 } } }),
  }), 30000);
  if (!res.ok) throw new Error(`exa ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({ url: r.url, title: r.title || "", snippet: r.text || r.snippet || "", provider: "exa" })).filter((s: Source) => s.url);
}
async function searchFirecrawl(query: string, key: string): Promise<Source[]> {
  const res = await withTimeout(fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 6 }),
  }), 30000);
  if (!res.ok) throw new Error(`firecrawl ${res.status}`);
  const data = await res.json();
  const items = data?.data || data?.web?.results || [];
  return items.map((r: any) => ({ url: r.url || r.link, title: r.title || "", snippet: r.description || r.snippet || "", provider: "firecrawl" })).filter((s: Source) => s.url);
}
async function searchSerpAPI(query: string, key: string): Promise<Source[]> {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=6&api_key=${key}`;
  const res = await withTimeout(fetch(url), 30000);
  if (!res.ok) throw new Error(`serpapi ${res.status}`);
  const data = await res.json();
  return (data.organic_results || []).map((r: any) => ({ url: r.link, title: r.title || "", snippet: r.snippet || "", provider: "serpapi" })).filter((s: Source) => s.url);
}

type SearchFn = (q: string, key: string) => Promise<Source[]>;
const ROUTES: Record<string, [string, SearchFn][]> = {
  trending: [["tavily", (q, k) => searchTavily(q, k, { topic: "news" })], ["exa", (q, k) => searchExa(q, k)], ["serpapi", searchSerpAPI]],
  semantic: [["exa", (q, k) => searchExa(q, k, { type: "neural" })], ["tavily", (q, k) => searchTavily(q, k)], ["serpapi", searchSerpAPI]],
  crawl:    [["firecrawl", searchFirecrawl], ["exa", (q, k) => searchExa(q, k)], ["tavily", (q, k) => searchTavily(q, k)]],
  google:   [["serpapi", searchSerpAPI], ["tavily", (q, k) => searchTavily(q, k)], ["exa", (q, k) => searchExa(q, k)]],
};


// spam/low-quality domains to drop
const SPAM_DOMAINS = /(pinterest\.|quora\.|answers\.|.*\.blogspot\.|medium\.com\/@|reddit\.com\/r\/|scribd\.|slideshare\.|ezinearticles\.)/i;
const AUTHORITY_HINTS = /(\.gov|\.edu|\.ac\.|\.org|wikipedia\.org|britannica\.com|nationalgeographic\.com|bbc\.|nytimes\.|guardian\.|nasa\.|nih\.|who\.int|stanford\.|harvard\.|cambridge\.|oxford\.|jstor\.|springer\.|nature\.|sciencedirect\.|penguin\.|harpercollins\.|randomhouse\.)/i;

function scoreSource(s: Source): number {
  if (SPAM_DOMAINS.test(s.url)) return -1;
  let score = 0;
  if (AUTHORITY_HINTS.test(s.url)) score += 10;
  if (s.snippet.length > 100) score += 2;
  if (s.title.length > 10) score += 1;
  return score;
}

async function routedSearch(task: keyof typeof ROUTES, query: string, log: any, sb: any, resolveKey: KeyResolver): Promise<Source[]> {
  log.search_attempts = log.search_attempts || [];
  log.fallback_sequence = log.fallback_sequence || [];
  const chain = ROUTES[task];
  const failedProviders: { name: string; error: string; status: number | null }[] = [];
  for (const [name, fn] of chain) {
    if (await isProviderPaused(sb, name)) {
      log.search_attempts.push({ task, provider: name, ok: false, skipped: "paused" });
      continue;
    }
    const key = await resolveKey(name);
    if (!key) {
      log.search_attempts.push({ task, provider: name, ok: false, skipped: "no-key" });
      continue;
    }
    try {
      const results = await retryOnce(() => fn(query, key));
      log.search_attempts.push({ task, provider: name, ok: true, count: results.length });
      log.fallback_sequence.push(`${task}:${name}`);
      const wasFailing = await recordProviderSuccess(sb, name);
      if (failedProviders.length > 0) {
        const first = failedProviders[0];
        const cls = classifyError(first.name, first.error, first.status);
        await sendRecovery(sb, {
          errorType: cls.errorType, provider: first.name, message: first.error,
          httpStatus: first.status, step: `search:${task}`,
          recoveryMethod: "search provider fallback", switchedTo: name,
          originalError: `${first.name}: ${first.error}`,
        });
      } else if (wasFailing) {
        await sendRecovery(sb, {
          errorType: `${name} recovered`, provider: name, step: `search:${task}`,
          recoveryMethod: "provider became healthy", switchedTo: name,
        });
      }
      return results;
    } catch (e: any) {
      const msg = String(e?.message || e);
      const status = parseStatus(msg);
      log.search_attempts.push({ task, provider: name, ok: false, error: msg.slice(0, 150) });
      failedProviders.push({ name, error: msg, status });
      const { consecutive, paused } = await recordProviderFailure(sb, name, msg, status);
      const cls = classifyError(name, msg, status);
      await sendAlert(sb, {
        errorType: cls.errorType, provider: name, message: msg.slice(0, 500),
        httpStatus: status, step: `search:${task}`, retryCount: 1, suggestion: cls.suggestion,
        severity: paused || consecutive >= 3 ? "high" : cls.severity,
      });
    }
  }
  return [];
}

async function researchTopic(topic: string, log: any, sb: any, resolveKey: KeyResolver): Promise<Source[]> {
  const [trending, semantic, google] = await Promise.all([
    routedSearch("trending", topic, log, sb, resolveKey),
    routedSearch("semantic", topic, log, sb, resolveKey),
    routedSearch("google", topic, log, sb, resolveKey),
  ]);



  const merged: Source[] = [];
  const seen = new Set<string>();
  for (const s of [...trending, ...semantic, ...google]) {
    const norm = s.url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (seen.has(norm)) continue;
    if (scoreSource(s) < 0) continue;
    seen.add(norm);
    merged.push(s);
  }
  // sort by authority score, keep top 10
  merged.sort((a, b) => scoreSource(b) - scoreSource(a));
  const top = merged.slice(0, 10);

  log.providers_merged = { trending: trending.length, semantic: semantic.length, google: google.length, kept: top.length };
  return top;
}

// ─── main ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Authorization: this endpoint publishes content and burns paid AI/search
  // quotas. It MUST NOT be callable by anonymous users. Accept either:
  //   - x-cron-secret matching SEO_AGENT_CRON_SECRET (scheduled cron), or
  //   - an admin JWT in the Authorization header (admin UI).
  const cronSecret = Deno.env.get("SEO_AGENT_CRON_SECRET") || "";
  const providedSecret = req.headers.get("x-cron-secret") || "";
  let authorized = cronSecret.length > 0 && providedSecret === cronSecret;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const anon = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        const { data, error } = await anon.auth.getUser(token);
        if (!error && data?.user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: data.user.id,
            _role: "admin",
          });
          if (isAdmin === true) authorized = true;
        }
      } catch { /* fall through to 401 */ }
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resolveKey = await buildKeyResolver(supabase);

  const started = Date.now();
  const log: any = { status: "ok", sources: [], internal_links: [], external_links: [], action: "created" };

  try {
    const body = await req.json().catch(() => ({}));
    const forcedTopic: string | undefined = body?.topic || body?.keyword;
    const requestedPublishStatus = ["draft", "scheduled", "published"].includes(body?.publish_status)
      ? body.publish_status
      : undefined;
    const requestedTz: string = typeof body?.timezone === "string" && body.timezone ? body.timezone : DEFAULT_TZ;
    const requestedAuthor: string = typeof body?.author === "string" && body.author ? body.author : AUTHOR;
    const requestedScheduledAt: string | null = typeof body?.scheduled_at === "string" ? body.scheduled_at : null;
    const confirmPublish: boolean = body?.confirm_publish === true;
    const batchIndex: number = Number.isInteger(body?.batch_index) ? body.batch_index : 0;

    // 1) Scan Posts (build internal content map)
    const { data: existing } = await supabase.from("posts")
      .select("id, slug, title, excerpt, meta_description, content, manually_edited, updated_at")
      .eq("post_type", "article").order("created_at", { ascending: false }).limit(500);


    const existingList = (existing || []).map(p => `- ${p.title} (/${p.slug})`).join("\n");

    // 2) Topic discovery
    let topic = forcedTopic;
    if (!topic) {
      const raw = await callLLM([
        { role: "system", content: `You are an SEO strategist for a publisher in the niche: ${NICHE}. Propose ONE high-search-intent English/Hindi blog topic NOT already covered. Prioritize high-search-volume worldwide Hindu/spiritual keywords with clear reader intent. Return JSON: {"topic":"...","rationale":"..."}` },
        { role: "user", content: `Existing posts:\n${existingList || "(none)"}\n\nRules:\n- Evergreen or trending in books/spirituality/meditation/self-growth/mindfulness/consciousness.\n- Different angle from anything above.\n- Serve real reader search intent.` },
      ], true, log, supabase, "topic-discovery", resolveKey);
      topic = JSON.parse(raw).topic;
    }
    log.topic = topic;

    // 3) Similarity (semantic-ish via jaccard)
    const topicTokens = tokenize(topic!);
    let bestMatch: { post: any; score: number } | null = null;
    for (const p of existing || []) {
      const sc = jaccard(topicTokens, tokenize(`${p.title} ${p.excerpt || ""}`));
      if (!bestMatch || sc > bestMatch.score) bestMatch = { post: p, score: sc };
    }
    log.duplicate_score = bestMatch?.score ?? 0;
    log.similarity_score = log.duplicate_score;
    log.matched_slug = bestMatch && bestMatch.score >= SIMILARITY_THRESHOLD ? bestMatch.post.slug : null;
    const willUpdate = !!log.matched_slug;
    log.action = willUpdate ? "updated" : "created";

    // 4) Load-balanced multi-provider research (parallel + fallback per task)
    const sources = await researchTopic(topic!, log, supabase, resolveKey);
    if (sources.length === 0) {
      log.status = "error";
      log.error = "All search providers unavailable or returned no results";
      log.execution_ms = Date.now() - started;
      await supabase.from("seo_agent_logs").insert(log);
      await sendAlert(supabase, {
        errorType: "All search providers unavailable", step: "research",
        message: log.error, severity: "high",
        suggestion: "Check Tavily/Exa/Firecrawl/SerpAPI keys and quotas.",
      });
      return new Response(JSON.stringify({ success: false, error: log.error, log }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.sources = sources.map(s => ({ url: s.url, title: s.title, provider: s.provider }));
    log.search_providers_used = [...new Set(sources.map(s => s.provider!))];

    const researchBlock = sources.map((s, i) => `[${i + 1}] (${s.provider}) ${s.title}\n${s.url}\n${s.snippet}`).join("\n\n");
    const internalPool = (existing || []).slice(0, 60).map(p => `/articles/${p.slug} — ${p.title}`).join("\n");

    // 5) Generate article
    const genPrompt = `Write a fully original, human-sounding, plagiarism-free Hindi-first article for a ${NICHE} publisher. Use simple Hinglish/Hindi phrasing where useful, but keep important search keywords in English too.

TOPIC: ${topic}

RESEARCH NOTES (multi-provider, rewrite in your own words, DO NOT COPY sentences):
${researchBlock}

INTERNAL LINK POOL (use 3–6 contextual links as <a href="/articles/slug">natural anchor</a> — only use slugs from this list, never invent):
${internalPool || "(none)"}

REQUIREMENTS
- 1800–2500 words body (excluding TOC/FAQ/conclusion).
- Target worldwide traffic: include naturally searched variants for India, US, UK, Canada and Australia readers.
- Preserve spiritual accuracy; do not invent scripture claims. Explain practical meaning, path vidhi, benefits, FAQs, and common mistakes when relevant.
- Google Helpful Content + EEAT, natural human tone, no AI clichés or repetition.
- Prefer authoritative citations (gov, .edu, scientific, books, reputable news).
- One H1, several H2/H3; short paragraphs; sentence variety; include Conclusion and a CTA paragraph.
- TOC (linked H2s) + FAQ (6 Qs).
- 2–4 external links only to authoritative sources from research.
- Output valid HTML body (h1,h2,h3,p,ul,ol,li,a,strong,em,blockquote).

Return STRICT JSON (no markdown fences):
{
  "seo_title":"≤60","meta_title":"≤60","meta_description":"≤160",
  "slug":"kebab-case","focus_keyword":"...","secondary_keywords":["..."],
  "tags":["5-10 short tags"],"category":"single category name",
  "h1":"...","excerpt":"≤200","body_html":"<h1>...</h1>...","cta":"...",
  "faq":[{"q":"...","a":"..."}, ...6],
  "featured_image_prompt":"...","featured_image_title":"short title for the featured image",
  "featured_image_alt":"≤120 chars with focus keyword",
  "featured_image_caption":"1-sentence caption shown under the image",
  "og_title":"...","og_description":"...","twitter_title":"...","twitter_description":"...",
  "social_caption":"engaging social post caption ≤280 chars with 2-3 relevant hashtags",
  "social_excerpt":"1-2 sentence teaser for social share",
  "external_references":[{"title":"...","url":"https://..."}],
  "external_links":[{"url":"...","anchor":"..."}]
}`;


    const raw = await callLLM([
      { role: "system", content: "You are a senior SEO editor and domain writer. Follow Google Helpful Content. Output ONLY valid JSON, no code fences." },
      { role: "user", content: genPrompt },
    ], true, log, supabase, "draft-generation", resolveKey);
    let article: any;
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    // 1) direct parse
    article = tryParse(raw);
    if (!article) {
      // 2) strip code fences / language hints
      let cleaned = raw.replace(/^\uFEFF/, "").trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      article = tryParse(cleaned);
      // 3) extract widest {...} slice
      if (!article) {
        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");
        if (first !== -1 && last > first) {
          const slice = cleaned.slice(first, last + 1);
          article = tryParse(slice);
          // 4) repair common issues: trailing commas, bad control chars, unescaped quotes in HTML strings
          if (!article) {
            const repaired = slice
              .replace(/,\s*([}\]])/g, "$1")
              .replace(/[\u0000-\u001F]+/g, (m) => m.replace(/[\r\n\t]/g, " "));
            article = tryParse(repaired);
          }
          // 5) truncate to last complete field before error position — recover partial article
          if (!article) {
            for (let end = slice.length - 1; end > 100; end -= 1) {
              if (slice[end] === "}" && slice[end - 1] !== "\\") {
                const candidate = slice.slice(0, end + 1)
                  .replace(/,\s*([}\]])/g, "$1")
                  .replace(/[\u0000-\u001F]+/g, " ");
                const parsed = tryParse(candidate);
                if (parsed && typeof parsed === "object" && parsed.title && parsed.body_html) {
                  article = parsed;
                  break;
                }
              }
            }
          }
        }
      }
    }
    if (!article || typeof article !== "object") {
      await sendAlert(supabase, {
        errorType: "Draft generation failed", step: "draft-generation",
        message: `LLM returned unparseable JSON (raw length ${raw?.length ?? 0})`,
        severity: "high", suggestion: "Inspect llm_attempts in seo_agent_logs and consider prompt tightening.",
      });
      throw new Error(`Draft JSON parse failed after repair attempts`);
    }

    // 6) Assemble final HTML
    const h2s = [...String(article.body_html).matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, ""));
    const toc = h2s.length ? `<nav class="toc"><strong>Table of Contents</strong><ol>${h2s.map(t => `<li>${t}</li>`).join("")}</ol></nav>` : "";
    const rt = readingTime(String(article.body_html).replace(/<[^>]+>/g, " "));
    log.word_count = rt.words;
    log.reading_time_min = rt.minutes;

    const slugFinal = slugify(article.slug || article.seo_title);
    const canonical = `${SITE}/articles/${log.matched_slug || slugFinal}`;

    // Sanitize internal links: drop any that don't match existing slugs
    const validSlugs = new Set((existing || []).map(p => p.slug));
    let bodyHtml = String(article.body_html).replace(/<a\s+href="\/articles\/([^"#?]+)"[^>]*>([^<]+)<\/a>/gi, (m, slug, anchor) => {
      return validSlugs.has(slug) ? m : anchor;
    });

    const faqSchema = {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: (article.faq || []).map((f: any) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    };
    const articleSchema = {
      "@context": "https://schema.org", "@type": "Article",
      headline: article.h1 || article.seo_title,
      author: { "@type": "Organization", name: AUTHOR },
      datePublished: new Date().toISOString(),
      description: article.meta_description, mainEntityOfPage: canonical,
      keywords: [article.focus_keyword, ...(article.secondary_keywords || [])].join(", "),
    };
    const meta = `<p class="post-meta"><em>${AUTHOR} • ${new Date().toLocaleDateString("en-IN")} • ${rt.minutes} min read • Focus: ${article.focus_keyword}</em></p>`;
    const ogBlock = `
<meta property="og:title" content="${(article.og_title || article.seo_title).replace(/"/g, "&quot;")}" />
<meta property="og:description" content="${(article.og_description || article.meta_description).replace(/"/g, "&quot;")}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${(article.twitter_title || article.seo_title).replace(/"/g, "&quot;")}" />
<meta name="twitter:description" content="${(article.twitter_description || article.meta_description).replace(/"/g, "&quot;")}" />
<link rel="canonical" href="${canonical}" />`;

    const finalHtml =
      `<!-- SEO_AGENT_META focus_keyword="${article.focus_keyword}" secondary="${(article.secondary_keywords || []).join("|")}" tags="${(article.tags || []).join("|")}" category="${article.category || ""}" alt="${(article.featured_image_alt || "").replace(/"/g, "'")}" -->\n` +
      meta + toc + bodyHtml +
      (article.cta ? `\n<p class="cta"><strong>${article.cta}</strong></p>` : "") +
      `\n<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` +
      `\n<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>` +
      `\n${ogBlock}`;

    const linkRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    for (const m of bodyHtml.matchAll(linkRe)) {
      if (m[1].startsWith("/")) log.internal_links.push({ url: m[1], anchor: m[2] });
      else if (m[1].startsWith("http")) log.external_links.push({ url: m[1], anchor: m[2] });
    }
    for (const el of article.external_links || []) log.external_links.push(el);

    // Simple content + SEO scores
    log.content_score = Math.min(100,
      Math.round((rt.words / 2000) * 50) +
      Math.min(20, h2s.length * 3) +
      (article.faq?.length >= 6 ? 15 : 5) +
      (log.internal_links.length >= 3 ? 10 : 0) +
      (log.external_links.length >= 2 ? 5 : 0));
    log.seo_score = Math.min(100,
      (article.meta_title?.length <= 60 ? 20 : 10) +
      (article.meta_description?.length <= 160 ? 20 : 10) +
      (article.focus_keyword ? 15 : 0) +
      ((article.secondary_keywords || []).length >= 3 ? 15 : 5) +
      (h2s.length >= 4 ? 15 : 5) +
      15);

    // Content quality threshold alert (non-fatal)
    if (log.content_score < CONTENT_SCORE_THRESHOLD) {
      await sendAlert(supabase, {
        errorType: "Content quality score below threshold",
        step: "quality-check", severity: "normal",
        message: `content_score=${log.content_score} (threshold ${CONTENT_SCORE_THRESHOLD}); word_count=${log.word_count}`,
        suggestion: "Article saved as Draft. Review and edit before publishing.",
      });
    }
    if (log.internal_links.length === 0 && (existing || []).length > 5) {
      await sendAlert(supabase, {
        errorType: "Internal linking failed", step: "internal-linking", severity: "normal",
        message: "No valid internal links inserted despite available post pool.",
        suggestion: "Check LLM prompt compliance and slug validation.",
      });
    }

    // 6b) Compute Publishing Plan
    const suggested = suggestSchedule(batchIndex);
    let scheduledAtIso: string | null = null;
    let publishStatus: "draft" | "scheduled" | "published" = "draft";
    let scheduledDate: string = suggested.date;
    let scheduledTime: string = suggested.time;

    if (requestedScheduledAt) {
      const d = new Date(requestedScheduledAt);
      if (!isNaN(d.getTime())) {
        scheduledAtIso = d.toISOString();
        publishStatus = "scheduled";
        const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
        scheduledDate = ist.toISOString().slice(0, 10);
        scheduledTime = ist.toISOString().slice(11, 16);
      }
    }
    if (!requestedScheduledAt && requestedPublishStatus === "scheduled") {
      scheduledAtIso = suggested.iso;
      publishStatus = "scheduled";
    }
    if (!requestedScheduledAt && (confirmPublish || requestedPublishStatus === "published")) {
      publishStatus = "published";
      scheduledAtIso = new Date().toISOString();
    }

    const secondaryKw: string[] = Array.isArray(article.secondary_keywords) ? article.secondary_keywords.map(String) : [];
    const tagsArr: string[] = Array.isArray(article.tags) ? article.tags.map(String).slice(0, 10) : [];
    const internalLinksArr = log.internal_links.slice(0, 20);
    const externalRefsArr = Array.isArray(article.external_references) && article.external_references.length
      ? article.external_references
      : (log.external_links || []).map((e: any) => ({ title: e.anchor || e.url, url: e.url }));

    // 7) Save (Draft by default; scheduled/published only when explicitly requested)
    let postId: string | null = null;
    let finalSlug = slugFinal;

    const savePayloadCommon = {
      publish_status: publishStatus,
      scheduled_at: scheduledAtIso,
      timezone: requestedTz,
      reading_time_min: rt.minutes,
      word_count: rt.words,
      category: article.category ?? null,
      primary_keyword: article.focus_keyword ?? null,
      secondary_keywords: secondaryKw,
      tags: tagsArr,
      author: requestedAuthor,
      featured_image_title: article.featured_image_title ?? null,
      featured_image_alt: article.featured_image_alt ?? null,
      featured_image_caption: article.featured_image_caption ?? null,
      social_caption: article.social_caption ?? null,
      social_excerpt: article.social_excerpt ?? null,
      internal_links: internalLinksArr,
      external_references: externalRefsArr,
      canonical_url: canonical,
      schema_type: "BlogPosting",
    };

    try {
      if (willUpdate && bestMatch) {
        const post = bestMatch.post;
        finalSlug = post.slug;
        await supabase.from("post_revisions").insert({
          post_id: post.id, title: post.title, content: post.content, excerpt: post.excerpt,
          meta_title: null, meta_description: post.meta_description,
          reason: post.manually_edited ? "seo-agent: pre-update snapshot (manually edited)" : "seo-agent: pre-update snapshot",
        });
        const { error } = await supabase.from("posts").update({
          title: article.h1 || article.seo_title, content: finalHtml, excerpt: article.excerpt,
          meta_title: article.meta_title, meta_description: article.meta_description,
          manually_edited: false,
          ...savePayloadCommon,
        }).eq("id", post.id);
        if (error) throw error;
        postId = post.id;
      } else {
        let candidate = finalSlug;
        for (let i = 2; i < 30; i++) {
          const { data: clash } = await supabase.from("posts").select("id").eq("slug", candidate).maybeSingle();
          if (!clash) break;
          candidate = `${finalSlug}-${i}`;
        }
        finalSlug = candidate;
        const { data: ins, error } = await supabase.from("posts").insert({
          title: article.h1 || article.seo_title, slug: finalSlug, content: finalHtml,
          excerpt: article.excerpt, meta_title: article.meta_title, meta_description: article.meta_description,
          post_type: "article",
          ...savePayloadCommon,
        }).select("id").single();
        if (error) throw error;
        postId = ins.id;
      }
    } catch (saveErr: any) {
      await sendAlert(supabase, {
        errorType: "Blog save failed", step: willUpdate ? "post-update" : "post-insert",
        severity: "high", message: String(saveErr?.message || saveErr).slice(0, 500),
        suggestion: "Check RLS/grants on posts and post_revisions tables and DB connectivity.",
      });
      throw saveErr;
    }


    log.post_id = postId;
    log.slug = finalSlug;
    log.focus_keyword = article.focus_keyword;
    log.keywords = [article.focus_keyword, ...secondaryKw];
    log.publish_status = publishStatus;
    log.scheduled_at = scheduledAtIso;
    log.meta = {
      featured_image_prompt: article.featured_image_prompt,
      featured_image_alt: article.featured_image_alt,
      secondary_keywords: secondaryKw,
      tags: tagsArr, category: article.category, canonical, cta: article.cta,
    };
    log.execution_ms = Date.now() - started;

    await supabase.from("seo_agent_logs").insert(log);

    const cms = {
      article: {
        title: article.h1 || article.seo_title,
        slug: finalSlug,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        content: finalHtml,
        excerpt: article.excerpt,
        body_html: article.body_html,
        h1: article.h1 || article.seo_title,
        cta: article.cta,
        faq: article.faq || [],
      },
      publishing: {
        publish_status: publishStatus,
        scheduled_publish_date: scheduledDate,
        scheduled_publish_time: scheduledTime,
        scheduled_at: scheduledAtIso,
        timezone: requestedTz,
        reading_time: rt.minutes,
        word_count: rt.words,
        category: article.category,
        primary_keyword: article.focus_keyword,
        secondary_keywords: secondaryKw,
        tags: tagsArr,
        author: requestedAuthor,
        featured_image_prompt: article.featured_image_prompt,
        featured_image_title: article.featured_image_title,
        featured_image_alt: article.featured_image_alt,
        featured_image_caption: article.featured_image_caption,
        social_caption: article.social_caption,
        social_excerpt: article.social_excerpt,
        internal_links: internalLinksArr,
        external_references: externalRefsArr,
        canonical_url: canonical,
        schema_type: "BlogPosting",
      },
    };

    return new Response(JSON.stringify({ success: true, ...log, cms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("seo-blog-agent error", e);
    log.status = "error";
    log.error = String(e?.message || e).slice(0, 1000);
    log.execution_ms = Date.now() - started;
    try { await supabase.from("seo_agent_logs").insert(log); } catch (dbe) {
      try {
        await sendAlert(supabase, {
          errorType: "Database connection failed", step: "log-persistence",
          severity: "high", message: String((dbe as any)?.message || dbe).slice(0, 500),
          suggestion: "Verify Lovable Cloud database availability and service role key.",
        });
      } catch {}
    }
    // Any unhandled exception → alert (skip if already emitted a specific one)
    const already = /All (LLM|search) providers|Blog save failed|Draft JSON parse failed/i.test(log.error);
    if (!already) {
      try {
        await sendAlert(supabase, {
          errorType: "Unexpected exception", step: "seo-agent",
          severity: "high", message: log.error,
          suggestion: "Inspect edge function logs and recent seo_agent_logs entries.",
        });
      } catch {}
    }
    return new Response(JSON.stringify({ success: false, error: log.error, log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
