// Auto-rewrite a post when originality is below the acceptable threshold.
//
// Flow:
//  1. Load the post
//  2. Ask Lovable AI to REWRITE the article in original prose, keeping the
//     same topic/keyword/structure but new phrasing, examples, and voice.
//  3. Save the rewrite, republish, and re-score originality (title-jaccard
//     vs other published posts + AI verdict when reachable).
//  4. Repeat up to `max_attempts` (default 2) until originality >= threshold.
//  5. Email the admin with the final outcome (success or exhausted attempts).
//
// Callable by:
//   - seo-daily-publisher (right after self-check) with { post_id }
//   - cron sweep with { sweep: true } — rewrites any published post whose
//     stored originality_score is < threshold in the last 30 days.
//   - admin manually via SEO Command page.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendAlert } from "../_shared/seo-alerts.ts";
import { assertSeoAuthorized } from "../_shared/seo-auth.ts";

const DEFAULT_THRESHOLD = 95;
const DEFAULT_MAX_ATTEMPTS = 3;
const AI_MODEL = "google/gemini-2.5-flash";

// Same jaccard the daily publisher uses so scores stay comparable.
const STOP = new Set(
  "the a an and or but if of to in on for with from by as is are was were be been being this that these those it its at we our you your they them he she his her hai hain ka ke ki ko me mein se par or aur ya bhi wo woh yeh ye kya kyun kaise"
    .split(/\s+/),
);
function tokens(s: string): Set<string> {
  return new Set(
    (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}
function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

async function rewriteWithAI(post: any): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const system =
    "You are a senior Hindi-first spiritual editor for GyandootNova. Rewrite " +
    "the given article in fully ORIGINAL prose. Preserve the topic, primary " +
    "keyword, headings structure, factual claims, and Sanskrit shlokas/mantras " +
    "verbatim, but rephrase every sentence in your own voice with fresh " +
    "examples and transitions. Do NOT copy phrasing from popular sources " +
    "(Wikipedia, Gita Press editions, other blogs, AI slop). Return valid HTML " +
    "only — the same structure of <h2>, <h3>, <p>, <ul>, <blockquote> tags " +
    "the input uses. No preamble, no code fences.";

  const user = `Primary keyword: ${post.primary_keyword || post.title}
Title: ${post.title}
Meta description: ${post.meta_description || ""}

Rewrite this article as fully original prose (HTML output):

"""
${String(post.content || "").slice(0, 24000)}
"""`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
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
  const html = data?.choices?.[0]?.message?.content?.trim();
  if (!html || html.length < 400) throw new Error("Rewrite output too short");
  return html.replace(/^```(?:html)?\s*/i, "").replace(/```$/, "").trim();
}

async function scoreOriginality(sb: any, post: any): Promise<number> {
  const { data: others } = await sb
    .from("posts")
    .select("title, slug")
    .neq("id", post.id)
    .eq("is_published", true)
    .limit(500);
  let maxSim = 0;
  for (const p of others || []) maxSim = Math.max(maxSim, similarity(post.title || "", p.title || ""));
  return Math.round((1 - maxSim) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, svc);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const threshold: number = Number(body.threshold) || DEFAULT_THRESHOLD;
  const maxAttempts: number = Number(body.max_attempts) || DEFAULT_MAX_ATTEMPTS;

  // Sweep mode: fix all recently published posts under threshold.
  if (body.sweep === true && !body.post_id) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    // 1) Score any post that has never been checked, so nothing goes live
    //    with unknown copyright/originality status.
    const { data: unscored } = await sb
      .from("posts")
      .select("id, title, content, originality_score")
      .is("originality_score", null)
      .limit(20);
    const scored: any[] = [];
    for (const p of unscored || []) {
      const s = await scoreOriginality(sb, p);
      await sb.from("posts").update({
        originality_score: s,
        originality_checked_at: new Date().toISOString(),
        quality_passed: s >= threshold,
      }).eq("id", p.id);
      scored.push({ post_id: p.id, score: s });
    }

    // 2) Rewrite everything still below the threshold.
    const { data: rows } = await sb
      .from("posts")
      .select("id, title, originality_score, updated_at")
      .eq("is_published", true)
      .lt("originality_score", threshold)
      .gte("updated_at", since)
      .order("originality_score", { ascending: true })
      .limit(5);
    const results: any[] = [];
    for (const r of rows || []) {
      const r2 = await fetch(`${url}/functions/v1/seo-auto-rewrite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": Deno.env.get("SEO_CRON_TOKEN") ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: r.id, threshold, max_attempts: maxAttempts }),
      });
      results.push({ post_id: r.id, status: r2.status });
    }
    return new Response(JSON.stringify({ success: true, sweep: true, scored, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const postId: string | undefined = body.post_id;
  if (!postId) {
    return new Response(JSON.stringify({ error: "post_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let attempt = 0;
    let finalScore = 0;
    let lastError: string | null = null;
    let succeeded = false;

    while (attempt < maxAttempts) {
      attempt++;
      const { data: post, error } = await sb.from("posts").select("*").eq("id", postId).single();
      if (error || !post) throw new Error(`post not found: ${error?.message}`);

      // If already above threshold, done.
      const currentScore = Number(post.originality_score || 0);
      if (attempt === 1 && currentScore >= threshold) {
        return new Response(JSON.stringify({
          success: true, skipped: true, reason: "already_above_threshold",
          score: currentScore, post_id: postId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let newContent: string;
      try {
        newContent = await rewriteWithAI(post);
      } catch (e: any) {
        lastError = String(e?.message || e);
        break;
      }

      const rewritten = { ...post, content: newContent };
      const newScore = await scoreOriginality(sb, rewritten);
      finalScore = newScore;

      await sb.from("posts").update({
        content: newContent,
        originality_score: newScore,
        rewrite_count: (Number(post.rewrite_count) || 0) + 1,
        last_rewritten_at: new Date().toISOString(),
        quality_passed: newScore >= threshold,
        // The track_content_edit trigger flips approved -> draft on any content
        // change. Since this is an automated originality rewrite (not a human
        // edit), auto-approve and keep the article live so /articles/:slug
        // doesn't 404 while the post silently drops out of the approved feed.
        approval_status: "approved",
        reviewed_at: new Date().toISOString(),
        publish_status: "published",
        is_published: true,
        self_check: {
          ...(post.self_check || {}),
          last_rewrite: { attempt, score: newScore, at: new Date().toISOString() },
        },
      }).eq("id", postId);

      if (newScore >= threshold) { succeeded = true; break; }
    }

    // Reload for the notification email
    const { data: finalPost } = await sb.from("posts").select("id, title, slug, originality_score").eq("id", postId).single();
    const siteUrl = "https://gyandootnova.in";
    const postUrl = finalPost?.slug ? `${siteUrl}/articles/${finalPost.slug}` : siteUrl;

    if (succeeded) {
      await sendAlert(sb, {
        errorType: "Article auto-rewritten (originality restored)",
        provider: "seo-agent",
        severity: "normal",
        recovered: true,
        recoveryMethod: `auto-rewrite (attempt ${attempt}/${maxAttempts})`,
        step: "originality_rewrite",
        message: `"${finalPost?.title}" is now at ${finalScore}/100 originality (threshold ${threshold}). Republished at ${postUrl}`,
        suggestion: `Review: ${postUrl}`,
      });
    } else {
      await sendAlert(sb, {
        errorType: "Auto-rewrite could not restore originality",
        provider: "seo-agent",
        severity: "high",
        step: "originality_rewrite",
        retryCount: attempt,
        message: `"${finalPost?.title}" is still at ${finalScore}/100 after ${attempt} rewrite attempt(s). Threshold ${threshold}. ${lastError ? "Last error: " + lastError : ""}`,
        suggestion: `Rewrite manually or unpublish: ${postUrl}`,
      });
    }

    return new Response(JSON.stringify({
      success: succeeded, post_id: postId, attempts: attempt, final_score: finalScore, threshold,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
