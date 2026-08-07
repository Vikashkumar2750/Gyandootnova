// Shared alert + provider-health helper for the SEO Blog Agent.
// - Sends Resend emails on critical events, recoveries, and daily health reports
// - Tracks consecutive failures per provider and auto-pauses on 3-in-a-row
// - Records every alert in `seo_agent_alerts`
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const SITE_NAME = "GyandootNova";
export const ADMIN_EMAIL = Deno.env.get("SEO_ADMIN_EMAIL") || "amrendra8765@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "SEO Agent <info@gyandootnova.in>";
const PAUSE_MINUTES = 60;
const CONSECUTIVE_THRESHOLD = 3;

export function istNow(): string {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type AlertPayload = {
  errorType: string;         // e.g. "Anthropic quota exceeded"
  provider?: string;         // e.g. "anthropic"
  message?: string;
  httpStatus?: number | null;
  remainingCredits?: string | null;
  step?: string;
  retryCount?: number;
  suggestion?: string;
  severity?: "normal" | "high";
  recovered?: boolean;
  recoveryMethod?: string;
  switchedTo?: string;
  originalError?: string;
};

function buildHtml(p: AlertPayload, subject: string): string {
  const rows: [string, string][] = [
    ["Website", SITE_NAME],
    ["Date & Time (IST)", istNow()],
    ["Error Type", p.errorType],
    ["Provider", p.provider || "—"],
    ["HTTP Status", p.httpStatus != null ? String(p.httpStatus) : "—"],
    ["Remaining Credits", p.remainingCredits || "—"],
    ["Current Step", p.step || "—"],
    ["Retry Count", String(p.retryCount ?? 0)],
    ["Environment", Deno.env.get("SUPABASE_URL")?.includes("localhost") ? "dev" : "production"],
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

async function sendEmail(subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY missing, skipping alert email"); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL], subject: subject.slice(0, 200), html }),
    });
    if (!res.ok) { console.error("Resend alert failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error("Resend alert exception", e); return false; }
}

export async function logAlert(sb: SupabaseClient, p: AlertPayload, subject: string, emailed: boolean) {
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
      subject,
      emailed,
      extra: { suggestion: p.suggestion, recoveryMethod: p.recoveryMethod, switchedTo: p.switchedTo, originalError: p.originalError, remainingCredits: p.remainingCredits },
    });
  } catch (e) { console.error("logAlert insert failed", e); }
}

export async function sendAlert(sb: SupabaseClient, p: AlertPayload): Promise<void> {
  const tag = p.severity === "high" ? "[SEO AGENT ALERT - HIGH PRIORITY]" : "[SEO AGENT ALERT]";
  const subject = `${tag} ${p.errorType}`;
  const html = buildHtml(p, subject);
  const ok = await sendEmail(subject, html);
  await logAlert(sb, p, subject, ok);
}

export async function sendRecovery(sb: SupabaseClient, p: AlertPayload): Promise<void> {
  const subject = `[SEO AGENT RECOVERED] ${p.errorType}`;
  const html = buildHtml({ ...p, recovered: true }, subject);
  const ok = await sendEmail(subject, html);
  await logAlert(sb, { ...p, recovered: true }, subject, ok);
}

// ── Provider health tracking ─────────────────────────────────────────
export async function isProviderPaused(sb: SupabaseClient, provider: string): Promise<boolean> {
  const { data } = await sb.from("seo_provider_health").select("paused_until").eq("provider", provider).maybeSingle();
  if (!data?.paused_until) return false;
  return new Date(data.paused_until).getTime() > Date.now();
}

export async function recordProviderFailure(sb: SupabaseClient, provider: string, error: string, httpStatus?: number | null): Promise<{ consecutive: number; paused: boolean }> {
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

export async function recordProviderSuccess(sb: SupabaseClient, provider: string): Promise<boolean> {
  const { data: cur } = await sb.from("seo_provider_health").select("consecutive_failures, paused_until").eq("provider", provider).maybeSingle();
  const wasFailing = (cur?.consecutive_failures || 0) > 0;
  if (wasFailing) {
    await sb.from("seo_provider_health").upsert({
      provider, consecutive_failures: 0, last_error: null, paused_until: null, updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
  }
  return wasFailing;
}

// ── Error classification ─────────────────────────────────────────────
export function classifyError(provider: string, message: string, status?: number | null): { errorType: string; suggestion: string; severity: "normal" | "high" } {
  const m = message.toLowerCase();
  const p = provider[0].toUpperCase() + provider.slice(1);
  if (status === 401 || status === 403 || m.includes("invalid api key") || m.includes("unauthorized") || m.includes("no-key")) {
    return { errorType: `${p} API key invalid`, suggestion: `Verify ${p.toUpperCase()}_API_KEY in Supabase secrets and rotate if leaked.`, severity: "high" };
  }
  if (status === 429 || m.includes("rate limit") || m.includes("too many")) {
    return { errorType: `${p} rate limited`, suggestion: `Reduce concurrency or wait for reset. Fallback provider will be used.`, severity: "normal" };
  }
  if (m.includes("quota") || m.includes("insufficient") || m.includes("credit") || status === 402) {
    return { errorType: `${p} quota exceeded`, suggestion: `Top up ${p} account or wait for monthly reset.`, severity: "high" };
  }
  return { errorType: `${p} API failed`, suggestion: `Check ${p} status page and retry. Fallback in effect.`, severity: "normal" };
}
