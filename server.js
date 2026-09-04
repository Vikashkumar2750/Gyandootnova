/**
 * Production server for Railway deployment.
 *
 * Serves both:
 * - /api/*   → Express API (ported Supabase Edge Functions)
 * - /*       → Vite-built dist/ with SPA fallback
 */
import express from "express";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import apiApp from "./api/server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();

// ── Health check (before any middleware) ────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── Mount API routes ─────────────────────────────────────────────────
app.use(apiApp);

// ── Static files from dist/ ──────────────────────────────────────────
const IMMUTABLE = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=3600";
const MEDIUM = "public, max-age=86400";

app.use((req, res, next) => {
  // Set cache headers based on path
  if (req.path.includes("/assets/")) {
    res.set("Cache-Control", IMMUTABLE);
  } else {
    const ext = extname(req.path);
    if ([".html", ".json", ".xml", ".txt"].includes(ext)) {
      res.set("Cache-Control", SHORT);
    } else if (ext) {
      res.set("Cache-Control", MEDIUM);
    }
  }
  next();
});

app.use(express.static(DIST, { index: false }));

// ── SPA fallback: serve index.html for non-file routes ───────────────
let indexHtmlCache = null;
app.get("/*path", async (req, res) => {
  // If the path has a file extension, it wasn't found in static → 404
  if (extname(req.path)) {
    return res.status(404).send("Not Found");
  }
  // SPA fallback
  try {
    if (!indexHtmlCache) {
      indexHtmlCache = await readFile(join(DIST, "index.html"), "utf8");
    }
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", SHORT);
    res.send(indexHtmlCache);
  } catch (err) {
    res.status(500).send("index.html not found — build the frontend first (npm run build)");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 GyandootNova server listening on http://0.0.0.0:${PORT}`);
  console.log(`   Frontend: http://0.0.0.0:${PORT}/`);
  console.log(`   API:      http://0.0.0.0:${PORT}/api/health`);
});
