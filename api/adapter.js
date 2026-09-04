/**
 * Adapter that bridges Deno-style Web API handlers to Express.
 *
 * Each ported function exports a handler: `async (req: Request) => Response`
 * This adapter converts Express req/res into Web API Request/Response.
 */
export function wrapHandler(handler) {
  return async (req, res) => {
    try {
      // Build a Web API Request from Express request
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost";
      const url = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }

      const init = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = JSON.stringify(req.body);
        headers.set("content-type", "application/json");
      }

      const webReq = new Request(url, init);

      const webRes = await handler(webReq);

      // Convert Web API Response to Express response
      res.status(webRes.status);
      webRes.headers.forEach((value, key) => {
        // Skip transfer-encoding to avoid conflicts with Express
        if (key.toLowerCase() !== "transfer-encoding") {
          res.set(key, value);
        }
      });
      const body = await webRes.text();
      res.send(body);
    } catch (err) {
      console.error("Handler error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
