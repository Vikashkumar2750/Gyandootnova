#!/usr/bin/env node
/**
 * Live SEO verifier — pure HTTP (no JS execution).
 *
 * Usage:
 *   node scripts/verify-live-seo.mjs [origin] [options]
 *   ORIGIN=https://foo.com node scripts/verify-live-seo.mjs
 *
 * Options:
 *   --origin=<url>          Target origin (default: https://gyandootnova.in).
 *   --concurrency=<n>       Max parallel requests (default: 6). Auto-throttles on 429.
 *   --min-concurrency=<n>   Floor for adaptive throttling (default: 1).
 *   --retries=<n>           Max retries per URL on 429/5xx (default: 3).
 *   --backoff=<ms>          Base backoff in ms; exponential + jitter (default: 500).
 *   --min-words=<n>         Minimum visible words per page (default: 60).
 *   --selector=<css>        Required content selector, repeatable
 *                           (default: main, article).
 *   --header="K: V"         Extra request header, repeatable
 *                           (e.g. --header="Authorization: Bearer xyz").
 *   --user-agent=<str>      Override the User-Agent header.
 *   --cookie=<str>          Add a Cookie header (shortcut for --header="Cookie: ...").
 *   --skip-og-check         Skip the og:image / twitter:image HEAD probe.
 *   --skip-jsonld-check     Skip JSON-LD schema validation.
 *   --schema-rule=<pat>=<T>:<a,b,c>
 *                           Override JSON-LD expectations for URL pattern <pat>
 *                           (glob-like: /books/*). Repeatable. Example:
 *                             --schema-rule="/books/*=Book:name,inLanguage,author,isbn"
 *                             --schema-rule="/articles/*=Article:headline,datePublished,author,image"
 *                             --schema-rule="/faq=FAQPage:mainEntity"
 *   --report=<path>         JSON report path (default: dist/seo-live-report.json).
 *   --html=<path>           HTML report path (default: dist/seo-live-report.html).
 *   --csv=<path>            CSV report path (default: dist/seo-live-report.csv).
 *                           One row per route, easy to sort/share in spreadsheets.
 *   --no-html               Do not emit the HTML report.
 *   --no-csv                Do not emit the CSV report.
 *   --timeout=<ms>          Per-request timeout (default: 15000). Timed-out
 *                           requests count as retriable errors (like 5xx).
 *   --max-fetch-ms=<ms>     Fail routes whose page fetch exceeds this
 *                           duration (default: unlimited).
 *   --max-asset-ms=<ms>     Fail routes whose og/twitter image probe exceeds
 *                           this duration (default: unlimited).
 *   --max-fetch-ms-rule=<glob>=<ms>
 *                           Per-route override for --max-fetch-ms (repeatable).
 *                           Example: --max-fetch-ms-rule="/books/*=6000"
 *   --max-asset-ms-rule=<glob>=<ms>
 *                           Per-route override for --max-asset-ms (repeatable).
 *   --config=<path>         Load defaults from a JSON or YAML config file
 *                           (see loadConfig() for the shape). CLI flags
 *                           always override the config file.
 *   --debug-log=<path>      Emit an NDJSON debug log with per-URL fetch
 *                           timings, redirect chains, and image-byte details.
 *                           Default: dist/seo-live-debug.ndjson (unless
 *                           --no-debug-log is passed).
 *   --sarif=<path>          Emit a SARIF v2.1.0 report so GitHub can display
 *                           failing routes inline on pull requests.
 *                           Default: dist/seo-live-report.sarif.
 *   --allow-redirect=<glob> Suppress "redirect landed off-route" failures for
 *                           URLs matching <glob>. Repeatable.
 *   --allow-canonical-mismatch=<glob>
 *                           Suppress canonical/og:url mismatch failures for
 *                           URLs matching <glob>. Repeatable.
 *   --github-summary        Append a compact table to $GITHUB_STEP_SUMMARY and
 *                           emit ::error:: annotations for failing routes.
 *   --resume=<path>         Reuse a previous JSON report; skip URLs that
 *                           passed there (default: off). Pair with --report to
 *                           point at the same file.
 *
 * Single-page curl (for spot checks):
 *   curl -sA "Googlebot" https://gyandootnova.in/books/rigved \
 *     | grep -E "<title|og:image|<h1|name=\"description\""
 */

import { writeFileSync, mkdirSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";


// ---------- CLI ----------
const args = process.argv.slice(2);
const positional = args.find((a) => !a.startsWith("--"));
const opt = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const flag = (name) => args.includes(`--${name}`);
const many = (name) => args.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));

const ORIGIN = (opt("origin", positional || process.env.ORIGIN || "https://gyandootnova.in")).replace(/\/$/, "");
const MAX_CONCURRENCY = Math.max(1, parseInt(opt("concurrency", "6"), 10));
const MIN_CONCURRENCY = Math.max(1, parseInt(opt("min-concurrency", "1"), 10));
const RETRIES = Math.max(0, parseInt(opt("retries", "3"), 10));
const BACKOFF = Math.max(50, parseInt(opt("backoff", "500"), 10));
const MIN_WORDS = Math.max(0, parseInt(opt("min-words", "60"), 10));
const SELECTORS = many("selector").length ? many("selector") : ["main", "article"];
const SKIP_OG = flag("skip-og-check");
const SKIP_JSONLD = flag("skip-jsonld-check");
const REPORT = opt("report", "dist/seo-live-report.json");
const HTML_REPORT = flag("no-html") ? null : opt("html", "dist/seo-live-report.html");
const CSV_REPORT = flag("no-csv") ? null : opt("csv", "dist/seo-live-report.csv");
const GITHUB_SUMMARY = flag("github-summary") || !!process.env.GITHUB_STEP_SUMMARY;
const RESUME = opt("resume", "");
const TIMEOUT_MS = Math.max(1000, parseInt(opt("timeout", "15000"), 10));
const MAX_FETCH_MS = parseInt(opt("max-fetch-ms", "0"), 10) || 0;
const MAX_ASSET_MS = parseInt(opt("max-asset-ms", "0"), 10) || 0;
// Per-route timing overrides — repeatable:
//   --max-fetch-ms-rule="/books/*=6000"
//   --max-asset-ms-rule="/articles/*=4000"
function parseTimingRule(raw) {
  const eq = raw.lastIndexOf("=");
  if (eq < 0) return null;
  const pattern = raw.slice(0, eq).trim();
  const ms = parseInt(raw.slice(eq + 1).trim(), 10);
  if (!pattern || !Number.isFinite(ms) || ms <= 0) return null;
  return { pattern, ms, re: globToRegExp(pattern) };
}

const DEFAULT_UA = "Mozilla/5.0 (compatible; GyandootSEOVerifier/1.0; +https://gyandootnova.in)";
const UA = opt("user-agent", DEFAULT_UA);


const EXTRA_HEADERS = { "User-Agent": UA, Accept: "text/html,*/*" };
for (const h of many("header")) {
  const idx = h.indexOf(":");
  if (idx > 0) EXTRA_HEADERS[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
}
const cookie = opt("cookie", "");
if (cookie) EXTRA_HEADERS["Cookie"] = cookie;

// Parse --schema-rule flags into ordered [pattern, {type, required[]}] pairs.
// First matching pattern wins; user rules take precedence over defaults.
function parseSchemaRule(raw) {
  const eq = raw.indexOf("=");
  if (eq < 0) return null;
  const pattern = raw.slice(0, eq).trim();
  const rhs = raw.slice(eq + 1).trim();
  const colon = rhs.indexOf(":");
  const type = colon < 0 ? rhs : rhs.slice(0, colon).trim();
  const required = colon < 0 ? [] : rhs.slice(colon + 1).split(",").map((s) => s.trim()).filter(Boolean);
  return { pattern, type, required };
}
function globToRegExp(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${esc}$`);
}
const USER_SCHEMA_RULES = many("schema-rule").map(parseSchemaRule).filter(Boolean)
  .map((r) => ({ ...r, re: globToRegExp(r.pattern) }));
const DEFAULT_SCHEMA_RULES = [
  { pattern: "/books/*", type: "Book", required: ["name", "inLanguage", "author"], re: globToRegExp("/books/*") },
  { pattern: "/articles/*", type: "Article", required: ["headline", "datePublished", "author"], re: globToRegExp("/articles/*") },
];
const SCHEMA_RULES_ORDERED = [...USER_SCHEMA_RULES, ...DEFAULT_SCHEMA_RULES];

// ---------- config file (--config=<path>) ----------
// Shape (JSON or YAML):
//   maxFetchMsRules: [{ pattern: "/books/*", ms: 6000 }]
//   maxAssetMsRules: [{ pattern: "/articles/*", ms: 4000 }]
//   allowlist:
//     redirects:          ["/legacy/*", "/promo/**"]
//     canonicalMismatch:  ["/campaign/*"]
async function loadConfig(path) {
  if (!path) return {};
  if (!existsSync(path)) { console.warn(`⚠ config: ${path} not found`); return {}; }
  const raw = readFileSync(path, "utf8");
  const ext = path.toLowerCase().split(".").pop();
  if (ext === "json") return JSON.parse(raw);
  if (ext === "yaml" || ext === "yml") {
    try {
      const mod = await import("yaml").catch(() => null);
      if (mod) return mod.parse(raw);
      // Minimal fallback parser for the shallow schema we document above.
      return parseTinyYaml(raw);
    } catch (e) { console.warn(`⚠ config: YAML parse failed (${e.message})`); return {}; }
  }
  console.warn(`⚠ config: unsupported extension .${ext}`);
  return {};
}
function parseTinyYaml(text) {
  // Handles the documented shape only:
  //   key: value
  //   key:
  //     nested: value
  //     - scalar
  //     - key: val         <- introduces a map inside a list; subsequent
  //       key2: val           indented lines add to that same map
  const root = {};
  // Contexts: { indent, container, pendingKey? }
  //   container is either an object or an array.
  //   pendingKey (map only) — the key that will hold the next indented block.
  const ctx = [{ indent: -1, container: root }];
  const coerce = (v) => {
    v = v.replace(/^["']|["']$/g, "");
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "null" || v === "~") return null;
    return v;
  };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();
    // Dedent: pop contexts whose indent is deeper than this line.
    while (ctx.length > 1 && indent < ctx[ctx.length - 1].indent) ctx.pop();

    let top = ctx[ctx.length - 1];

    // If parent has a pendingKey, this indented line resolves what type
    // that key holds. First line decides: "- ..." → array, "key: ..." → object.
    if (top.pendingKey !== undefined) {
      const parent = top.container;
      const newContainer = trimmed.startsWith("- ") ? [] : {};
      parent[top.pendingKey] = newContainer;
      top.pendingKey = undefined;
      ctx.push({ indent, container: newContainer });
      top = ctx[ctx.length - 1];
    }

    if (trimmed.startsWith("- ")) {
      if (!Array.isArray(top.container)) {
        // Shouldn't happen if input is well-formed; skip.
        continue;
      }
      const rest = trimmed.slice(2).trim();
      const colon = rest.indexOf(":");
      if (colon > 0) {
        // "- key: value" or "- key:" — introduces a map into the list.
        const obj = {};
        const key = rest.slice(0, colon).trim();
        const val = rest.slice(colon + 1).trim();
        if (val === "") obj[key] = null; else obj[key] = coerce(val);
        top.container.push(obj);
        // Sibling "key: val" lines at deeper indent attach to this map.
        ctx.push({ indent: indent + 2, container: obj });
      } else {
        top.container.push(coerce(rest));
      }
    } else {
      const colon = trimmed.indexOf(":");
      if (colon < 0) continue;
      if (Array.isArray(top.container)) continue;
      const key = trimmed.slice(0, colon).trim();
      const val = trimmed.slice(colon + 1).trim();
      if (val === "" ) {
        // Container follows on subsequent indented lines.
        top.pendingKey = key;
      } else if (val === "[]") {
        top.container[key] = [];
      } else if (val === "{}") {
        top.container[key] = {};
      } else {
        top.container[key] = coerce(val);
      }
    }
  }
  return root;
}


const CONFIG = await loadConfig(opt("config", ""));

function mergeTimingRules(cliRules, cfgRules) {
  const fromCfg = (cfgRules || []).map((r) => (r && r.pattern && r.ms)
    ? { pattern: r.pattern, ms: parseInt(r.ms, 10), re: globToRegExp(r.pattern) } : null).filter(Boolean);
  // CLI wins → put CLI first so it matches before config entries.
  return [...cliRules, ...fromCfg];
}
const MAX_FETCH_MS_RULES = mergeTimingRules(
  many("max-fetch-ms-rule").map(parseTimingRule).filter(Boolean),
  CONFIG.maxFetchMsRules,
);
const MAX_ASSET_MS_RULES = mergeTimingRules(
  many("max-asset-ms-rule").map(parseTimingRule).filter(Boolean),
  CONFIG.maxAssetMsRules,
);
function timingLimit(url, rules, fallback) {
  try {
    const path = new URL(url).pathname;
    for (const r of rules) if (r.re.test(path)) return r.ms;
  } catch { /* ignore */ }
  return fallback || 0;
}

// ---------- allowlists ----------
const ALLOW_REDIRECT_PATTERNS = [
  ...many("allow-redirect"),
  ...(CONFIG.allowlist?.redirects || []),
].map(globToRegExp);
const ALLOW_CANONICAL_MISMATCH_PATTERNS = [
  ...many("allow-canonical-mismatch"),
  ...(CONFIG.allowlist?.canonicalMismatch || []),
].map(globToRegExp);
function matchesAllowlist(url, patterns) {
  if (!patterns.length) return false;
  try {
    const path = new URL(url).pathname;
    return patterns.some((re) => re.test(path));
  } catch { return false; }
}

// ---------- output paths ----------
const DEBUG_LOG = flag("no-debug-log") ? null : opt("debug-log", "dist/seo-live-debug.ndjson");
const SARIF_REPORT = flag("no-sarif") ? null : opt("sarif", "dist/seo-live-report.sarif");



// ---------- resume mode ----------
const RESUMED_PASSING = new Set();
if (RESUME && existsSync(RESUME)) {
  try {
    const prev = JSON.parse(readFileSync(RESUME, "utf8"));
    for (const r of prev.results || []) {
      if (!(r.problems && r.problems.length)) RESUMED_PASSING.add(r.url);
    }
    console.log(`↺ resume: ${RESUMED_PASSING.size} URL(s) previously passing will be skipped (${RESUME})`);
  } catch (e) {
    console.warn(`⚠ resume: could not parse ${RESUME}: ${e.message}`);
  }
}

// ---------- helpers ----------
const pick = (re, s) => { const m = s.match(re); return m ? m[1].trim() : ""; };
const countMatches = (re, s) => (s.match(re) || []).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


// ---------- adaptive throttle ----------
// Reduce concurrency when sustained 429s appear; ramp back up after quiet window.
const throttle = {
  current: MAX_CONCURRENCY,
  recent429: 0,           // rolling count of 429s in the last window
  lastAdjustAt: Date.now(),
  cooldownUntil: 0,       // wall-clock when we may attempt to ramp back up
  windowMs: 5000,
  rampUpMs: 10_000,
};
function note429() {
  throttle.recent429++;
  const now = Date.now();
  if (throttle.recent429 >= 3 && throttle.current > MIN_CONCURRENCY) {
    const next = Math.max(MIN_CONCURRENCY, Math.floor(throttle.current / 2));
    console.log(`  ⚠︎ sustained 429s — lowering concurrency ${throttle.current} → ${next}`);
    throttle.current = next;
    throttle.cooldownUntil = now + throttle.rampUpMs;
    throttle.recent429 = 0;
    throttle.lastAdjustAt = now;
  }
}
function note2xx() {
  const now = Date.now();
  if (now - throttle.lastAdjustAt > throttle.windowMs) throttle.recent429 = 0;
  if (now >= throttle.cooldownUntil && throttle.current < MAX_CONCURRENCY) {
    throttle.current = Math.min(MAX_CONCURRENCY, throttle.current + 1);
    console.log(`  ↑ ramping concurrency back up → ${throttle.current}`);
    throttle.cooldownUntil = now + throttle.rampUpMs;
  }
}

// Single-hop fetch (no redirect following). Adds AbortController-based
// timeout and treats timeouts as retriable.
async function httpFetchOnce(url, { method = "GET" } = {}) {
  let attempt = 0;
  const t0 = Date.now();
  while (true) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`timeout ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    try {
      const r = await fetch(url, { method, headers: EXTRA_HEADERS, redirect: "manual", signal: ctrl.signal });
      clearTimeout(timer);
      const retriable = r.status === 429 || (r.status >= 500 && r.status <= 599);
      if (r.status === 429) note429();
      else if (r.status >= 200 && r.status < 400) note2xx();
      if (retriable && attempt < RETRIES) {
        const retryAfter = parseInt(r.headers.get("retry-after") || "0", 10) * 1000;
        const wait = retryAfter || (BACKOFF * 2 ** attempt + Math.floor(Math.random() * 200));
        await sleep(wait);
        attempt++;
        continue;
      }
      const body = method === "HEAD" ? "" : await r.text().catch(() => "");
      return {
        status: r.status,
        body,
        redirect: r.headers.get("location") || "",
        contentType: r.headers.get("content-type") || "",
        contentLength: parseInt(r.headers.get("content-length") || "0", 10) || 0,
        attempts: attempt + 1,
        ms: Date.now() - t0,
      };
    } catch (e) {
      clearTimeout(timer);
      const timedOut = e?.name === "AbortError" || /timeout|aborted/i.test(e?.message || "");
      if (attempt < RETRIES) {
        await sleep(BACKOFF * 2 ** attempt + Math.floor(Math.random() * 200));
        attempt++;
        continue;
      }
      return { status: 0, body: "", redirect: "", contentType: "", contentLength: 0, attempts: attempt + 1, ms: Date.now() - t0, error: timedOut ? `timeout after ${TIMEOUT_MS}ms` : e.message };
    }
  }
}

// Follows up to 5 redirects, recording the chain. The final response's URL
// is what audits/canonical checks run against.
async function httpFetch(url, opts = {}) {
  const chain = [];
  let current = url;
  let totalMs = 0;
  let attemptsSum = 0;
  for (let hop = 0; hop < 6; hop++) {
    const r = await httpFetchOnce(current, opts);
    totalMs += r.ms;
    attemptsSum += r.attempts;
    const isRedirect = r.status >= 300 && r.status < 400 && r.redirect;
    chain.push({ url: current, status: r.status, location: r.redirect || null, ms: r.ms });
    if (!isRedirect) {
      return { ...r, finalUrl: current, chain, ms: totalMs, attempts: attemptsSum };
    }
    current = new URL(r.redirect, current).toString();
  }
  return { status: 0, body: "", redirect: "", contentType: "", contentLength: 0, finalUrl: current, chain, ms: totalMs, attempts: attemptsSum, error: "too many redirects (>5)" };
}



async function loadSitemap() {
  const { status, body } = await httpFetch(`${ORIGIN}/sitemap.xml`);
  if (status !== 200) throw new Error(`sitemap.xml → HTTP ${status}`);
  return Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
}

function extractRoot(html) {
  const m = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/i);
  return m ? m[1] : "";
}
function stripTags(s) { return s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

// ---------- JSON-LD schema validation ----------
// Resolves the schema expectation for a URL using the ordered rule list
// (user rules first, then defaults). Returns null if no rule matches.
function ruleFor(url) {
  const path = new URL(url).pathname;
  for (const r of SCHEMA_RULES_ORDERED) if (r.re.test(path)) return r;
  return null;
}
function extractJsonLd(html) {
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const parsed = [];
  for (const b of blocks) {
    try {
      const raw = JSON.parse(b[1].trim());
      const items = Array.isArray(raw) ? raw : raw["@graph"] ? raw["@graph"] : [raw];
      for (const it of items) if (it && typeof it === "object") parsed.push(it);
    } catch { /* malformed block */ }
  }
  return parsed;
}
function validateJsonLd(url, html) {
  const problems = [];
  const blocks = extractJsonLd(html);
  const foundTypes = new Set(blocks.map((b) => Array.isArray(b["@type"]) ? b["@type"][0] : b["@type"]).filter(Boolean));
  const rule = ruleFor(url);
  if (rule) {
    const block = blocks.find((b) => (Array.isArray(b["@type"]) ? b["@type"].includes(rule.type) : b["@type"] === rule.type));
    if (!block) {
      problems.push(`missing JSON-LD @type=${rule.type} (rule: ${rule.pattern})`);
    } else {
      const missing = rule.required.filter((k) => block[k] === undefined || block[k] === "" || block[k] === null);
      if (missing.length) problems.push(`JSON-LD ${rule.type} missing: ${missing.join(", ")}`);
    }
  }
  return { problems, jsonldTypes: Array.from(foundTypes), appliedRule: rule ? rule.pattern : null };
}

function selectorPresent(rootHtml, sel) {
  if (sel.startsWith(".")) {
    const cls = sel.slice(1).replace(/[^\w-]/g, "");
    return new RegExp(`class=["'][^"']*\\b${cls}\\b`, "i").test(rootHtml);
  }
  const tag = sel.replace(/[^\w-]/g, "");
  return new RegExp(`<${tag}\\b`, "i").test(rootHtml);
}

// Canonical URL must match the URL we fetched, ignoring differences that
// are semantically insignificant: trailing slash, scheme/host case, default
// ports, fragments, and query-param ordering. Both origin-swap and
// homepage-pointing bugs still get caught.
function normalizeUrl(u) {
  try {
    const x = new URL(u);
    const protocol = x.protocol.toLowerCase();
    const host = x.hostname.toLowerCase();
    const defaultPort = (protocol === "http:" && x.port === "80") || (protocol === "https:" && x.port === "443");
    const port = defaultPort || !x.port ? "" : `:${x.port}`;
    let p = x.pathname.replace(/\/+$/, "");
    if (p === "") p = "/";
    // Sort query params for stable comparison; drop empty query.
    const params = [...x.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    const qs = params.length ? "?" + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&") : "";
    // Fragment intentionally dropped — never affects server response.
    return `${protocol}//${host}${port}${p}${qs}`;
  } catch { return null; }
}
function canonicalMismatch(fetchedUrl, canonicalHref) {
  if (!canonicalHref) return null;
  const a = normalizeUrl(fetchedUrl);
  const b = normalizeUrl(canonicalHref);
  if (!a || !b) return `canonical URL not parseable (${canonicalHref})`;
  if (a !== b) return `canonical mismatch — fetched ${a}, canonical ${b}`;
  return null;
}


function auditPage(url, html) {
  const problems = [];
  const title = pick(/<title>([^<]+)<\/title>/i, html);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, html);
  const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i, html);
  const ogUrl = pick(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i, html);
  const twImage = pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i, html);
  const twCard = pick(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i, html);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i, html);
  const rootHtml = extractRoot(html);
  const h1Count = countMatches(/<h1\b/gi, html);
  const visibleText = stripTags(rootHtml);
  const wordCount = visibleText ? visibleText.split(/\s+/).length : 0;
  const missingSelectors = SELECTORS.filter((s) => !selectorPresent(rootHtml, s));

  if (!title) problems.push("no <title>");
  if (!desc) problems.push("no meta description");
  if (!ogImage) problems.push("no og:image");
  if (!twCard) problems.push("no twitter:card");
  if (!canonical) problems.push("no canonical");
  const canonProblem = canonicalMismatch(url, canonical);
  if (canonProblem) problems.push(canonProblem);
  const ogUrlProblem = ogUrl ? canonicalMismatch(url, ogUrl) : null;
  if (ogUrlProblem) problems.push(`og:url ${ogUrlProblem.replace(/^canonical /, "")}`);
  if (rootHtml.length < 200) problems.push(`empty #root (${rootHtml.length} chars)`);
  if (wordCount < MIN_WORDS) problems.push(`only ${wordCount} words in #root (min ${MIN_WORDS})`);
  if (missingSelectors.length) problems.push(`missing content selector(s): ${missingSelectors.join(", ")}`);
  if (h1Count === 0) problems.push("missing <h1>");
  else if (h1Count > 1) problems.push(`multiple <h1> (${h1Count})`);

  let jsonldTypes = [];
  let appliedRule = null;
  if (!SKIP_JSONLD) {
    const j = validateJsonLd(url, html);
    problems.push(...j.problems);
    jsonldTypes = j.jsonldTypes;
    appliedRule = j.appliedRule;
  }

  return { url, title, desc, ogImage, ogUrl, twImage, twCard, canonical, h1Count, wordCount, missingSelectors, jsonldTypes, appliedRule, problems };
}

// Fetch just the first N bytes and identify the image format from its magic
// signature. Catches spoofed HTML served as image/png, wrong content-types,
// and truly broken placeholders regardless of Content-Type.
async function sniffImageBytes(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.min(TIMEOUT_MS, 8000));
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { ...EXTRA_HEADERS, Range: "bytes=0-63" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const buf = new Uint8Array(await r.arrayBuffer());
    return { bytes: buf, status: r.status };
  } catch {
    return { bytes: new Uint8Array(0), status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
function detectImageFormat(b) {
  if (!b || b.length < 4) return null;
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";
  // WebP: RIFF????WEBP
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  // AVIF / HEIC: 'ftyp' at offset 4, brand at 8..11
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
    if (["avif", "avis", "heic", "heix", "mif1"].includes(brand)) return brand.startsWith("avi") ? "avif" : "heic";
  }
  // BMP
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";
  // TIFF
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) return "tiff";
  // ICO
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return "ico";
  // SVG: text starts with "<?xml" or "<svg"
  const head = new TextDecoder("utf-8", { fatal: false }).decode(b.slice(0, Math.min(b.length, 64))).trim().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "svg";
  // Common spoof: HTML doctype/tag
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html";
  return null;
}

async function checkAssetExists(assetUrl) {
  if (!assetUrl) return { ok: false, status: 0, ms: 0, reason: "missing url" };
  const abs = assetUrl.startsWith("http") ? assetUrl : `${ORIGIN}${assetUrl.startsWith("/") ? "" : "/"}${assetUrl}`;
  const t0 = Date.now();
  let r = await httpFetch(abs, { method: "HEAD" });
  if (r.status === 405 || r.status === 0 || !r.contentType) r = await httpFetch(abs, { method: "GET" });
  const status = r.status;
  const contentType = (r.contentType || "").split(";")[0].trim().toLowerCase();
  const isImageType = contentType.startsWith("image/");
  const httpOk = status >= 200 && status < 400;
  const looksLikeErrorPage = httpOk && !isImageType && (contentType.includes("html") || contentType === "" || contentType.includes("text/"));
  const tooSmall = httpOk && r.contentLength > 0 && r.contentLength < 100;

  // Magic-byte sniff: only run for reachable assets; skip if HEAD already
  // proved it's a Ranged image *and* we care about identifying HTML spoofs.
  let sniffedFormat = null;
  if (httpOk) {
    const sniff = await sniffImageBytes(r.finalUrl || abs);
    sniffedFormat = detectImageFormat(sniff.bytes);
  }
  const isImageMagic = sniffedFormat && sniffedFormat !== "html" && sniffedFormat !== null;

  return {
    ok: httpOk && (isImageType || isImageMagic) && !tooSmall && sniffedFormat !== "html",
    status,
    ms: Date.now() - t0,
    url: abs,
    contentType: r.contentType || "",
    contentLength: r.contentLength || 0,
    finalUrl: r.finalUrl || abs,
    isImage: isImageType,
    sniffedFormat,           // "png" | "jpeg" | ... | "html" | null
    magicByteMatch: !!isImageMagic,
    looksLikeErrorPage,
    tooSmall,
  };
}




// Adaptive worker pool — reads throttle.current on every task pick so
// concurrency can grow/shrink mid-run.
async function withAdaptiveConcurrency(items, worker) {
  const results = new Array(items.length);
  let i = 0;
  let active = 0;
  return await new Promise((resolveAll) => {
    const spawn = () => {
      while (active < throttle.current && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(worker(items[idx], idx))
          .then((v) => { results[idx] = v; })
          .finally(() => {
            active--;
            if (i >= items.length && active === 0) resolveAll(results);
            else spawn();
          });
      }
    };
    spawn();
  });
}


// ---------- HTML report ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renderHtmlReport(summary) {
  const rows = summary.results.map((r) => {
    const bad = r.problems?.length ? "fail" : "pass";
    const diffs = (r.problems || []).map((p) => `<li>${esc(p)}</li>`).join("");
    const og = r.ogImageCheck ? `${r.ogImageCheck.status} · ${r.ogImageCheck.ms ?? "-"}ms` : "—";
    const tw = r.twImageCheck ? `${r.twImageCheck.status} · ${r.twImageCheck.ms ?? "-"}ms` : "—";
    const skipped = r.skipped ? ' <span title="resumed from previous report">↺</span>' : "";
    return `<tr class="${bad}">
      <td class="url"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>${skipped}</td>
      <td>${r.status ?? "-"}</td>
      <td>${r.fetchMs ?? "-"}</td>
      <td>${r.h1Count ?? "-"}</td>
      <td>${r.wordCount ?? "-"}</td>
      <td class="mono">${esc(r.title || "")}</td>
      <td class="mono">${og}</td>
      <td class="mono">${tw}</td>
      <td>${diffs ? `<ul>${diffs}</ul>` : "✓"}</td>
    </tr>`;
  }).join("\n");

  const timings = summary.results.map((r) => r.fetchMs).filter((n) => typeof n === "number").sort((a, b) => a - b);
  const p = (q) => timings.length ? timings[Math.min(timings.length - 1, Math.floor(timings.length * q))] : 0;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>SEO Live Report — ${esc(summary.origin)}</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; color:#111; background:#fafafa; }
  h1 { margin:0 0 4px; font-size:22px; }
  .meta { color:#666; margin-bottom:16px; font-size:13px; }
  .stats { display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
  .stat { background:#fff; padding:10px 14px; border-radius:6px; border:1px solid #e5e5e5; }
  .stat.ok { border-color:#16a34a; color:#166534; }
  .stat.bad { border-color:#dc2626; color:#991b1b; }
  table { width:100%; border-collapse:collapse; background:#fff; font-size:13px; }
  th, td { padding:8px 10px; border-bottom:1px solid #eee; vertical-align:top; text-align:left; }
  th { background:#f3f4f6; position:sticky; top:0; }
  tr.fail td { background:#fef2f2; }
  tr.pass td { background:#f0fdf4; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size:12px; word-break:break-all; }
  .url { max-width:340px; word-break:break-all; }
  ul { margin:0; padding-left:18px; color:#991b1b; }
</style></head><body>
<h1>SEO Live Report</h1>
<div class="meta">Origin: <b>${esc(summary.origin)}</b> · Generated ${esc(summary.generatedAt)} · Concurrency ${summary.maxConcurrency} (final ${summary.finalConcurrency}) · Min words ${summary.minWords}${summary.resumed ? ` · resumed ${summary.resumed} URL(s)` : ""}</div>
<div class="stats">
  <div class="stat ok">✓ ${summary.total - summary.failed} passing</div>
  <div class="stat bad">✗ ${summary.failed} failing</div>
  <div class="stat">Σ ${summary.total} routes</div>
  <div class="stat">fetch p50 ${p(0.5)}ms · p95 ${p(0.95)}ms · max ${timings[timings.length - 1] || 0}ms</div>
</div>
<table>
<thead><tr><th>URL</th><th>Status</th><th>Fetch ms</th><th>H1</th><th>Words</th><th>Title</th><th>og:image</th><th>twitter:image</th><th>Problems</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}


// ---------- GitHub Actions integration ----------
function emitGitHubAnnotations(results) {
  // ::error:: annotations show up on the PR "Files changed" / checks view.
  for (const r of results) {
    if (!r.problems?.length) continue;
    const msg = r.problems.join(" | ").replace(/\n/g, " ");
    console.log(`::error title=SEO failure: ${r.url}::${msg}`);
  }
}
function emitGitHubStepSummary(summary) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const failing = summary.results.filter((r) => r.problems?.length);
  const rows = failing.length
    ? failing.map((r) => `| ${r.url} | ${r.status ?? "-"} | ${r.h1Count ?? "-"} | ${r.wordCount ?? "-"} | ${(r.problems || []).map((p) => p.replace(/\|/g, "\\|")).join("<br>")} |`).join("\n")
    : "_All routes passing._";
  const md = [
    `## SEO Live Report — \`${summary.origin}\``,
    ``,
    `**${summary.total - summary.failed}/${summary.total} passing** · concurrency ${summary.maxConcurrency} · min-words ${summary.minWords} · retries ${summary.retries}`,
    ``,
    `### ${summary.failed} failing route${summary.failed === 1 ? "" : "s"}`,
    ``,
    `| URL | Status | H1 | Words | Problems |`,
    `|---|---|---|---|---|`,
    rows,
    ``,
    `Full HTML/JSON reports are attached as workflow artifacts (\`seo-live-report\`).`,
    ``,
  ].join("\n");
  appendFileSync(path, md);
}

// ---------- CSV report ----------
// RFC 4180-ish: wrap every cell in quotes, escape internal quotes as "".
// Excel/Sheets both open this cleanly with sortable columns.
function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}
function renderCsv(summary) {
  const header = [
    "url", "status", "final_url",
    "redirect_hops", "redirect_chain", "final_matches_canonical", "final_matches_og_url",
    "fetch_ms", "attempts",
    "h1_count", "word_count", "title", "description", "canonical", "og_url",
    "og_image", "og_image_status", "og_image_ms", "og_image_type",
    "og_image_magic", "og_image_magic_ok",
    "tw_image", "tw_image_status", "tw_image_ms", "tw_image_type",
    "tw_image_magic", "tw_image_magic_ok",
    "jsonld_types", "applied_rule", "problems",
  ];
  const normEq = (a, b) => {
    if (!a || !b) return "";
    try {
      const norm = (u) => {
        const x = new URL(u);
        let p = x.pathname.replace(/\/+$/, "") || "/";
        return `${x.origin}${p}`;
      };
      return norm(a) === norm(b) ? "yes" : "no";
    } catch { return ""; }
  };
  const rows = summary.results.map((r) => {
    const chain = r.redirectChain || [];
    // Chain URLs joined with " → ". Each hop shows "STATUS url" for context.
    const chainStr = chain.map((h, i) => i === 0 ? h.url : `${h.status || "?"} ${h.url}`).join(" → ");
    return [
      r.url,
      r.status ?? "",
      r.finalUrl ?? "",
      Math.max(0, chain.length - 1),
      chainStr,
      normEq(r.finalUrl, r.canonical),
      normEq(r.finalUrl, r.ogUrl),
      r.fetchMs ?? "",
      r.attempts ?? "",
      r.h1Count ?? "",
      r.wordCount ?? "",
      r.title ?? "",
      r.desc ?? "",
      r.canonical ?? "",
      r.ogUrl ?? "",
      r.ogImage ?? "",
      r.ogImageCheck?.status ?? "",
      r.ogImageCheck?.ms ?? "",
      r.ogImageCheck?.contentType ?? "",
      r.ogImageCheck?.sniffedFormat ?? "",
      r.ogImageCheck ? (r.ogImageCheck.magicByteMatch ? "yes" : "no") : "",
      r.twImage ?? "",
      r.twImageCheck?.status ?? "",
      r.twImageCheck?.ms ?? "",
      r.twImageCheck?.contentType ?? "",
      r.twImageCheck?.sniffedFormat ?? "",
      r.twImageCheck ? (r.twImageCheck.magicByteMatch ? "yes" : "no") : "",
      (r.jsonldTypes || []).join("|"),
      r.appliedRule ?? "",
      (r.problems || []).join(" | "),
    ].map(csvCell).join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\n") + "\n";
}

// ---------- SARIF v2.1.0 ----------
// Groups problems by category so GitHub renders each SEO check as its own
// rule (with a stable ruleId) and each failing route as a result.
function classifyProblem(msg) {
  if (msg.startsWith("HTTP ")) return { id: "SEO001", name: "unreachable", level: "error" };
  if (msg.startsWith("no <title>") || msg.startsWith("no meta description") || msg.startsWith("no canonical") || msg.startsWith("no og:image") || msg.startsWith("no twitter:card")) return { id: "SEO010", name: "missing-meta", level: "error" };
  if (msg.startsWith("canonical mismatch") || msg.startsWith("og:url mismatch") || msg.startsWith("canonical URL not parseable")) return { id: "SEO011", name: "canonical-mismatch", level: "error" };
  if (msg.startsWith("redirect landed off-route")) return { id: "SEO012", name: "redirect-off-route", level: "error" };
  if (msg.startsWith("empty #root") || msg.startsWith("only ") || msg.startsWith("missing content selector")) return { id: "SEO020", name: "no-prerendered-content", level: "error" };
  if (msg.startsWith("missing <h1>") || msg.startsWith("multiple <h1>")) return { id: "SEO021", name: "h1-issue", level: "warning" };
  if (msg.startsWith("missing JSON-LD") || msg.startsWith("JSON-LD ")) return { id: "SEO030", name: "jsonld", level: "warning" };
  if (msg.startsWith("og:image") || msg.startsWith("twitter:image")) return { id: "SEO040", name: "social-image", level: "error" };
  if (msg.startsWith("duplicate title") || msg.startsWith("duplicate description")) return { id: "SEO050", name: "duplicate-meta", level: "warning" };
  if (msg.includes("too slow")) return { id: "SEO060", name: "slow-response", level: "warning" };
  return { id: "SEO999", name: "other", level: "note" };
}
function renderSarif(summary) {
  const rulesMap = new Map();
  const sarifResults = [];
  for (const r of summary.results) {
    for (const p of r.problems || []) {
      const rule = classifyProblem(p);
      if (!rulesMap.has(rule.id)) {
        rulesMap.set(rule.id, {
          id: rule.id,
          name: rule.name,
          shortDescription: { text: rule.name },
          fullDescription: { text: `SEO check: ${rule.name}` },
          defaultConfiguration: { level: rule.level },
        });
      }
      sarifResults.push({
        ruleId: rule.id,
        level: rule.level,
        message: { text: p },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: r.url },
            region: { startLine: 1 },
          },
          logicalLocations: [{ name: new URL(r.url).pathname, kind: "route" }],
        }],
        properties: { fetchMs: r.fetchMs || 0, status: r.status || 0 },
      });
    }
  }
  return {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "verify-live-seo",
          informationUri: "https://gyandootnova.in",
          version: "1.1.0",
          rules: [...rulesMap.values()],
        },
      },
      invocations: [{
        executionSuccessful: summary.failed === 0,
        startTimeUtc: summary.generatedAt,
        properties: { origin: summary.origin, total: summary.total, failed: summary.failed },
      }],
      results: sarifResults,
    }],
  };
}


// ---------- main ----------
async function main() {
  console.log(`→ verifying ${ORIGIN}  (max-concurrency=${MAX_CONCURRENCY} min=${MIN_CONCURRENCY} retries=${RETRIES} timeout=${TIMEOUT_MS}ms min-words=${MIN_WORDS}${MAX_FETCH_MS ? ` max-fetch=${MAX_FETCH_MS}ms` : ""}${MAX_ASSET_MS ? ` max-asset=${MAX_ASSET_MS}ms` : ""})`);
  const urls = await loadSitemap();
  console.log(`  sitemap: ${urls.length} URLs`);

  const seenTitles = new Map();
  const seenDescs = new Map();
  let done = 0;

  const results = await withAdaptiveConcurrency(urls, async (url) => {
    if (RESUMED_PASSING.has(url)) {
      done++;
      console.log(`  [${done}/${urls.length}] ↺ ${url} (skipped — passed in previous run)`);
      return { url, status: 200, skipped: true, problems: [], fetchMs: 0 };
    }
    const res = await httpFetch(url);
    const { status, body, attempts, ms: fetchMs, finalUrl, chain, error } = res;
    let entry;
    if (status !== 200) {
      const trail = (chain || []).map((h) => `${h.status}${h.location ? ` → ${h.location}` : ""}`).join(" ");
      entry = { url, status, attempts, fetchMs, redirectChain: chain, finalUrl, problems: [`HTTP ${status}${error ? ` (${error})` : ""}${trail ? ` [${trail}]` : ""}`] };
    } else {
      const audit = auditPage(url, body);
      entry = { status, attempts, fetchMs, redirectChain: chain, finalUrl, ...audit };
      // Redirect-chain sanity: the final URL must resolve to the same path
      // we asked for (canonical/og:url are checked separately in auditPage).
      // Redirect-chain sanity: the final URL must resolve to the same path
      // we asked for (ignoring trailing slash). Off-route redirects fail;
      // trailing-slash normalizations are silent.
      if (finalUrl && finalUrl !== url) {
        const mm = canonicalMismatch(url, finalUrl);
        if (mm) entry.problems.push(`redirect landed off-route — ${mm.replace(/^canonical /, "")}`);
      }

      const fetchLimit = timingLimit(url, MAX_FETCH_MS_RULES, MAX_FETCH_MS);
      if (fetchLimit && fetchMs > fetchLimit) {
        entry.problems.push(`fetch too slow: ${fetchMs}ms > ${fetchLimit}ms`);
      }
      if (!SKIP_OG) {
        const [og, tw] = await Promise.all([checkAssetExists(audit.ogImage), checkAssetExists(audit.twImage)]);
        entry.ogImageCheck = og;
        entry.twImageCheck = tw;
        const assetLimit = timingLimit(url, MAX_ASSET_MS_RULES, MAX_ASSET_MS);
        const flagAsset = (label, meta, probe) => {
          if (!meta) return;
          if (probe.status < 200 || probe.status >= 400) {
            entry.problems.push(`${label} not reachable (HTTP ${probe.status})`);
            return;
          }
          if (probe.looksLikeErrorPage) {
            entry.problems.push(`${label} returned non-image content-type "${probe.contentType || "unknown"}" (likely error page)`);
          } else if (!probe.isImage) {
            entry.problems.push(`${label} content-type is "${probe.contentType || "unknown"}", expected image/*`);
          }
          // Magic-byte checks catch spoofed HTML served as image/png etc.
          if (probe.sniffedFormat === "html") {
            entry.problems.push(`${label} magic bytes look like HTML — spoofed image (content-type claims "${probe.contentType || "unknown"}")`);
          } else if (probe.sniffedFormat && probe.isImage) {
            const expected = (probe.contentType.split("/")[1] || "").split(";")[0].trim();
            const equiv = { jpg: "jpeg", "svg+xml": "svg", "vnd.microsoft.icon": "ico", "x-icon": "ico" };
            const norm = equiv[expected] || expected;
            if (norm && norm !== probe.sniffedFormat && !(norm === "png" && probe.sniffedFormat === "png")) {
              entry.problems.push(`${label} content-type says image/${expected} but magic bytes say ${probe.sniffedFormat}`);
            }
          } else if (!probe.sniffedFormat && probe.isImage) {
            entry.problems.push(`${label} content-type is image/* but no recognizable image signature in first 64 bytes`);
          }
          if (probe.tooSmall) entry.problems.push(`${label} suspiciously small (${probe.contentLength} bytes — broken placeholder?)`);
          if (assetLimit && probe.ms > assetLimit) entry.problems.push(`${label} probe too slow: ${probe.ms}ms > ${assetLimit}ms`);
        };
        flagAsset("og:image", audit.ogImage, og);
        flagAsset("twitter:image", audit.twImage, tw);
      }
    }


    done++;
    const mark = entry.problems?.length ? "✗" : "✓";
    const timing = entry.fetchMs != null ? ` ${entry.fetchMs}ms` : "";
    console.log(`  [${done}/${urls.length}] (c=${throttle.current}) ${mark}${timing} ${url}${entry.problems?.length ? " — " + entry.problems.join("; ") : ""}`);
    return entry;
  });

  for (const r of results) {
    if (r.skipped) continue;
    if (r.title) {
      if (seenTitles.has(r.title) && seenTitles.get(r.title) !== r.url) {
        r.problems.push(`duplicate title (also ${seenTitles.get(r.title)})`);
      } else seenTitles.set(r.title, r.url);
    }
    if (r.desc) {
      if (seenDescs.has(r.desc) && seenDescs.get(r.desc) !== r.url) {
        r.problems.push(`duplicate description (also ${seenDescs.get(r.desc)})`);
      } else seenDescs.set(r.desc, r.url);
    }
  }

  // Apply allowlists — suppress specific problem categories without touching
  // the underlying audit data. Silenced problems are moved to `ignored` for
  // transparency in reports.
  for (const r of results) {
    if (!r.problems?.length) continue;
    const allowRedirect = matchesAllowlist(r.url, ALLOW_REDIRECT_PATTERNS);
    const allowCanon = matchesAllowlist(r.url, ALLOW_CANONICAL_MISMATCH_PATTERNS);
    if (!allowRedirect && !allowCanon) continue;
    const kept = [], ignored = [];
    for (const p of r.problems) {
      if (allowRedirect && p.startsWith("redirect landed off-route")) { ignored.push(p); continue; }
      if (allowCanon && (p.startsWith("canonical mismatch") || p.startsWith("og:url mismatch"))) { ignored.push(p); continue; }
      kept.push(p);
    }
    r.problems = kept;
    if (ignored.length) r.ignoredProblems = ignored;
  }


  const failed = results.filter((r) => r.problems?.length).length;
  const summary = {
    origin: ORIGIN,
    generatedAt: new Date().toISOString(),
    maxConcurrency: MAX_CONCURRENCY,
    minConcurrency: MIN_CONCURRENCY,
    finalConcurrency: throttle.current,
    retries: RETRIES,
    timeoutMs: TIMEOUT_MS,
    maxFetchMs: MAX_FETCH_MS || null,
    maxAssetMs: MAX_ASSET_MS || null,
    minWords: MIN_WORDS,

    selectors: SELECTORS,
    schemaRules: SCHEMA_RULES_ORDERED.map(({ pattern, type, required }) => ({ pattern, type, required })),
    resumed: RESUMED_PASSING.size,
    resumeFrom: RESUME || null,
    total: results.length,
    failed,
    results,
  };


  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, JSON.stringify(summary, null, 2));
  console.log(`\nJSON report → ${REPORT}`);
  if (HTML_REPORT) {
    mkdirSync(dirname(HTML_REPORT), { recursive: true });
    writeFileSync(HTML_REPORT, renderHtmlReport(summary));
    console.log(`HTML report → ${HTML_REPORT}`);
  }
  if (CSV_REPORT) {
    mkdirSync(dirname(CSV_REPORT), { recursive: true });
    writeFileSync(CSV_REPORT, renderCsv(summary));
    console.log(`CSV report  → ${CSV_REPORT}`);
  }
  if (DEBUG_LOG) {
    mkdirSync(dirname(DEBUG_LOG), { recursive: true });
    // NDJSON: one line per URL. Keeps everything needed to reproduce a run.
    const lines = results.map((r) => JSON.stringify({
      url: r.url,
      status: r.status,
      finalUrl: r.finalUrl || null,
      fetchMs: r.fetchMs || 0,
      attempts: r.attempts || 0,
      redirectChain: r.redirectChain || [],
      ogImage: r.ogImage || null,
      ogImageCheck: r.ogImageCheck || null,
      twImage: r.twImage || null,
      twImageCheck: r.twImageCheck || null,
      jsonldTypes: r.jsonldTypes || [],
      appliedRule: r.appliedRule || null,
      problems: r.problems || [],
      ignoredProblems: r.ignoredProblems || [],
    }));
    writeFileSync(DEBUG_LOG, lines.join("\n") + "\n");
    console.log(`Debug log   → ${DEBUG_LOG}`);
  }
  if (SARIF_REPORT) {
    mkdirSync(dirname(SARIF_REPORT), { recursive: true });
    writeFileSync(SARIF_REPORT, JSON.stringify(renderSarif(summary), null, 2));
    console.log(`SARIF       → ${SARIF_REPORT}`);
  }

  if (GITHUB_SUMMARY) {
    emitGitHubAnnotations(results);
    emitGitHubStepSummary(summary);
  }
  console.log(`${results.length - failed}/${results.length} URLs pass all checks`);
  if (failed) process.exit(1);
}


main().catch((e) => { console.error(e); process.exit(1); });

