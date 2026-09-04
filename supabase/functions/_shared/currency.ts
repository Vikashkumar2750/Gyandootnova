// Global currency rules for GyandootNova payments.
//
// CRITICAL BUSINESS RULE: there is NO exchange-rate conversion.
// The numeric amount stored on the product/order is charged as-is; only the
// currency code changes (227 -> ₹227 INR / $227 USD / £227 GBP / €227 EUR).

export const SUPPORTED_CURRENCIES = [
  "INR", "USD", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "JPY", "SGD",
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

// Currencies the configured PayPal account/environment can settle.
export const PAYPAL_SUPPORTED = new Set<string>([
  "USD", "GBP", "EUR", "CAD", "AUD", "JPY", "SGD",
]);

// PayPal / Razorpay currencies without minor units.
export const ZERO_DECIMAL = new Set<string>(["JPY"]);

export const normalizeCurrency = (code?: string | null): CurrencyCode => {
  const c = (code || "INR").toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c)
    ? (c as CurrencyCode)
    : "INR";
};

/** Centralised gateway routing — same rule as the frontend. */
export const gatewayForCurrency = (code: string): "razorpay" | "paypal" | "unsupported" => {
  const c = normalizeCurrency(code);
  if (c === "INR") return "razorpay";
  return PAYPAL_SUPPORTED.has(c) ? "paypal" : "unsupported";
};

/** PayPal amount string for the SAME numeric value (no conversion). */
export const paypalAmount = (amount: number, code: string): string => {
  const c = normalizeCurrency(code);
  return ZERO_DECIMAL.has(c)
    ? String(Math.max(1, Math.round(amount)))
    : (Math.round(amount * 100) / 100).toFixed(2);
};

/** Razorpay smallest-unit amount (₹227 -> 22700 paise). */
export const razorpayAmount = (amount: number, code = "INR"): number => {
  const c = normalizeCurrency(code);
  return ZERO_DECIMAL.has(c) ? Math.round(amount) : Math.round(amount * 100);
};
