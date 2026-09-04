import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "placeholder_key");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendAccountStatusEmail(email, displayName, action) {
  const name = displayName || email;
  const isDisabled = action === "disable";

  const subject = isDisabled
    ? "Your account has been disabled — GyandootNova"
    : "Your account has been re-enabled — GyandootNova";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color:${isDisabled ? "#dc2626" : "#16a34a"};padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">GyandootNova</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Account Notification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hello, <strong>${name}</strong>,</p>
                  ${isDisabled ? `
                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                    Your account on <strong>GyandootNova</strong> has been <strong style="color:#dc2626;">disabled</strong> by an administrator.
                  </p>
                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                    You will not be able to log in until your account is re-enabled. If you believe this is a mistake, please contact our support team.
                  </p>
                  ` : `
                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                    Great news Your account on <strong>GyandootNova</strong> has been <strong style="color:#16a34a;">re-enabled</strong> by an administrator.
                  </p>
                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                    You can now log in and access all your books, reading progress, and other features as before.
                  </p>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="https://gyandoot-reader-forge.lovable.app/auth" style="background-color:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;display:inline-block;">Login to Your Account</a>
                  </div>
                  `}
                  <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
                    If you have questions, reply to this email or contact us at gyandootnova57@gmail.com
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 GyandootNova. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: "GyandootNova <info@gyandootnova.in>",
      to: [email],
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err);
    // Don't fail the request if email fails
  }
}

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const supabaseUser = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers } },
  );

  const { data, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Verify admin role
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  // Require a server-recorded admin OTP session (2FA), not just the UI flag.
  const { data: otpOk } = await supabaseAdmin.rpc("is_admin_otp_verified", { _user_id: user.id });
  if (!otpOk) {
    return new Response(JSON.stringify({ error: "Admin 2FA verification required" }), {
      status: 403,
      headers,
    });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const userId = url.searchParams.get("user_id");

    if (userId) {
      // Get single user history
      const [purchases, donations, reading, bookmarks] = await Promise.all([
        supabaseAdmin.from("purchases").select("*, books(title, slug)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("donations").select("id, amount, status, donor_name, donor_email, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("reading_progress").select("*, books(title, slug)").eq("user_id", userId).order("updated_at", { ascending: false }),
        supabaseAdmin.from("bookmarks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      return new Response(JSON.stringify({
        purchases: purchases.data ?? [],
        donations: donations.data ?? [],
        reading: reading.data ?? [],
        bookmarks: bookmarks.data ?? [],
      }), { headers });
    }

    // List all users
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    // Get profiles and roles
    const [profiles, roles] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, display_name, avatar_url"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const profileMap = Object.fromEntries((profiles.data ?? []).map((p) => [p.user_id, p]));
    const roleMap = Object.fromEntries((roles.data ?? []).map((r) => [r.user_id, r.role]));

    const users = authUsers.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until,
      display_name: profileMap[u.id]?.display_name ?? null,
      role: roleMap[u.id] ?? "user",
    }));

    return new Response(JSON.stringify({ users }), { headers });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { user_id, action } = body;

    if (!user_id || !action) return new Response(JSON.stringify({ error: "Missing user_id or action" }), { status: 400, headers: corsHeaders });

    // Fetch target user info before action
    const { data: targetUser, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (fetchErr || !targetUser?.user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    const targetEmail = targetUser.user.email ?? "";
    const { data: profileData } = await supabaseAdmin.from("profiles").select("display_name").eq("user_id", user_id).maybeSingle();
    const displayName = profileData?.display_name ?? null;

    if (action === "disable") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      await sendAccountStatusEmail(targetEmail, displayName, "disable");
    } else if (action === "enable") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      await sendAccountStatusEmail(targetEmail, displayName, "enable");
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
};

export default handler;
