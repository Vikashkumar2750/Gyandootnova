// Auto-runner: every 48h, invokes seo-blog-agent to research → write → schedule.
// Also fires the post-publish hook for any posts that were auto-published since last run.
import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, svc);

  const results = { started: new Date().toISOString() };

  // 1) Run the SEO blog agent (writes + schedules an article).
  try {
    const r = await fetch(`${url}/functions/v1/seo-blog-agent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": process.env.SEO_CRON_TOKEN ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({ auto: true, publish_status: "scheduled" }),
    });
    results.agent = { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) {
    results.agent = { error: String(e?.message || e) };
  }

  // 2) Send post-publish hook for any posts published in the last 50h that
  //    have not been reported yet (indexing + email report).
  try {
    const { data: recentlyPublished } = await supabase
      .from("posts")
      .select("id")
      .eq("post_type", "article")
      .eq("is_published", true)
      .is("report_sent_at", null)
      .gte("updated_at", new Date(Date.now() - 50 * 3600 * 1000).toISOString())
      .limit(10);

    const hookResults = [];
    for (const p of recentlyPublished || []) {
      try {
        const r = await fetch(`${url}/functions/v1/seo-post-publish-hook`, {
          method: "POST",
          headers: { Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": process.env.SEO_CRON_TOKEN ?? "", "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: p.id }),
        });
        hookResults.push({ post_id: p.id, status: r.status });
      } catch (e) {
        hookResults.push({ post_id: p.id, error: String(e?.message || e) });
      }
    }
    results.hooks = hookResults;
  } catch (e) {
    results.hooks = { error: String(e?.message || e) };
  }

  results.finished = new Date().toISOString();
  return new Response(JSON.stringify({ success: true, ...results }), {
    headers,
  });
};

export default handler;
