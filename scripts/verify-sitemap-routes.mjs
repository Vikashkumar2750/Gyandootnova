#!/usr/bin/env node
/**
 * CI guardrail: regenerates the sitemap + verifies required public routes
 * are present in public/sitemap.xml and NOT blocked by public/robots.txt.
 *
 * Run: node scripts/verify-sitemap-routes.mjs
 * Fails the build if any REQUIRED_ROUTES entry is missing or disallowed
 * for the default User-agent.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_ROUTES = [
  "/",
  "/books",
  "/articles",
  
  "/library",
  "/our-story",
  "/about",
  "/contact",
];

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

// 1. Regenerate sitemap so the check runs against fresh output.
console.log("→ Regenerating sitemap.xml…");
try {
  execSync("node scripts/generate-sitemap.mjs", { stdio: "inherit" });
} catch (e) {
  fail(`sitemap generator failed: ${e.message}`);
}

// 2. Parse sitemap.xml and collect <loc> paths.
const sitemapPath = resolve("public/sitemap.xml");
if (!existsSync(sitemapPath)) fail("public/sitemap.xml not found after generation.");
const sitemapXml = readFileSync(sitemapPath, "utf8");
const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const paths = new Set(
  locMatches.map((u) => {
    try {
      return new URL(u).pathname.replace(/\/$/, "") || "/";
    } catch {
      return u;
    }
  }),
);
console.log(`→ sitemap contains ${locMatches.length} URLs`);

// 3. Parse robots.txt for the default User-agent (*) Disallow rules.
const robotsPath = resolve("public/robots.txt");
if (!existsSync(robotsPath)) fail("public/robots.txt not found.");
const robots = readFileSync(robotsPath, "utf8");
const disallowStar = [];
{
  let inStar = false;
  for (const raw of robots.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [k, ...rest] = line.split(":");
    const key = (k || "").trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") inStar = val === "*";
    else if (inStar && key === "disallow" && val) disallowStar.push(val);
  }
}

function isBlocked(path) {
  return disallowStar.some((rule) => {
    // Treat trailing-slash rules as prefix. `/admin` matches `/admin/x`.
    if (rule.endsWith("/")) return path.startsWith(rule);
    return path === rule || path.startsWith(rule + "/");
  });
}

// 4. Verify each required route.
const missing = [];
const blocked = [];
for (const route of REQUIRED_ROUTES) {
  const key = route.replace(/\/$/, "") || "/";
  if (!paths.has(key)) missing.push(route);
  if (isBlocked(route)) blocked.push(route);
}

if (missing.length || blocked.length) {
  if (missing.length) console.error("Missing from sitemap.xml:", missing.join(", "));
  if (blocked.length) console.error("Blocked by robots.txt (User-agent: *):", blocked.join(", "));
  fail("sitemap/robots verification failed.");
}

console.log(
  `✓ All ${REQUIRED_ROUTES.length} required routes present in sitemap and not blocked by robots.txt.`,
);
