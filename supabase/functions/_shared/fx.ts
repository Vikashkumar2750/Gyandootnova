// Server-side INR->foreign FX resolution with in-memory cache and safe fallback.
// NEVER trust a client-supplied rate — buyers can otherwise manipulate the
// PayPal charge amount to a fraction of the real book price.

export const PAYPAL_SUPPORTED = new Set([
  "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "HKD", "JPY", "NZD",
  "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ILS", "MXN",
  "PHP", "THB", "TWD", "BRL",
]);

// Conservative fallback rates (INR -> currency). Refreshed occasionally.
export const FALLBACK_FX: Record<string, number> = {
  USD: 0.012, EUR: 0.011, GBP: 0.0095, AUD: 0.018, CAD: 0.016,
  SGD: 0.016, HKD: 0.094, JPY: 1.8,   NZD: 0.020, CHF: 0.010,
  SEK: 0.125, NOK: 0.132, DKK: 0.083, PLN: 0.049, CZK: 0.275,
  HUF: 4.40,  ILS: 0.044, MXN: 0.220, PHP: 0.700, THB: 0.410,
  TWD: 0.380, BRL: 0.065,
};

interface CacheEntry { rates: Record<string, number>; fetchedAt: number; }
let cache: CacheEntry | null = null;
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function loadLiveRates(): Promise<Record<string, number> | null> {
  try {
    // open.er-api.com is free, no key required, updated hourly.
    const r = await fetch("https://open.er-api.com/v6/latest/INR", {
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.result !== "success" || !j?.rates) return null;
    return j.rates as Record<string, number>;
  } catch {
    return null;
  }
}

export async function getInrRate(currency: string): Promise<number> {
  const code = (currency || "USD").toUpperCase();
  const now = Date.now();

  if (!cache || now - cache.fetchedAt > TTL_MS) {
    const live = await loadLiveRates();
    if (live) cache = { rates: live, fetchedAt: now };
  }

  const live = cache?.rates?.[code];
  if (typeof live === "number" && live > 0) return live;
  return FALLBACK_FX[code] ?? FALLBACK_FX.USD;
}

// Convert INR amount to the target currency using a server-computed rate.
// Returns { rate, converted, formatted } where `formatted` is the PayPal
// string representation (zero-decimal currencies get integer values).
export async function convertInr(
  amountInr: number,
  currency: string,
): Promise<{ rate: number; converted: number; formatted: string; currency: string }> {
  const code = PAYPAL_SUPPORTED.has((currency || "USD").toUpperCase())
    ? (currency || "USD").toUpperCase()
    : "USD";
  const rate = await getInrRate(code);
  const converted = amountInr * rate;
  const zeroDecimal = code === "JPY";
  const formatted = zeroDecimal
    ? Math.max(1, Math.round(converted)).toString()
    : converted.toFixed(2);
  return { rate, converted, formatted, currency: code };
}
