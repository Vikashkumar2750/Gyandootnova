import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_EVENTS = new Set([
  "view_books_list",
  "view_book",
  "click_buy_now",
  "begin_checkout",
  "coupon_applied",
  "payment_success",
  "payment_failed",
  "add_to_wishlist",
  "share_book",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = typeof body?.event === "string" ? body.event : null;
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response(JSON.stringify({ error: "Invalid event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  const utms = body?.utms && typeof body.utms === "object" ? body.utms : {};
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Try to attach user id if the caller sent an Authorization bearer.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    } catch {}
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await supabase.from("sales_events").insert({
    event,
    payload,
    utm_source: utms.utm_source ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_content: utms.utm_content ?? null,
    utm_term: utms.utm_term ?? null,
    path,
    referrer,
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    console.error("sales_events insert failed", error);
    return new Response(JSON.stringify({ error: "Insert failed", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
