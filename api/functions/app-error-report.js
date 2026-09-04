// Self-healing error intake.
// 1) Deduplicates client/runtime errors by fingerprint.
// 2) Suggests a known auto-fix (the browser applies it immediately).
// 3) If the error is unknown, asks Lovable AI for a diagnosis and emails the admin.
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = "am123allindiafree@gmail.com";

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sha1(input) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Known error signatures the app can recover from on its own.
function knownAutoFix(message) {
  const m = message.toLowerCase();
  if (/failed to fetch dynamically imported module|loading chunk|importing a module script failed|dynamically imported module/.test(m))
    return "reload"; // stale bundle after a deploy
  if (/network|failed to fetch|load failed|timeout/.test(m)) return "retry";
  if (/jwt|refresh token|invalid claim|not authenticated|401/.test(m)) return "refresh-session";
  if (/quotaexceeded|exceeded the quota|localstorage/.test(m)) return "clear-cache";
  return null;
}

async function aiDiagnose(message, stack, route) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior React/Supabase engineer. In under 120 words give the likely root cause and the concrete fix for this production error. Plain text only." },
          { role: "user", content: `Route: ${route}\nError: ${message}\nStack:\n${(stack || "").slice(0, 2000)}` },
        ],
      }),
    });
    if (!r.ok) return `AI diagnosis unavailable (HTTP ${r.status})`;
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function emailAdmin(row, diagnosis) {
  if (!RESEND_API_KEY) return false;
  const html = `
    <h2>Automatic bug alert — GyandootNova</h2>
    <p><b>Message:</b> ${esc(row.message)}</p>
    <p><b>Route:</b> ${esc(row.route)}</p>
    <p><b>Occurrences:</b> ${esc(row.occurrences)}</p>
    <p><b>Auto-fix applied:</b> ${esc(row.auto_fix ?? "none — needs a code change")}</p>
    <h3>AI diagnosis</h3>
    <pre style="white-space:pre-wrap;font-family:inherit">${esc(diagnosis ?? "not available")}</pre>
    <h3>Stack</h3>
    <pre style="white-space:pre-wrap;font-size:12px">${esc(String(row.stack ?? "").slice(0, 3000))}</pre>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "GyandootNova Alerts <info@gyandootnova.in>",
      to: [ADMIN_EMAIL],
      subject: `[Bug] ${String(row.message).slice(0, 90)}`,
      html,
    }),
  });
  return r.ok;
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "").trim().slice(0, 1000);
    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers,
      });
    }
    const stack = String(body?.stack ?? "").slice(0, 8000);
    const route = String(body?.route ?? "").slice(0, 300);
    const source = ["client", "server", "boundary"].includes(String(body?.source)) ? String(body.source) : "client";
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const fingerprint = await sha1(`${message}|${route}|${stack.split("\n")[1] ?? ""}`);
    const autoFix = knownAutoFix(message);

    const { data: existing } = await sb.from("app_errors").select("*").eq("fingerprint", fingerprint).maybeSingle();

    if (existing) {
      const occurrences = (existing.occurrences ?? 1) + 1;
      await sb.from("app_errors").update({ occurrences, last_seen_at: new Date().toISOString() }).eq("id", existing.id);
      // Re-alert only if a known fix does not exist and it keeps happening.
      const shouldEmail = !autoFix && !existing.emailed_at;
      if (shouldEmail) {
        const diagnosis = existing.ai_diagnosis ?? (await aiDiagnose(message, stack, route));
        const sent = await emailAdmin({ ...existing, occurrences, message, stack, route, auto_fix: autoFix }, diagnosis);
        await sb.from("app_errors").update({
          ai_diagnosis: diagnosis, needs_ai: true, emailed_at: sent ? new Date().toISOString() : null,
        }).eq("id", existing.id);
      }
      return new Response(JSON.stringify({ ok: true, auto_fix: autoFix, known: true }), {
        headers,
      });
    }

    let diagnosis = null;
    if (!autoFix) diagnosis = await aiDiagnose(message, stack, route);

    const { data: inserted } = await sb.from("app_errors").insert({
      fingerprint, message, stack, route, source,
      user_agent: userAgent,
      auto_fix: autoFix,
      ai_diagnosis: diagnosis,
      needs_ai: !autoFix,
      status: autoFix ? "auto_fixed" : "open",
    }).select().single();

    if (!autoFix) {
      const sent = await emailAdmin({ ...inserted, message, stack, route, occurrences: 1, auto_fix: null }, diagnosis);
      if (sent) await sb.from("app_errors").update({ emailed_at: new Date().toISOString() }).eq("id", inserted.id);
    }

    return new Response(JSON.stringify({ ok: true, auto_fix: autoFix, known: false }), {
      headers,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers,
    });
  }
};

export default handler;
