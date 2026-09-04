// Public read-only JSON list of published articles for AI agents.
// CORS wide-open; no auth. Used by /openapi.json operation `list_articles`.
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const q = (url.searchParams.get("q") ?? "").trim();

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let query = sb.from("posts")
    .select("slug, title, excerpt, created_at, updated_at, meta_description", { count: "exact" })
    .eq("is_published", true).eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  const articles = (data ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: (p.excerpt || p.meta_description || "").replace(/<[^>]*>/g, "").slice(0, 500),
    url: `https://gyandootnova.in/articles/${p.slug}`,
    published_at: p.created_at,
    updated_at: p.updated_at,
    language: "hi-IN",
  }));

  return new Response(JSON.stringify({ count: count ?? articles.length, limit, offset, articles }), {
    headers,
  });
};

export default handler;
