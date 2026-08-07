// Shared authorization guard for SEO automation endpoints.
// Accepts ONE of:
//   1) x-cron-secret header matching SEO_AGENT_CRON_SECRET (scheduled cron)
//   2) Authorization: Bearer <SERVICE_ROLE_KEY> (internal fn-to-fn invocation)
//   3) Authorization: Bearer <user JWT> where the user has the 'admin' role
// Returns a 401 Response when unauthorized, or null when the caller may proceed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

export async function assertSeoAuthorized(req: Request): Promise<Response | null> {
  const cronSecret = Deno.env.get("SEO_AGENT_CRON_SECRET") || "";
  const provided = req.headers.get("x-cron-secret") || "";
  if (cronSecret.length > 0 && provided === cronSecret) return null;

  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    // Internal fn-to-fn calls use the service role key as bearer.
    if (svcKey && token === svcKey) return null;

    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
