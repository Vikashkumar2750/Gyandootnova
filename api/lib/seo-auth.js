// SEO auth guard — ported from _shared/seo-auth.ts
import { createClient } from "@supabase/supabase-js";
import { CORS_HEADERS } from "./supabase.js";

export async function assertSeoAuthorized(req) {
  const provided = req.headers.get("x-cron-secret") || "";
  const cronSecrets = [
    process.env.SEO_AGENT_CRON_SECRET || "",
    process.env.SEO_CRON_TOKEN || "",
  ].filter((s) => s.length > 0);
  if (provided.length > 0 && cronSecrets.includes(provided)) return null;

  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (svcKey && token === svcKey) return null;

    try {
      const url = process.env.SUPABASE_URL;
      const anonKey = process.env.SUPABASE_ANON_KEY;
      const anon = createClient(url, anonKey);
      const { data, error } = await anon.auth.getUser(token);
      if (!error && data?.user) {
        const svc = createClient(url, svcKey);
        const { data: isAdmin } = await svc.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        if (isAdmin === true) return null;
      }
    } catch {
      // fall through to 401
    }
  }

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
