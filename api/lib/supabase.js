// Supabase client factory for the API server
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Service-role Supabase client (full privileged access). */
export function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** User-scoped Supabase client (auth-limited via the caller's JWT). */
export function userClient(authHeader) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader || "" } } }
  );
}

/** Extract and verify user from request auth header using service client. */
export async function getUser(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!authHeader || authHeader.endsWith("Bearer ") || authHeader.endsWith("Bearer anonymous")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = adminClient();
  const { data: { user } } = await sb.auth.getUser(token);
  return user ?? null;
}

export { CORS_HEADERS };
