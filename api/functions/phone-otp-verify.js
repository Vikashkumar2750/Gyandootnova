// serve removed (handler exported instead)
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sha256(t) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normPhone(p) {
  const s = p.replace(/[^\d+]/g, "");
  return s.startsWith("+") ? s : `+${s}`;
}

function phoneToSyntheticEmail(phone) {
  // strip +, use a non-routable subdomain we control
  return `${phone.replace(/[^\d]/g, "")}@phone.gyandootnova.in`;
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipient, channel, code } = await req.json();
    if (!recipient || !channel || !code || !/^\d{6}$/.test(String(code))) {
      return new Response(JSON.stringify({ error: "recipient, channel, and 6-digit code required" }), { status: 400, headers });
    }

    const normalized = channel === "email" ? String(recipient).trim().toLowerCase() : normPhone(recipient);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: otps } = await admin.from("phone_otps")
      .select("*").eq("phone", normalized).eq("used", false)
      .order("created_at", { ascending: false }).limit(1);
    const otp = otps?.[0];
    if (!otp) return new Response(JSON.stringify({ error: "No active OTP. Request a new one." }), { status: 400, headers });

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from("phone_otps").update({ used: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "OTP expired" }), { status: 400, headers });
    }
    if (otp.attempts >= 5) {
      await admin.from("phone_otps").update({ used: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Too many attempts" }), { status: 429, headers });
    }

    const hash = await sha256(String(code));
    if (hash !== otp.code_hash) {
      await admin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Incorrect OTP" }), { status: 400, headers });
    }

    await admin.from("phone_otps").update({ used: true }).eq("id", otp.id);

    // Find or create user
    const email = channel === "email" ? normalized : phoneToSyntheticEmail(normalized);

    // List by email
    let userId = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email === email);
    if (existing) userId = existing.id;

    if (!userId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: channel === "email" ? {} : { phone: normalized, login_channel: channel },
      });
      if (cErr || !created.user) throw cErr || new Error("user create failed");
      userId = created.user.id;
      // Store phone in profile
      if (channel !== "email") {
        await admin.from("profiles").update({ phone: normalized }).eq("user_id", userId);
      }
    } else if (channel !== "email") {
      await admin.from("profiles").update({ phone: normalized }).eq("user_id", userId);
    }

    // Generate magic link → return hashed_token; client does verifyOtp to get session
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (lErr || !link.properties) throw lErr || new Error("link gen failed");

    return new Response(JSON.stringify({
      success: true,
      email,
      token_hash: (link.properties).hashed_token,
    }), { headers });
  } catch (e) {
    console.error("phone-otp-verify:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export default handler;
