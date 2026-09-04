// Extracts topics, entities, concepts, keywords and FAQs from every book
// in the library and stores them in `book_knowledge` for grounding the
// daily blog automation. Uses Lovable AI Gateway (Gemini flash).
import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { assertSeoAuthorized } from "../lib/seo-auth.js";

const MODEL = "google/gemini-2.5-flash";

function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractOne(book, chapters) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const chapterSummary = chapters
    .slice(0, 20)
    .map((c) => `Ch ${c.chapter_number}: ${c.title}\n${stripHtml(c.content || "").slice(0, 800)}`)
    .join("\n\n");

  const prompt = `You are a librarian building a searchable knowledge base for a Hindu spiritual publisher.
Analyse this book and return STRICT JSON only.

Book: "${book.title}" by ${book.author}
Category: ${book.category}
Description: ${book.description || ""}

Chapter snippets:
${chapterSummary || "(no chapters)"}

Return JSON with this exact shape:
{
  "summary": "3-4 sentence English summary",
  "topics": ["...", "..."],        // 8-15 broad topics readers care about
  "entities": ["...", "..."],      // deities, sages, places, texts mentioned
  "concepts": ["...", "..."],      // philosophical/spiritual concepts (dharma, karma etc.)
  "keywords": ["...", "..."],      // 20-30 SEO seed keywords (mix of Hindi Roman + English)
  "faqs": [{"q":"...", "a":"..."}] // 5-8 real questions readers ask
}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format,
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  return {
    summary: parsed.summary || "",
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 20) : [],
    entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 30) : [],
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 20) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 40) : [],
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 10) : [],
  };
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;
  const url = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, svc);

  const body = await req.json().catch(() => ({}));
  const force = body.force === true;

  const { data: books } = await sb.from("books").select("id,title,author,category,description");
  const results = [];

  for (const book of books || []) {
    try {
      if (!force) {
        const { data: existing } = await sb
          .from("book_knowledge")
          .select("updated_at")
          .eq("book_id", book.id)
          .maybeSingle();
        if (existing?.updated_at) {
          const ageH = (Date.now() - new Date(existing.updated_at).getTime()) / 3600000;
          if (ageH < 24 * 7) {
            results.push({ book: book.title, skipped: "fresh" });
            continue;
          }
        }
      }
      const { data: chapters } = await sb
        .from("book_chapters")
        .select("chapter_number,title,content")
        .eq("book_id", book.id)
        .order("chapter_number");
      const kb = await extractOne(book, chapters || []);
      await sb.from("book_knowledge").upsert(
        {
          book_id: book.id,
          title: book.title,
          author: book.author,
          ...kb,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id" },
      );
      results.push({ book: book.title, ok: true, keywords: kb.keywords.length });
    } catch (e) {
      results.push({ book: book.title, error: String(e?.message || e) });
    }
  }

  return new Response(JSON.stringify({ success: true, count: results.length, results }), {
    headers,
  });
};

export default handler;
