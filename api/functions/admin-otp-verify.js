// serve removed (handler exported instead)
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers },
    });
    const { data } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers });
    }

    const { data: otps } = await admin.from("admin_otps")
      .select("*").eq("user_id", user.id).eq("used", false)
      .order("created_at", { ascending: false }).limit(1);

    const otp = otps?.[0];
    if (!otp) return new Response(JSON.stringify({ error: "No active OTP. Please request a new one." }), { status: 400, headers });

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from("admin_otps").update({ used: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "OTP expired. Request a new one." }), { status: 400, headers });
    }

    if (otp.attempts >= 5) {
      await admin.from("admin_otps").update({ used: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Too many attempts." }), { status: 429, headers });
    }

    const hash = await sha256(String(code));
    if (hash !== otp.code_hash) {
      await admin.from("admin_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Incorrect OTP" }), { status: 400, headers });
    }

    await admin.from("admin_otps").update({ used: true }).eq("id", otp.id);

    // Record a server-side verified admin session so edge functions can
    // enforce the 2FA gate, not just the browser UI.
    const expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await admin.from("admin_otp_sessions")
      .delete().lt("expires_at", new Date().toISOString());
    await admin.from("admin_otp_sessions")
      .insert({ user_id: user.id, expires_at });

    return new Response(JSON.stringify({ success: true, expires_at }), { headers });
  } catch (e) {
    console.error("admin-otp-verify error:", e);
    return new Response(JSON.stringify({ error: "OTP verification failed. Please try again." }), { status: 500, headers });
  }
};

export default handler;
