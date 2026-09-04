// PayPal API base URL. Set PAYPAL_ENV=sandbox to use sandbox credentials.
export const PAYPAL_API_BASE =
  (Deno.env.get("PAYPAL_ENV") || "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
