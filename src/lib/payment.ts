import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, gatewayForCurrency, type CurrencyCode } from "@/lib/currency";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type PaymentGateway = "razorpay" | "paypal";

interface CreateOrderParams {
  /**
   * Numeric amount exactly as stored in the database.
   * NEVER converted — only the currency code changes.
   */
  amount: number;
  type: "donation" | "purchase";
  /** Optional override; normally derived from `buyer_currency`. */
  gateway?: PaymentGateway;
  book_id?: string;
  name?: string;
  email?: string;
  coupon_id?: string;
  referrer_id?: string;
  /** Buyer's selected currency. INR -> Razorpay, others -> PayPal. */
  buyer_currency?: CurrencyCode;
  // Guest checkout — when the user is not logged in.
  guest_email?: string;
  guest_name?: string;
}

export interface PaymentSuccessInfo {
  claim_token?: string;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

export async function initiatePayment(
  params: CreateOrderParams,
  onSuccess: (info?: PaymentSuccessInfo) => void,
  onFailure: (error: string) => void
) {
  const currency: CurrencyCode = params.buyer_currency ?? "INR";
  const routed = gatewayForCurrency(currency);

  if (routed === "unsupported") {
    onFailure(
      `${CURRENCIES[currency]?.label ?? currency} (${currency}) payments are not supported yet. Please switch to INR, USD, GBP, EUR, CAD, AUD, JPY or SGD.`
    );
    return;
  }

  const gateway: PaymentGateway = params.gateway ?? routed;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Guest checkout: purchase without login requires guest_email
    if (params.type === "purchase" && !session && !params.guest_email) {
      onFailure("Please log in or provide an email to purchase");
      return;
    }

    const res = await supabase.functions.invoke("create-order", {
      body: { ...params, gateway, buyer_currency: currency },
      headers: session ? {} : { Authorization: "" },
    });

    if (res.error || !res.data) {
      onFailure(res.error?.message || "Failed to create order");
      return;
    }

    const orderData = res.data;

    if (gateway === "razorpay") {
      await handleRazorpayCheckout(orderData, params, session?.access_token ?? null, onSuccess, onFailure);
    } else if (gateway === "paypal") {
      handlePaypalCheckout(orderData, params, session?.access_token ?? null, onSuccess, onFailure);
    }
  } catch (err: any) {
    onFailure(err.message || "Payment failed");
  }
}

async function handleRazorpayCheckout(
  orderData: any,
  params: CreateOrderParams,
  accessToken: string | null,
  onSuccess: (info?: PaymentSuccessInfo) => void,
  onFailure: (error: string) => void
) {
  await loadRazorpayScript();

  const options = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "GyandootNova",
    description: params.type === "purchase" ? "Book Purchase" : "Donation",
    order_id: orderData.order_id,
    handler: async (response: any) => {
      const verifyRes = await supabase.functions.invoke("verify-payment", {
        body: {
          gateway: "razorpay",
          order_id: orderData.order_id,
          payment_id: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          type: params.type,
        },
        headers: accessToken ? {} : { Authorization: "" },
      });

      if (verifyRes.error || !verifyRes.data?.success) {
        onFailure("Payment verification failed");
      } else {
        onSuccess({ claim_token: orderData.claim_token });
      }
    },
    prefill: {
      name: params.name || params.guest_name || "",
      email: params.email || params.guest_email || "",
    },
    theme: { color: "#B71C1C" },
    modal: {
      ondismiss: () => onFailure("Payment cancelled"),
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

function handlePaypalCheckout(
  orderData: any,
  params: CreateOrderParams,
  accessToken: string | null,
  onSuccess: (info?: PaymentSuccessInfo) => void,
  onFailure: (error: string) => void
) {
  if (!orderData.approve_url) {
    onFailure("PayPal approval URL not received");
    return;
  }

  const popup = window.open(orderData.approve_url, "paypal-checkout", "width=500,height=700");

  const timer = setInterval(async () => {
    if (popup?.closed) {
      clearInterval(timer);
      const verifyRes = await supabase.functions.invoke("verify-payment", {
        body: {
          gateway: "paypal",
          order_id: orderData.order_id,
          type: params.type,
        },
        headers: accessToken ? {} : { Authorization: "" },
      });

      if (verifyRes.error || !verifyRes.data?.success) {
        onFailure("Payment verification failed or was cancelled");
      } else {
        onSuccess({ claim_token: orderData.claim_token });
      }
    }
  }, 1000);
}
