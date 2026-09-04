// Daily 09:00 IST orchestrator — the flowchart backbone.
// 1. Refresh book knowledge if stale
// 2. Ensure keyword queue (top up if <30)
// 3. Pop best keyword grounded in book KB
// 4. Uniqueness check against existing posts
// 5. Invoke seo-blog-agent with publish_status=published
// 6. Self-check (readability, originality, seo score)
// 7. Fire seo-post-publish-hook (indexing + email report)
// 8. Ensure queue top-up for tomorrow
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertSeoAuthorized } from "../_shared/seo-auth.ts";

const MIN_QUEUE = 30;

const STOP = new Set("the a an and or but if of to in on for with from by as is are was were be been being this that these those it its at we our you your they them he she his her hai hain ka ke ki ko me mein se par or aur ya bhi wo woh yeh ye kya kyun kaise".split(/\s+/));
function tokens(s: string) {
  return new Set(
    (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}
function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}
function readability(text: string): number {
  const clean = (text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = Math.max(1, (clean.match(/[.!?]+/g) || []).length);
  const words = clean.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((s, w) => s + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  if (!words.length) return 0;
  const flesch = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return Math.max(0, Math.min(100, flesch));
}

async function invokeFn(url: string, svc: string, name: string, body: any) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": Deno.env.get("SEO_CRON_TOKEN") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = null; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: r.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, svc);

  const steps: any[] = [];
  const log = (name: string, info: any) => { steps.push({ step: name, at: new Date().toISOString(), ...info }); };

  // Start run log
  const { data: run } = await sb.from("daily_run_log").insert({ status: "running" }).select().single();
  const runId = run?.id;
  const finish = async (patch: any) =>
    runId && (await sb.from("daily_run_log").update({ ...patch, steps, finished_at: new Date().toISOString() }).eq("id", runId));

  try {
    // 1) Refresh book KB if any book has none / stale
    const { data: kbRows } = await sb.from("book_knowledge").select("updated_at");
    const { count: booksCount } = await sb.from("books").select("*", { count: "exact", head: true });
    const needsKb = !kbRows?.length || (kbRows.length < (booksCount || 0));
    if (needsKb) {
      log("kb_refresh", { reason: "missing_or_incomplete" });
      await invokeFn(url, svc, "seo-book-kb-refresh", {});
    }

    // 2) Load KB for grounding
    const { data: kb } = await sb.from("book_knowledge").select("*");
    const bookTopics = Array.from(new Set((kb || []).flatMap((k: any) => [
      ...(k.topics || []), ...(k.concepts || []), ...(k.keywords || []), ...(k.entities || []),
    ]))).slice(0, 200);
    log("kb_loaded", { topics: bookTopics.length, books: kb?.length || 0 });

    // 3) Ensure queue has candidates
    const { count: queueCount } = await sb.from("seo_keyword_queue")
      .select("*", { count: "exact", head: true }).eq("status", "pending");
    if ((queueCount || 0) < 5) {
      log("queue_topup", { was: queueCount });
      // Kick the agent's research pass by asking it to pull one; it stores candidates.
      await invokeFn(url, svc, "seo-queue-topup", {});
    }

    // 4) Pop best keyword filtered by book relevance
    // Prefer high search-volume keywords first (worldwide traffic), then opportunity score.
    const { data: candidates } = await sb.from("seo_keyword_queue")
      .select("*").eq("status", "pending")
      .order("estimated_volume", { ascending: false, nullsFirst: false })
      .order("opportunity_score", { ascending: false, nullsFirst: false })
      .limit(50);

    const { data: existingPosts } = await sb.from("posts")
      .select("title,slug,primary_keyword,meta_title").limit(500);

    let chosen: any = null;
    for (const cand of candidates || []) {
      const kw = String(cand.keyword || "").toLowerCase();
      const bookMatch = Number(cand.relevance_score || 0) >= 70 || cand.source === "high_volume_worldwide" || bookTopics.some((t: string) =>
        kw.includes(String(t).toLowerCase()) || String(t).toLowerCase().includes(kw));
      if (!bookMatch) continue;
      // uniqueness gate 15%
      const dup = (existingPosts || []).some((p: any) => {
        const s = Math.max(
          similarity(kw, p.title || ""),
          similarity(kw, p.primary_keyword || ""),
          similarity(kw, p.meta_title || ""),
        );
        return s > 0.15;
      });
      if (!dup) { chosen = cand; break; }
      await sb.from("seo_keyword_queue").update({ status: "rejected", reject_reason: "duplicate>15%" }).eq("id", cand.id);
    }

    if (!chosen) {
      // Fallback: let the agent invent one from book topics
      log("no_keyword_in_queue", { candidates: candidates?.length || 0 });
    } else {
      log("keyword_selected", { keyword: chosen.keyword, score: chosen.opportunity_score });
      await sb.from("seo_keyword_queue").update({ status: "processing" }).eq("id", chosen.id);
    }

    // 5) Invoke writer — publish immediately
    const agentBody: any = {
      auto: !chosen,
      publish_status: "published",
      book_context: bookTopics.slice(0, 60),
    };
    if (chosen) agentBody.keyword = chosen.keyword;
    const agentRes = await invokeFn(url, svc, "seo-blog-agent", agentBody);
    log("agent_run", { status: agentRes.status });

    const postId = agentRes.data?.post_id || agentRes.data?.post?.id;
    if (!postId) throw new Error(`agent returned no post_id: ${JSON.stringify(agentRes.data).slice(0, 300)}`);

    // 6) Self-check
    const { data: post } = await sb.from("posts").select("*").eq("id", postId).single();
    const rd = readability(post?.content || "");
    // originality: max similarity of title vs existing published titles
    let origMax = 0;
    for (const p of existingPosts || []) {
      if (p.slug === post?.slug) continue;
      origMax = Math.max(origMax, similarity(post?.title || "", p.title || ""));
    }
    const originality = Math.round((1 - origMax) * 100);
    const seoScore = Number(post?.content_score || 0);
    const passed = seoScore >= 70 && rd >= 55 && originality >= 95;

    await sb.from("posts").update({
      readability_score: rd,
      originality_score: originality,
      quality_passed: passed,
      self_check: {
        seo_score: seoScore,
        readability: rd,
        originality,
        checks: {
          seo_over_70: seoScore >= 70,
          readability_over_55: rd >= 55,
          originality_over_95: originality >= 95,
        },
      },
    }).eq("id", postId);
    log("self_check", { seoScore, rd, originality, passed });

    // 6.1) If originality is below threshold, kick auto-rewrite (async, non-blocking).
    // The rewrite function emails the admin on success or exhausted attempts.
    if (originality < 95) {
      log("auto_rewrite_triggered", { originality });
      invokeFn(url, svc, "seo-auto-rewrite", { post_id: postId, threshold: 95, max_attempts: 3 })
        .catch((e) => log("auto_rewrite_error", { error: String(e?.message || e) }));
    }

    if (chosen) await sb.from("seo_keyword_queue").update({ status: "used", used_at: new Date().toISOString() }).eq("id", chosen.id);

    // 6.5) Hero image — external CDN link only (no upload, no hosting cost, zero load impact)
    try {
      if (!post?.cover_url) {
        const title = post?.title || chosen?.keyword || "spiritual wisdom";
        // Derive 2-3 English-ish keywords for Unsplash search
        const kw = (chosen?.keyword || title)
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .join(",") || "spiritual,india,temple";
        // Unsplash Source — direct hotlink, cached on their CDN, no bandwidth on our side
        const coverUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(kw)},spiritual,india`;
        const alt = `${title} — GyandootNova`.slice(0, 150);
        await sb.from("posts").update({
          cover_url: coverUrl,
          featured_image_alt: alt,
          featured_image_title: title.slice(0, 150),
        }).eq("id", postId);
        log("hero_image_link", { url: coverUrl });
      }
    } catch (e: any) {
      log("hero_image_error", { error: String(e?.message || e) });
    }

    // 7) Publish hook (indexing + report email)
    const hook = await invokeFn(url, svc, "seo-post-publish-hook", { post_id: postId });
    log("publish_hook", { status: hook.status });

    // 8) Ensure future queue >=30 scheduled — fire top-up async
    invokeFn(url, svc, "seo-queue-topup", {}).catch(() => {});

    await finish({
      status: "success",
      keyword: chosen?.keyword || post?.primary_keyword,
      keyword_score: chosen?.opportunity_score,
      post_id: postId,
      seo_score: seoScore,
      readability_score: rd,
      originality_score: originality,
      self_check: { passed, seoScore, rd, originality },
    });

    return new Response(JSON.stringify({ success: true, post_id: postId, passed, seoScore, rd, originality, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("error", { error: String(e?.message || e) });
    await finish({ status: "failed", error: String(e?.message || e) });
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e), steps }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
