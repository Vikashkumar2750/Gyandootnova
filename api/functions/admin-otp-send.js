// serve removed (handler exported instead)
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
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

    const { data, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    // Check admin
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Not an admin" }), { status: 403, headers });

    // If a still-valid OTP exists, reuse it (don't send a new email)
    const { data: existing } = await admin
      .from("admin_otps")
      .select("id, expires_at")
      .eq("user_id", user.id)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, reused: true, expires_at: existing.expires_at }),
        { headers },
      );
    }

    // Generate 6-digit OTP (valid 5 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate any older unused OTPs
    await admin.from("admin_otps").update({ used: true }).eq("user_id", user.id).eq("used", false);

    const { error: insErr } = await admin.from("admin_otps").insert({
      user_id: user.id, code_hash, expires_at,
    });
    if (insErr) throw insErr;

    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fafaf8;border-radius:12px;overflow:hidden">
        <div style="background:#B71C1C;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:20px">Admin Login Verification</h1></div>
        <div style="padding:32px;text-align:center">
          <p style="color:#333;font-size:15px">Aapka admin login OTP code:</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;color:#B71C1C;margin:24px 0;background:#fff;padding:18px;border-radius:8px;border:1px dashed #B71C1C">${code}</div>
          <p style="color:#666;font-size:13px">Yeh code 5 minutes ke liye valid hai. Agar aapne login attempt nahi kiya to is email ko ignore karein.</p>
          <p style="color:#aaa;font-size:11px;margin-top:24px">GyandootNova Admin Security</p>
        </div>
      </div>`;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured (RESEND_API_KEY missing)" }), { status: 500, headers });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "GyandootNova Security <info@gyandootnova.in>",
        to: [user.email],
        subject: `Your admin OTP: ${code}`,
        html,
      }),
    });
    const respText = await r.text();
    if (!r.ok) {
      console.error("Resend error:", r.status, respText);
      let parsed = {};
      try { parsed = JSON.parse(respText); } catch {}
      const msg = parsed?.message || respText || "Resend send failed";
      // Common case: free Resend account can only send to the account-owner email
      // Surface helpful message + return the OTP code in dev fallback ONLY if explicitly enabled
      return new Response(JSON.stringify({ error: `Email failed: ${msg}` }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e) {
    console.error("admin-otp-send fatal:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export default handler;
