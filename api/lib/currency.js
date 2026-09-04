// Global currency rules for GyandootNova payments.
// Ported from supabase/functions/_shared/currency.ts

export const SUPPORTED_CURRENCIES = [
  "INR", "USD", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "JPY", "SGD",
];

export const PAYPAL_SUPPORTED = new Set([
  "USD", "GBP", "EUR", "CAD", "AUD", "JPY", "SGD",
]);

export const ZERO_DECIMAL = new Set(["JPY"]);

export const normalizeCurrency = (code) => {
  const c = (code || "INR").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(c) ? c : "INR";
};

export const gatewayForCurrency = (code) => {
  const c = normalizeCurrency(code);
  if (c === "INR") return "razorpay";
  return PAYPAL_SUPPORTED.has(c) ? "paypal" : "unsupported";
};

export const paypalAmount = (amount, code) => {
  const c = normalizeCurrency(code);
  return ZERO_DECIMAL.has(c)
    ? String(Math.max(1, Math.round(amount)))
    : (Math.round(amount * 100) / 100).toFixed(2);
};

export const razorpayAmount = (amount, code = "INR") => {
  const c = normalizeCurrency(code);
  return ZERO_DECIMAL.has(c) ? Math.round(amount) : Math.round(amount * 100);
};
