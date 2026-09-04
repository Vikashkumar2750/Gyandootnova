// Sync last-28d GSC metrics into posts + return aggregated stats for dashboard.
import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const GATEWAY = "https://connector-gateway.lovable.dev";
const SITE = "https://gyandootnova.in";
const GSC_SITE_URL = "https://gyandootnova.in/";

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) {
    return new Response(JSON.stringify({ success: false, error: "GSC connector not configured" }), {
      status: 500, headers,
    });
  }

  const end = new Date();
  const start = new Date(end.getTime() - 28 * 86400 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  try {
    // Site-wide totals
    const totalsRes = await fetch(
      `${GATEWAY}/google_search_console/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: [], rowLimit: 1 }),
      },
    );
    const totalsBody = await totalsRes.json().catch(() => ({}));
    const totals = totalsBody?.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    // Per-page metrics
    const pagesRes = await fetch(
      `${GATEWAY}/google_search_console/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: ["page"], rowLimit: 500 }),
      },
    );
    const pagesBody = await pagesRes.json().catch(() => ({}));
    const pageRows = pagesBody?.rows || [];

    // Top queries
    const queriesRes = await fetch(
      `${GATEWAY}/google_search_console/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: ["query"], rowLimit: 25 }),
      },
    );
    const queriesBody = await queriesRes.json().catch(() => ({}));

    // Update matching posts by slug
    let updated = 0;
    for (const row of pageRows) {
      const url = row.keys?.[0] || "";
      const m = url.match(/\/articles\/([^/?#]+)/);
      if (!m) continue;
      const slug = m[1];
      const { error } = await supabase.from("posts").update({
        gsc_clicks: Math.round(row.clicks || 0),
        gsc_impressions: Math.round(row.impressions || 0),
        gsc_ctr: row.ctr || 0,
        gsc_position: row.position || null,
      }).eq("slug", slug);
      if (!error) updated++;
    }

    return new Response(JSON.stringify({
      success: true,
      range,
      totals,
      top_pages: pageRows.slice(0, 15),
      top_queries: queriesBody?.rows || [],
      updated_posts: updated,
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500, headers,
    });
  }
};

export default handler;
