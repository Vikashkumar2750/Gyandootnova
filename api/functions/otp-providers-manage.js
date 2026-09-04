// Admin-only management endpoint for OTP provider credentials.
// Secret fields are AES-GCM encrypted server-side (AI_PROVIDER_ENC_KEY) so
// they are NEVER sent back to the browser and never stored in plaintext.
import { createClient } from "@supabase/supabase-js";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { encryptKey, decryptKey } from "../lib/ai-crypto.js";

// Fields that must be encrypted at rest (never returned to the browser).
const SECRET_FIELDS = new Set([
  "auth_token",
  "auth_key",
  "api_key",
  "access_token",
]);

async function encryptConfig(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg || {})) {
    if (SECRET_FIELDS.has(k) && typeof v === "string" && v.length > 0 && !v.startsWith("v1.")) {
      out[k] = await encryptKey(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function maskConfig(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg || {})) {
    if (SECRET_FIELDS.has(k)) {
      out[k] = typeof v === "string" && v.length > 0 ? "••••••••" : "";
    } else {
      out[k] = v;
    }
  }
  return out;
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers,
    });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice(7);

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    const anon = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // Enforce admin 2FA (server-side) for mutating actions.
    if (action !== "list") {
      const { data: otpOk } = await admin.rpc("is_admin_otp_verified", { _user_id: userData.user.id });
      if (!otpOk) return json({ error: "Admin 2FA verification required" }, 403);
    }

    if (action === "list") {
      const channel = String(body?.channel || "");
      let q = admin.from("otp_providers").select("id, channel, provider_name, config_json, is_active, created_at").order("created_at");
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      // Opportunistically encrypt any legacy plaintext rows so plaintext
      // stops sitting in the database from this call onward.
      const rows = [];
      for (const row of data ?? []) {
        const cfg = (row.config_json || {});
        const needsMigration = Object.entries(cfg).some(
          ([k, v]) => SECRET_FIELDS.has(k) && typeof v === "string" && v.length > 0 && !v.startsWith("v1."),
        );
        if (needsMigration) {
          const encrypted = await encryptConfig(cfg);
          await admin.from("otp_providers").update({ config_json: encrypted }).eq("id", row.id);
          row.config_json = encrypted;
        }
        row.config_json = maskConfig(row.config_json || {});
        rows.push(row);
      }
      return json({ rows });
    }

    if (action === "create") {
      const channel = String(body?.channel || "");
      const provider_name = String(body?.provider_name || "");
      const cfg = (body?.config_json || {});
      if (!channel || !provider_name) return json({ error: "channel and provider_name required" }, 400);
      const encrypted = await encryptConfig(cfg);
      const { error } = await admin.from("otp_providers").insert({
        channel, provider_name, config_json: encrypted, is_active: false,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "toggle") {
      const id = String(body?.id || "");
      const channel = String(body?.channel || "");
      const activate = Boolean(body?.activate);
      if (!id || !channel) return json({ error: "id and channel required" }, 400);
      if (activate) {
        await admin.from("otp_providers").update({ is_active: false }).eq("channel", channel);
      }
      const { error } = await admin.from("otp_providers").update({ is_active: activate }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete") {
      const id = String(body?.id || "");
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await admin.from("otp_providers").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("otp-providers-manage:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
};

// Referenced to satisfy tree-shakers; not used but keeps imports meaningful.
export { decryptKey };

export default handler;
