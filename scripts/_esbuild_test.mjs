// Autonomous SEO Publishing Agent v4
// - LLM chain: Anthropic (primary) → OpenAI → DeepSeek → Gemini
// - Intelligent per-task search routing with retry-once + auto fallback
//   • trending  : Tavily → Exa → SerpAPI
//   • semantic  : Exa → Tavily → SerpAPI
//   • crawl     : Firecrawl → Exa → Tavily
//   • google    : SerpAPI → Tavily → Exa
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

// ─── LLM providers ───────────────────────────────────────────────────

// Lovable AI Gateway (primary) — uses auto-provisioned LOVABLE_API_KEY.
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

// Lovable AI Gateway is tried first — LOVABLE_API_KEY is auto-provisioned and
// covered by workspace credits, so no quota / invalid-key alerts.
// External providers remain as fallback only if their keys are configured.
const LLM_CHAIN = [
  ["lovable", llmLovable],
  ["openrouter", llmOpenRouter], ["openai", llmOpenAI], ["deepseek", llmDeepSeek], ["gemini", llmGemini],
];

function parseStatus(msg) {
export default {};