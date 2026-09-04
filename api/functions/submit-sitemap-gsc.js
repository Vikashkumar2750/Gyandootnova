// Submits the site's sitemap.xml to Google Search Console via the connector gateway.
// Callable by admins only. Uses GOOGLE_SEARCH_CONSOLE_API_KEY connector secret + LOVABLE_API_KEY.
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://gyandootnova.in/";
const SITEMAP_URL = "https://gyandootnova.in/sitemap.xml";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GSC_KEY = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!LOVABLE_API_KEY || !GSC_KEY) {
    return json({ error: "Google Search Console connector not configured" }, 500);
  }

  // AuthN + admin check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers } },
  );
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const headers = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GSC_KEY,
  };

  // 1) List verified sites and pick the matching one
  const sitesRes = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!sitesRes.ok) {
    const body = await sitesRes.text();
    console.error("GSC sites list failed", sitesRes.status, body);
    return json({ error: "Failed to list verified sites", status: sitesRes.status, details: body }, sitesRes.status);
  }
  const sitesJson = await sitesRes.json();
  const entries = sitesJson?.siteEntry ?? [];
  const match = entries.find((e) => e.siteUrl === SITE_URL)
    ?? entries.find((e) => e.siteUrl === `sc-domain:gyandootnova.in`)
    ?? entries[0];
  if (!match) return json({ error: "No verified GSC properties found for this account" }, 404);

  // 2) Submit sitemap
  const submitUrl = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(match.siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
  const submitRes = await fetch(submitUrl, { method: "PUT", headers });
  if (!submitRes.ok && submitRes.status !== 204) {
    const body = await submitRes.text();
    console.error("GSC sitemap submit failed", submitRes.status, body);
    return json({ error: "Sitemap submit failed", status: submitRes.status, details: body }, submitRes.status);
  }

  return json({ ok: true, siteUrl: match.siteUrl, sitemap: SITEMAP_URL, submittedAt: new Date().toISOString() });
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

export default handler;
