import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

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

const handler = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers,
    });
  }

  const event = typeof body?.event === "string" ? body.event : null;
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response(JSON.stringify({ error: "Invalid event" }), {
      status: 400,
      headers,
    });
  }

  const payload = body?.payload && typeof body.payload === "object" ? body.payload : null;
  const utms = body?.utms && typeof body.utms === "object" ? body.utms : null;
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth }
  );

  // Try to attach user id if the caller sent an Authorization bearer.
  let userId = null;
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
      headers,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
};

export default handler;
