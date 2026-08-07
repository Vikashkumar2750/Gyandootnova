#!/usr/bin/env node
/**
 * Prerender + SEO validator.
 *
 * - Boots `vite preview` on port 4173
 * - Fetches book/article slugs and SEO-safe reader chapter content
 * - For every route: navigates via Playwright, waits for react-helmet-style
 *   head mutation, then snapshots the final <head> and rewrites
 *   `dist/<route>/index.html` so social-preview crawlers see route-specific
 *   title / description / canonical / og:* / twitter:* / JSON-LD.
 * - Fails (exit 1) if any route is missing required tags.
 *
 * Usage:
 *   node scripts/prerender-and-seo-check.mjs           # prerender + validate
 *   node scripts/prerender-and-seo-check.mjs --check   # validate only (no writes)
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

const CHECK_ONLY = process.argv.includes("--check");
const NO_FAIL = process.argv.includes("--no-fail");
const DIST = resolve("dist");
const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const BASE_URL = "https://gyandootnova.in";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  "https://vrzngahawxtbpwrgxtmb.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyem5nYWhhd3h0YnB3cmd4dG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDYxNjQsImV4cCI6MjA4NjYyMjE2NH0.f1ua55Aav2XbTx9QoYlR7B1WS_flsxR7o-hyu6aiYIY";

const STATIC_ROUTES = [
  "/",
  "/books",
  "/articles",
  "/our-story",
  "/library",
  "/about",
  "/services",
  "/contact",
  "/faq",
  "/testimonials",
  "/portfolio",
  "/careers",
  "/support",
  "/donate",
  "/support-us",
  "/privacy-policy",
  "/terms-conditions",
  "/refund-policy",
  "/shipping-policy",
  "/sitemap",
  "/keywords",
  "/texts/bhagavad-gita",
  "/texts/vedas",
  "/texts/upanishads",
  "/texts/rig-veda",
  "/hindi/upanishad-meaning-in-hindi",
  "/hindi/vedas-meaning-in-hindi",
  "/hindi/dhyan-kaise-karein",
  "/how-to-read/bhagavad-gita",
  "/meditation/techniques-compared",
  "/meditation/for-anxiety",
  "/meditation/for-stress",
  "/qa/who-wrote-bhagavad-gita",
  "/qa/who-wrote-vedas",
  "/qa/how-many-vedas",
  "/qa/how-many-upanishads",
  "/qa/how-many-slokas-in-bhagavad-gita",
];

async function fetchSlugs(table, filter = "") {

  const url = `${SUPABASE_URL}/rest/v1/${table}?select=slug${filter}`;

  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[warn] ${table} fetch failed (${res.status})`);
    return [];
  }
  const rows = await res.json();
  return rows.map((r) => r.slug).filter(Boolean);
}

async function fetchSeoPrerenderPayload() {
  const url = `${SUPABASE_URL}/functions/v1/seo-prerender-data`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[warn] seo-prerender-data fetch failed (${res.status})`);
      return { books: [], chapters: [] };
    }
    const json = await res.json();
    return {
      books: Array.isArray(json?.books) ? json.books : [],
      chapters: Array.isArray(json?.chapters) ? json.chapters : [],
    };
  } catch (e) {
    console.warn(`[warn] seo-prerender-data fetch failed (${e.message})`);
    return { books: [], chapters: [] };
  }
}


function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    const tick = async () => {
      try {
        const r = await fetch(url);
        if (r.ok || r.status === 404) return res();
      } catch {}
      if (Date.now() - start > timeoutMs) return rej(new Error("preview timeout"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

async function startPreview() {
  const proc = spawn("bunx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  proc.stdout.on("data", () => {});
  proc.stderr.on("data", (d) => process.stderr.write(d));
  await waitForServer(ORIGIN);
  return proc;
}

const REQUIRED = [
  { name: "title", check: (h) => /<title>[^<]{5,}<\/title>/.test(h) },
  { name: "meta description", check: (h) => /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(h) },
  { name: "canonical", check: (h) => /<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\/[^"']+["']/i.test(h) },
  { name: "og:title", check: (h) => /property=["']og:title["']/i.test(h) },
  { name: "og:description", check: (h) => /property=["']og:description["']/i.test(h) },
  { name: "og:url", check: (h) => /property=["']og:url["']/i.test(h) },
  { name: "og:image", check: (h) => /property=["']og:image["'][^>]+content=["']https?:\/\/[^"']+["']/i.test(h) },
  { name: "twitter:card", check: (h) => /name=["']twitter:card["']/i.test(h) },
  { name: "twitter:image", check: (h) => /name=["']twitter:image["'][^>]+content=["']https?:\/\/[^"']+["']/i.test(h) },
];

function extract(re, s) {
  const m = s.match(re);
  return m ? m[1].trim() : "";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function stripTags(s) {
  return String(s ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHtml(s) {
  return /<\/?(p|div|span|strong|em|br|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|td|th|pre|code)\b/i.test(String(s ?? ""));
}

function textToHtml(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function safeContentHtml(content) {
  const raw = String(content ?? "").trim();
  if (!raw) return "<p>इस अध्याय की सामग्री उपलब्ध नहीं है।</p>";
  if (!isHtml(raw)) return textToHtml(raw);
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<h1\b/gi, "<h2")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function routePathForReader(row) {
  return `/${["books", row.book_slug, row.chapter_slug].map(encodeURIComponent).join("/")}`;
}

function renderReaderSnapshot(row) {
  const route = routePathForReader(row);
  const abs = `${BASE_URL}${route}`;
  const bookUrl = `${BASE_URL}/books/${encodeURIComponent(row.book_slug)}`;
  const title = `${row.chapter_title} — ${row.book_title} | GyandootNova`;
  const plainContent = stripTags(row.content);
  const plainBookDesc = stripTags(row.book_description);
  const description = `${row.book_title} ka ${row.chapter_title} Hindi mein padhein. ${plainContent || plainBookDesc}`.slice(0, 155);
  const image = row.cover_url || `${BASE_URL}/og-default.jpg`;
  const contentHtml = safeContentHtml(row.content);
  const h1 = esc(row.chapter_title);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": row.book_title,
    "inLanguage": "hi-IN",
    "author": { "@type": "Person", "name": row.author || "GyandootNova" },
    "description": plainBookDesc || description,
    "url": bookUrl,
    ...(row.cover_url ? { "image": row.cover_url } : {}),
    "workExample": {
      "@type": "Chapter",
      "name": row.chapter_title,
      "position": row.chapter_number,
      "url": abs,
    },
  };
  const head = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="author" content="GyandootNova">
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="${esc(bookUrl)}">

    <link rel="icon" href="/gyandoot-nova-icon.ico" type="image/x-icon">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:type" content="book">
    <meta property="og:url" content="${esc(abs)}">
    <meta property="og:image" content="${esc(image)}">
    <meta property="og:site_name" content="GyandootNova">
    <meta property="og:locale" content="hi_IN">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(image)}">
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  `;
  const rootHtml = `
    <main class="min-h-screen bg-background text-foreground">
      <article class="mx-auto max-w-3xl px-6 py-10">
        <p class="mb-2 text-sm text-muted-foreground">${esc(row.book_title)} · Chapter ${esc(row.chapter_number)}</p>
        <h1 class="font-serif text-3xl font-bold mb-4">${h1}</h1>
        <p class="mb-6 text-muted-foreground">${esc(row.author || "GyandootNova")}</p>
        <div class="secure-rich-reader max-w-none" data-prerendered-reader="true">
          ${contentHtml}
        </div>
        ${row.is_excerpt ? `<p class="mt-8 text-sm text-muted-foreground">यह SEO preview है। पूरा अध्याय पढ़ने के लिए GyandootNova reader में access unlock करें।</p>` : ""}
      </article>
    </main>
  `;
  return { head, rootHtml };
}

function routePathForBook(book) {
  return `/books/${encodeURIComponent(book.slug)}`;
}

function renderBookDetailSnapshot(book) {
  const route = routePathForBook(book);
  const abs = `${BASE_URL}${route}`;
  const priceNum = Number(book.price ?? 0);
  const priceLabel = book.is_free ? "मुफ़्त" : `₹${priceNum}`;
  const cleanedDesc = stripTags(book.description || "");
  const shortDesc = cleanedDesc.length >= 20 ? cleanedDesc.slice(0, 110) : "";
  const description = (shortDesc
    ? `${shortDesc}… ${book.author} द्वारा। ${priceLabel} — Instant digital delivery, UPI/Card checkout।`
    : `${book.title} — ${book.author} द्वारा। ${priceLabel} में पढ़ें, तुरंत access, सभी devices पर। GyandootNova पर सुरक्षित checkout।`
  ).slice(0, 160);
  const title = `${book.title} — ${book.author} | ${priceLabel} | GyandootNova`;
  const image = book.cover_url || `${BASE_URL}/og-default.jpg`;
  const readers = Math.max(Number(book.purchase_count ?? 0), 100);
  const firstFree = book.first_free_chapter;
  const firstFreeHtml = firstFree ? safeContentHtml(firstFree.content) : "";
  const firstFreeChapterUrl = firstFree
    ? `${BASE_URL}/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(firstFree.slug)}`
    : abs;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "inLanguage": "hi-IN",
    "author": { "@type": "Person", "name": book.author || "GyandootNova" },
    "description": cleanedDesc || description,
    "url": abs,
    ...(book.cover_url ? { "image": book.cover_url } : {}),
    "offers": {
      "@type": "Offer",
      "price": book.is_free ? "0" : String(priceNum),
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "url": abs,
    },
    ...(readers > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": String(readers),
      },
    } : {}),
  };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": book.title,
    "description": cleanedDesc || description,
    ...(book.cover_url ? { "image": book.cover_url } : {}),
    "brand": { "@type": "Brand", "name": "GyandootNova" },
    "offers": {
      "@type": "Offer",
      "price": book.is_free ? "0" : String(priceNum),
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "url": abs,
    },
  };
  const head = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="author" content="GyandootNova">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <link rel="canonical" href="${esc(abs)}">
    <link rel="icon" href="/gyandoot-nova-icon.ico" type="image/x-icon">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:type" content="book">
    <meta property="og:url" content="${esc(abs)}">
    <meta property="og:image" content="${esc(image)}">
    <meta property="og:site_name" content="GyandootNova">
    <meta property="og:locale" content="hi_IN">
    <meta property="product:price:amount" content="${esc(book.is_free ? "0" : String(priceNum))}">
    <meta property="product:price:currency" content="INR">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(image)}">
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
    <script type="application/ld+json">${JSON.stringify(productJsonLd).replace(/</g, "\\u003c")}</script>
  `;
  const tocHtml = (book.toc || []).slice(0, 20).map((c) => `
    <li><a href="/books/${esc(encodeURIComponent(book.slug))}/${esc(encodeURIComponent(c.slug))}">${esc(c.chapter_number)}. ${esc(c.title)}${c.is_preview ? " (Preview)" : ""}</a></li>
  `).join("");
  const rootHtml = `
    <main class="min-h-screen bg-background text-foreground">
      <article class="mx-auto max-w-4xl px-6 py-10">
        <div class="grid gap-8 md:grid-cols-3">
          <div class="md:col-span-1">
            ${book.cover_url ? `<img src="${esc(book.cover_url)}" alt="${esc(book.title)} — ${esc(book.author)}" width="600" height="800" class="w-full rounded-lg" />` : ""}
          </div>
          <div class="md:col-span-2">
            <h1 class="font-serif text-3xl font-bold md:text-4xl">${esc(book.title)}</h1>
            <p class="mt-1 text-lg text-muted-foreground">by ${esc(book.author || "GyandootNova")}</p>
            <p class="mt-3 text-2xl font-bold text-primary" data-price="${esc(book.is_free ? "0" : String(priceNum))}" data-currency="INR">${esc(priceLabel)}</p>
            <p class="mt-2 text-sm text-muted-foreground">${esc(readers)}+ readers • Lifetime access • Instant delivery</p>
            <div class="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p class="text-sm">${esc(description)}</p>
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              ${book.is_free
                ? `<a href="${esc(firstFreeChapterUrl)}" class="inline-flex items-center rounded-md bg-primary px-5 py-3 text-base font-bold text-primary-foreground">अभी पढ़ें — मुफ़्त</a>`
                : `<a href="${esc(abs)}#buy-section" class="inline-flex items-center rounded-md bg-primary px-5 py-3 text-base font-bold text-primary-foreground">Buy Now — ₹${esc(priceNum)} (जीवनभर)</a>`
              }
              ${firstFree ? `<a href="${esc(firstFreeChapterUrl)}" class="inline-flex items-center rounded-md border border-primary/40 px-5 py-3 text-base font-medium">पहला अध्याय मुफ़्त पढ़ें →</a>` : ""}
            </div>
            <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li>🔒 100% Secure Payment</li>
              <li>SSL Secured Checkout</li>
              <li>UPI / Card / NetBanking (Razorpay + PayPal)</li>
              <li>7-day 100% Money-Back Guarantee</li>
              <li>Lifetime Access — no subscription</li>
            </ul>
          </div>
        </div>

        ${firstFree ? `
          <section class="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p class="text-xs font-semibold uppercase tracking-wider text-primary">Free Preview — पहला अध्याय</p>
            <h2 class="mt-1 font-serif text-2xl font-bold">${esc(firstFree.title)}</h2>
            <div class="secure-rich-reader prose max-w-none mt-4" data-prerendered-preview="true">
              ${firstFreeHtml}
            </div>
            ${book.is_free ? "" : `
              <div class="mt-6 rounded-lg border border-primary bg-background p-4">
                <p class="font-semibold">पहला अध्याय मुफ़्त पढ़ा आपने। पूरा ग्रंथ पढ़ने के लिए ₹${esc(priceNum)} में unlock करें।</p>
                <a href="${esc(abs)}#buy-section" class="mt-3 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Unlock Now — ₹${esc(priceNum)}</a>
                <p class="mt-2 text-xs text-muted-foreground">7-day refund guarantee • Secure Razorpay/PayPal checkout • Instant access</p>
              </div>
            `}
          </section>
        ` : ""}

        ${book.description ? `
          <section class="mt-10">
            <h2 class="font-serif text-2xl font-bold mb-4">About This Book</h2>
            <div class="prose max-w-none">${safeContentHtml(book.description)}</div>
          </section>
        ` : ""}

        ${(book.toc || []).length ? `
          <section class="mt-10">
            <h2 class="font-serif text-2xl font-bold mb-4">Table of Contents (${esc(book.total_chapters)} chapters)</h2>
            <ol class="list-decimal pl-6 space-y-1 text-sm">${tocHtml}</ol>
          </section>
        ` : ""}
      </article>
    </main>
  `;
  return { head, rootHtml };
}

async function writeBookRouteFile(book, baseHtml) {
  const route = routePathForBook(book);
  const snapshot = renderBookDetailSnapshot(book);
  await writeRouteFile(route, baseHtml, snapshot);
  return { route, snapshot };
}


function validateHead(route, headHtml, seen) {
  const missing = REQUIRED.filter((r) => !r.check(headHtml)).map((r) => r.name);
  const title = extract(/<title>([^<]+)<\/title>/i, headHtml);
  const desc = extract(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, headHtml);
  // Uniqueness — homepage title/desc must not repeat on inner routes.
  if (title && seen.titles.has(title) && seen.titles.get(title) !== route) {
    missing.push(`duplicate title (also on ${seen.titles.get(title)})`);
  } else if (title) seen.titles.set(title, route);
  if (desc && seen.descs.has(desc) && seen.descs.get(desc) !== route) {
    missing.push(`duplicate description (also on ${seen.descs.get(desc)})`);
  } else if (desc) seen.descs.set(desc, route);
  return missing;
}

function validateBody(route, rootHtml) {
  const problems = [];
  if (!rootHtml || rootHtml.length < 200) {
    problems.push(`empty/tiny #root (${rootHtml?.length ?? 0} chars)`);
  }
  const h1Count = (rootHtml.match(/<h1\b/gi) || []).length;
  if (h1Count === 0) problems.push("missing <h1>");
  else if (h1Count > 1) problems.push(`multiple <h1> (${h1Count})`);
  return problems;
}



async function snapshotRoute(page, route) {
  const url = `${ORIGIN}${route}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  // Give react-helmet-style hooks a tick to mutate head after data loads.
  await page.waitForTimeout(800);
  // Wait until canonical points at this route (best-effort).
  try {
    await page.waitForFunction(
      (expected) => {
        const c = document.querySelector('link[rel="canonical"]');
        return c && c.getAttribute("href")?.includes(expected);
      },
      route === "/" ? "gyandootnova.in" : route,
      { timeout: 4000 }
    );
  } catch {}
  return page.evaluate(() => ({
    head: document.head.innerHTML,
    rootHtml: document.getElementById("root")?.innerHTML ?? "",
  }));
}

async function writeRouteFile(route, baseHtml, snapshot) {
  // Strip any absolute localhost URLs the vite preview server injected into
  // the captured head (e.g. dynamic <link rel="modulepreload"> tags). Left
  // in place they leak dev URLs into production HTML.
  const cleanHead = snapshot.head
    .replace(/https?:\/\/localhost:\d+/g, "")
    .replace(/https?:\/\/127\.0\.0\.1:\d+/g, "");
  // Replace the head content of the base index.html with the rendered head.
  let rewritten = baseHtml.replace(
    /<head>[\s\S]*?<\/head>/i,
    `<head>\n${cleanHead}\n</head>`
  );
  // Inject the rendered body content into #root so crawlers (and users with
  // JS disabled) see real text without executing JavaScript. React will
  // hydrate on top of this markup on first client render.
  if (snapshot.rootHtml && snapshot.rootHtml.length > 20) {
    rewritten = rewritten.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${snapshot.rootHtml}</div>`
    );
  }

  const targets = outputTargetsForRoute(route);
  for (const target of targets) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, rewritten, "utf8");
  }
}

function outputTargetsForRoute(route) {
  if (route === "/") return [join(DIST, "index.html")];
  const rel = route.replace(/^\//, "");
  const variants = new Set([rel]);
  try { variants.add(decodeURIComponent(rel)); } catch {}
  const targets = new Set();
  for (const variant of variants) {
    targets.add(join(DIST, variant, "index.html"));
    targets.add(join(DIST, `${variant}.html`));
  }
  return Array.from(targets);
}

async function writeReaderRouteFile(row, baseHtml) {
  const route = routePathForReader(row);
  const snapshot = renderReaderSnapshot(row);
  await writeRouteFile(route, baseHtml, snapshot);
  return route;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ missing — run `bun run build` first.");
    process.exit(1);
  }
  const baseHtml = await readFile(join(DIST, "index.html"), "utf8");

  console.log("→ fetching dynamic slugs from Supabase…");
  const [articleSlugs, seoPayload, fallbackBookSlugs] = await Promise.all([
    fetchSlugs("posts", "&is_published=eq.true"),
    fetchSeoPrerenderPayload(),
    fetchSlugs("books"),
  ]);
  const bookRows = seoPayload.books.length ? seoPayload.books : fallbackBookSlugs.map((slug) => ({ slug, title: slug, author: "GyandootNova", is_free: false, price: 0, toc: [], first_free_chapter: null }));
  const readerRows = seoPayload.chapters;

  console.log(`  books=${bookRows.length}  reader-pages=${readerRows.length}  articles=${articleSlugs.length}`);

  // Static routes + articles still go through Playwright snapshot;
  // book detail routes are rendered statically from backend data below.
  const routes = [
    ...STATIC_ROUTES,
    ...articleSlugs.map((s) => `/articles/${s}`),
  ];
  const bookRoutes = bookRows.map(routePathForBook);
  const readerRoutes = readerRows.map(routePathForReader);
  const allRoutesCount = routes.length + bookRoutes.length + readerRoutes.length;
  console.log(`→ ${allRoutesCount} routes total (${CHECK_ONLY ? "check-only" : "prerender+check"})`);


  console.log("→ starting vite preview…");
  const preview = await startPreview();

  const failures = [];
  let processed = 0;
  try {
    // Auto-detect chromium if the packaged one isn't installed (e.g. sandbox)
    let execPath = process.env.CHROMIUM_PATH;
    if (!execPath) {
      const candidates = [
        "/chromium_headless_shell-1194/chrome-linux/headless_shell",
        "/chromium-1194/chrome-linux/chrome",
      ];
      for (const c of candidates) if (existsSync(c)) { execPath = c; break; }
    }
    const browser = await chromium.launch({ headless: true, executablePath: execPath || undefined });


    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (compatible; LovableSEOBot/1.0)",
    });
    const page = await context.newPage();
    page.on("pageerror", () => {});

    const seen = { titles: new Map(), descs: new Map() };
    for (const route of routes) {
      try {
        const snapshot = await snapshotRoute(page, route);
        const missing = [
          ...validateHead(route, snapshot.head, seen),
          ...validateBody(route, snapshot.rootHtml),
        ];
        if (missing.length) {
          failures.push({ route, missing });
          console.log(`  ✗ ${route}  ${missing.join(", ")}`);
        } else {
          console.log(`  ✓ ${route}`);
        }
        if (!CHECK_ONLY) await writeRouteFile(route, baseHtml, snapshot);
      } catch (e) {
        failures.push({ route, missing: [`render error: ${e.message}`] });
        console.log(`  ✗ ${route}  ${e.message}`);
      }
      processed++;
    }

    for (const book of bookRows) {
      const route = routePathForBook(book);
      try {
        const snapshot = renderBookDetailSnapshot(book);
        const missing = [
          ...validateHead(route, snapshot.head, seen),
          ...validateBody(route, snapshot.rootHtml),
        ];
        if (missing.length) {
          failures.push({ route, missing });
          console.log(`  ✗ ${route}  ${missing.join(", ")}`);
        } else {
          console.log(`  ✓ ${route}`);
        }
        if (!CHECK_ONLY) await writeBookRouteFile(book, baseHtml);
      } catch (e) {
        failures.push({ route, missing: [`render error: ${e.message}`] });
        console.log(`  ✗ ${route}  ${e.message}`);
      }
      processed++;
    }

    for (const row of readerRows) {

      const route = routePathForReader(row);
      try {
        const snapshot = renderReaderSnapshot(row);
        const missing = [
          ...validateHead(route, snapshot.head, seen),
          ...validateBody(route, snapshot.rootHtml),
        ];
        if (missing.length) {
          failures.push({ route, missing });
          console.log(`  ✗ ${route}  ${missing.join(", ")}`);
        } else {
          console.log(`  ✓ ${route}`);
        }
        if (!CHECK_ONLY) await writeReaderRouteFile(row, baseHtml);
      } catch (e) {
        failures.push({ route, missing: [`render error: ${e.message}`] });
        console.log(`  ✗ ${route}  ${e.message}`);
      }
      processed++;
    }


    await browser.close();
  } finally {
    preview.kill("SIGTERM");
  }

  console.log(`\nDone: ${processed - failures.length}/${processed} routes OK`);
  if (failures.length) {
    console.error(`\nSEO failures on ${failures.length} route(s):`);
    failures.forEach((f) => console.error(`  ${f.route} — ${f.missing.join(", ")}`));
    if (!NO_FAIL) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
