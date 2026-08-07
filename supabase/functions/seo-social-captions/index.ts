// Generate platform-specific social captions + hashtags for a post using Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertSeoAuthorized } from "../_shared/seo-auth.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const SITE = "https://gyandootnova.in";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { post_id } = await req.json();
    const { data: post, error } = await supabase.from("posts").select("id,title,slug,excerpt,primary_keyword,secondary_keywords,meta_description").eq("id", post_id).maybeSingle();
    if (error) throw error;
    if (!post) throw new Error("post not found");

    const url = `${SITE}/articles/${post.slug}`;
    const prompt = `Generate ready-to-post social media captions for this spiritual/self-growth article.

Title: ${post.title}
URL: ${url}
Excerpt: ${post.excerpt || post.meta_description || ""}
Primary keyword: ${post.primary_keyword || ""}
Secondary keywords: ${(post.secondary_keywords || []).join(", ")}

Return STRICT JSON with keys (no markdown, no explanation):
{
  "facebook": "1-2 short paras + 3 hashtags",
  "instagram": "punchy hook + 3 line breaks + 8-12 relevant hashtags",
  "linkedin": "professional insight, 3-4 lines, 3 hashtags",
  "twitter": "under 240 chars incl URL + 2 hashtags",
  "pinterest": "SEO-rich description under 200 chars + 3 hashtags",
  "threads": "conversational hook 2-3 lines",
  "telegram": "1 short para + URL",
  "whatsapp": "short share-friendly text + URL",
  "youtube_community": "question hook + 2 lines + URL",
  "hashtags": ["10 relevant hashtags including brand and topic"],
  "featured_image_prompt": "detailed AI image prompt for a serene spiritual-themed cover"
}`;

    const r = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`AI ${r.status}: ${text.slice(0, 300)}`);
    }
    const body = await r.json();
    const raw = body?.choices?.[0]?.message?.content || "{}";
    const captions = JSON.parse(raw);

    await supabase.from("posts").update({ social_captions: captions }).eq("id", post.id);

    return new Response(JSON.stringify({ success: true, captions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
