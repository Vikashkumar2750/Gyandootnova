/**
 * Production server for Railway deployment.
 *
 * Serves the Vite-built `dist/` folder as static files and falls back to
 * `index.html` for all non-file routes so client-side routing (React Router)
 * works correctly.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".xml":  "application/xml; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".mp4":  "video/mp4",
  ".pdf":  "application/pdf",
};

/** Cache-Control header values */
const IMMUTABLE = "public, max-age=31536000, immutable";      // hashed assets
const SHORT     = "public, max-age=3600";                      // html / manifests
const MEDIUM    = "public, max-age=86400";                     // images, fonts

function cachePolicy(filePath) {
  // Vite hashed assets (e.g. assets/index-abc123.js)
  if (filePath.includes("/assets/")) return IMMUTABLE;
  const ext = extname(filePath);
  if ([".html", ".json", ".xml", ".txt"].includes(ext)) return SHORT;
  return MEDIUM;
}

async function serveFile(res, filePath) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const ext = extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": body.length,
      "Cache-Control": cachePolicy(filePath),
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

const indexHtmlCache = { body: null };
async function serveIndex(res) {
  if (!indexHtmlCache.body) {
    indexHtmlCache.body = await readFile(join(DIST, "index.html"));
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": SHORT,
  });
  res.end(indexHtmlCache.body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // Health check for Railway
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }

  // Try to serve the exact file from dist/
  const filePath = join(DIST, pathname);
  // Prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (await serveFile(res, filePath)) return;

  // For paths that look like files (have an extension) but weren't found → 404
  if (extname(pathname)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  // SPA fallback: serve index.html for all other routes
  await serveIndex(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 GyandootNova server listening on http://0.0.0.0:${PORT}`);
});
