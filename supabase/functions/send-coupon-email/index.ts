import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Verify admin
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  // Require a server-recorded admin OTP session (2FA).
  const { data: otpOk } = await supabaseAdmin.rpc("is_admin_otp_verified", { _user_id: user.id });
  if (!otpOk) {
    return new Response(JSON.stringify({ error: "Admin 2FA verification required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { emails, coupon_code, discount_label, description, message } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), { status: 400, headers: corsHeaders });
    }
    if (!coupon_code) {
      return new Response(JSON.stringify({ error: "No coupon code provided" }), { status: 400, headers: corsHeaders });
    }

    // Validate emails (basic check)
    const validEmails = emails.filter((e: string) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    if (validEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No valid email addresses found" }), { status: 400, headers: corsHeaders });
    }

    const personalMessage = message?.trim()
      ? `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">${message.trim()}</p>`
      : "";

    const descriptionHtml = description?.trim()
      ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;">${description.trim()}</p>`
      : "";

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
                  <td style="background-color:#8B1A1A;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#F5C518;font-family:Georgia,serif;font-size:26px;font-weight:700;letter-spacing:0.5px;">GyandootNova</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">ज्ञान का सफर शुरू होता है यहाँ से</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;font-family:Georgia,serif;">
                      🎁 A Special Coupon Just for You!
                    </h2>

                    ${personalMessage}

                    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                      Use the exclusive coupon code below to get <strong>${discount_label}</strong> on your next book purchase:
                    </p>

                    <!-- Coupon Code Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="background-color:#fef9f0;border:2px dashed #F5C518;border-radius:8px;padding:20px;text-align:center;">
                          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Your Coupon Code</p>
                          <p style="margin:0;font-size:28px;font-weight:800;color:#8B1A1A;font-family:monospace;letter-spacing:4px;">${coupon_code}</p>
                          ${descriptionHtml}
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <div style="text-align:center;margin:28px 0;">
                      <a href="https://gyandoot-reader-forge.lovable.app/books"
                         style="background-color:#8B1A1A;color:#F5C518;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;display:inline-block;letter-spacing:0.3px;">
                        Browse Books →
                      </a>
                    </div>

                    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
                      Apply this code at checkout. Limited time offer.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 GyandootNova. All rights reserved.</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#d1d5db;">You received this because you are a valued member of GyandootNova.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send emails in batches of 10 to avoid rate limiting
    const batchSize = 10;
    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < validEmails.length; i += batchSize) {
      const batch = validEmails.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (email: string) => {
          try {
            await resend.emails.send({
              from: "GyandootNova <info@gyandootnova.in>",
              to: [email.trim()],
              subject: `🎁 Your Exclusive Coupon: ${coupon_code} — ${discount_label} OFF`,
              html,
            });
            sent++;
          } catch (err: any) {
            errors.push(`${email}: ${err.message}`);
          }
        })
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed: errors.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Send coupon email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
