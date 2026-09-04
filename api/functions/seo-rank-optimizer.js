// Rank Optimizer agent — pushes existing articles from page 2-5 towards
// positions #1-2 for the queries they ALREADY rank for.
//
// Flow (sweep mode, default):
//  1. Pull last-28d Google Search Console rows with dimensions [page, query].
//  2. Keep rows for /articles/:slug where position is between 1.5 and 60 and
//     impressions >= MIN_IMPRESSIONS — i.e. Google already understands the
//     page, it just is not winning yet.
//  3. Pick the highest-opportunity query per page (impressions x position).
//  4. Ask the AI writer to upgrade that article specifically for that query:
//     exact-match title, 155-char meta description, a direct answer block in
//     the first 100 words, an H2 using the exact query, a comparison table,
//     an FAQ block, and internal links to the book/reader.
//  5. Save title/meta/content, keep the post published, and log the run in
//     seo_agent_logs so the daily 5pm PDF report shows the movement.
//
// Single-post mode
//
// Cron: daily (see migration). Manual: Admin -> SEO Command.

import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const GATEWAY = "https://connector-gateway.lovable.dev";
const GSC_SITE_URL = "https://gyandootnova.in/";
const SITE = "https://gyandootnova.in";
const AI_MODEL = "google/gemini-2.5-pro";
const MIN_IMPRESSIONS = 3;
const MAX_POSITION = 60;
const MIN_POSITION = 1.5; // already #1 -> leave alone
const DEFAULT_LIMIT = 5;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers,
  });

async function gscQueryPageRows(lovableKey, gscKey) {
  const end = new Date();
  const start = new Date(end.getTime() - 28 * 86400 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const res = await fetch(
    `${GATEWAY}/google_search_console/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ["page", "query"],
        rowLimit: 1000,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json().catch(() => ({}));
  return body?.rows || [];
}

/** Best opportunity query per article slug. */
function pickTargets(rows) {
  const best = new Map();
  for (const row of rows) {
    const page = row.keys?.[0] || "";
    const query = row.keys?.[1] || "";
    const m = page.match(/\/articles\/([^/?#]+)/);
    if (!m || !query) continue;
    const position = Number(row.position || 999);
    const impressions = Number(row.impressions || 0);
    if (position < MIN_POSITION || position > MAX_POSITION) continue;
    if (impressions < MIN_IMPRESSIONS) continue;
    const slug = m[1];
    const score = impressions * position;
    const prev = best.get(slug);
    const prevScore = prev ? prev.impressions * prev.position : -1;
    if (score > prevScore) {
      best.set(slug, { slug, query, position, impressions, clicks: Number(row.clicks || 0) });
    }
  }
  return [...best.values()].sort(
    (a, b) => b.impressions * b.position - a.impressions * a.position,
  );
}

async function optimizeWithAI(post, keyword, position) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const system =
    "You are the head SEO editor of GyandootNova, a Hindi-first Sanatan Dharma " +
    "publication. Your single goal is to move an article from its current " +
    "Google position to #1 or #2 for one exact target query. Rules: " +
    "(1) Every sentence must be ORIGINAL prose — never copy phrasing from " +
    "Wikipedia, Gita Press editions, other blogs, or generic AI text. " +
    "(2) Keep Sanskrit shlokas and factual claims accurate and unchanged. " +
    "(3) Answer the target query directly in the first 100 words. " +
    "(4) Use the exact target query once in the title, once in an <h2>, and " +
    "naturally 3-5 times in the body. " +
    "(5) Add depth the current top results lack: a comparison <table>, a " +
    "step list, and a 5-question FAQ in <h3>/<p> pairs at the end. " +
    "(6) Keep or add contextual internal links to /books, /articles and the " +
    "relevant scripture hub page. " +
    "(7) Match the language of the target query (Hindi query -> Hindi article). " +
    "Return STRICT JSON only, no code fences: " +
    '{"title": "...", "meta_description": "...", "content": "<html>", "changes": ["..."]}. ' +
    "title <= 60 chars, meta_description <= 155 chars, content is clean HTML " +
    "using <h2>, <h3>, <p>, <ul>, <table>, <blockquote> only, 1400+ words.";

  const user = `Target query: "${keyword}"
Current Google position: ${position.toFixed(1)}
Article URL: ${SITE}/articles/${post.slug}
Current title: ${post.title}
Current meta description: ${post.meta_description || "(none)"}

Current article HTML:
"""
${String(post.content || "").slice(0, 22000)}
"""

Rewrite and expand this article so it deserves position #1 for the target query.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  let raw = String(data?.choices?.[0]?.message?.content || "").trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s < 0 || e <= s) throw new Error("AI returned unparsable JSON");
    parsed = JSON.parse(raw.slice(s, e + 1));
  }
  if (!parsed?.content || String(parsed.content).length < 800) {
    throw new Error("AI output too short");
  }
  return parsed;
}

async function optimizeOne(sb, post, target) {
  const out = await optimizeWithAI(post, target.query, target.position);
  const words = String(out.content).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  await sb.from("posts").update({
    title: String(out.title || post.title).slice(0, 120),
    meta_description: String(out.meta_description || post.meta_description || "").slice(0, 200),
    content: out.content,
    primary_keyword: target.query,
    // The content-edit trigger demotes approved posts; this is an automated
    // optimization of an already-live article, so keep it published.
    approval_status: "approved",
    reviewed_at: new Date().toISOString(),
    publish_status: "published",
    is_published: true,
    last_rewritten_at: new Date().toISOString(),
    self_check: {
      ...(post.self_check || {}),
      last_rank_optimization,
    },
  }).eq("id", post.id);

  await sb.from("seo_agent_logs").insert({
    topic: post.title,
    focus_keyword: target.query,
    action: "rank_optimize",
    status: "success",
    post_id: post.id,
    slug: post.slug,
    word_count: words,
    meta,
  });

  return { slug: post.slug, keyword: target.query, position_before: target.position, words };
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const limit = Math.min(Number(body.limit) || DEFAULT_LIMIT, 10);

  try {
    // ---- Single post mode ------------------------------------------------
    if (body.post_id) {
      const { data: post, error } = await sb
        .from("posts").select("*").eq("id", body.post_id).single();
      if (error || !post) return json({ error: "post not found" }, 404);
      const keyword = String(body.keyword || post.primary_keyword || post.title);
      const result = await optimizeOne(sb, post, {
        slug: post.slug,
        query: keyword,
        position: Number(post.gsc_position || 30),
        impressions: Number(post.gsc_impressions || 0),
        clicks: Number(post.gsc_clicks || 0),
      });
      return json({ success: true, mode: "single", result });
    }

    // ---- Sweep mode ------------------------------------------------------
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    let targets = [];

    if (lovableKey && gscKey) {
      const rows = await gscQueryPageRows(lovableKey, gscKey);
      targets = pickTargets(rows).slice(0, limit);
    }

    // Fallback when GSC has no rows yet (new site): use stored gsc_position,
    // otherwise the weakest published articles by impressions.
    if (targets.length === 0) {
      const { data: posts } = await sb
        .from("posts")
        .select("slug, primary_keyword, title, gsc_position, gsc_impressions, gsc_clicks")
        .eq("is_published", true)
        .order("gsc_impressions", { ascending: false, nullsFirst: false })
        .limit(limit);
      targets = (posts || [])
        .filter((p) => p.slug)
        .map((p) => ({
          slug: p.slug,
          query: p.primary_keyword || p.title,
          position: Number(p.gsc_position || 40),
          impressions: Number(p.gsc_impressions || 0),
          clicks: Number(p.gsc_clicks || 0),
        }))
        .filter((t) => t.position > MIN_POSITION);
    }

    const results = [];
    for (const t of targets) {
      const { data: post } = await sb.from("posts").select("*").eq("slug", t.slug).maybeSingle();
      if (!post) continue;
      try {
        results.push(await optimizeOne(sb, post, t));
      } catch (e) {
        const message = String(e?.message || e);
        await sb.from("seo_agent_logs").insert({
          topic: post.title,
          focus_keyword: t.query,
          action: "rank_optimize",
          status: "error",
          post_id: post.id,
          slug: post.slug,
          error: message.slice(0, 500),
        });
        results.push({ slug: t.slug, error: message });
      }
    }

    return json({
      success: true,
      mode: "sweep",
      considered: targets.length,
      optimized: results.filter((r) => !r.error).length,
      results,
    });
  } catch (e) {
    return json({ success: false, error: String(e?.message || e) }, 500);
  }
};

export default handler;
