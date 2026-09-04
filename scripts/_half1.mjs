// Autonomous SEO Publishing Agent v4
// - LLM chain: Anthropic (primary) â†’ OpenAI â†’ DeepSeek â†’ Gemini
// - Intelligent per-task search routing with retry-once + auto fallback
//   â€¢ trending  : Tavily â†’ Exa â†’ SerpAPI
//   â€¢ semantic  : Exa â†’ Tavily â†’ SerpAPI
//   â€¢ crawl     : Firecrawl â†’ Exa â†’ Tavily
//   â€¢ google    : SerpAPI â†’ Tavily â†’ Exa
// - Load-balanced multi-provider research merge (dedup + authority filter)
// - Similarity check, revisions, JSON-LD, TOC, internal/external links, full logs

import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import {
  sendAlert, sendRecovery, isProviderPaused, recordProviderFailure,
  recordProviderSuccess, classifyError,
} from "../lib/seo-alerts.js";
import { buildKeyResolver } from "../lib/ai-key-resolver.js";
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const NICHE = "Books, Spirituality, Meditation, Self Growth, Mindfulness, Consciousness";
const SITE = "https://gyandootnova.in";
const AUTHOR = "GyandootNova Editorial";
const DEFAULT_TZ = "Asia/Kolkata";
const SIMILARITY_THRESHOLD = 0.7;
const CONTENT_SCORE_THRESHOLD = Number(process.env.SEO_CONTENT_SCORE_MIN || "55");

// Suggested IST publishing slots for a Hindi spiritual audience.
// Alternates a morning devotion slot and an evening reading slot.
const IST_SLOTS = [[7, 0], [19, 30]]; // 07:00 and 19:30 IST
function suggestSchedule(batchIndex) {
  const slot = IST_SLOTS[batchIndex % IST_SLOTS.length];
  const dayOffset = Math.floor(batchIndex / IST_SLOTS.length) + 1; // start tomorrow
  // IST = UTC+5:30 â†’ UTC hour = slot.hour - 5, minute = slot.minute - 30 (mod)
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, slot[0] - 5, slot[1] - 30, 0));
  const iso = utc.toISOString();
  // Format date/time as seen in the target tz (IST) for display fields.
  const istDate = new Date(utc.getTime() + 5.5 * 3600 * 1000);
  const date = istDate.toISOString().slice(0, 10);
  const time = `${String(slot[0]).padStart(2, "0")}:${String(slot[1]).padStart(2, "0")}`;
  return { date, time, iso };
}

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function slugify(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
const STOP = new Set("the a an and or but if of to in on for with from by as is are was were be been being this that these those it its at we our you your they them he she his her hai hain ka ke ki ko me mein se par or aur ya bhi wo woh yeh ye kya kyun kaise".split(/\s+/));
function tokenize(s) {
  return new Set((s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function readingTime(text) {
  const w = text.split(/\s+/).filter(Boolean).length;
  return { words: w, minutes: Math.max(1, Math.round(w / 200)) };
}
function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
async function withTimeout(p, ms) {
  return await Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}
async function retryOnce(fn) {
  try { return await fn(); }
  catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    // Don't retry on hard failures
    if (msg.includes("no-key") || msg.includes("401") || msg.includes("403")) throw e;
    await new Promise(r => setTimeout(r, 400));
    return await fn();
  }
}

// â”€â”€â”€ LLM providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Lovable AI Gateway (primary) â€” uses auto-provisioned LOVABLE_API_KEY.
// No user-supplied key, no quota alerts, no invalid-key errors.
async function llmLovable(messages, json, key) {
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

async function llmOpenRouter(messages, json, key) {
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
async function llmOpenAI(messages, json, key) {
  const res = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o", messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  }), 90000);
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
async function llmDeepSeek(messages, json, key) {
  const res = await withTimeout(fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "deepseek-chat", messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  }), 90000);
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
async function llmGemini(messages, json, key) {
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const user = messages.filter(m => m.role !== "system").map(m => m.content).join("\n\n");
  const res = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST", headers,
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

// Lovable AI Gateway is tried first â€” LOVABLE_API_KEY is auto-provisioned and
// covered by workspace credits, so no quota / invalid-key alerts.
// External providers remain as fallback only if their keys are configured.
const LLM_CHAIN = [
  ["lovable", llmLovable],
  ["openrouter", llmOpenRouter], ["openai", llmOpenAI], ["deepseek", llmDeepSeek], ["gemini", llmGemini],
];

function parseStatus(msg) {
  const m = msg.match(/\b(\d{3})\b/);
  return m ? Number(m[1]) : null;
}

async function callLLM(messages, json, log, sb, step, resolveKey) {
  log.llm_attempts = log.llm_attempts || [];
  const errors = [];
  const failedProviders = [];
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
    } catch (e) {
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

// â”€â”€â”€ Search providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function searchTavily(query, key, opts = {}) {
  const res = await withTimeout(fetch("https://api.tavily.com/search", {
    method: "POST", headers,
    body: JSON.stringify({ api_key: key, query, max_results: 6, search_depth: "advanced", topic: opts.topic || "general" }),
  }), 30000);
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({ url: r.url, title: r.title || "", snippet: r.content || "", provider: "tavily" })).filter((s) => s.url);
}
async function searchExa(query, key, opts = {}) {
  const res = await withTimeout(fetch("https://api.exa.ai/search", {
    method: "POST", headers,
    body: JSON.stringify({ query, numResults: 6, type: opts.type || "neural", contents: { text } }),
  }), 30000);
  if (!res.ok) throw new Error(`exa ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({ url: r.url, title: r.title || "", snippet: r.text || r.snippet || "", provider: "exa" })).filter((s) => s.url);
}
async function searchFirecrawl(query, key) {
  const res = await withTimeout(fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 6 }),
  }), 30000);
  if (!res.ok) throw new Error(`firecrawl ${res.status}`);
  const data = await res.json();
  const items = data?.data || data?.web?.results || [];
  return items.map((r) => ({ url: r.url || r.link, title: r.title || "", snippet: r.description || r.snippet || "", provider: "firecrawl" })).filter((s) => s.url);
}
async function searchSerpAPI(query, key) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=6&api_key=${key}`;
  const res = await withTimeout(fetch(url), 30000);
  if (!res.ok) throw new Error(`serpapi ${res.status}`);
  const data = await res.json();
  return (data.organic_results || []).map((r) => ({ url: r.link, title: r.title || "", snippet: r.snippet || "", provider: "serpapi" })).filter((s) => s.url);
}

const ROUTES = {
  trending: [["tavily", (q, k) => searchTavily(q, k, { topic: "news" })], ["exa", (q, k) => searchExa(q, k)], ["serpapi", searchSerpAPI]],
  semantic: [["exa", (q, k) => searchExa(q, k, { type: "neural" })], ["tavily", (q, k) => searchTavily(q, k)], ["serpapi", searchSerpAPI]],
  crawl:    [["firecrawl", searchFirecrawl], ["exa", (q, k) => searchExa(q, k)], ["tavily", (q, k) => searchTavily(q, k)]],
  google:   [["serpapi", searchSerpAPI], ["tavily", (q, k) => searchTavily(q, k)], ["exa", (q, k) => searchExa(q, k)]],
};

// spam/low-quality domains to drop
const SPAM_DOMAINS = /(pinterest\.|quora\.|answers\.|.*\.blogspot\.|medium\.com\/@|reddit\.com\/r\/|scribd\.|slideshare\.|ezinearticles\.)/i;
const AUTHORITY_HINTS = /(\.gov|\.edu|\.ac\.|\.org|wikipedia\.org|britannica\.com|nationalgeographic\.com|bbc\.|nytimes\.|guardian\.|nasa\.|nih\.|who\.int|stanford\.|harvard\.|cambridge\.|oxford\.|jstor\.|springer\.|nature\.|sciencedirect\.|penguin\.|harpercollins\.|randomhouse\.)/i;

function scoreSource(s) {
  if (SPAM_DOMAINS.test(s.url)) return -1;
  let score = 0;
  if (AUTHORITY_HINTS.test(s.url)) score += 10;
  if (s.snippet.length > 100) score += 2;
  if (s.title.length > 10) score += 1;
  return score;
}

async function routedSearch(task, query, log, sb, resolveKey) {
  log.search_attempts = log.search_attempts || [];
  log.fallback_sequence = log.fallback_sequence || [];
  const chain = ROUTES[task];
  const failedProviders = [];
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
    } catch (e) {
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

async function researchTopic(topic, log, sb, resolveKey) {
  const [trending, semantic, google] = await Promise.all([
    routedSearch("trending", topic, log, sb, resolveKey),
    routedSearch("semantic", topic, log, sb, resolveKey),
    routedSearch("google", topic, log, sb, resolveKey),
  ]);

  const merged = [];
  const seen = new Set();
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

// â”€â”€â”€ main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Authorization: this endpoint publishes content and burns paid AI/search
  // quotas. It MUST NOT be callable by anonymous users. Handled centrally by
  // the shared guard (cron secret, service-role bearer, or admin JWT).
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const resolveKey = await buildKeyResolver(supabase);

  const started = Date.now();
  const log = { status: "ok", sources: [], internal_links: [], external_links: [], action: "created" };

  try {
    const body = await req.json().catch(() => ({}));
    const forcedTopic = body?.topic || body?.keyword;
    const requestedPublishStatus = ["draft", "scheduled", "published"].includes(body?.publish_status)
      ? body.publish_status
      : undefined;
    const requestedTz = typeof body?.timezone === "string" && body.timezone ? body.timezone : DEFAULT_TZ;
    const requestedAuthor = typeof body?.author === "string" && body.author ? body.author : AUTHOR;
    const requestedScheduledAt = typeof body?.scheduled_at === "string" ? body.scheduled_at : null;
    const confirmPublish = body?.confirm_publish === true;
    const batchIndex = Number.isInteger(body?.batch_index) ? body.batch_index : 0;

    // 1) Scan Posts (build internal content map)
    const { data: existing } = await supabase.from("posts")
      .select("id, slug, title, excerpt, meta_description, content, manually_edited, updated_at")
      .eq("post_type", "article").order("created_at", { ascending: false }).limit(500);

    const existingList = (existing || []).map(p => `- ${p.title} (/${p.slug})`).join("\n");
    const usedKeywords = new Set(
      (existing || []).map((p) => String(p.title || "").toLowerCase()),
    );

    // 1b) Keyword hub: pull the active LSI keyword bank so every article is
    // anchored to a real, prioritised target keyword instead of a random topic.
    const { data: kwRows } = await supabase
      .from("lsi_keywords")
      .select("term, category, related_terms, description, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(120);
    const { data: usedKwRows } = await supabase
      .from("posts").select("primary_keyword").not("primary_keyword", "is", null).limit(1000);
    const usedKw = new Set((usedKwRows || []).map((r) => String(r.primary_keyword || "").toLowerCase().trim()));
    const freshKeywords = (kwRows || []).filter((k) => !usedKw.has(String(k.term).toLowerCase().trim()));
    const keywordPool = (freshKeywords.length ? freshKeywords : (kwRows || [])).slice(0, 40);
    const keywordBlock = keywordPool
      .map((k) => `- ${k.term}${k.category ? ` [${k.category}]` : ""}${k.related_terms?.length ? ` â€” related: ${k.related_terms.slice(0, 6).join(", ")}` : ""}`)
      .join("\n");
    // Rotate through the pool so batch runs don't all pick the same term.
export default {};