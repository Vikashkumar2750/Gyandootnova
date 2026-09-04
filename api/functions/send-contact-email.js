// serve removed (handler exported instead)
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "gyandootnova57@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape to prevent injection in the rendered admin email.
const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Naive in-memory rate limit per IP (best effort within a single function instance).
const HITS = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function rateLimited(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = HITS.get(ip);
  if (!entry || entry.reset < now) {
    HITS.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (rateLimited(req)) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again shortly." }), {
        status: 429,
        headers,
      });
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400, headers });
    }
    if (name.length > 120 || subject.length > 200 || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Field length exceeded" }), { status: 400, headers });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers });
    }

    const safeName = esc(name);
    const safeEmail = esc(email);
    const safeSubject = esc(subject);
    const safeMessage = esc(message).replace(/\n/g, "<br>");

    const html = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8; border-radius: 12px; overflow: hidden;">
        <div style="background: #8B1A1A; padding: 24px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">📩 New Contact Message</h1>
        </div>
        <div style="padding: 32px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #888; width: 80px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Subject</td><td style="padding: 8px 0; font-weight: 600;">${safeSubject}</td></tr>
          </table>
          <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase;">Message</p>
            <p style="margin: 0; line-height: 1.7; color: #333;">${safeMessage}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #aaa;">Sent from GyandootNova Contact Form</p>
        </div>
      </div>
    `;

    // Persist the enquiry so admins can see it in the admin panel,
    // even if email delivery later fails.
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth,
      });
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      await admin.from("contact_enquiries").insert({
        name, email, subject, message, source_ip: ip, user_agent: ua,
      });
    } catch (logErr) {
      console.error("contact_enquiries insert error:", logErr);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "GyandootNova <info@gyandootnova.in>",
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `Contact: ${subject}`.slice(0, 200),
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      // Email failed but enquiry is saved — still tell the user we got it.
      return new Response(JSON.stringify({ success: true, emailDelivered: false }), {
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e) {
    console.error("send-contact-email error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers });
  }
};

export default handler;
