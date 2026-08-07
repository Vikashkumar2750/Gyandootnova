// Server-side visitor logger.
// Derives user identity from the caller's JWT (never from body), reads UA/IP
// from request headers, validates and length-caps all remaining fields, and
// writes with the service role so the visitor_logs table can be locked down
// against direct anon inserts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const cap = (v: unknown, n: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, n) : null;
};

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Identity: server-derived only. Never trust client-supplied user_id / email / phone.
  let user_id: string | null = null;
  let user_email: string | null = null;
  let user_phone: string | null = null;
  let user_name: string | null = null;

  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7).trim();
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        user_id = data.user.id;
        user_email = data.user.email ?? null;
        user_phone = data.user.phone ?? null;
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (prof) {
          user_name = cap((prof as any).display_name, 200);
          user_phone = user_phone ?? cap((prof as any).phone, 40);
        }
      }
    } catch { /* anonymous visit */ }
  }

  // Network-derived fields (headers, not body).
  const headerIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Client-supplied fields — validated and length-capped only.
  const bodyIp = cap(body?.ip_address, 64);
  const row = {
    user_id,
    user_email,
    user_name,
    user_phone,
    ip_address: headerIp ?? bodyIp,
    country: cap(body?.country, 100),
    country_code: cap(body?.country_code, 4),
    region: cap(body?.region, 100),
    city: cap(body?.city, 100),
    latitude: num(body?.latitude),
    longitude: num(body?.longitude),
    timezone: cap(body?.timezone, 64),
    isp: cap(body?.isp, 200),
    user_agent: userAgent ?? cap(body?.user_agent, 500),
    device_type: cap(body?.device_type, 32),
    browser: cap(body?.browser, 64),
    os: cap(body?.os, 64),
    referrer: cap(body?.referrer, 500),
    landing_path: cap(body?.landing_path, 500),
    language: cap(body?.language, 32),
    screen: cap(body?.screen, 32),
  };

  const { error } = await supabase.from("visitor_logs").insert(row);
  if (error) {
    console.error("track-visit insert error:", error);
    return new Response(JSON.stringify({ error: "insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
