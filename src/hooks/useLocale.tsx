import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import {
  CURRENCIES,
  CurrencyCode,
  DEFAULT_CURRENCY,
  currencyForCountry,
  formatAmount,
  gatewayForCurrency,
  isCurrencyCode,
  PaymentGatewayId,
} from "@/lib/currency";

/**
 * GyandootNova locale/currency provider.
 *
 * Content stays Hindi-first (en-IN, no Google Translate). Currency is global,
 * but there is NO exchange-rate conversion: the numeric price never changes,
 * only the currency code/symbol and the payment gateway.
 *
 * Currency priority:
 *   1. Manually selected currency (this session / stored)
 *   2. Previously saved preference
 *   3. Auto-detected country
 *   4. INR
 */

export type Currency = CurrencyCode;
export type Language = "en-IN";

interface LocaleContextValue {
  currency: Currency;
  language: Language;
  setCurrency: (c: Currency) => void;
  setLanguage: (l: Language) => void;
  /** Formats WITHOUT conversion — same number, different symbol. */
  formatPrice: (amount: number) => string;
  /** Legacy shape: every rate is 1 because conversion is disabled by design. */
  rates: Record<string, number>;
  country: string | null;
  gateway: PaymentGatewayId;
  symbol: string;
  isManual: boolean;
}

const STORAGE_KEY = "gn_currency";
const MANUAL_KEY = "gn_currency_manual";
const COUNTRY_KEY = "gn_country";

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Kill any leftover Google Translate state from earlier sessions. */
const purgeLegacyLocaleState = () => {
  if (typeof document === "undefined") return;
  try {
    const clear = (domain?: string) => {
      const base = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = domain ? `${base}; domain=${domain}` : base;
    };
    const host = window.location.hostname;
    clear();
    clear(host);
    const parts = host.split(".");
    if (parts.length > 1) clear(`.${parts.slice(-2).join(".")}`);

    document.getElementById("google_translate_element")?.remove();
    document
      .querySelectorAll("iframe.goog-te-banner-frame, iframe.skiptranslate")
      .forEach((n) => n.remove());
    if (document.body.style.top) document.body.style.top = "";
  } catch {
    /* ignore */
  }
};

const readStored = (): { code: CurrencyCode | null; manual: boolean } => {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    const manual = localStorage.getItem(MANUAL_KEY) === "1";
    return { code: isCurrencyCode(code) ? code : null, manual };
  } catch {
    return { code: null, manual: false };
  }
};

/** Offline country guess from the browser timezone / language. */
const guessCountry = (): string | null => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzMap: Record<string, string> = {
      "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA", "Asia/Singapore": "SG", "Asia/Tokyo": "JP",
      "Europe/London": "GB",
    };
    if (tzMap[tz]) return tzMap[tz];
    if (tz.startsWith("America/")) return "US";
    if (tz.startsWith("Australia/")) return "AU";
    if (tz.startsWith("Europe/")) return "DE"; // eurozone default
    const lang = navigator.language || "";
    const region = lang.split("-")[1];
    return region ? region.toUpperCase() : null;
  } catch {
    return null;
  }
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const stored = typeof window !== "undefined" ? readStored() : { code: null, manual: false };

  const [currency, setCurrencyState] = useState<CurrencyCode>(stored.code ?? DEFAULT_CURRENCY);
  const [isManual, setIsManual] = useState(stored.manual);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    purgeLegacyLocaleState();
    document.documentElement.lang = "en-IN";
    document.documentElement.setAttribute("translate", "no");
    document.documentElement.classList.add("notranslate");
  }, []);

  // Country detection (only used when no manual preference exists).
  useEffect(() => {
    let cancelled = false;

    const apply = (cc: string | null, cache = false) => {
      if (cancelled || !cc) return;
      const code = cc.toUpperCase();
      setCountry(code);
      if (cache) {
        try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* ignore */ }
      }
      if (readStored().manual) return; // manual selection always wins
      setCurrencyState(currencyForCountry(code));
    };

    // 1. Cached IP-detected country (instant, accurate on repeat visits)
    let cached: string | null = null;
    try { cached = localStorage.getItem(COUNTRY_KEY); } catch { /* ignore */ }
    apply(cached ?? guessCountry());

    // 2. Live IP lookup (with fallback provider)
    (async () => {
      const providers: { url: string; pick: (j: any) => string | undefined }[] = [
        { url: "https://ipapi.co/json/", pick: (j) => j?.country_code },
        { url: "https://ipwho.is/", pick: (j) => j?.country_code },
      ];
      for (const p of providers) {
        try {
          const res = await fetch(p.url, { signal: AbortSignal.timeout(4000) });
          if (!res.ok) continue;
          const j = await res.json();
          const cc = p.pick(j);
          if (cc) { apply(String(cc), true); return; }
        } catch {
          /* try next provider */
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);


  const setCurrency = useCallback((c: Currency) => {
    if (!isCurrencyCode(c)) return;
    setCurrencyState(c);
    setIsManual(true);
    try {
      localStorage.setItem(STORAGE_KEY, c);
      localStorage.setItem(MANUAL_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const formatPrice = useCallback(
    (amount: number) => formatAmount(amount, currency),
    [currency]
  );

  const noopLanguage = useCallback(() => {
    /* Hindi-first content only — language switching stays disabled. */
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    currency,
    language: "en-IN",
    setCurrency,
    setLanguage: noopLanguage,
    formatPrice,
    rates: Object.fromEntries(Object.keys(CURRENCIES).map((k) => [k, 1])),
    country,
    gateway: gatewayForCurrency(currency),
    symbol: CURRENCIES[currency].symbol,
    isManual,
  }), [currency, setCurrency, noopLanguage, formatPrice, country, isManual]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
};
