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
export default {};