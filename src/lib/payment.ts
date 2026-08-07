import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type PaymentGateway = "razorpay" | "paypal";

interface CreateOrderParams {
<<<<<<< HEAD
  amount: number; // Always in INR (source-of-truth)
=======
  amount: number;
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  type: "donation" | "purchase";
  gateway?: PaymentGateway;
  book_id?: string;
  name?: string;
  email?: string;
<<<<<<< HEAD
  coupon_id?: string;
  referrer_id?: string;
  // Buyer's display currency + live INR→currency rate (for PayPal international pricing)
  buyer_currency?: string;
  buyer_fx_rate?: number;
  // Guest checkout — when the user is not logged in.
  guest_email?: string;
  guest_name?: string;
}

export interface PaymentSuccessInfo {
  claim_token?: string;
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
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
<<<<<<< HEAD
  onSuccess: (info?: PaymentSuccessInfo) => void,
=======
  onSuccess: () => void,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  onFailure: (error: string) => void
) {
  const gateway = params.gateway || "razorpay";

  try {
<<<<<<< HEAD
    const { data: { session } } = await supabase.auth.getSession();

    // Guest checkout: purchase without login requires guest_email
    if (params.type === "purchase" && !session && !params.guest_email) {
      onFailure("Please log in or provide an email to purchase");
      return;
    }

=======
    // For purchases, session is required. For donations, it's optional.
    const { data: { session } } = await supabase.auth.getSession();

    if (params.type === "purchase" && !session) {
      onFailure("Please log in to purchase books");
      return;
    }

    // Invoke edge function — pass auth header only if logged in
    const invokeOptions = session
      ? { body: { ...params, gateway } }
      : {
          body: { ...params, gateway },
          headers: { Authorization: "Bearer anonymous" },
        };

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    const res = await supabase.functions.invoke("create-order", {
      body: { ...params, gateway },
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
<<<<<<< HEAD
  onSuccess: (info?: PaymentSuccessInfo) => void,
=======
  onSuccess: () => void,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
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
<<<<<<< HEAD
        onSuccess({ claim_token: orderData.claim_token });
      }
    },
    prefill: {
      name: params.name || params.guest_name || "",
      email: params.email || params.guest_email || "",
=======
        onSuccess();
      }
    },
    prefill: {
      name: params.name || "",
      email: params.email || "",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
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
<<<<<<< HEAD
  onSuccess: (info?: PaymentSuccessInfo) => void,
=======
  onSuccess: () => void,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
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
<<<<<<< HEAD
        onSuccess({ claim_token: orderData.claim_token });
=======
        onSuccess();
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      }
    }
  }, 1000);
}
