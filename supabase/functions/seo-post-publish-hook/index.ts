// Post-publish hook: submit URL to GSC + send email report via Resend.
// Called with { post_id } after a post is published.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertSeoAuthorized } from "../_shared/seo-auth.ts";

const SITE = "https://gyandootnova.in";
const GSC_SITE_URL = "https://gyandootnova.in/";
const REPORT_TO = "gyandootnova57@gmail.com";
const GATEWAY = "https://connector-gateway.lovable.dev";

async function submitToGsc(articleUrl: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !gscKey) return { ok: false, error: "GSC connector not configured" };

  const results: any = {};
  // 1) Resubmit sitemap so Google notices the new URL.
  try {
    const sitemapEncoded = encodeURIComponent(`${SITE}/sitemap.xml`);
    const siteEncoded = encodeURIComponent(GSC_SITE_URL);
    const r = await fetch(
      `${GATEWAY}/google_search_console/webmasters/v3/sites/${siteEncoded}/sitemaps/${sitemapEncoded}`,
      { method: "PUT", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey } },
    );
    results.sitemap = { status: r.status, ok: r.ok };
  } catch (e: any) {
    results.sitemap = { ok: false, error: String(e?.message || e) };
  }
  // 2) URL inspection so we get current index state.
  try {
    const r = await fetch(`${GATEWAY}/google_search_console/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gscKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: articleUrl, siteUrl: GSC_SITE_URL }),
    });
    const body = await r.json().catch(() => ({}));
    results.inspection = { status: r.status, verdict: body?.inspectionResult?.indexStatusResult?.verdict, coverage: body?.inspectionResult?.indexStatusResult?.coverageState };
  } catch (e: any) {
    results.inspection = { ok: false, error: String(e?.message || e) };
  }
  return { ok: true, ...results };
}

async function generateCaptions(post: any) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const r = await fetch(`${supabaseUrl}/functions/v1/seo-social-captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": Deno.env.get("SEO_CRON_TOKEN") ?? "" },
      body: JSON.stringify({ post_id: post.id }),
    });
    const j = await r.json().catch(() => ({}));
    return j?.captions || j?.data || j || null;
  } catch { return null; }
}

function buildShareBlock(post: any, captions: any) {
  const url = `${SITE}/articles/${post.slug}`;
  const enc = encodeURIComponent;
  const text = enc(post.title);
  const links: Record<string, string> = {
    WhatsApp: `https://wa.me/?text=${text}%20${enc(url)}`,
    Twitter: `https://twitter.com/intent/tweet?text=${text}&url=${enc(url)}`,
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    Telegram: `https://t.me/share/url?url=${enc(url)}&text=${text}`,
    Pinterest: `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${text}`,
    Reddit: `https://www.reddit.com/submit?url=${enc(url)}&title=${text}`,
  };
  const buttons = Object.entries(links).map(([k, v]) =>
    `<a href="${v}" style="display:inline-block;padding:8px 14px;margin:4px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-size:13px">Share on ${k}</a>`
  ).join("");
  const capBlock = captions ? Object.entries(captions).map(([platform, cap]) =>
    `<div style="margin:12px 0;padding:12px;background:#f8f9fa;border-radius:6px"><b style="text-transform:capitalize;color:#0f766e">${platform}</b><pre style="white-space:pre-wrap;font-family:inherit;margin:6px 0 0;font-size:13px">${String(cap).replace(/</g, "&lt;")}</pre></div>`
  ).join("") : "<p style='color:#888'>Captions unavailable.</p>";
  return `
    <h2 style="color:#0f766e;margin:24px 0 8px">One-click share (backlink signals)</h2>
    <div>${buttons}</div>
    <h2 style="color:#0f766e;margin:24px 0 8px">Ready-to-paste captions</h2>
    ${capBlock}`;
}

async function sendReport(post: any, indexingResult: any, captions: any) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !lovableKey) return { ok: false, error: "Resend not configured" };

  const url = `${SITE}/articles/${post.slug}`;
  const shareBlock = buildShareBlock(post, captions);
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
      <h1 style="color:#0f766e;margin:0 0 8px">New Post Published</h1>
      <p style="color:#555;margin:0 0 24px">GyandootNova SEO Agent Report</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Title</b></td><td style="padding:8px;border-bottom:1px solid #eee">${post.title || ""}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>URL</b></td><td style="padding:8px;border-bottom:1px solid #eee"><a href="${url}">${url}</a></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Primary Keyword</b></td><td style="padding:8px;border-bottom:1px solid #eee">${post.primary_keyword || "—"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Meta Title</b></td><td style="padding:8px;border-bottom:1px solid #eee">${post.meta_title || ""}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Index status</b></td><td style="padding:8px;border-bottom:1px solid #eee">${indexingResult?.inspection?.verdict || "unknown"} · ${indexingResult?.inspection?.coverage || ""}</td></tr>
      </table>

      ${shareBlock}

      <p style="margin-top:24px;color:#666;font-size:12px">Automated by GyandootNova SEO Command Center.</p>
    </div>`;

  const r = await fetch(`${GATEWAY}/resend/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GyandootNova SEO <onboarding@resend.dev>",
      to: [REPORT_TO],
      subject: `[Publish + Share] ${post.title}`,
      html,
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { post_id } = await req.json();
    if (!post_id) throw new Error("post_id required");

    const { data: post, error } = await supabase.from("posts").select("*").eq("id", post_id).maybeSingle();
    if (error) throw error;
    if (!post) throw new Error("post not found");

    const url = `${SITE}/articles/${post.slug}`;
    const indexing = await submitToGsc(url);
    const captions = await generateCaptions(post);
    const report = await sendReport(post, indexing, captions);

    await supabase.from("posts").update({
      indexing_submitted_at: indexing.ok ? new Date().toISOString() : null,
      report_sent_at: report.ok ? new Date().toISOString() : null,
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, indexing, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
