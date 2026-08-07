// Public read-only JSON for a single article, by slug. For AI agents.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: cors });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await sb.from("posts")
    .select("slug, title, excerpt, content, meta_description, created_at, updated_at, originality_score")
    .eq("slug", slug).eq("is_published", true).eq("approval_status", "approved")
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  if (!data) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: cors });

  const articleUrl = `https://gyandootnova.in/articles/${data.slug}`;
  return new Response(JSON.stringify({
    slug: data.slug,
    title: data.title,
    excerpt: (data.excerpt || data.meta_description || "").replace(/<[^>]*>/g, "").slice(0, 500),
    content_html: data.content,
    url: articleUrl,
    published_at: data.created_at,
    updated_at: data.updated_at,
    author: "GyandootNova Editorial Team",
    originality_score: data.originality_score ?? null,
    language: "hi-IN",
    citation: `Source: GyandootNova — ${articleUrl}`,
    license: "Attribution required. See https://gyandootnova.in/ai.txt",
  }), { headers: { ...cors, "Cache-Control": "public, max-age=300" } });
});
