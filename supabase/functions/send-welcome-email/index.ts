import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape to prevent injection through the display_name field.
const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated session; only let users trigger a welcome email
    // to their own address. This stops anonymous abuse / spam relays.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requested = String(body?.email ?? "").trim().toLowerCase();
    const displayName = String(body?.display_name ?? "").trim().slice(0, 80);

    // Only allow sending to the authenticated user's own email.
    const target = (user.email ?? "").toLowerCase();
    if (!target || (requested && requested !== target)) {
      return new Response(JSON.stringify({ error: "Email mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = esc(displayName || target.split("@")[0]);

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
                <tr>
                  <td style="background-color:#8B1A1A;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#F5C518;font-family:Georgia,serif;font-size:26px;font-weight:700;letter-spacing:0.5px;">GyandootNova</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">ज्ञान का सफर शुरू होता है यहाँ से</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;font-family:Georgia,serif;">
                      Welcome aboard, ${safeName}! 🎉
                    </h2>
                    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                      Thank you for joining <strong>GyandootNova</strong> — your digital home for books, knowledge, and personal growth.
                    </p>
                    <div style="text-align:center;margin:28px 0;">
                      <a href="https://gyandoot-reader-forge.lovable.app/books"
                         style="background-color:#8B1A1A;color:#F5C518;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;display:inline-block;letter-spacing:0.3px;">
                        Start Reading →
                      </a>
                    </div>
                    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
                      Need help? Reply to this email and we'll be happy to assist.
                    </p>
                  </td>
                </tr>
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

    await resend.emails.send({
      from: "GyandootNova <info@gyandootnova.in>",
      to: [target],
      subject: `Welcome to GyandootNova, ${displayName || target.split("@")[0]}! 🎉`,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Welcome email error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
