import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { buildKeyResolver } from "../lib/ai-key-resolver.js";
import { assertSeoAuthorized } from "../lib/seo-auth.js";
import {
  callChain,
  parseJson,
  WRITER_CHAIN,
  REVIEWER_CHAIN
} from "../lib/llm-multi.js";
const SITE = "https://gyandootnova.in";
const AGENT_AUTHOR = "Gyandoot Editorial Desk";
const PILLARS = [
  "sahasranama (\u0938\u0939\u0938\u094D\u0930\u0928\u093E\u092E)",
  "aarti (\u0906\u0930\u0924\u0940)",
  "rigved / vedic mantras (\u090B\u0917\u094D\u0935\u0947\u0926)",
  "devotional stories (\u092D\u0915\u094D\u0924\u093F \u0915\u0925\u093E)"
];
const MIN_WORDS = 1600;
const MAX_REVISIONS = 3;
const PASS_SCORE = 85;
const MAX_INTERNAL_SIMILARITY = 0.55;
const MAX_SOURCE_OVERLAP = 0.18;
const STOP = new Set("the a an and or but if of to in on for with from by as is are was were be been this that these those it its at we our you your they them his her hai hain ka ke ki ko me mein se par aur ya bhi wo woh yeh ye kya kyun kaise ek liye hota hoti karne kar".split(/\s+/));
const strip = (h) => String(h || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
function words(s) {
  return strip(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}
function tokens(s) {
  return new Set(words(s).filter((w) => w.length > 2 && !STOP.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let i = 0;
  for (const t of a) if (b.has(t)) i++;
  return i / (a.size + b.size - i);
}
function shingles(s, n = 6) {
  const w = words(s);
  const out = /* @__PURE__ */ new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}
function overlapRatio(article, corpus) {
  const a = shingles(article);
  const c = shingles(corpus);
  if (!a.size || !c.size) return 0;
  let hit = 0;
  for (const s of a) if (c.has(s)) hit++;
  return hit / a.size;
}
function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
const esc = (s) => String(s || "").replace(/"/g, "&quot;");
async function withTimeout(p, ms) {
  return await Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(`timeout ${ms}ms`)), ms))]);
}
async function searchTavily(q, key, news = false) {
  const r = await withTimeout(fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query: q, max_results: 6, search_depth: "advanced", topic: news ? "news" : "general" })
  }), 3e4);
  if (!r.ok) throw new Error(`tavily ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x) => ({ url: x.url, title: x.title || "", snippet: x.content || "", provider: "tavily" }));
}
async function searchExa(q, key) {
  const r = await withTimeout(fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query: q, numResults: 6, type: "neural", contents: { text: { maxCharacters: 800 } } })
  }), 3e4);
  if (!r.ok) throw new Error(`exa ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x) => ({ url: x.url, title: x.title || "", snippet: x.text || "", provider: "exa" }));
}
async function searchSerp(q, key) {
  const r = await withTimeout(fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&num=8&api_key=${key}`), 3e4);
  if (!r.ok) throw new Error(`serpapi ${r.status}`);
  const d = await r.json();
  const organic = (d.organic_results || []).map((x) => ({ url: x.link, title: x.title || "", snippet: x.snippet || "", provider: "serpapi" }));
  const related = (d.related_questions || []).map((x) => ({ url: x.link || "", title: x.question || "", snippet: x.snippet || "", provider: "serpapi:paa" }));
  return [...organic, ...related].filter((s) => s.title);
}
const SPAM = /(pinterest\.|quora\.|answers\.|\.blogspot\.|reddit\.com|scribd\.|slideshare\.)/i;
async function research(query, resolveKey, log, news = false) {
  const chain = [
    ["serpapi", searchSerp],
    ["tavily", (q, k) => searchTavily(q, k, news)],
    ["exa", searchExa]
  ];
  const out = [];
  for (const [name, fn] of chain) {
    const key = await resolveKey(name);
    if (!key) continue;
    try {
      const res = await fn(query, key);
      out.push(...res.filter((s) => s.url && !SPAM.test(s.url)));
      log.search_attempts.push({ query, provider: name, ok: true, count: res.length });
      if (out.length >= 8) break;
    } catch (e) {
      log.search_attempts.push({ query, provider: name, ok: false, error: String(e.message).slice(0, 160) });
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return out.filter((s) => seen.has(s.url) ? false : (seen.add(s.url), true)).slice(0, 12);
}
function rankBooks(books, articleText, topic) {
  const at = tokens(`${topic} ${articleText}`);
  return books.map((b) => ({ b, s: jaccard(at, tokens(`${b.title} ${b.category || ""} ${b.description || ""}`)) + (at.has(String(b.title).toLowerCase().split(/\s+/)[0]) ? 0.2 : 0) })).sort((x, y) => y.s - x.s).map((x) => x.b);
}
function injectBookLinks(html, books, topic, log) {
  const valid = new Set(books.map((b) => b.slug));
  let out = html.replace(
    /<a\s+href="\/books\/([^"#?]+)"[^>]*>([^<]*)<\/a>/gi,
    (m, slug, anchor) => valid.has(slug) ? m : anchor
  );
  const countLinks = () => (out.match(/href="\/books\//g) || []).length;
  const ranked = rankBooks(books, strip(out), topic);
  for (const b of ranked) {
    if (countLinks() >= 3) break;
    if (out.includes(`/books/${b.slug}`)) continue;
    const title = b.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!<a[^>]*>)\\b(${title})\\b(?![^<]*<\\/a>)`, "i");
    if (re.test(out)) {
      out = out.replace(re, `<a href="/books/${b.slug}">$1</a>`);
    }
  }
  if (countLinks() < 2) {
    const picks = ranked.slice(0, 2);
    if (picks.length) {
      const block = `
<div class="book-recommendation"><h2>\u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u0941\u0938\u094D\u0924\u0915\u0947\u0902 (GyandootNova)</h2><ul>${picks.map((b) => `<li><a href="/books/${b.slug}"><strong>${b.title}</strong></a>${b.author ? ` \u2014 ${b.author}` : ""}${b.description ? `: ${strip(b.description).slice(0, 140)}` : ""}</li>`).join("")}</ul></div>`;
      const idx = out.search(/<h2[^>]*>\s*(निष्कर्ष|उपसंहार|Conclusion)/i);
      out = idx > -1 ? out.slice(0, idx) + block + out.slice(idx) : out + block;
    }
  }
  log.book_links = [...out.matchAll(/href="\/books\/([^"]+)"/g)].map((m) => m[1]);
  return out;
}
function writerPrompt(topic, kw, sources, internalPool, bookPool, fixes) {
  return `${fixes?.length ? `\u092A\u093F\u091B\u0932\u0947 draft \u092E\u0947\u0902 editor \u0928\u0947 \u092F\u0947 \u0915\u092E\u093F\u092F\u093E\u0901 \u092C\u0924\u093E\u0908\u0902 \u2014 \u0907\u0928 \u0938\u092C\u0915\u094B \u0920\u0940\u0915 \u0915\u0930\u0915\u0947 \u092A\u0942\u0930\u093E article \u0926\u094B\u092C\u093E\u0930\u093E \u0932\u093F\u0916\u094B:
- ${fixes.join("\n- ")}

` : ""}TOPIC: ${topic}
FOCUS KEYWORD: ${kw.focus_keyword}
SECONDARY KEYWORDS: ${(kw.secondary_keywords || []).join(", ")}
SEARCH INTENT: ${kw.search_intent || "informational"}

RESEARCH (\u0938\u093F\u0930\u094D\u092B\u093C facts \u0915\u0947 \u0932\u093F\u090F \u2014 \u090F\u0915 \u092D\u0940 \u0935\u093E\u0915\u094D\u092F copy \u092E\u0924 \u0915\u0930\u0928\u093E, \u0938\u092C \u0915\u0941\u091B \u0905\u092A\u0928\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u092E\u0947\u0902):
${sources.map((s, i) => `[${i + 1}] ${s.title}
${s.url}
${s.snippet.slice(0, 400)}`).join("\n\n")}

INTERNAL LINK POOL (\u0938\u093F\u0930\u094D\u092B\u093C \u0907\u0928\u094D\u0939\u0940\u0902 slugs \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u2014 <a href="/articles/slug">natural anchor</a>):
${internalPool || "(none)"}

BOOK LINK POOL (GyandootNova \u0915\u0940 \u0915\u093F\u0924\u093E\u092C\u0947\u0902 \u2014 2-3 \u091C\u0917\u0939 \u091C\u0939\u093E\u0901 \u0938\u094D\u0935\u093E\u092D\u093E\u0935\u093F\u0915 \u0932\u0917\u0947 \u0935\u0939\u0940\u0902 <a href="/books/slug">\u092A\u0941\u0938\u094D\u0924\u0915 \u0915\u093E \u0928\u093E\u092E</a> \u0921\u093E\u0932\u094B, \u091C\u093C\u092C\u0930\u0926\u0938\u094D\u0924\u0940 \u0928\u0939\u0940\u0902):
${bookPool || "(none)"}

REQUIREMENTS
- \u092D\u093E\u0937\u093E: \u0936\u0941\u0926\u094D\u0927 \u092A\u0930 \u0938\u0930\u0932 \u0939\u093F\u0928\u094D\u0926\u0940 (\u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940), \u092C\u0940\u091A-\u092C\u0940\u091A \u092E\u0947\u0902 search keywords English \u092E\u0947\u0902 \u092D\u0940\u0964
- ${MIN_WORDS}-2600 words \u0915\u093E original body. \u0915\u094B\u0908 AI clich\xE9 \u0928\u0939\u0940\u0902, \u0915\u094B\u0908 repetition \u0928\u0939\u0940\u0902\u0964
- \u0936\u093E\u0938\u094D\u0924\u094D\u0930\u0940\u092F \u0936\u0941\u0926\u094D\u0927\u0924\u093E \u091C\u093C\u0930\u0942\u0930\u0940 \u2014 \u092E\u0928\u0917\u0922\u093C\u0902\u0924 \u0936\u094D\u0932\u094B\u0915/\u0926\u093E\u0935\u0947 \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0928\u0939\u0940\u0902\u0964 \u091C\u094B \u092A\u094D\u0930\u092E\u093E\u0923\u093F\u0924 \u0928 \u0939\u094B \u0935\u094B \u092E\u0924 \u0932\u093F\u0916\u094B\u0964
- Structure: \u090F\u0915 H1, 6+ H2, \u091C\u093C\u0930\u0942\u0930\u0924 \u0905\u0928\u0941\u0938\u093E\u0930 H3, \u091B\u094B\u091F\u0947 paragraphs, tables/lists \u091C\u0939\u093E\u0901 \u0909\u092A\u092F\u094B\u0917\u0940\u0964
- \u092A\u093E\u0920/\u092E\u0902\u0924\u094D\u0930, \u0905\u0930\u094D\u0925, \u0935\u093F\u0927\u093F, \u0932\u093E\u092D, \u0938\u0939\u0940 \u0938\u092E\u092F, \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092D\u0942\u0932\u0947\u0902, \u0914\u0930 6 FAQ \u0936\u093E\u092E\u093F\u0932 \u0915\u0930\u094B\u0964
- 3-6 internal links, 2-3 book links, 2-4 authoritative external links.
- Output: valid HTML body only (h1,h2,h3,p,ul,ol,li,a,strong,em,blockquote,table).

STRICT JSON \u0932\u094C\u091F\u093E\u0913:
{"seo_title":"\u226460","meta_title":"\u226460","meta_description":"\u2264160","slug":"kebab-case","focus_keyword":"...","secondary_keywords":["..."],"tags":["5-10"],"category":"...","h1":"...","excerpt":"\u2264200","body_html":"<h1>...","cta":"...","faq":[{"q":"","a":""}],"featured_image_alt":"\u2264120","featured_image_caption":"...","og_title":"...","og_description":"...","social_caption":"\u2264280","external_references":[{"title":"","url":""}]}`;
}
const REVIEW_SYSTEM = "You are a ruthless senior Hindi SEO editor and a Sanatan-dharma subject expert. You never approve mediocre work. Output ONLY valid JSON.";
function reviewPrompt(article, kw, metrics) {
  return `\u0907\u0938 article \u0915\u093E \u0915\u0920\u094B\u0930 audit \u0915\u0930\u094B \u0914\u0930 JSON scorecard \u0926\u094B\u0964

FOCUS KEYWORD: ${kw.focus_keyword}
MEASURED: words=${metrics.words}, internal_links=${metrics.internal}, book_links=${metrics.books}, external_links=${metrics.external}, source_overlap=${(metrics.overlap * 100).toFixed(1)}%, site_similarity=${(metrics.similarity * 100).toFixed(1)}%

TITLE: ${article.seo_title}
META: ${article.meta_description}
BODY:
${strip(article.body_html).slice(0, 14e3)}

\u091C\u093E\u0901\u091A\u094B: (1) \u0924\u0925\u094D\u092F/\u0936\u093E\u0938\u094D\u0924\u094D\u0930\u0940\u092F \u0936\u0941\u0926\u094D\u0927\u0924\u093E \u2014 \u0915\u094B\u0908 \u0917\u0932\u0924 \u0936\u094D\u0932\u094B\u0915, \u0917\u0932\u0924 \u0926\u0947\u0935\u0924\u093E, \u0917\u0932\u0924 \u0935\u093F\u0927\u093F? (2) originality \u2014 \u0915\u0939\u0940\u0902 \u0938\u0947 \u0909\u0920\u093E\u092F\u093E \u0939\u0941\u0906 \u0924\u094B \u0928\u0939\u0940\u0902 \u0932\u0917\u0924\u093E? (3) SEO \u2014 title/meta/keyword placement/heading structure/search intent (4) depth \u0935 usefulness (5) \u092D\u093E\u0937\u093E, \u092A\u094D\u0930\u0935\u093E\u0939, AI-\u091F\u094B\u0928 (6) internal + book links \u0938\u094D\u0935\u093E\u092D\u093E\u0935\u093F\u0915 \u0939\u0948\u0902 \u092F\u093E \u0920\u0942\u0901\u0938\u0947 \u0939\u0941\u090F?

Return STRICT JSON:
{"scores":{"accuracy":0-100,"originality":0-100,"seo":0-100,"depth":0-100,"readability":0-100,"linking":0-100},"overall":0-100,"verdict":"publish"|"revise"|"reject","issues":["\u0920\u0940\u0915 \u0915\u0930\u0928\u0947 \u092F\u094B\u0917\u094D\u092F \u0920\u094B\u0938 \u092C\u093F\u0902\u0926\u0941"],"critical":["\u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0917\u0932\u0924\u093F\u092F\u093E\u0901, \u0905\u0917\u0930 \u0915\u094B\u0908 \u0939\u094B\u0902"]}`;
}
async function runAgent(body) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const resolveKey = await buildKeyResolver(supabase);
  const started = Date.now();
  const log = {
    status: "ok",
    search_attempts: [],
    llm_attempts: [],
    revisions: [],
    book_links: []
  };
  try {
    const forcedTopic = body?.topic;
    const autoPublish = body?.publish !== false;
    const { data: existing } = await supabase.from("posts").select("id, title, slug, excerpt, primary_keyword, content").eq("post_type", "article").order("created_at", { ascending: false }).limit(200);
    const posts = existing || [];
    const covered = posts.map((p) => `${p.title} \u2014 ${p.primary_keyword || ""}`).join("\n");
    const pillar = PILLARS[Math.floor(Math.random() * PILLARS.length)];
    const trend = await research(`${pillar} bhakti devotional trending 2026`, resolveKey, log, true);
    const serp = await research(`${pillar} lyrics meaning benefits hindi`, resolveKey, log);
    const researchPool = [...trend, ...serp];
    const kwRaw = await callChain(REVIEWER_CHAIN, [
      { role: "system", content: "You are an SEO keyword strategist for a Hindi devotional publisher. Output ONLY valid JSON." },
      { role: "user", content: `\u0939\u092E\u093E\u0930\u0940 website \u092A\u0930 \u092F\u0947 articles \u092A\u0939\u0932\u0947 \u0938\u0947 \u0939\u0948\u0902:
${covered.slice(0, 6e3)}

Live search signals:
${researchPool.map((s) => `- ${s.title}`).join("\n").slice(0, 4e3)}

Pillar: ${pillar}
${forcedTopic ? `Admin \u0928\u0947 \u092F\u0947 topic \u092E\u093E\u0901\u0917\u093E \u0939\u0948: ${forcedTopic}
` : ""}
\u0910\u0938\u093E \u090F\u0915 keyword \u091A\u0941\u0928\u094B \u091C\u093F\u0938 \u092A\u0930 (a) \u0905\u091A\u094D\u091B\u093E search volume \u0939\u094B, (b) \u0939\u092E\u093E\u0930\u0940 site \u092A\u0930 \u092A\u0939\u0932\u0947 \u0938\u0947 article \u0928 \u0939\u094B, (c) devotional intent \u0939\u094B.
Return JSON: {"topic":"article title idea in Hindi","focus_keyword":"...","secondary_keywords":["6-8"],"search_intent":"informational|transactional|navigational","estimated_volume":number,"why_now":"trend reason","duplicate_of":null|"existing title"}` }
    ], true, resolveKey, log, "keyword-research");
    const kw = parseJson(kwRaw.text);
    if (!kw?.focus_keyword) throw new Error("keyword research failed");
    log.keyword = kw;
    const topic = forcedTopic || kw.topic || kw.focus_keyword;
    const tTok = tokens(`${topic} ${kw.focus_keyword}`);
    let best = null;
    for (const p of posts) {
      const s = jaccard(tTok, tokens(`${p.title} ${p.primary_keyword || ""} ${p.excerpt || ""}`));
      if (!best || s > best.s) best = { p, s };
    }
    log.topic = topic;
    log.topic_similarity = best?.s ?? 0;
    if (!forcedTopic && best && best.s >= 0.6) {
      log.status = "skipped";
      log.reason = `duplicate topic \u2014 already covered by "${best.p.title}"`;
      await supabase.from("editorial_agent_runs").insert({ topic, status: "skipped", details: log });
      return { success: true, skipped: true, reason: log.reason };
    }
    const deep = await research(`${kw.focus_keyword} \u0905\u0930\u094D\u0925 \u0932\u093E\u092D \u0935\u093F\u0927\u093F`, resolveKey, log);
    const sources = [...deep, ...serp].slice(0, 12);
    if (!sources.length) throw new Error("no research sources available");
    const corpus = sources.map((s) => s.snippet).join("\n");
    const { data: bookRows } = await supabase.from("books").select("id, title, slug, author, description, category").limit(50);
    const books = (bookRows || []).filter((b) => b.slug);
    const bookPool = books.map((b) => `/books/${b.slug} \u2014 ${b.title}${b.category ? ` (${b.category})` : ""}`).join("\n");
    const internalPool = posts.slice(0, 50).map((p) => `/articles/${p.slug} \u2014 ${p.title}`).join("\n");
    let article = null;
    let review = null;
    let metrics = {};
    let fixes = [];
    let writerProvider = "";
    for (let attempt = 1; attempt <= MAX_REVISIONS + 1; attempt++) {
      const msgs = [
        { role: "system", content: "You are a senior Hindi devotional writer + SEO editor for GyandootNova. 100% original, factually accurate, Google Helpful Content compliant. Output ONLY valid JSON, no fences." },
        { role: "user", content: writerPrompt(topic, kw, sources, internalPool, bookPool, fixes) }
      ];
      const res = await callChain(WRITER_CHAIN, msgs, true, resolveKey, log, `write-${attempt}`);
      writerProvider = res.provider;
      const draft = parseJson(res.text);
      if (!draft?.body_html) {
        fixes = ["\u092A\u093F\u091B\u0932\u093E output valid JSON \u0928\u0939\u0940\u0902 \u0925\u093E \u2014 \u0938\u093F\u0930\u094D\u092B\u093C JSON \u0932\u094C\u091F\u093E\u0913\u0964"];
        continue;
      }
      draft.body_html = injectBookLinks(String(draft.body_html), books, topic, log);
      const bodyText = strip(draft.body_html);
      const validSlugs = new Set(posts.map((p) => p.slug));
      draft.body_html = draft.body_html.replace(
        /<a\s+href="\/articles\/([^"#?]+)"[^>]*>([^<]*)<\/a>/gi,
        (m, slug2, anchor) => validSlugs.has(slug2) ? m : anchor
      );
      let maxSim = 0;
      for (const p of posts) maxSim = Math.max(maxSim, jaccard(tokens(bodyText), tokens(strip(p.content || ""))));
      metrics = {
        words: words(bodyText).length,
        internal: (draft.body_html.match(/href="\/articles\//g) || []).length,
        books: (draft.body_html.match(/href="\/books\//g) || []).length,
        external: (draft.body_html.match(/href="https?:\/\//g) || []).length,
        overlap: overlapRatio(bodyText, corpus),
        similarity: maxSim
      };
      const rev = await callChain(REVIEWER_CHAIN, [
        { role: "system", content: REVIEW_SYSTEM },
        { role: "user", content: reviewPrompt(draft, kw, metrics) }
      ], true, resolveKey, log, `review-${attempt}`, writerProvider);
      review = parseJson(rev.text) || { overall: 0, verdict: "revise", issues: ["editor JSON parse failed"] };
      review.reviewer_provider = rev.provider;
      const hard = [];
      if (metrics.words < MIN_WORDS) hard.push(`article \u0938\u093F\u0930\u094D\u092B\u093C ${metrics.words} words \u0915\u093E \u0939\u0948, \u0915\u092E \u0938\u0947 \u0915\u092E ${MIN_WORDS} \u091A\u093E\u0939\u093F\u090F\u0964`);
      if (metrics.overlap > MAX_SOURCE_OVERLAP) hard.push(`sources \u0938\u0947 ${(metrics.overlap * 100).toFixed(1)}% text \u092E\u0947\u0932 \u0916\u093E \u0930\u0939\u093E \u0939\u0948 \u2014 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0905\u092A\u0928\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u092E\u0947\u0902 \u0926\u094B\u092C\u093E\u0930\u093E \u0932\u093F\u0916\u094B\u0964`);
      if (metrics.similarity > MAX_INTERNAL_SIMILARITY) hard.push("\u0939\u092E\u093E\u0930\u0940 \u0939\u0940 \u0915\u093F\u0938\u0940 \u092A\u0941\u0930\u093E\u0928\u0940 post \u0938\u0947 \u092C\u0939\u0941\u0924 \u092E\u093F\u0932\u0924\u093E-\u091C\u0941\u0932\u0924\u093E \u0939\u0948 \u2014 \u0928\u092F\u093E angle \u0932\u094B\u0964");
      if (metrics.internal < 3) hard.push("\u0915\u092E \u0938\u0947 \u0915\u092E 3 internal links \u091A\u093E\u0939\u093F\u090F\u0964");
      if (metrics.books < 2) hard.push("\u0915\u092E \u0938\u0947 \u0915\u092E 2 book links \u091A\u093E\u0939\u093F\u090F (\u091C\u0939\u093E\u0901 \u0938\u094D\u0935\u093E\u092D\u093E\u0935\u093F\u0915 \u0939\u094B\u0902)\u0964");
      if (!/<h2/i.test(draft.body_html)) hard.push("H2 headings \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964");
      if ((review.critical || []).length) hard.push(...review.critical);
      log.revisions.push({ attempt, writer: writerProvider, reviewer: rev.provider, metrics, overall: review.overall, verdict: review.verdict, hard_fails: hard });
      article = draft;
      const passed = hard.length === 0 && Number(review.overall) >= PASS_SCORE && review.verdict === "publish";
      if (passed) {
        log.passed = true;
        break;
      }
      fixes = [...hard, ...review.issues || []].slice(0, 12);
      log.passed = false;
    }
    if (!article) throw new Error("writer produced no usable draft");
    const h2s = [...String(article.body_html).matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ""));
    const toc = h2s.length ? `<nav class="toc"><strong>\u0935\u093F\u0937\u092F \u0938\u0942\u091A\u0940</strong><ol>${h2s.map((t) => `<li>${t}</li>`).join("")}</ol></nav>` : "";
    let slug = slugify(article.slug || article.seo_title || topic);
    for (let i = 2; i < 40; i++) {
      const { data: clash } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${slugify(article.slug || article.seo_title)}-${i}`;
    }
    const canonical = `${SITE}/articles/${slug}`;
    const readingMin = Math.max(1, Math.round(metrics.words / 200));
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (article.faq || []).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
    };
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.h1 || article.seo_title,
      author: { "@type": "Person", name: AGENT_AUTHOR },
      publisher: { "@type": "Organization", name: "GyandootNova" },
      datePublished: (/* @__PURE__ */ new Date()).toISOString(),
      description: article.meta_description,
      mainEntityOfPage: canonical,
      inLanguage: "hi-IN",
      keywords: [kw.focus_keyword, ...article.secondary_keywords || []].join(", ")
    };
    const finalHtml = `<p class="post-meta"><em>${AGENT_AUTHOR} \u2022 ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")} \u2022 ${readingMin} \u092E\u093F\u0928\u091F \u2022 Focus: ${kw.focus_keyword}</em></p>` + toc + article.body_html + (article.cta ? `
<p class="cta"><strong>${article.cta}</strong></p>` : "") + `
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
<link rel="canonical" href="${esc(canonical)}" />`;
    const publish = log.passed === true && autoPublish;
    const { data: ins, error } = await supabase.from("posts").insert({
      title: article.h1 || article.seo_title,
      slug,
      content: finalHtml,
      excerpt: article.excerpt,
      meta_title: article.meta_title || article.seo_title,
      meta_description: article.meta_description,
      post_type: "article",
      author: AGENT_AUTHOR,
      publish_status: publish ? "published" : "draft",
      approval_status: publish ? "approved" : "draft",
      is_published: publish,
      scheduled_at: publish ? (/* @__PURE__ */ new Date()).toISOString() : null,
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
      internal_links: [...String(article.body_html).matchAll(/href="(\/(?:articles|books)\/[^"]+)"/g)].map((m) => ({ url: m[1] })),
      external_references: article.external_references || [],
      canonical_url: canonical,
      schema_type: "BlogPosting"
    }).select("id").single();
    if (error) throw error;
    log.post_id = ins.id;
    log.slug = slug;
    log.execution_ms = Date.now() - started;
    await supabase.from("editorial_agent_runs").insert({
      topic,
      keyword: kw.focus_keyword,
      post_id: ins.id,
      status: publish ? "published" : "needs_review",
      quality_score: Number(review?.overall) || null,
      originality_score: Math.round((1 - metrics.overlap) * 100),
      revisions: log.revisions.length,
      details: log
    });
    if (publish) {
      try {
        await fetch(`${process.env.SUPABASE_URL}/functions/v1/seo-post-publish-hook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "x-cron-secret": process.env.SEO_CRON_TOKEN || process.env.SEO_AGENT_CRON_SECRET || ""
          },
          body: JSON.stringify({ post_id: ins.id })
        });
      } catch (e) {
        console.error("publish hook failed", e);
      }
    }
    return {
      success: true,
      published: publish,
      slug,
      post_id: ins.id,
      topic,
      keyword: kw.focus_keyword,
      metrics,
      review,
      revisions: log.revisions
    };
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 1e3);
    console.error("editorial-agent error", msg);
    try {
      await supabase.from("editorial_agent_runs").insert({
        topic: log.topic ?? null,
        status: "error",
        error: msg,
        details: log
      });
    } catch {
    }
    return { success: false, error: msg };
  }
}
const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await assertSeoAuthorized(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const task = runAgent(body).catch((e) => console.error("agent crashed", e));
  try {
    EdgeRuntime.waitUntil(task);
  } catch {
  }
  return new Response(JSON.stringify({
    success: true,
    started: true,
    message: "Editorial agent chal raha hai. Result editorial_agent_runs me aayega."
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
};

export default handler;