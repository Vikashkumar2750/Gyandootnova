// Ensures the scheduled-posts queue never drops below MIN_SCHEDULED.
// Runs every 6 hours via pg_cron. Invokes seo-blog-agent in batches
// with publish_status='scheduled' and staggered scheduled_at dates.
import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const MIN_SCHEDULED = 30;
const MAX_PER_RUN = 5; // safety: don't burn tokens in one shot

async function invokeFn(url, svc, name, body) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${svc}`, apikey: svc, "x-cron-secret": process.env.SEO_CRON_TOKEN ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; } catch { return { status: r.status, data }; }
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;
  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, svc);

  const { count } = await sb.from("posts")
    .select("*", { count: "exact", head: true })
    .eq("post_type", "article")
    .eq("publish_status", "scheduled")
    .gt("scheduled_at", new Date().toISOString());

  const scheduled = count || 0;
  const need = Math.max(0, MIN_SCHEDULED - scheduled);
  const toGenerate = Math.min(need, MAX_PER_RUN);

  if (toGenerate === 0) {
    return new Response(JSON.stringify({ success: true, scheduled, need: 0 }), {
      headers,
    });
  }

  const { data: kb } = await sb.from("book_knowledge").select("topics,concepts,keywords,entities");
  const bookTopics = Array.from(new Set((kb || []).flatMap((k) => [
    ...(k.topics || []), ...(k.concepts || []), ...(k.keywords || []), ...(k.entities || []),
  ]))).slice(0, 60);

  const results = [];
  for (let i = 0; i < toGenerate; i++) {
    try {
      const r = await invokeFn(url, svc, "seo-blog-agent", {
        auto: true,
        publish_status: "scheduled",
        batch_index: scheduled + i,
        book_context: bookTopics,
      });
      results.push({ i, status: r.status, post_id: r.data?.post_id });
    } catch (e) {
      results.push({ i, error: String(e?.message || e) });
    }
  }

  return new Response(JSON.stringify({ success: true, scheduled, generated: results.length, results }), {
    headers,
  });
};

export default handler;
