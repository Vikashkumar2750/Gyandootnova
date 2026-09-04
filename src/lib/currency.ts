/**
 * GyandootNova global currency system.
 *
 * BUSINESS RULE: there is NO exchange-rate conversion anywhere.
 * The numeric price stored in the database is charged as-is; only the
 * currency code / symbol changes.
 *
 *   price = 227  ->  ₹227 INR (Razorpay)
 *                ->  $227 USD (PayPal)
 *                ->  £227 GBP (PayPal)
 *                ->  €227 EUR (PayPal)
 */

export type CurrencyCode =
  | "INR" | "USD" | "GBP" | "EUR" | "AED" | "SAR"
  | "CAD" | "AUD" | "JPY" | "SGD";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
  /** Supported by the configured PayPal account/environment. */
  paypal: boolean;
  /** Currency has no minor units (PayPal / Razorpay integer amounts). */
  zeroDecimal?: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: "INR", symbol: "₹",  label: "Indian Rupee",        locale: "en-IN", paypal: false },
  USD: { code: "USD", symbol: "$",  label: "US Dollar",           locale: "en-US", paypal: true },
  GBP: { code: "GBP", symbol: "£",  label: "British Pound",       locale: "en-GB", paypal: true },
  EUR: { code: "EUR", symbol: "€",  label: "Euro",                locale: "de-DE", paypal: true },
  AED: { code: "AED", symbol: "AED", label: "UAE Dirham",         locale: "en-AE", paypal: false },
  SAR: { code: "SAR", symbol: "SAR", label: "Saudi Riyal",        locale: "en-SA", paypal: false },
  CAD: { code: "CAD", symbol: "C$", label: "Canadian Dollar",     locale: "en-CA", paypal: true },
  AUD: { code: "AUD", symbol: "A$", label: "Australian Dollar",   locale: "en-AU", paypal: true },
  JPY: { code: "JPY", symbol: "¥",  label: "Japanese Yen",        locale: "ja-JP", paypal: true, zeroDecimal: true },
  SGD: { code: "SGD", symbol: "S$", label: "Singapore Dollar",    locale: "en-SG", paypal: true },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

const EUROZONE = [
  "AT","BE","HR","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU",
  "MT","NL","PT","SK","SI","ES",
];

/**
 * Simplified worldwide rule:
 *   India            -> INR (Razorpay)
 *   Eurozone         -> EUR (PayPal)
 *   Everyone else    -> USD (PayPal)
 */
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  IN: "INR",
  ...Object.fromEntries(EUROZONE.map((c) => [c, "EUR" as CurrencyCode])),
};

/** Currencies a shopper can actually pick in the UI. */
export const SELECTABLE_CURRENCY_CODES: CurrencyCode[] = ["INR", "USD", "EUR"];

export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === "string" && (CURRENCY_CODES as string[]).includes(v);

export const currencyForCountry = (country?: string | null): CurrencyCode => {
  if (!country) return DEFAULT_CURRENCY;
  const cc = country.toUpperCase();
  // India -> INR, Eurozone -> EUR, rest of the world -> USD.
  return COUNTRY_CURRENCY[cc] ?? "USD";
};

/**
 * Format an amount. The NUMBER IS NEVER CONVERTED — only the symbol changes.
 */
export const formatAmount = (amount: number, code: CurrencyCode = DEFAULT_CURRENCY): string => {
  const meta = CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
  const n = meta.zeroDecimal ? Math.round(amount) : Math.round(amount * 100) / 100;
  const shown = Number.isInteger(n)
    ? n.toLocaleString(meta.locale)
    : n.toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return meta.symbol.length > 1 ? `${meta.symbol} ${shown}` : `${meta.symbol}${shown}`;
};

/** Centralised gateway routing. */
export type PaymentGatewayId = "razorpay" | "paypal" | "unsupported";

export const gatewayForCurrency = (code: CurrencyCode): PaymentGatewayId => {
  if (code === "INR") return "razorpay";
  if (CURRENCIES[code]?.paypal) return "paypal";
  return "unsupported";
};
