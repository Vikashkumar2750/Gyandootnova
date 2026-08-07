// Daily SEO Agent health report — runs at 08:00 IST via pg_cron.
// Probes every provider, aggregates last-24h stats from seo_agent_logs,
// and emails ADMIN_EMAIL. Also acts as a scheduler self-heartbeat: if it
// never runs, the cron job itself has failed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { SITE_NAME, ADMIN_EMAIL, istNow, sendAlert } from "../_shared/seo-alerts.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "SEO Agent <info@gyandootnova.in>";

type Probe = { provider: string; ok: boolean; status?: number; error?: string; hasKey: boolean };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error(`timeout ${ms}ms`)), ms))]);
}

async function probe(name: string, keyEnv: string, run: () => Promise<Response>): Promise<Probe> {
  const key = Deno.env.get(keyEnv);
  if (!key) return { provider: name, ok: false, hasKey: false, error: "API key not configured" };
  try {
    const res = await withTimeout(run(), 15000);
    return { provider: name, ok: res.ok, status: res.status, hasKey: true, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { provider: name, ok: false, hasKey: true, error: String(e?.message || e).slice(0, 200) };
  }
}

async function probeAll(): Promise<Probe[]> {
  return await Promise.all([
    probe("openrouter", "OPENROUTER_API_KEY", () => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek/deepseek-chat", max_tokens: 5, messages: [{ role: "user", content: "ping" }] }),
    })),
    probe("openai", "OPENAI_API_KEY", () => fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")!}` },
    })),
    probe("gemini", "GEMINI_API_KEY", () => fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${Deno.env.get("GEMINI_API_KEY")!}`)),
    probe("deepseek", "DEEPSEEK_API_KEY", () => fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")!}` },
    })),
    probe("tavily", "TAVILY_API_KEY", () => fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: Deno.env.get("TAVILY_API_KEY"), query: "test", max_results: 1 }),
    })),
    probe("exa", "EXA_API_KEY", () => fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("EXA_API_KEY")! },
      body: JSON.stringify({ query: "test", numResults: 1 }),
    })),
    probe("firecrawl", "FIRECRAWL_API_KEY", () => fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("FIRECRAWL_API_KEY")!}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test", limit: 1 }),
    })),
    probe("serpapi", "SERPAPI_API_KEY", () => fetch(`https://serpapi.com/search.json?engine=google&q=test&num=1&api_key=${Deno.env.get("SERPAPI_API_KEY")!}`)),
  ]);
}

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const badge = (p: Probe) => p.ok ? '<span style="color:#1B7A3E;font-weight:600">HEALTHY</span>'
  : !p.hasKey ? '<span style="color:#888">NOT CONFIGURED</span>'
  : `<span style="color:#B00020;font-weight:600">DOWN (${esc(p.error || "?")})</span>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Authorization: require the shared cron secret OR an admin JWT.
  // Without this, any anonymous caller could burn paid API quotas by
  // repeatedly triggering the live provider probes.
  const cronSecret = Deno.env.get("SEO_AGENT_CRON_SECRET") || "";
  const providedSecret = req.headers.get("x-cron-secret") || "";
  let authorized = cronSecret.length > 0 && providedSecret === cronSecret;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const anon = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        const { data, error } = await anon.auth.getUser(token);
        if (!error && data?.user) {
          const { data: isAdmin } = await sb.rpc("has_role", {
            _user_id: data.user.id,
            _role: "admin",
          });
          if (isAdmin === true) authorized = true;
        }
      } catch { /* fall through to 401 */ }
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const probes = await probeAll();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await sb.from("seo_agent_logs")
      .select("status, action, content_score, seo_score, error").gte("run_at", since);
    const rows = logs || [];
    const created = rows.filter((r: any) => r.status !== "error" && r.action === "created").length;
    const updated = rows.filter((r: any) => r.status !== "error" && r.action === "updated").length;
    const failed = rows.filter((r: any) => r.status === "error").length;
    const total = rows.length || 1;
    const success = Math.round(((total - failed) / total) * 100);
    const avg = (k: string) => {
      const nums = rows.map((r: any) => Number(r[k])).filter((n: number) => n > 0);
      return nums.length ? Math.round(nums.reduce((a: number, b: number) => a + b, 0) / nums.length) : 0;
    };
    const { data: paused } = await sb.from("seo_provider_health").select("provider, paused_until").gt("paused_until", new Date().toISOString());

    const html = `<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;background:#fafaf8;border-radius:12px;overflow:hidden">
      <div style="background:#1B7A3E;color:#fff;padding:20px 28px"><h1 style="margin:0;font-size:18px">${SITE_NAME} — SEO Agent Health Report</h1><p style="margin:4px 0 0;font-size:13px;opacity:.9">${istNow()} IST</p></div>
      <div style="padding:24px 28px">
        <h2 style="font-size:15px;margin:0 0 8px">Provider Status</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          ${probes.map(p => `<tr><td style="padding:6px 0;color:#333;width:140px">${esc(p.provider)}</td><td style="padding:6px 0">${badge(p)}</td></tr>`).join("")}
        </table>
        ${paused?.length ? `<p style="background:#fff5e6;border-left:3px solid #B87500;padding:10px 14px;font-size:13px">Paused providers: ${paused.map((p: any) => esc(p.provider)).join(", ")}</p>` : ""}
        <h2 style="font-size:15px;margin:16px 0 8px">Last 24h</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:220px">Blogs Created</td><td style="padding:6px 0;font-weight:600">${created}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Blogs Updated</td><td style="padding:6px 0;font-weight:600">${updated}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Failed Jobs</td><td style="padding:6px 0;font-weight:600">${failed}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Success Rate</td><td style="padding:6px 0;font-weight:600">${success}%</td></tr>
          <tr><td style="padding:6px 0;color:#666">Average SEO Score</td><td style="padding:6px 0;font-weight:600">${avg("seo_score")}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Average Content Score</td><td style="padding:6px 0;font-weight:600">${avg("content_score")}</td></tr>
        </table>
      </div>
    </div>`;

    let emailed = false;
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: FROM, to: [ADMIN_EMAIL], subject: `[SEO AGENT HEALTH] ${SITE_NAME} — ${new Date().toISOString().slice(0, 10)}`, html }),
      });
      emailed = res.ok;
      if (!res.ok) console.error("health email failed", res.status, await res.text());
    }

    return new Response(JSON.stringify({ success: true, emailed, probes, stats: { created, updated, failed, success, avgSeo: avg("seo_score"), avgContent: avg("content_score") } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    try {
      await sendAlert(sb, {
        errorType: "Scheduler (Cron Job) failed", step: "health-report",
        severity: "high", message: String(e?.message || e).slice(0, 500),
        suggestion: "Health report crashed — check edge function logs and pg_cron job.",
      });
    } catch {}
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
