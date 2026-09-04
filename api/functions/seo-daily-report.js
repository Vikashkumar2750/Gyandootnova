import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { SITE_NAME, ADMIN_EMAIL, istNow } from "../lib/seo-alerts.js";
import { assertSeoAuthorized } from "../lib/seo-auth.js";
import { buildPdf, toBase64 } from "../lib/simple-pdf.js";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = "SEO Agent <info@gyandootnova.in>";
const GATEWAY = "https://connector-gateway.lovable.dev";
const SITE_URL = "https://gyandootnova.in";
const GSC_SITE_URL = "https://gyandootnova.in/";
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (d) => d.toISOString().slice(0, 10);
const istDay = () => new Date(Date.now() + 5.5 * 3600 * 1e3).toISOString().slice(0, 10);
const EMPTY = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
async function gsc(body) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) return null;
  try {
    const res = await fetch(
      `${GATEWAY}/google_search_console/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gscKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      console.error("GSC query failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("GSC query error", String(e));
    return null;
  }
}
async function gscTotals(days, offset = 0) {
  const end = new Date(Date.now() - offset * 864e5);
  const start = new Date(end.getTime() - days * 864e5);
  const body = await gsc({ startDate: fmtDate(start), endDate: fmtDate(end), dimensions: [], rowLimit: 1 });
  if (!body) return null;
  const r = body?.rows?.[0];
  return r ? { clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 } : EMPTY;
}
const AI_REFERRERS = [
  ["ChatGPT", /chat\.openai|chatgpt\.com|openai\.com/i],
  ["Perplexity", /perplexity\.ai/i],
  ["Gemini / Google AI", /gemini\.google|bard\.google|aistudio\.google/i],
  ["Claude", /claude\.ai|anthropic\.com/i],
  ["Copilot / Bing Chat", /copilot\.microsoft|bing\.com\/chat/i],
  ["Other AI", /you\.com|phind\.com|poe\.com|mistral\.ai|grok|x\.ai/i]
];
const AI_BOTS = [
  ["GPTBot (OpenAI)", /GPTBot/i],
  ["OAI-SearchBot", /OAI-SearchBot/i],
  ["ChatGPT-User", /ChatGPT-User/i],
  ["PerplexityBot", /PerplexityBot/i],
  ["ClaudeBot", /ClaudeBot|Claude-Web|anthropic-ai/i],
  ["Google-Extended", /Google-Extended/i],
  ["Applebot-Extended", /Applebot/i],
  ["CCBot", /CCBot/i],
  ["Bytespider", /Bytespider/i],
  ["Amazonbot", /Amazonbot/i],
  ["Meta AI", /meta-externalagent|FacebookBot/i]
];
const numFmt = (n) => Number(n || 0).toLocaleString("en-IN");
const pct = (n) => `${(Number(n || 0) * 100).toFixed(2)}%`;
function trafficRow(label, t) {
  if (!t) return `<tr><td style="padding:6px 0;color:#666">${label}</td><td colspan="4" style="padding:6px 0;color:#888">Search Console data unavailable</td></tr>`;
  return `<tr>
    <td style="padding:6px 0;color:#666">${label}</td>
    <td style="padding:6px 0;font-weight:600">${numFmt(t.clicks)}</td>
    <td style="padding:6px 0">${numFmt(t.impressions)}</td>
    <td style="padding:6px 0">${pct(t.ctr)}</td>
    <td style="padding:6px 0">${(t.position || 0).toFixed(1)}</td>
  </tr>`;
}
const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const unauthorized = await assertSeoAuthorized(req);
  if (unauthorized) return unauthorized;
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let body = {};
  try {
    body = await req.json();
  } catch {
  }
  const force = body?.force === true;
  const day = istDay();
  if (!force) {
    const { error: claimErr } = await sb.from("seo_report_runs").insert({ report_date: day, kind: "daily-seo" });
    if (claimErr) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already sent today", report_date: day }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  try {
    const [d1, d7, d28] = await Promise.all([
      gscTotals(1, 2),
      gscTotals(7, 2),
      gscTotals(28, 2)
    ]);
    const end = new Date(Date.now() - 2 * 864e5);
    const start28 = new Date(end.getTime() - 28 * 864e5);
    const [queriesBody, pagesBody] = await Promise.all([
      gsc({ startDate: fmtDate(start28), endDate: fmtDate(end), dimensions: ["query"], rowLimit: 10 }),
      gsc({ startDate: fmtDate(start28), endDate: fmtDate(end), dimensions: ["page"], rowLimit: 10 })
    ]);
    const topQueries = queriesBody?.rows || [];
    const topPages = pagesBody?.rows || [];
    const since24 = new Date(Date.now() - 864e5).toISOString();
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: visits24 } = await sb.from("visitor_logs").select("ip_address, country, referrer, landing_path, user_agent").gte("created_at", since24).limit(5e3);
    const { count: visits7Count } = await sb.from("visitor_logs").select("id", { count: "exact", head: true }).gte("created_at", since7);
    const rows24 = visits24 || [];
    const uniqueVisitors = new Set(rows24.map((r) => r.ip_address).filter(Boolean)).size;
    const tally = (vals) => {
      const m = /* @__PURE__ */ new Map();
      for (const v of vals) {
        const k = (v || "").trim();
        if (!k) continue;
        m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const topCountries = tally(rows24.map((r) => r.country));
    const topLanding = tally(rows24.map((r) => r.landing_path));
    const aiReferrals = AI_REFERRERS.map(([name, re]) => [
      name,
      rows24.filter((r) => re.test(String(r.referrer || ""))).length
    ]).filter(([, n]) => n > 0);
    const aiBots = AI_BOTS.map(([name, re]) => [
      name,
      rows24.filter((r) => re.test(String(r.user_agent || ""))).length
    ]).filter(([, n]) => n > 0);
    const aiReferralTotal = aiReferrals.reduce((a, [, n]) => a + n, 0);
    const aiBotTotal = aiBots.reduce((a, [, n]) => a + n, 0);
    const { count: publishedCount } = await sb.from("posts").select("id", { count: "exact", head: true }).eq("status", "published");
    const { count: publishedToday } = await sb.from("posts").select("id", { count: "exact", head: true }).eq("status", "published").gte("published_at", since24);
    const { count: scheduledCount } = await sb.from("posts").select("id", { count: "exact", head: true }).eq("status", "scheduled");
    const { data: alertRows } = await sb.from("seo_agent_alerts").select("created_at, severity, error_type, provider, message, recovered").gte("created_at", since24).order("created_at", { ascending: false }).limit(50);
    const alerts = alertRows || [];
    const listRows = (items, emptyText) => items.length ? items.map(([k, v]) => `<tr><td style="padding:5px 0;color:#444">${esc(k)}</td><td style="padding:5px 0;text-align:right;font-weight:600">${numFmt(v)}</td></tr>`).join("") : `<tr><td colspan="2" style="padding:5px 0;color:#888">${esc(emptyText)}</td></tr>`;
    const html = `<div style="font-family:Georgia,serif;max-width:700px;margin:0 auto;background:#fafaf8;border-radius:12px;overflow:hidden">
  <div style="background:#1B7A3E;color:#fff;padding:22px 28px">
    <h1 style="margin:0;font-size:19px">${SITE_NAME} \u2014 Daily SEO &amp; Traffic Report</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:.92">${istNow()} IST</p>
    <p style="margin:6px 0 0;font-size:13px">Live site: <a href="${SITE_URL}" style="color:#fff">${SITE_URL}</a></p>
  </div>
  <div style="padding:24px 28px">

    <h2 style="font-size:15px;margin:0 0 8px">Google Search Traffic</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:22px">
      <tr style="color:#888;font-size:12px;text-align:left">
        <th style="padding:4px 0;font-weight:600">Period</th><th style="padding:4px 0;font-weight:600">Clicks</th>
        <th style="padding:4px 0;font-weight:600">Impressions</th><th style="padding:4px 0;font-weight:600">CTR</th>
        <th style="padding:4px 0;font-weight:600">Avg Pos</th>
      </tr>
      ${trafficRow("Last 1 day", d1)}
      ${trafficRow("Last 7 days", d7)}
      ${trafficRow("Last 28 days", d28)}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">AI Search Visibility (last 24h)</h2>
    <p style="font-size:13px;color:#444;margin:0 0 8px">
      AI assistant referrals: <b>${numFmt(aiReferralTotal)}</b> &nbsp;|&nbsp; AI crawler hits: <b>${numFmt(aiBotTotal)}</b>
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px">
      ${listRows(aiReferrals, "No AI assistant referrals recorded in the last 24h")}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:22px">
      ${listRows(aiBots, "No AI crawler visits recorded in the last 24h")}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">Website Traffic</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:14px">
      <tr><td style="padding:6px 0;color:#666;width:240px">Visits (24h)</td><td style="padding:6px 0;font-weight:600">${numFmt(rows24.length)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Unique visitors (24h)</td><td style="padding:6px 0;font-weight:600">${numFmt(uniqueVisitors)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Visits (7 days)</td><td style="padding:6px 0;font-weight:600">${numFmt(visits7Count || 0)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px">
      <tr><td colspan="2" style="padding:4px 0;color:#888;font-size:12px">Top countries (24h)</td></tr>
      ${listRows(topCountries, "No visits recorded")}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:22px">
      <tr><td colspan="2" style="padding:4px 0;color:#888;font-size:12px">Top landing pages (24h)</td></tr>
      ${listRows(topLanding, "No visits recorded")}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">Top Search Queries (28 days)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:22px">
      ${topQueries.length ? topQueries.map((r) => `<tr><td style="padding:5px 0;color:#444">${esc(r.keys?.[0])}</td><td style="padding:5px 0;text-align:right">${numFmt(r.clicks)} clicks \xB7 ${numFmt(r.impressions)} impr \xB7 pos ${(r.position || 0).toFixed(1)}</td></tr>`).join("") : `<tr><td style="padding:5px 0;color:#888">No query data available</td></tr>`}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">Top Pages (28 days)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:22px">
      ${topPages.length ? topPages.map((r) => `<tr><td style="padding:5px 0;color:#444">${esc(r.keys?.[0])}</td><td style="padding:5px 0;text-align:right">${numFmt(r.clicks)} clicks \xB7 ${numFmt(r.impressions)} impr</td></tr>`).join("") : `<tr><td style="padding:5px 0;color:#888">No page data available</td></tr>`}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">Content</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:22px">
      <tr><td style="padding:6px 0;color:#666;width:240px">Published articles (total)</td><td style="padding:6px 0;font-weight:600">${numFmt(publishedCount || 0)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Published in last 24h</td><td style="padding:6px 0;font-weight:600">${numFmt(publishedToday || 0)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Scheduled</td><td style="padding:6px 0;font-weight:600">${numFmt(scheduledCount || 0)}</td></tr>
    </table>

    <h2 style="font-size:15px;margin:0 0 8px">SEO Agent Events (last 24h)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${alerts.length ? alerts.map((a) => `<tr><td style="padding:5px 0;color:#444">${esc(a.error_type)}${a.recovered ? " (recovered)" : ""}<div style="color:#888;font-size:12px">${esc(String(a.message || "").slice(0, 220))}</div></td><td style="padding:5px 0;text-align:right;color:#888;white-space:nowrap">${esc(new Date(a.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }))}</td></tr>`).join("") : `<tr><td style="padding:5px 0;color:#888">No agent issues in the last 24h</td></tr>`}
    </table>
  </div>
</div>`;
    const L = [];
    L.push({ text: `${SITE_NAME} \u2014 Daily SEO & Traffic Report`, bold: true, size: 16 });
    L.push({ text: `${istNow()} IST`, size: 10 });
    L.push({ text: `Live site: ${SITE_URL}`, size: 10 });
    const head = (t) => L.push({ text: t, bold: true, size: 13, gap: 12 });
    const kv = (k, v) => L.push({ text: `${k}: ${v}`, size: 10 });
    head("Google Search Traffic");
    const tRow = (label, t) => kv(label, t ? `${numFmt(t.clicks)} clicks | ${numFmt(t.impressions)} impressions | CTR ${pct(t.ctr)} | avg pos ${(t.position || 0).toFixed(1)}` : "Search Console data unavailable");
    tRow("Last 1 day", d1);
    tRow("Last 7 days", d7);
    tRow("Last 28 days", d28);
    head("AI Search Visibility (last 24h)");
    kv("AI assistant referrals", numFmt(aiReferralTotal));
    kv("AI crawler hits", numFmt(aiBotTotal));
    for (const [k, v] of aiReferrals) kv(`  ${k}`, numFmt(v));
    for (const [k, v] of aiBots) kv(`  ${k}`, numFmt(v));
    if (!aiReferrals.length && !aiBots.length) L.push({ text: "No AI activity recorded in the last 24h", size: 10 });
    head("Website Traffic");
    kv("Visits (24h)", numFmt(rows24.length));
    kv("Unique visitors (24h)", numFmt(uniqueVisitors));
    kv("Visits (7 days)", numFmt(visits7Count || 0));
    L.push({ text: "Top countries (24h)", bold: true, size: 10, gap: 6 });
    if (topCountries.length) for (const [k, v] of topCountries) kv(`  ${k}`, numFmt(v));
    else L.push({ text: "  No visits recorded", size: 10 });
    L.push({ text: "Top landing pages (24h)", bold: true, size: 10, gap: 6 });
    if (topLanding.length) for (const [k, v] of topLanding) kv(`  ${k}`, numFmt(v));
    else L.push({ text: "  No visits recorded", size: 10 });
    head("Top Search Queries (28 days)");
    if (topQueries.length) {
      for (const r of topQueries) {
        L.push({ text: `${r.keys?.[0]} \u2014 ${numFmt(r.clicks)} clicks, ${numFmt(r.impressions)} impr, pos ${(r.position || 0).toFixed(1)}`, size: 10 });
      }
    } else L.push({ text: "No query data available", size: 10 });
    head("Top Pages (28 days)");
    if (topPages.length) {
      for (const r of topPages) {
        L.push({ text: `${r.keys?.[0]} \u2014 ${numFmt(r.clicks)} clicks, ${numFmt(r.impressions)} impr`, size: 10 });
      }
    } else L.push({ text: "No page data available", size: 10 });
    head("Content");
    kv("Published articles (total)", numFmt(publishedCount || 0));
    kv("Published in last 24h", numFmt(publishedToday || 0));
    kv("Scheduled", numFmt(scheduledCount || 0));
    head("SEO Agent Events (last 24h)");
    if (alerts.length) {
      for (const a of alerts) {
        const when = new Date(a.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
        L.push({ text: `[${when}] ${a.error_type}${a.recovered ? " (recovered)" : ""}`, bold: true, size: 10, gap: 4 });
        if (a.message) L.push({ text: String(a.message).slice(0, 400), size: 9 });
      }
    } else L.push({ text: "No agent issues in the last 24h", size: 10 });
    const pdfBase64 = toBase64(buildPdf(L));
    const recipients = (process.env.SEO_REPORT_TO || `${ADMIN_EMAIL},gyandootnova57@gmail.com`).split(",").map((s) => s.trim()).filter(Boolean);
    const uniqueRecipients = [...new Set(recipients)];
    let emailed = false;
    let emailError = null;
    let emailId = null;
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM,
          to: uniqueRecipients,
          reply_to: ADMIN_EMAIL,
          subject: `[SEO REPORT] ${SITE_NAME} \u2014 ${day}`,
          html,
          attachments: [
            { filename: `gyandootnova-seo-report-${day}.pdf`, content: pdfBase64 }
          ]
        })
      });
      emailed = res.ok;
      if (res.ok) {
        try {
          emailId = (await res.json())?.id ?? null;
        } catch {
        }
        console.log("daily report emailed", { to: uniqueRecipients, emailId });
      } else {
        emailError = (await res.text()).slice(0, 300);
        console.error("daily report email failed", res.status, emailError);
      }
    } else {
      emailError = "RESEND_API_KEY not configured";
    }
    if (!emailed && !force) {
      await sb.from("seo_report_runs").delete().eq("report_date", day).eq("kind", "daily-seo");
    }
    return new Response(
      JSON.stringify({
        success: true,
        emailed,
        emailError,
        emailId,
        recipients: uniqueRecipients,
        report_date: day,
        gsc: { last1d: d1, last7d: d7, last28d: d28 },
        onsite: { visits24h: rows24.length, unique24h: uniqueVisitors, visits7d: visits7Count || 0 },
        ai: { referrals: aiReferrals, bots: aiBots }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    if (!force) {
      await sb.from("seo_report_runs").delete().eq("report_date", day).eq("kind", "daily-seo");
    }
    console.error("seo-daily-report failed", String(e?.message || e));
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

export default handler;