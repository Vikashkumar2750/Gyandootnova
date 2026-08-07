#!/usr/bin/env node
/**
 * Post-build crawl coverage summary.
 * Parses dist/sitemap.xml, HEAD-checks every URL against the local vite preview
 * (translated from https://gyandootnova.in → http://localhost:PORT), and writes
 * dist/seo-crawl-report.json + a compact stdout summary.
 * Boots vite preview itself when not already running.
 */
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 4174;
const ORIGIN = `http://localhost:${PORT}`;
const REMOTE = "https://gyandootnova.in";

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

async function main() {
  const sitemapPath = resolve("dist/sitemap.xml");
  if (!existsSync(sitemapPath)) {
    console.error("dist/sitemap.xml missing — run build first.");
    process.exit(1);
  }
  const xml = await readFile(sitemapPath, "utf8");
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  console.log(`→ crawl-summary: ${urls.length} URLs from sitemap`);

  const preview = spawn(
    "bunx",
    ["vite", "preview", "--port", String(PORT), "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );
  preview.stderr.on("data", () => {});
  await waitForServer(ORIGIN);

  const results = [];
  try {
    for (const remote of urls) {
      const local = remote.replace(REMOTE, ORIGIN);
      const started = Date.now();
      let status = 0;
      let ok = false;
      try {
        const r = await fetch(local, { method: "GET" });
        status = r.status;
        ok = r.ok;
      } catch (e) {
        status = -1;
      }
      results.push({ url: remote, status, ok, ms: Date.now() - started });
    }
  } finally {
    preview.kill("SIGTERM");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    sitemap: `${REMOTE}/sitemap.xml`,
    results,
  };

  await writeFile(
    resolve("dist/seo-crawl-report.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log(`crawl-summary: ${passed}/${results.length} OK (report → dist/seo-crawl-report.json)`);
  if (failed) {
    console.error(`✗ ${failed} URL(s) not reachable:`);
    results.filter((r) => !r.ok).forEach((r) => console.error(`  ${r.status}  ${r.url}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
