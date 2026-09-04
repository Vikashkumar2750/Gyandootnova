// GyandootNova Editorial Agent
// A single autonomous "writer user" that:
//   1. researches devotional keywords from live search engines (trend aware)
//   2. rejects topics that already exist on the site (duplicate guard)
//   3. writes a long-form, SEO-optimised Hindi article (NVIDIA / OpenRouter LLMs)
//   4. gets it audited by a DIFFERENT model (editor pass) with a scorecard
//   5. rewrites until every gate passes (or gives up and saves a draft)
//   6. injects contextual backlinks to the store's books wherever they fit
//   7. publishes only when the whole checklist is green
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildKeyResolver } from "../_shared/ai-key-resolver.ts";
import { assertSeoAuthorized } from "../_shared/seo-auth.ts";
import {
  callChain, parseJson, WRITER_CHAIN, REVIEWER_CHAIN, ChatMsg,
} from "../_shared/llm-multi.ts";

const SITE = "https://gyandootnova.in";
// The dedicated editorial "user" that owns every article this agent writes.
const AGENT_AUTHOR = "Gyandoot Editorial Desk";
const PILLARS = [
  "sahasranama (सहस्रनाम)",
  "aarti (आरती)",
  "rigved / vedic mantras (ऋग्वेद)",
  "devotional stories (भक्ति कथा)",
];
const MIN_WORDS = 1600;
const MAX_REVISIONS = 3;
const PASS_SCORE = 85;              // editor scorecard gate
const MAX_INTERNAL_SIMILARITY = 0.55; // vs existing posts
const MAX_SOURCE_OVERLAP = 0.18;      // vs research snippets (plagiarism proxy)

// ── text utils ───────────────────────────────────────────────────────
const STOP = new Set("the a an and or but if of to in on for with from by as is are was were be been this that these those it its at we our you your they them his her hai hain ka ke ki ko me mein se par aur ya bhi wo woh yeh ye kya kyun kaise ek liye hota hoti karne kar".split(/\s+/));
const strip = (h: string) => String(h || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
function words(s: string) { return strip(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean); }
function tokens(s: string) { return new Set(words(s).filter(w => w.length > 2 && !STOP.has(w))); }
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let i = 0; for (const t of a) if (b.has(t)) i++;
  return i / (a.size + b.size - i);
}
function shingles(s: string, n = 6): Set<string> {
  const w = words(s); const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}
/** fraction of the article's 6-gram shingles that also appear in the sources */
function overlapRatio(article: string, corpus: string): number {
  const a = shingles(article); const c = shingles(corpus);
  if (!a.size || !c.size) return 0;
  let hit = 0; for (const s of a) if (c.has(s)) hit++;
  return hit / a.size;
}
function slugify(s: string) {
  return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
const esc = (s: string) => String(s || "").replace(/"/g, "&quot;");
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error(`timeout ${ms}ms`)), ms))]);
}

// ── search providers (keyword + trend research) ──────────────────────
type Source = { url: string; title: string; snippet: string; provider: string };

async function searchTavily(q: string, key: string, news = false): Promise<Source[]> {
  const r = await withTimeout(fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query: q, max_results: 6, search_depth: "advanced", topic: news ? "news" : "general" }),
  }), 30000);
  if (!r.ok) throw new Error(`tavily ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x: any) => ({ url: x.url, title: x.title || "", snippet: x.content || "", provider: "tavily" }));
}
async function searchExa(q: string, key: string): Promise<Source[]> {
  const r = await withTimeout(fetch("https://api.exa.ai/search", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query: q, numResults: 6, type: "neural", contents: { text: { maxCharacters: 800 } } }),
  }), 30000);
  if (!r.ok) throw new Error(`exa ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x: any) => ({ url: x.url, title: x.title || "", snippet: x.text || "", provider: "exa" }));
}
async function searchSerp(q: string, key: string): Promise<Source[]> {
  const r = await withTimeout(fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=8&api_key=${key}`), 30000);
  if (!r.ok) throw new Error(`serpapi ${r.status}`);
  const d = await r.json();
  const organic = (d.organic_results || []).map((x: any) => ({ url: x.link, title: x.title || "", snippet: x.snippet || "", provider: "serpapi" }));
  const related = (d.related_questions || []).map((x: any) => ({ url: x.link || "", title: x.question || "", snippet: x.snippet || "", provider: "serpapi:paa" }));
  return [...organic, ...related].filter((s: Source) => s.title);
}

const SPAM = /(pinterest\.|quora\.|answers\.|\.blogspot\.|reddit\.com|scribd\.|slideshare\.)/i;

async function research(query: string, resolveKey: any, log: any, news = false): Promise<Source[]> {
  const chain: [string, (q: string, k: string) => Promise<Source[]>][] = [
    ["serpapi", searchSerp],
    ["tavily", (q, k) => searchTavily(q, k, news)],
    ["exa", searchExa],
  ];
  const out: Source[] = [];
  for (const [name, fn] of chain) {
    const key = await resolveKey(name);
    if (!key) continue;
    try {
      const res = await fn(query, key);
      out.push(...res.filter(s => s.url && !SPAM.test(s.url)));
      log.search_attempts.push({ query, provider: name, ok: true, count: res.length });
      if (out.length >= 8) break;
    } catch (e) {
      log.search_attempts.push({ query, provider: name, ok: false, error: String((e as Error).message).slice(0, 160) });
    }
  }
  const seen = new Set<string>();
  return out.filter(s => (seen.has(s.url) ? false : (seen.add(s.url), true))).slice(0, 12);
}

// ── book backlinks ───────────────────────────────────────────────────
type Book = { id: string; title: string; slug: string; author: string | null; description: string | null; category: string | null };

/** Score how relevant a book is to the article text. */
function rankBooks(books: Book[], articleText: string, topic: string): Book[] {
  const at = tokens(`${topic} ${articleText}`);
  return books
    .map(b => ({ b, s: jaccard(at, tokens(`${b.title} ${b.category || ""} ${b.description || ""}`)) + (at.has(String(b.title).toLowerCase().split(/\s+/)[0]) ? 0.2 : 0) }))
    .sort((x, y) => y.s - x.s)
    .map(x => x.b);
}

/**
 * Guarantees book backlinks exist in the body:
 *  - keeps valid /books/<slug> anchors written by the model
 *  - auto-links the first plain-text mention of a book title
 *  - appends a "recommended reading" block if still under 2 links
 */
function injectBookLinks(html: string, books: Book[], topic: string, log: any): string {
  const valid = new Set(books.map(b => b.slug));
  let out = html.replace(/<a\s+href="\/books\/([^"#?]+)"[^>]*>([^<]*)<\/a>/gi,
    (m, slug, anchor) => (valid.has(slug) ? m : anchor));

  const countLinks = () => (out.match(/href="\/books\//g) || []).length;
  const ranked = rankBooks(books, strip(out), topic);

  // auto-link the first unlinked plain-text mention of each book title
  for (const b of ranked) {
    if (countLinks() >= 3) break;
    if (out.includes(`/books/${b.slug}`)) continue;
    const title = b.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!<a[^>]*>)\\b(${title})\\b(?![^<]*<\\/a>)`, "i");
    if (re.test(out)) {
      out = out.replace(re, `<a href="/books/${b.slug}">$1</a>`);
    }
  }

  // still not enough → contextual recommendation block before the conclusion
  if (countLinks() < 2) {
    const picks = ranked.slice(0, 2);
    if (picks.length) {
      const block = `\n<div class="book-recommendation"><h2>संबंधित पुस्तकें (GyandootNova)</h2><ul>${picks.map(b =>
        `<li><a href="/books/${b.slug}"><strong>${b.title}</strong></a>${b.author ? ` — ${b.author}` : ""}${b.description ? `: ${strip(b.description).slice(0, 140)}` : ""}</li>`).join("")}</ul></div>`;
      const idx = out.search(/<h2[^>]*>\s*(निष्कर्ष|उपसंहार|Conclusion)/i);
      out = idx > -1 ? out.slice(0, idx) + block + out.slice(idx) : out + block;
    }
  }
  log.book_links = [...out.matchAll(/href="\/books\/([^"]+)"/g)].map(m => m[1]);
  return out;
}

// ── prompts ──────────────────────────────────────────────────────────
function writerPrompt(topic: string, kw: any, sources: Source[], internalPool: string, bookPool: string, fixes?: string[]) {
  return `${fixes?.length ? `पिछले draft में editor ने ये कमियाँ बताईं — इन सबको ठीक करके पूरा article दोबारा लिखो:\n- ${fixes.join("\n- ")}\n\n` : ""}TOPIC: ${topic}
FOCUS KEYWORD: ${kw.focus_keyword}
SECONDARY KEYWORDS: ${(kw.secondary_keywords || []).join(", ")}
SEARCH INTENT: ${kw.search_intent || "informational"}

RESEARCH (सिर्फ़ facts के लिए — एक भी वाक्य copy मत करना, सब कुछ अपने शब्दों में):
${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet.slice(0, 400)}`).join("\n\n")}

INTERNAL LINK POOL (सिर्फ़ इन्हीं slugs का उपयोग — <a href="/articles/slug">natural anchor</a>):
${internalPool || "(none)"}

BOOK LINK POOL (GyandootNova की किताबें — 2-3 जगह जहाँ स्वाभाविक लगे वहीं <a href="/books/slug">पुस्तक का नाम</a> डालो, ज़बरदस्ती नहीं):
${bookPool || "(none)"}

REQUIREMENTS
- भाषा: शुद्ध पर सरल हिन्दी (देवनागरी), बीच-बीच में search keywords English में भी।
- ${MIN_WORDS}-2600 words का original body. कोई AI cliché नहीं, कोई repetition नहीं।
- शास्त्रीय शुद्धता ज़रूरी — मनगढ़ंत श्लोक/दावे बिल्कुल नहीं। जो प्रमाणित न हो वो मत लिखो।
- Structure: एक H1, 6+ H2, ज़रूरत अनुसार H3, छोटे paragraphs, tables/lists जहाँ उपयोगी।
- पाठ/मंत्र, अर्थ, विधि, लाभ, सही समय, सामान्य भूलें, और 6 FAQ शामिल करो।
- 3-6 internal links, 2-3 book links, 2-4 authoritative external links.
- Output: valid HTML body only (h1,h2,h3,p,ul,ol,li,a,strong,em,blockquote,table).

STRICT JSON लौटाओ:
{"seo_title":"≤60","meta_title":"≤60","meta_description":"≤160","slug":"kebab-case","focus_keyword":"...","secondary_keywords":["..."],"tags":["5-10"],"category":"...","h1":"...","excerpt":"≤200","body_html":"<h1>...","cta":"...","faq":[{"q":"","a":""}],"featured_image_alt":"≤120","featured_image_caption":"...","og_title":"...","og_description":"...","social_caption":"≤280","external_references":[{"title":"","url":""}]}`;
}

const REVIEW_SYSTEM = "You are a ruthless senior Hindi SEO editor and a Sanatan-dharma subject expert. You never approve mediocre work. Output ONLY valid JSON.";

function reviewPrompt(article: any, kw: any, metrics: any) {
  return `इस article का कठोर audit करो और JSON scorecard दो।

FOCUS KEYWORD: ${kw.focus_keyword}
MEASURED: words=${metrics.words}, internal_links=${metrics.internal}, book_links=${metrics.books}, external_links=${metrics.external}, source_overlap=${(metrics.overlap * 100).toFixed(1)}%, site_similarity=${(metrics.similarity * 100).toFixed(1)}%

TITLE: ${article.seo_title}
META: ${article.meta_description}
BODY:
${strip(article.body_html).slice(0, 14000)}

जाँचो: (1) तथ्य/शास्त्रीय शुद्धता — कोई गलत श्लोक, गलत देवता, गलत विधि? (2) originality — कहीं से उठाया हुआ तो नहीं लगता? (3) SEO — title/meta/keyword placement/heading structure/search intent (4) depth व usefulness (5) भाषा, प्रवाह, AI-टोन (6) internal + book links स्वाभाविक हैं या ठूँसे हुए?

Return STRICT JSON:
{"scores":{"accuracy":0-100,"originality":0-100,"seo":0-100,"depth":0-100,"readability":0-100,"linking":0-100},"overall":0-100,"verdict":"publish"|"revise"|"reject","issues":["ठीक करने योग्य ठोस बिंदु"],"critical":["तथ्यात्मक गलतियाँ, अगर कोई हों"]}`;
}

// ── agent run (executed in the background: the full research → write →
//    review → rewrite loop takes several minutes, far past the HTTP timeout) ──
async function runAgent(body: any): Promise<any> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const resolveKey = await buildKeyResolver(supabase);
  const started = Date.now();
  const log: any = {
    status: "ok", search_attempts: [], llm_attempts: [], revisions: [], book_links: [],
  };

  try {
    const forcedTopic: string | undefined = body?.topic;
    const autoPublish: boolean = body?.publish !== false; // publish only if it passes every gate

    // 1) existing content map (duplicate guard + internal links)
    const { data: existing } = await supabase.from("posts")
      .select("id, title, slug, excerpt, primary_keyword, content")
      .eq("post_type", "article").order("created_at", { ascending: false }).limit(200);
    const posts = existing || [];
    const covered = posts.map(p => `${p.title} — ${p.primary_keyword || ""}`).join("\n");

    // 2) keyword research from live search + trends
    const pillar = PILLARS[Math.floor(Math.random() * PILLARS.length)];
    const trend = await research(`${pillar} bhakti devotional trending 2026`, resolveKey, log, true);
    const serp = await research(`${pillar} lyrics meaning benefits hindi`, resolveKey, log);
    const researchPool = [...trend, ...serp];

    const kwRaw = await callChain(REVIEWER_CHAIN, [
      { role: "system", content: "You are an SEO keyword strategist for a Hindi devotional publisher. Output ONLY valid JSON." },
      { role: "user", content: `हमारी website पर ये articles पहले से हैं:\n${covered.slice(0, 6000)}\n\nLive search signals:\n${researchPool.map(s => `- ${s.title}`).join("\n").slice(0, 4000)}\n\nPillar: ${pillar}\n${forcedTopic ? `Admin ने ये topic माँगा है: ${forcedTopic}\n` : ""}
ऐसा एक keyword चुनो जिस पर (a) अच्छा search volume हो, (b) हमारी site पर पहले से article न हो, (c) devotional intent हो.
Return JSON: {"topic":"article title idea in Hindi","focus_keyword":"...","secondary_keywords":["6-8"],"search_intent":"informational|transactional|navigational","estimated_volume":number,"why_now":"trend reason","duplicate_of":null|"existing title"}` },
    ], true, resolveKey, log, "keyword-research");
    const kw = parseJson(kwRaw.text);
    if (!kw?.focus_keyword) throw new Error("keyword research failed");
    log.keyword = kw;

    const topic: string = forcedTopic || kw.topic || kw.focus_keyword;

    // duplicate topic gate — never write what we already have
    const tTok = tokens(`${topic} ${kw.focus_keyword}`);
    let best: { p: any; s: number } | null = null;
    for (const p of posts) {
      const s = jaccard(tTok, tokens(`${p.title} ${p.primary_keyword || ""} ${p.excerpt || ""}`));
      if (!best || s > best.s) best = { p, s };
    }
    log.topic = topic;
    log.topic_similarity = best?.s ?? 0;
    if (!forcedTopic && best && best.s >= 0.6) {
      log.status = "skipped";
      log.reason = `duplicate topic — already covered by "${best.p.title}"`;
      await supabase.from("editorial_agent_runs").insert({ topic, status: "skipped", details: log });
      return { success: true, skipped: true, reason: log.reason };
    }

    // 3) deep research for the chosen keyword
    const deep = await research(`${kw.focus_keyword} अर्थ लाभ विधि`, resolveKey, log);
    const sources = [...deep, ...serp].slice(0, 12);
    if (!sources.length) throw new Error("no research sources available");
    const corpus = sources.map(s => s.snippet).join("\n");

    // 4) book pool for backlinks
    const { data: bookRows } = await supabase.from("books")
      .select("id, title, slug, author, description, category").limit(50);
    const books: Book[] = (bookRows || []).filter(b => b.slug);
    const bookPool = books.map(b => `/books/${b.slug} — ${b.title}${b.category ? ` (${b.category})` : ""}`).join("\n");
    const internalPool = posts.slice(0, 50).map(p => `/articles/${p.slug} — ${p.title}`).join("\n");

    // 5) write → review → rewrite loop
    let article: any = null;
    let review: any = null;
    let metrics: any = {};
    let fixes: string[] = [];
    let writerProvider = "";

    for (let attempt = 1; attempt <= MAX_REVISIONS + 1; attempt++) {
      const msgs: ChatMsg[] = [
        { role: "system", content: "You are a senior Hindi devotional writer + SEO editor for GyandootNova. 100% original, factually accurate, Google Helpful Content compliant. Output ONLY valid JSON, no fences." },
        { role: "user", content: writerPrompt(topic, kw, sources, internalPool, bookPool, fixes) },
      ];
      const res = await callChain(WRITER_CHAIN, msgs, true, resolveKey, log, `write-${attempt}`);
      writerProvider = res.provider;
      const draft = parseJson(res.text);
      if (!draft?.body_html) { fixes = ["पिछला output valid JSON नहीं था — सिर्फ़ JSON लौटाओ।"]; continue; }

      draft.body_html = injectBookLinks(String(draft.body_html), books, topic, log);

      // hard metrics
      const bodyText = strip(draft.body_html);
      const validSlugs = new Set(posts.map(p => p.slug));
      draft.body_html = draft.body_html.replace(/<a\s+href="\/articles\/([^"#?]+)"[^>]*>([^<]*)<\/a>/gi,
        (m: string, slug: string, anchor: string) => (validSlugs.has(slug) ? m : anchor));

      let maxSim = 0;
      for (const p of posts) maxSim = Math.max(maxSim, jaccard(tokens(bodyText), tokens(strip(p.content || ""))));
      metrics = {
        words: words(bodyText).length,
        internal: (draft.body_html.match(/href="\/articles\//g) || []).length,
        books: (draft.body_html.match(/href="\/books\//g) || []).length,
        external: (draft.body_html.match(/href="https?:\/\//g) || []).length,
        overlap: overlapRatio(bodyText, corpus),
        similarity: maxSim,
      };

      // 6) editor pass on a different model
      const rev = await callChain(REVIEWER_CHAIN, [
        { role: "system", content: REVIEW_SYSTEM },
        { role: "user", content: reviewPrompt(draft, kw, metrics) },
      ], true, resolveKey, log, `review-${attempt}`, writerProvider);
      review = parseJson(rev.text) || { overall: 0, verdict: "revise", issues: ["editor JSON parse failed"] };
      review.reviewer_provider = rev.provider;

      const hard: string[] = [];
      if (metrics.words < MIN_WORDS) hard.push(`article सिर्फ़ ${metrics.words} words का है, कम से कम ${MIN_WORDS} चाहिए।`);
      if (metrics.overlap > MAX_SOURCE_OVERLAP) hard.push(`sources से ${(metrics.overlap * 100).toFixed(1)}% text मेल खा रहा है — पूरी तरह अपने शब्दों में दोबारा लिखो।`);
      if (metrics.similarity > MAX_INTERNAL_SIMILARITY) hard.push("हमारी ही किसी पुरानी post से बहुत मिलता-जुलता है — नया angle लो।");
      if (metrics.internal < 3) hard.push("कम से कम 3 internal links चाहिए।");
      if (metrics.books < 2) hard.push("कम से कम 2 book links चाहिए (जहाँ स्वाभाविक हों)।");
      if (!/<h2/i.test(draft.body_html)) hard.push("H2 headings नहीं हैं।");
      if ((review.critical || []).length) hard.push(...review.critical);

      log.revisions.push({ attempt, writer: writerProvider, reviewer: rev.provider, metrics, overall: review.overall, verdict: review.verdict, hard_fails: hard });

      article = draft;
      const passed = hard.length === 0 && Number(review.overall) >= PASS_SCORE && review.verdict === "publish";
      if (passed) { log.passed = true; break; }
      fixes = [...hard, ...(review.issues || [])].slice(0, 12);
      log.passed = false;
    }

    if (!article) throw new Error("writer produced no usable draft");

    // 7) assemble + save
    const h2s = [...String(article.body_html).matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, ""));
    const toc = h2s.length ? `<nav class="toc"><strong>विषय सूची</strong><ol>${h2s.map(t => `<li>${t}</li>`).join("")}</ol></nav>` : "";
    let slug = slugify(article.slug || article.seo_title || topic);
    for (let i = 2; i < 40; i++) {
      const { data: clash } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${slugify(article.slug || article.seo_title)}-${i}`;
    }
    const canonical = `${SITE}/articles/${slug}`;
    const readingMin = Math.max(1, Math.round(metrics.words / 200));

    const faqSchema = {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: (article.faq || []).map((f: any) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    };
    const articleSchema = {
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: article.h1 || article.seo_title,
      author: { "@type": "Person", name: AGENT_AUTHOR },
      publisher: { "@type": "Organization", name: "GyandootNova" },
      datePublished: new Date().toISOString(),
      description: article.meta_description, mainEntityOfPage: canonical,
      inLanguage: "hi-IN",
      keywords: [kw.focus_keyword, ...(article.secondary_keywords || [])].join(", "),
    };

    const finalHtml =
      `<p class="post-meta"><em>${AGENT_AUTHOR} • ${new Date().toLocaleDateString("en-IN")} • ${readingMin} मिनट • Focus: ${kw.focus_keyword}</em></p>` +
      toc + article.body_html +
      (article.cta ? `\n<p class="cta"><strong>${article.cta}</strong></p>` : "") +
      `\n<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` +
      `\n<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>` +
      `\n<link rel="canonical" href="${esc(canonical)}" />`;

    const publish = log.passed === true && autoPublish;
    const { data: ins, error } = await supabase.from("posts").insert({
      title: article.h1 || article.seo_title,
      slug, content: finalHtml, excerpt: article.excerpt,
      meta_title: article.meta_title || article.seo_title,
      meta_description: article.meta_description,
      post_type: "article",
      author: AGENT_AUTHOR,
      publish_status: publish ? "published" : "draft",
      approval_status: publish ? "approved" : "draft",
      is_published: publish,
      scheduled_at: publish ? new Date().toISOString() : null,
      category: article.category ?? null,
      primary_keyword: kw.focus_keyword,
      secondary_keywords: (article.secondary_keywords || []).map(String),
      tags: (article.tags || []).map(String).slice(0, 10),
      search_intent: kw.search_intent ?? null,
      reading_time_min: readingMin,
      word_count: metrics.words,
      content_score: Number(review?.overall) || null,
      originality_score: Math.round((1 - metrics.overlap) * 100),
      readability_score: Number(review?.scores?.readability) || null,
      quality_passed: !!log.passed,
      self_check: { review, metrics, revisions: log.revisions },
      featured_image_alt: article.featured_image_alt ?? null,
      featured_image_caption: article.featured_image_caption ?? null,
      social_caption: article.social_caption ?? null,
      internal_links: [...String(article.body_html).matchAll(/href="(\/(?:articles|books)\/[^"]+)"/g)].map(m => ({ url: m[1] })),
      external_references: article.external_references || [],
      canonical_url: canonical,
      schema_type: "BlogPosting",
    }).select("id").single();
    if (error) throw error;

    log.post_id = ins.id;
    log.slug = slug;
    log.execution_ms = Date.now() - started;
    await supabase.from("editorial_agent_runs").insert({
      topic, keyword: kw.focus_keyword, post_id: ins.id,
      status: publish ? "published" : "needs_review",
      quality_score: Number(review?.overall) || null,
      originality_score: Math.round((1 - metrics.overlap) * 100),
      revisions: log.revisions.length, details: log,
    });

    // fire indexing + admin report for published pieces
    if (publish) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/seo-post-publish-hook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "x-cron-secret": Deno.env.get("SEO_CRON_TOKEN") || Deno.env.get("SEO_AGENT_CRON_SECRET") || "",
          },
          body: JSON.stringify({ post_id: ins.id }),
        });
      } catch (e) { console.error("publish hook failed", e); }
    }

    return {
      success: true, published: publish, slug, post_id: ins.id,
      topic, keyword: kw.focus_keyword, metrics, review, revisions: log.revisions,
    };

  } catch (e) {
    const msg = String((e as Error)?.message || e).slice(0, 1000);
    console.error("editorial-agent error", msg);
    try {
      await supabase.from("editorial_agent_runs").insert({
        topic: log.topic ?? null, status: "error", error: msg, details: log,
      });
    } catch { /* ignore */ }
    return { success: false, error: msg };
  }
}

// ── handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await assertSeoAuthorized(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));

  // Cron and admin triggers get an immediate ack; the run continues in the
  // background and its outcome lands in public.editorial_agent_runs.
  const task = runAgent(body).catch((e) => console.error("agent crashed", e));
  try {
    // @ts-ignore EdgeRuntime is provided by the Supabase runtime
    EdgeRuntime.waitUntil(task);
  } catch { /* local dev fallback */ }

  return new Response(JSON.stringify({
    success: true, started: true,
    message: "Editorial agent chal raha hai. Result editorial_agent_runs me aayega.",
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

