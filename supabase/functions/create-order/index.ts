import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
<<<<<<< HEAD
import { convertInr, PAYPAL_SUPPORTED as _PP_SUPPORTED } from "../_shared/fx.ts";
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

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

<<<<<<< HEAD
    const {
      amount, type, book_id, name, email, gateway = "razorpay",
      coupon_id, referrer_id, buyer_currency, buyer_fx_rate,
      guest_email, guest_name,
    } = await req.json();

    // Auth is optional. Purchases allow logged-in OR guest (guest_email required).
    let user: any = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.endsWith("Bearer ") && !authHeader.endsWith("Bearer anonymous")) {
=======
    const { amount, type, book_id, name, email, gateway = "razorpay", coupon_id, referrer_id } = await req.json();

    // For purchases, auth is required. For donations, auth is optional.
    let user: any = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser ?? null;
    }

<<<<<<< HEAD
    if (type === "purchase" && !user && !guest_email) {
      return new Response(JSON.stringify({ error: "Login OR guest email required to purchase" }), {
=======
    if (type === "purchase" && !user) {
      return new Response(JSON.stringify({ error: "Login required to purchase books" }), {
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "purchase" && !book_id) {
      return new Response(JSON.stringify({ error: "book_id is required for purchases" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify book price server-side for purchases
    let verifiedAmount = amount;
    if (type === "purchase" && book_id) {
      const { data: book } = await supabase.from("books").select("price, is_free").eq("id", book_id).single();
      if (!book) {
        return new Response(JSON.stringify({ error: "Book not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (book.is_free) {
        return new Response(JSON.stringify({ error: "Book is free" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      verifiedAmount = book.price;

<<<<<<< HEAD
      // Apply coupon discount if coupon_id provided (skip for guests — repurchase check needs user)
      if (coupon_id) {
        const { data: coupon } = await supabase
          .from("coupons")
          .select("id, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at, repurchase_only")
=======
      // Apply coupon discount if coupon_id provided
      if (coupon_id) {
        const { data: coupon } = await supabase
          .from("coupons")
          .select("id, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at")
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          .eq("id", coupon_id)
          .eq("is_active", true)
          .single();

        if (coupon) {
          const now = new Date();
          const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now;
          const hasUses = !coupon.max_uses || coupon.used_count < coupon.max_uses;
          const meetsMin = verifiedAmount >= (coupon.min_order_amount ?? 0);

<<<<<<< HEAD
=======
          // Enforce book restriction server-side
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          let bookAllowed = true;
          const { count: restrictionCount } = await supabase
            .from("coupon_books")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", coupon_id);

          if ((restrictionCount ?? 0) > 0) {
            const { count: matchCount } = await supabase
              .from("coupon_books")
              .select("id", { count: "exact", head: true })
              .eq("coupon_id", coupon_id)
              .eq("book_id", book_id);
            bookAllowed = (matchCount ?? 0) > 0;
          }

<<<<<<< HEAD
          let repurchaseOk = true;
          if ((coupon as any).repurchase_only) {
            if (!user?.id) {
              repurchaseOk = false;
            } else {
              const { count: priorCount } = await supabase
                .from("purchases")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("status", "completed");
              repurchaseOk = (priorCount ?? 0) >= 1;
            }
            if (!repurchaseOk) {
              return new Response(
                JSON.stringify({ error: "This coupon is only valid for returning customers (requires a previous purchase)." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          if (notExpired && hasUses && meetsMin && bookAllowed && repurchaseOk) {
=======
          if (notExpired && hasUses && meetsMin && bookAllowed) {
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            let discount = 0;
            if (coupon.discount_type === "percent") {
              discount = Math.round((verifiedAmount * coupon.discount_value / 100) * 100) / 100;
            } else {
              discount = Math.min(coupon.discount_value, verifiedAmount);
            }
            verifiedAmount = Math.max(verifiedAmount - discount, 1);
          }
        }
      }
    }

    if (gateway === "razorpay") {
<<<<<<< HEAD
      return await handleRazorpay(supabase, user, verifiedAmount, type, book_id, name, email, coupon_id, referrer_id, guest_email, guest_name);
    } else if (gateway === "paypal") {
      return await handlePaypal(supabase, user, verifiedAmount, type, book_id, name, email, coupon_id, referrer_id, buyer_currency, guest_email, guest_name);
=======
      return await handleRazorpay(supabase, user, verifiedAmount, type, book_id, name, email, coupon_id, referrer_id);
    } else if (gateway === "paypal") {
      return await handlePaypal(supabase, user, verifiedAmount, type, book_id, name, email, coupon_id, referrer_id);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    } else {
      return new Response(JSON.stringify({ error: "Unsupported gateway" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("create-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

<<<<<<< HEAD
function newClaimToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleRazorpay(
  supabase: any, user: any, amount: number, type: string,
  book_id?: string, name?: string, email?: string, coupon_id?: string, referrer_id?: string,
  guest_email?: string, guest_name?: string,
=======
async function handleRazorpay(
  supabase: any, user: any, amount: number, type: string,
  book_id?: string, name?: string, email?: string, coupon_id?: string, referrer_id?: string
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
) {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
    },
    body: JSON.stringify({
<<<<<<< HEAD
      amount: Math.round(amount * 100),
=======
      amount: Math.round(amount * 100), // paise
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      currency: "INR",
      receipt: `${type}_${Date.now()}`,
    }),
  });

  if (!orderRes.ok) {
    const errBody = await orderRes.text();
    console.error("Razorpay order error:", errBody);
    return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const order = await orderRes.json();
<<<<<<< HEAD
  const isGuest = !user && !!guest_email;
  const claim_token = type === "purchase" && isGuest ? newClaimToken() : undefined;

  if (type === "purchase") {
    const purchaseData: any = {
      user_id: user?.id ?? null,
      guest_email: isGuest ? guest_email : null,
      guest_name: isGuest ? (guest_name ?? null) : null,
      claim_token: claim_token ?? null,
      book_id,
      razorpay_order_id: order.id,
      status: "pending",
      amount,
      currency: "INR",
    };
    if (referrer_id && referrer_id !== user?.id) {
      purchaseData.referrer_id = referrer_id;
    }
    if (coupon_id) purchaseData.coupon_id = coupon_id;
    await supabase.from("purchases").insert(purchaseData);
=======

  // Store pending record
  if (type === "purchase") {
    const purchaseData: any = {
      user_id: user.id,
      book_id,
      razorpay_order_id: order.id,
      status: "pending",
    };
    // Store referrer_id if present and not self-referral
    if (referrer_id && referrer_id !== user.id) {
      purchaseData.referrer_id = referrer_id;
    }
    await supabase.from("purchases").insert(purchaseData);
    // Increment coupon usage if applied
    if (coupon_id) {
      await supabase.rpc("increment_coupon_usage", { _coupon_id: coupon_id });
    }
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  } else {
    await supabase.from("donations").insert({
      user_id: user?.id ?? null,
      amount,
      donor_name: name || null,
      donor_email: email || user?.email || null,
      razorpay_order_id: order.id,
      status: "pending",
    });
  }

  return new Response(
<<<<<<< HEAD
    JSON.stringify({ gateway: "razorpay", order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency, claim_token }),
=======
    JSON.stringify({ gateway: "razorpay", order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency }),
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

<<<<<<< HEAD
const PAYPAL_SUPPORTED = _PP_SUPPORTED;

async function handlePaypal(
  supabase: any, user: any, amount: number, type: string,
  book_id?: string, name?: string, email?: string, coupon_id?: string, referrer_id?: string,
  buyer_currency?: string,
  guest_email?: string, guest_name?: string,
=======
async function handlePaypal(
  supabase: any, user: any, amount: number, type: string,
  book_id?: string, name?: string, email?: string, coupon_id?: string, referrer_id?: string
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
) {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "PayPal not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

<<<<<<< HEAD
=======
  // Get access token
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    console.error("PayPal token error:", await tokenRes.text());
    return new Response(JSON.stringify({ error: "PayPal auth failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { access_token } = await tokenRes.json();

<<<<<<< HEAD
  // SECURITY: server-side FX only. Ignore any client-supplied rate — a hostile
  // buyer would otherwise send `buyer_fx_rate: 0.00001` and pay pennies.
  const { rate: _rate, formatted: paypalValue, currency } =
    await convertInr(amount, buyer_currency || "USD");

=======
  // Convert INR to USD (approximate)
  const usdAmount = (amount / 83).toFixed(2);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
<<<<<<< HEAD
          amount: { currency_code: currency, value: paypalValue },
=======
          amount: { currency_code: "USD", value: usdAmount },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          description: type === "purchase" ? "Book Purchase" : "Donation",
        },
      ],
    }),
  });

  if (!orderRes.ok) {
    console.error("PayPal order error:", await orderRes.text());
    return new Response(JSON.stringify({ error: "Failed to create PayPal order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ppOrder = await orderRes.json();
<<<<<<< HEAD
  const isGuest = !user && !!guest_email;
  const claim_token = type === "purchase" && isGuest ? newClaimToken() : undefined;

  if (type === "purchase") {
    const purchaseData: any = {
      user_id: user?.id ?? null,
      guest_email: isGuest ? guest_email : null,
      guest_name: isGuest ? (guest_name ?? null) : null,
      claim_token: claim_token ?? null,
      book_id,
      razorpay_order_id: ppOrder.id,
      status: "pending",
      amount: Number(paypalValue),
      currency,
    };
    if (referrer_id && referrer_id !== user?.id) {
      purchaseData.referrer_id = referrer_id;
    }
    if (coupon_id) purchaseData.coupon_id = coupon_id;
=======

  // Store pending record
  if (type === "purchase") {
    const purchaseData: any = {
      user_id: user.id,
      book_id,
      razorpay_order_id: ppOrder.id,
      status: "pending",
    };
    if (referrer_id && referrer_id !== user.id) {
      purchaseData.referrer_id = referrer_id;
    }
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    await supabase.from("purchases").insert(purchaseData);
  } else {
    await supabase.from("donations").insert({
      user_id: user?.id ?? null,
      amount,
      donor_name: name || null,
      donor_email: email || user?.email || null,
      razorpay_order_id: ppOrder.id,
      status: "pending",
    });
  }

  const approveLink = ppOrder.links?.find((l: any) => l.rel === "approve")?.href;

  return new Response(
<<<<<<< HEAD
    JSON.stringify({ gateway: "paypal", order_id: ppOrder.id, approve_url: approveLink, currency, amount: paypalValue, claim_token }),
=======
    JSON.stringify({ gateway: "paypal", order_id: ppOrder.id, approve_url: approveLink }),
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
