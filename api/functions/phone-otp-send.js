// serve removed (handler exported instead)
import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "../lib/ai-crypto.js";

const SECRET_FIELDS = new Set(["auth_token", "auth_key", "api_key", "access_token"]);

async function decryptConfig(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg || {})) {
    if (SECRET_FIELDS.has(k) && typeof v === "string" && v.startsWith("v1.")) {
      try { out[k] = await decryptKey(v); } catch { out[k] = ""; }
    } else {
      out[k] = v;
    }
  }
  return out;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sha256(t) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normPhone(p) {
  const s = p.replace(/[^\d+]/g, "");
  return s.startsWith("+") ? s : `+${s}`;
}

// ---------------- Provider adapters ----------------
async function providerError(name, r) {
  let detail = "";
  try { detail = (await r.text()).slice(0, 500); } catch { /* ignore */ }
  console.error(`${name} provider error (${r.status}):`, detail);
  throw new Error(`Provider ${name} returned an error. Check provider configuration.`);
}

async function sendTwilioSMS(cfg, to, body) {
  const sid = cfg.account_sid, token = cfg.auth_token, from = cfg.from_number;
  if (!sid || !token || !from) throw new Error("Twilio config incomplete");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!r.ok) await providerError("twilio", r);
}

async function sendTwilioWhatsApp(cfg, to, body) {
  const sid = cfg.account_sid, token = cfg.auth_token, from = cfg.from_number;
  if (!sid || !token || !from) throw new Error("Twilio config incomplete");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: body }),
  });
  if (!r.ok) await providerError("twilio-wa", r);
}

async function sendMsg91(cfg, to, code) {
  const authkey = cfg.auth_key, template_id = cfg.template_id, sender = cfg.sender_id;
  if (!authkey || !template_id) throw new Error("MSG91 config incomplete");
  const mobile = to.replace(/^\+/, "");
  const r = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers,
    body: JSON.stringify({ template_id, sender, short_url: "0", mobiles: mobile, OTP: code, otp: code, var1: code }),
  });
  if (!r.ok) await providerError("msg91", r);
}

async function sendFast2SMS(cfg, to, _body, code) {
  const key = cfg.api_key;
  if (!key) throw new Error("Fast2SMS config incomplete");
  const mobile = to.replace(/^\+91/, "").replace(/^\+/, "");
  const r = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers,
    body: JSON.stringify(
      cfg.route === "dlt"
        ? { route: "dlt", sender_id: cfg.sender_id, message: cfg.template_id, variables_values: code, numbers: mobile }
        : { route: "otp", variables_values: code, numbers: mobile }
    ),
  });
  if (!r.ok) await providerError("fast2sms", r);
}

async function sendWhatsAppCloud(cfg, to, code) {
  const token = cfg.access_token, phone_id = cfg.phone_number_id, template = cfg.template_name || "otp_verification";
  if (!token || !phone_id) throw new Error("WhatsApp Cloud config incomplete");
  const r = await fetch(`https://graph.facebook.com/v20.0/${phone_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: template,
        language,
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!r.ok) await providerError("whatsapp-cloud", r);
}

async function sendGupshupWA(cfg, to, code) {
  const apikey = cfg.api_key, source = cfg.source_number, template_id = cfg.template_id;
  if (!apikey || !source) throw new Error("Gupshup config incomplete");
  const r = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
    method: "POST",
    headers,
    body: new URLSearchParams({
      source, destination: to.replace(/^\+/, ""),
      template: JSON.stringify({ id: template_id, params: [code] }),
      "src.name": cfg.app_name || "",
    }),
  });
  if (!r.ok) await providerError("gupshup", r);
}

async function sendResendEmail(_cfg, to, code) {
  if (!RESEND_API_KEY) throw new Error("Email provider is not configured");
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto"><div style="background:#B71C1C;padding:20px;color:#fff"><h1 style="margin:0;font-size:20px">Login OTP</h1></div><div style="padding:28px;text-align:center;background:#fafaf8"><p style="color:#333">Aapka OTP code:</p><div style="font-size:34px;letter-spacing:8px;color:#B71C1C;font-weight:700;padding:14px;background:#fff;border:1px dashed #B71C1C;border-radius:8px">${code}</div><p style="color:#666;font-size:12px;margin-top:18px">Yeh code 10 minutes ke liye valid hai.</p></div></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: "GyandootNova <info@gyandootnova.in>", to: [to], subject: `Your OTP: ${code}`, html }),
  });
  if (!r.ok) await providerError("resend", r);
}

async function dispatch(provider, channel, cfg, recipient, code) {
  const body = `Aapka GyandootNova OTP code hai: ${code}. 10 minute me expire hoga.`;
  switch (provider) {
    case "twilio":          return channel === "whatsapp" ? sendTwilioWhatsApp(cfg, recipient, body) : sendTwilioSMS(cfg, recipient, body);
    case "msg91":           return sendMsg91(cfg, recipient, code);
    case "fast2sms":        return sendFast2SMS(cfg, recipient, body, code);
    case "whatsapp_cloud":  return sendWhatsAppCloud(cfg, recipient, code);
    case "gupshup":         return sendGupshupWA(cfg, recipient, code);
    case "resend":          return sendResendEmail(cfg, recipient, code);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

// ---------------- Handler ----------------

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipient, channel } = await req.json();
    if (!recipient || !channel || !["sms", "whatsapp", "email"].includes(channel)) {
      return new Response(JSON.stringify({ error: "recipient and valid channel required" }), { status: 400, headers });
    }

    const normalized = channel === "email" ? String(recipient).trim().toLowerCase() : normPhone(recipient);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limit: max 3 in last 10 min for this recipient
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", normalized).gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Try again in 10 minutes." }), { status: 429, headers });
    }

    // Get active provider for channel
    const { data: prov, error: provErr } = await admin.from("otp_providers")
      .select("provider_name, config_json").eq("channel", channel).eq("is_active", true).maybeSingle();
    if (provErr || !prov) {
      return new Response(JSON.stringify({ error: `No active ${channel} provider configured. Admin needs to set one up.` }), { status: 500, headers });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous
    await admin.from("phone_otps").update({ used: true }).eq("phone", normalized).eq("used", false);
    const { error: insErr } = await admin.from("phone_otps").insert({ phone: normalized, channel, code_hash, expires_at });
    if (insErr) throw insErr;

    const cfg = await decryptConfig((prov.config_json || {}));
    await dispatch(prov.provider_name, channel, cfg, normalized, code);

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e) {
    console.error("phone-otp-send:", e);
    return new Response(JSON.stringify({ error: "Could not send OTP. Please try again." }), { status: 500, headers });
  }
};

export default handler;
