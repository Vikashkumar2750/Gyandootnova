// Shared alert + provider-health helper — ported from _shared/seo-alerts.ts
import { createClient } from "@supabase/supabase-js";

export const SITE_NAME = "GyandootNova";
export const ADMIN_EMAIL = () => process.env.SEO_ADMIN_EMAIL || "am123allindiafree@gmail.com";
const RESEND_API_KEY = () => process.env.RESEND_API_KEY || "";
const FROM = "SEO Agent <info@gyandootnova.in>";
const PAUSE_MINUTES = 60;
const CONSECUTIVE_THRESHOLD = 3;

export function istNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
}

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildHtml(p, subject) {
  const rows = [
    ["Website", SITE_NAME],
    ["Date & Time (IST)", istNow()],
    ["Error Type", p.errorType],
    ["Provider", p.provider || "—"],
    ["HTTP Status", p.httpStatus != null ? String(p.httpStatus) : "—"],
    ["Remaining Credits", p.remainingCredits || "—"],
    ["Current Step", p.step || "—"],
    ["Retry Count", String(p.retryCount ?? 0)],
    ["Environment", (process.env.SUPABASE_URL || "").includes("localhost") ? "dev" : "production"],
    ["Message", p.message || "—"],
    ["Suggested Resolution", p.suggestion || "—"],
  ];
  if (p.recovered) {
    rows.push(["Recovery Method", p.recoveryMethod || "provider fallback"]);
    rows.push(["Switched To", p.switchedTo || "—"]);
    rows.push(["Original Error", p.originalError || "—"]);
  }
  const color = p.severity === "high" ? "#B00020" : p.recovered ? "#1B7A3E" : "#8B1A1A";
  return `<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;background:#fafaf8;border-radius:12px;overflow:hidden">
    <div style="background:${color};padding:20px 28px;color:#fff">
      <h1 style="margin:0;font-size:18px">${esc(subject)}</h1>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;width:180px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600;color:#222">${esc(v)}</td></tr>`).join("")}
      </table>
    </div>
  </div>`;
}

async function sendEmail(subject, html) {
  const key = RESEND_API_KEY();
  if (!key) { console.warn("RESEND_API_KEY missing, skipping alert email"); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL()], subject: subject.slice(0, 200), html }),
    });
    if (!res.ok) { console.error("Resend alert failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error("Resend alert exception", e); return false; }
}

export async function logAlert(sb, p, subject, emailed) {
  try {
    await sb.from("seo_agent_alerts").insert({
      severity: p.severity || "normal",
      error_type: p.errorType,
      provider: p.provider || null,
      http_status: p.httpStatus ?? null,
      message: p.message || null,
      step: p.step || null,
      retry_count: p.retryCount ?? 0,
      recovered: !!p.recovered,
      subject, emailed,
      extra: { suggestion: p.suggestion, recoveryMethod: p.recoveryMethod, switchedTo: p.switchedTo, originalError: p.originalError, remainingCredits: p.remainingCredits },
    });
  } catch (e) { console.error("logAlert insert failed", e); }
}

const INSTANT_ALERT_EMAILS = () => (process.env.SEO_ALERT_EMAILS || "").toLowerCase() === "on";

export async function sendAlert(sb, p) {
  const tag = p.severity === "high" ? "[SEO AGENT ALERT - HIGH PRIORITY]" : "[SEO AGENT ALERT]";
  const subject = `${tag} ${p.errorType}`;
  const ok = INSTANT_ALERT_EMAILS() ? await sendEmail(subject, buildHtml(p, subject)) : false;
  await logAlert(sb, p, subject, ok);
}

export async function sendRecovery(sb, p) {
  const subject = `[SEO AGENT RECOVERED] ${p.errorType}`;
  const ok = INSTANT_ALERT_EMAILS() ? await sendEmail(subject, buildHtml({ ...p, recovered: true }, subject)) : false;
  await logAlert(sb, { ...p, recovered: true }, subject, ok);
}

export async function isProviderPaused(sb, provider) {
  const { data } = await sb.from("seo_provider_health").select("paused_until").eq("provider", provider).maybeSingle();
  if (!data?.paused_until) return false;
  return new Date(data.paused_until).getTime() > Date.now();
}

export async function recordProviderFailure(sb, provider, error, httpStatus) {
  const { data: cur } = await sb.from("seo_provider_health").select("consecutive_failures").eq("provider", provider).maybeSingle();
  const consecutive = (cur?.consecutive_failures || 0) + 1;
  const shouldPause = consecutive >= CONSECUTIVE_THRESHOLD;
  const paused_until = shouldPause ? new Date(Date.now() + PAUSE_MINUTES * 60_000).toISOString() : null;
  await sb.from("seo_provider_health").upsert({
    provider, consecutive_failures: consecutive, last_error: error.slice(0, 500),
    last_http_status: httpStatus ?? null, paused_until, updated_at: new Date().toISOString(),
  }, { onConflict: "provider" });
  return { consecutive, paused: shouldPause };
}

export async function recordProviderSuccess(sb, provider) {
  const { data: cur } = await sb.from("seo_provider_health").select("consecutive_failures, paused_until").eq("provider", provider).maybeSingle();
  const wasFailing = (cur?.consecutive_failures || 0) > 0;
  if (wasFailing) {
    await sb.from("seo_provider_health").upsert({
      provider, consecutive_failures: 0, last_error: null, paused_until: null, updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
  }
  return wasFailing;
}

export function classifyError(provider, message, status) {
  const m = message.toLowerCase();
  const p = provider[0].toUpperCase() + provider.slice(1);
  if (status === 401 || status === 403 || m.includes("invalid api key") || m.includes("unauthorized") || m.includes("no-key")) {
    return { errorType: `${p} API key invalid`, suggestion: `Verify ${p.toUpperCase()}_API_KEY in secrets and rotate if leaked.`, severity: "high" };
  }
  if (status === 429 || m.includes("rate limit") || m.includes("too many")) {
    return { errorType: `${p} rate limited`, suggestion: `Reduce concurrency or wait for reset. Fallback provider will be used.`, severity: "normal" };
  }
  if (m.includes("quota") || m.includes("insufficient") || m.includes("credit") || status === 402) {
    return { errorType: `${p} quota exceeded`, suggestion: `Top up ${p} account or wait for monthly reset.`, severity: "high" };
  }
  return { errorType: `${p} API failed`, suggestion: `Check ${p} status page and retry. Fallback in effect.`, severity: "normal" };
}
