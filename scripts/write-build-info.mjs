#!/usr/bin/env node
/**
 * Writes public/build.json with the current build id + timestamp so that
 * the deployed site can be inspected via `GET /build.json` to prove which
 * commit/build is actually live. Also consumed at build time via
 * `import.meta.env.VITE_BUILD_ID` for the footer badge.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  new Date().toISOString().replace(/[:.]/g, "-");

const info = {
  buildId,
  builtAt: new Date().toISOString(),
  commit:
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    null,
};

const target = join(ROOT, "public", "build.json");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(info, null, 2) + "\n", "utf8");

// Emit for downstream vite via env; harmless if unused.
process.stdout.write(`build id: ${info.buildId}\n`);
