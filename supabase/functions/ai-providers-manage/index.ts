// Super Admin AI Provider management endpoint.
// Actions: list, save, test, toggle, delete, logs
// All actions require admin role; keys are encrypted with AES-GCM.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encryptKey, decryptKey, last4 } from "../_shared/ai-crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const PROVIDERS = ["openrouter", "openai", "gemini", "deepseek", "tavily", "exa", "firecrawl", "serpapi"];

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function audit(sb: any, entry: {
  provider?: string; action: string; admin_user_id?: string | null;
  admin_email?: string | null; ip?: string; ua?: string; status?: string; details?: any;
}) {
  try {
    await sb.from("ai_provider_audit_logs").insert({
      provider: entry.provider || null,
      action: entry.action,
      admin_user_id: entry.admin_user_id || null,
      admin_email: entry.admin_email || null,
      ip_address: entry.ip || null,
      user_agent: entry.ua || null,
      status: entry.status || null,
      details: entry.details || null,
    });
  } catch (e) { console.error("audit insert failed", e); }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
}

type TestResult = { status: "connected" | "invalid_key" | "quota_exceeded" | "rate_limited" | "timeout" | "failed"; http?: number; credits?: string | null; error?: string };

async function testProvider(provider: string, key: string): Promise<TestResult> {
  try {
    let res: Response;
    if (provider === "openrouter") {
      res = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "deepseek/deepseek-chat", max_tokens: 5, messages: [{ role: "user", content: "ping" }] }),
      }), 15000);
    } else if (provider === "openai") {
      res = await withTimeout(fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } }), 15000);
    } else if (provider === "gemini") {
      res = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`), 15000);
    } else if (provider === "deepseek") {
      res = await withTimeout(fetch("https://api.deepseek.com/models", { headers: { Authorization: `Bearer ${key}` } }), 15000);
    } else if (provider === "tavily") {
      res = await withTimeout(fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query: "test", max_results: 1 }),
      }), 15000);
    } else if (provider === "exa") {
      res = await withTimeout(fetch("https://api.exa.ai/search", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ query: "test", numResults: 1 }),
      }), 15000);
    } else if (provider === "firecrawl") {
      res = await withTimeout(fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test", limit: 1 }),
      }), 15000);
    } else if (provider === "serpapi") {
      res = await withTimeout(fetch(`https://serpapi.com/account.json?api_key=${key}`), 15000);
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const credits = j.total_searches_left != null ? `${j.total_searches_left} searches left` : null;
        return { status: "connected", http: 200, credits };
      }
    } else {
      return { status: "failed", error: "unknown provider" };
    }

    if (res.ok) return { status: "connected", http: res.status };
    const body = (await res.text()).slice(0, 300);
    if (res.status === 401 || res.status === 403) return { status: "invalid_key", http: res.status, error: body };
    if (res.status === 429) return { status: "rate_limited", http: res.status, error: body };
    if (res.status === 402 || /quota|insufficient|credit/i.test(body)) return { status: "quota_exceeded", http: res.status, error: body };
    return { status: "failed", http: res.status, error: body };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/timeout/i.test(msg)) return { status: "timeout", error: msg };
    return { status: "failed", error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const ip = getIp(req);
  const ua = req.headers.get("user-agent") || "";

  try {
    // Authn: bearer token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = userData.user;

    // Authz: admin role
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      await audit(admin, { action: "unauthorized_access", admin_user_id: user.id, admin_email: user.email, ip, ua, status: "denied" });
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce admin 2FA (server-side): mutating actions require a live OTP session.
    const preAction = ((await req.clone().json().catch(() => ({}))) as any)?.action as string | undefined;
    const readOnly = preAction === "list" || preAction === "logs";
    if (!readOnly) {
      const { data: otpOk } = await admin.rpc("is_admin_otp_verified", { _user_id: user.id });
      if (!otpOk) {
        await audit(admin, { action: "otp_required", admin_user_id: user.id, admin_email: user.email, ip, ua, status: "denied" });
        return new Response(JSON.stringify({ error: "Admin 2FA verification required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      const { data } = await admin.from("ai_provider_settings").select("*").order("priority");
      return new Response(JSON.stringify({ providers: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "logs") {
      const limit = Math.min(Number(body?.limit) || 100, 500);
      const { data } = await admin.from("ai_provider_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      return new Response(JSON.stringify({ logs: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const provider = String(body?.provider || "");
    if (!PROVIDERS.includes(provider)) {
      return new Response(JSON.stringify({ error: "invalid provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "save") {
      const key = String(body?.api_key || "").trim();
      if (!key || key.length < 8) return new Response(JSON.stringify({ error: "invalid api key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const encrypted = await encryptKey(key);
      const l4 = last4(key);
      const priority = body?.priority != null ? Number(body.priority) : undefined;
      const enabled = body?.enabled != null ? Boolean(body.enabled) : undefined;
      await admin.from("ai_provider_settings").upsert({
        provider, encrypted_key: encrypted, key_last4: l4,
        ...(priority != null && !Number.isNaN(priority) ? { priority } : {}),
        ...(enabled != null ? { enabled } : {}),
        updated_at: new Date().toISOString(), updated_by: user.id,
      }, { onConflict: "provider" });
      await audit(admin, { provider, action: "key_updated", admin_user_id: user.id, admin_email: user.email, ip, ua, status: "success", details: { last4: l4 } });
      return new Response(JSON.stringify({ success: true, last4: l4 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle") {
      const enabled = Boolean(body?.enabled);
      await admin.from("ai_provider_settings").upsert({
        provider, enabled, updated_at: new Date().toISOString(), updated_by: user.id,
      }, { onConflict: "provider" });
      await audit(admin, { provider, action: enabled ? "provider_enabled" : "provider_disabled", admin_user_id: user.id, admin_email: user.email, ip, ua, status: "success" });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      await admin.from("ai_provider_settings").update({
        encrypted_key: null, key_last4: null, connection_status: null,
        last_tested_at: null, remaining_credits: null, health_status: "unknown",
        updated_at: new Date().toISOString(), updated_by: user.id,
      }).eq("provider", provider);
      await audit(admin, { provider, action: "key_deleted", admin_user_id: user.id, admin_email: user.email, ip, ua, status: "success" });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "test") {
      // Load current key (or accept new one from body for pre-save test)
      let key = String(body?.api_key || "").trim();
      if (!key) {
        const { data: row } = await admin.from("ai_provider_settings").select("encrypted_key").eq("provider", provider).maybeSingle();
        if (!row?.encrypted_key) return new Response(JSON.stringify({ error: "no key configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        key = await decryptKey(row.encrypted_key);
      }
      const result = await testProvider(provider, key);
      await admin.from("ai_provider_settings").upsert({
        provider,
        connection_status: result.status,
        last_tested_at: new Date().toISOString(),
        last_error: result.error?.slice(0, 500) || null,
        remaining_credits: result.credits || null,
        health_status: result.status === "connected" ? "healthy" : (result.status === "rate_limited" ? "degraded" : "down"),
        updated_at: new Date().toISOString(), updated_by: user.id,
      }, { onConflict: "provider" });
      await audit(admin, { provider, action: "connection_tested", admin_user_id: user.id, admin_email: user.email, ip, ua, status: result.status, details: { http: result.http, credits: result.credits } });
      return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-providers-manage error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
