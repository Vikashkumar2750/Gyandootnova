import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeCurrency, paypalAmount } from "../_shared/currency.ts";
import { PAYPAL_API_BASE } from "../_shared/paypal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth is optional — required only for purchases
    let user: any = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser ?? null;
    }

    const { gateway, order_id, payment_id, signature, type } = await req.json();

    if (!order_id || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guest purchases are allowed — verify-payment will look up the pending row by order_id.
    // No auth required.


    if (gateway === "razorpay") {
      return await verifyRazorpay(supabase, user, order_id, payment_id, signature, type);
    } else if (gateway === "paypal") {
      return await verifyPaypal(supabase, user, order_id, type);
    } else {
      return new Response(JSON.stringify({ error: "Unsupported gateway" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("verify-payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", GBP: "£", EUR: "€", CAD: "C$", AUD: "A$", JPY: "¥", SGD: "S$",
  AED: "AED ", SAR: "SAR ",
};
// Same number, different currency — never converted.
const money = (amount: number, code: string) =>
  `${CURRENCY_SYMBOLS[normalizeCurrency(code)] ?? ""}${amount} ${normalizeCurrency(code)}`;

async function sendReceipt(
  supabase: any,
  user: any,
  type: string,
  orderId: string,
  paymentId: string,
  gateway: string
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping email receipt");
    return;
  }

  try {
    let amount = 0;
    let currencyCode = "INR";
    let bookTitle = "";
    let recipientEmail = user?.email || "";
    let recipientName = "";

    if (type === "purchase") {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("book_id, created_at, guest_email, guest_name, claim_token, amount, currency")
        .eq("razorpay_order_id", orderId)
        .single();
      if (purchase?.book_id) {
        const { data: book } = await supabase
          .from("books")
          .select("title, price, slug")
          .eq("id", purchase.book_id)
          .single();
        if (book) {
          bookTitle = book.title;
          amount = Number(purchase.amount ?? book.price);
        }
        currencyCode = normalizeCurrency(purchase.currency ?? "INR");
        if (purchase.guest_email) {
          recipientEmail = purchase.guest_email;
          recipientName = purchase.guest_name ?? "";
        }
      }
      // Attach claim URL for guest receipts
      if (purchase?.claim_token) {
        (globalThis as any).__claimUrl = `https://gyandootnova.in/claim/${purchase.claim_token}`;
      } else {
        (globalThis as any).__claimUrl = "";
      }
    } else {
      const { data: donation } = await supabase
        .from("donations")
        .select("amount, donor_name, donor_email, currency")
        .eq("razorpay_order_id", orderId)
        .single();
      if (donation) {
        amount = donation.amount;
        currencyCode = normalizeCurrency(donation.currency ?? "INR");
        recipientName = donation.donor_name || "";
        if (donation.donor_email) recipientEmail = donation.donor_email;
      }
    }

    if (!recipientEmail) {
      console.warn("No recipient email, skipping receipt");
      return;
    }

    const date = new Date().toLocaleDateString("en-IN", {
      year: "numeric", month: "long", day: "numeric",
    });

    const subject = type === "purchase"
      ? `GyandootNova — Book Purchase Receipt`
      : `GyandootNova — Donation Receipt`;

    const html = type === "purchase"
      ? `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #fff;">
          <div style="text-align: center; border-bottom: 3px solid #B71C1C; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="color: #B71C1C; margin: 0; font-size: 28px;">📚 GyandootNova</h1>
            <p style="color: #666; margin-top: 5px;">Purchase Confirmation</p>
          </div>
          <p>Namaste${recipientName ? ` ${recipientName}` : ""},</p>
          <p>Thank you for your purchase! Your book is now ready to read.</p>
          <div style="background: #FFF8E1; border-left: 4px solid #FBC02D; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #333;">📖 ${bookTitle}</p>
            <p style="margin: 0; color: #555;">Amount: <strong>${money(amount, currencyCode)}</strong></p>
            <p style="margin: 8px 0 0; color: #888; font-size: 13px;">Payment ID: ${paymentId}</p>
            <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Date: ${date}</p>
            <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Gateway: ${gateway.charAt(0).toUpperCase() + gateway.slice(1)}</p>
          </div>
          <p>You can start reading your book anytime by visiting your library.</p>
          <div style="text-align: center; margin-top: 25px;">
            <a href="${(globalThis as any).__claimUrl || "https://gyandootnova.in/dashboard"}" style="background: #B71C1C; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Access Your Book</a>
          </div>

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">GyandootNova — Illuminating spiritual seekers with sacred knowledge.</p>
        </div>`
      : `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #fff;">
          <div style="text-align: center; border-bottom: 3px solid #B71C1C; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="color: #B71C1C; margin: 0; font-size: 28px;">🙏 GyandootNova</h1>
            <p style="color: #666; margin-top: 5px;">Donation Receipt</p>
          </div>
          <p>Namaste${recipientName ? ` ${recipientName}` : ""},</p>
          <p>Thank you for your generous donation! Your kindness helps spread spiritual knowledge to seekers everywhere.</p>
          <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #333;">❤️ Donation Amount: <strong>${money(amount, currencyCode)}</strong></p>
            <p style="margin: 8px 0 0; color: #888; font-size: 13px;">Payment ID: ${paymentId}</p>
            <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Date: ${date}</p>
            <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Gateway: ${gateway.charAt(0).toUpperCase() + gateway.slice(1)}</p>
          </div>
          <p>May your generosity bring blessings and light into your life. 🙏</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">GyandootNova — Illuminating spiritual seekers with sacred knowledge.</p>
        </div>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "GyandootNova <info@gyandootnova.in>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend email error:", errText);
    } else {
      console.log("Receipt email sent to", recipientEmail);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

async function verifyRazorpay(
  supabase: any, user: any, orderId: string, paymentId: string, signature: string, type: string
) {
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keySecret) {
    return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!paymentId || !signature) {
    return new Response(JSON.stringify({ error: "Missing payment_id or signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify signature
  const body = orderId + "|" + paymentId;
  const key = new TextEncoder().encode(keySecret);
  const msg = new TextEncoder().encode(body);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const expectedSignature = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedSignature !== signature) {
    console.error("Razorpay signature mismatch");
    return new Response(JSON.stringify({ error: "Payment verification failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the actual captured amount + currency with Razorpay (never trust the client).
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  if (keyId) {
    try {
      const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
      });
      if (payRes.ok) {
        const pay = await payRes.json();
        const expectedTable = type === "purchase" ? "purchases" : "donations";
        const { data: row } = await supabase
          .from(expectedTable)
          .select("amount, currency")
          .eq("razorpay_order_id", orderId)
          .maybeSingle();
        const expectedAmount = Number(row?.amount ?? 0);
        const expectedCurrency = normalizeCurrency(row?.currency ?? "INR");

        const orderMatches = pay?.order_id === orderId;
        const currencyMatches = String(pay?.currency ?? "").toUpperCase() === expectedCurrency;
        const amountMatches = expectedAmount > 0
          ? Number(pay?.amount) === Math.round(expectedAmount * 100)
          : true;
        const captured = pay?.status === "captured" || pay?.status === "authorized";

        if (!orderMatches || !currencyMatches || !amountMatches || !captured) {
          console.error("Razorpay payment mismatch", {
            orderId, paymentId, expectedAmount, expectedCurrency,
            got: { order_id: pay?.order_id, amount: pay?.amount, currency: pay?.currency, status: pay?.status },
          });
          return new Response(JSON.stringify({ error: "Payment verification failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.warn("Razorpay payment fetch failed, relying on signature only:", e);
    }
  }

  const table = type === "purchase" ? "purchases" : "donations";

  // For donations, match by order_id only (no user_id filter for anonymous)
  let updateQuery = supabase
    .from(table)
    .update({
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      status: "completed",
    })
    .eq("razorpay_order_id", orderId);

  if (type === "purchase" && user) {
    updateQuery = updateQuery.eq("user_id", user.id);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error("DB update error:", updateError);
    return new Response(JSON.stringify({ error: "Failed to update payment record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Increment purchase count, redeem coupon, and create referral for books
  if (type === "purchase") {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id, book_id, user_id, referrer_id, coupon_id, coupon_redeemed_at")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (purchase?.book_id) {
      await supabase.rpc("increment_purchase_count", { _book_id: purchase.book_id }).catch(() => {
        console.warn("Could not increment purchase count");
      });

      // Atomic, idempotent coupon redemption: only increment if not already redeemed.
      if (purchase.coupon_id && !purchase.coupon_redeemed_at) {
        const { data: claimed } = await supabase
          .from("purchases")
          .update({ coupon_redeemed_at: new Date().toISOString() })
          .eq("id", purchase.id)
          .is("coupon_redeemed_at", null)
          .select("id")
          .maybeSingle();
        if (claimed) {
          await supabase.rpc("increment_coupon_usage", { _coupon_id: purchase.coupon_id })
            .catch((e) => console.warn("Coupon increment failed:", e));
        }
      }

      // Create referral record if referrer exists
      if (purchase.referrer_id) {
        try {
          const { data: book } = await supabase
            .from("books")
            .select("price, referral_commission_percent")
            .eq("id", purchase.book_id)
            .single();

          if (book && book.referral_commission_percent > 0) {
            const commissionAmount = Math.round((book.price * book.referral_commission_percent / 100) * 100) / 100;
            await supabase.from("referrals").insert({
              referrer_user_id: purchase.referrer_id,
              buyer_user_id: purchase.user_id,
              book_id: purchase.book_id,
              purchase_id: orderId,
              commission_percent: book.referral_commission_percent,
              commission_amount: commissionAmount,
              status: "pending",
            });
          }
        } catch (e) {
          console.error("Referral creation error:", e);
        }
      }
    }
  }

  // Send receipt email (non-blocking)
  sendReceipt(supabase, user, type, orderId, paymentId, "razorpay").catch((e) =>
    console.error("Receipt email failed:", e)
  );

  return new Response(
    JSON.stringify({ success: true, message: "Payment verified" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function verifyPaypal(supabase: any, user: any, orderId: string, type: string) {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "PayPal not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await tokenRes.json();

  const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!captureRes.ok) {
    console.error("PayPal capture error:", await captureRes.text());
    return new Response(JSON.stringify({ error: "PayPal capture failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const captureData = await captureRes.json();

  if (captureData.status !== "COMPLETED") {
    return new Response(JSON.stringify({ error: "Payment not completed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: cross-check the captured amount/currency against the order that
  // the server created. There is NO exchange-rate conversion — the captured
  // amount must equal the stored numeric amount in the stored currency.
  const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
  const capturedAmountStr = capture?.amount?.value;
  const capturedCurrency = capture?.amount?.currency_code;
  const capturedAmount = capturedAmountStr ? Number(capturedAmountStr) : NaN;

  if (!capturedAmount || !capturedCurrency) {
    return new Response(JSON.stringify({ error: "Payment amount missing" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve the expected amount + currency from the pending order row.
  let expectedAmount = 0;
  let expectedCurrency = "";
  if (type === "purchase") {
    const { data: pRow } = await supabase
      .from("purchases")
      .select("book_id, coupon_id, amount, currency")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    expectedCurrency = normalizeCurrency(pRow?.currency);
    expectedAmount = Number(pRow?.amount ?? 0);
    if (!expectedAmount && pRow?.book_id) {
      const { data: book } = await supabase
        .from("books").select("price").eq("id", pRow.book_id).maybeSingle();
      expectedAmount = Number(book?.price ?? 0);
    }
  } else {
    const { data: dRow } = await supabase
      .from("donations")
      .select("amount, currency")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    expectedAmount = Number(dRow?.amount ?? 0);
    expectedCurrency = normalizeCurrency(dRow?.currency);
  }

  if (expectedAmount > 0) {
    const expectedStr = paypalAmount(expectedAmount, expectedCurrency);
    const currencyOk = capturedCurrency.toUpperCase() === expectedCurrency;
    // Allow only sub-cent rounding differences — no conversion tolerance.
    const amountOk = Math.abs(capturedAmount - Number(expectedStr)) < 0.01;
    if (!currencyOk || !amountOk) {
      console.error("PayPal amount/currency mismatch", {
        orderId, expectedStr, expectedCurrency, capturedAmount, capturedCurrency,
      });
      return new Response(
        JSON.stringify({ error: "Payment amount does not match order total" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const captureId = capture?.id || "";
  const table = type === "purchase" ? "purchases" : "donations";

  let updateQuery = supabase
    .from(table)
    .update({
      razorpay_payment_id: captureId,
      status: "completed",
    })
    .eq("razorpay_order_id", orderId);

  if (type === "purchase" && user) {
    updateQuery = updateQuery.eq("user_id", user.id);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error("DB update error:", updateError);
    return new Response(JSON.stringify({ error: "Failed to update payment record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  sendReceipt(supabase, user, type, orderId, captureId, "paypal").catch((e) =>
    console.error("Receipt email failed:", e)
  );

  return new Response(
    JSON.stringify({ success: true, message: "Payment verified" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
