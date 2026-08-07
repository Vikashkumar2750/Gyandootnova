import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";

/**
 * GyandootNova is INR-only, Hindi-first.
 * Multi-currency and auto-translate were removed intentionally — they were
 * mis-detecting geolocation and letting Google Translate rewrite prices
 * (e.g. "₹100" → "100 kr" for Swedish visitors/crawlers). All prices are
 * authored in INR and displayed with the ₹ symbol on every page and for
 * every visitor, including search engine crawlers.
 */

export type Currency = "INR";
export type Language = "en-IN";

interface LocaleContextValue {
  currency: Currency;
  language: Language;
  setCurrency: (c: Currency) => void;
  setLanguage: (l: Language) => void;
  formatPrice: (inrAmount: number) => string;
  rates: Record<Currency, number>;
  country: string | null;
}

const FIXED_RATES: Record<Currency, number> = { INR: 1 };

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Kill any leftover Google Translate state from earlier sessions. */
const purgeLegacyLocaleState = () => {
  if (typeof document === "undefined") return;
  try {
    // Clear googtrans cookies on every path/domain scope we may have written.
    const clear = (domain?: string) => {
      const base = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = domain ? `${base}; domain=${domain}` : base;
    };
    const host = window.location.hostname;
    clear();
    clear(host);
    const parts = host.split(".");
    if (parts.length > 1) clear(`.${parts.slice(-2).join(".")}`);

    // Remove Google Translate DOM leftovers if present.
    document.getElementById("google_translate_element")?.remove();
    document
      .querySelectorAll("iframe.goog-te-banner-frame, iframe.skiptranslate")
      .forEach((n) => n.remove());
    if (document.body.style.top) document.body.style.top = "";

    // Wipe legacy overrides so the site never re-activates a stored non-INR/non-hi choice.
    ["gn_currency", "gn_language", "gn_currency_manual", "gn_language_manual"].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    purgeLegacyLocaleState();
    if (typeof document !== "undefined") {
      document.documentElement.lang = "en-IN";
      // Signal to translation tools / crawlers to leave the content alone.
      document.documentElement.setAttribute("translate", "no");
      document.documentElement.classList.add("notranslate");
    }
  }, []);

  const formatPrice = useCallback(
    (baseAmount: number) => `₹${Math.round(baseAmount).toLocaleString("en-IN")}`,
    []
  );

  const noop = useCallback(() => {
    /* Multi-locale switching is disabled — GyandootNova is Hindi/INR only. */
  }, []);

  const value: LocaleContextValue = {
    currency: "INR",
    language: "en-IN",
    setCurrency: noop,
    setLanguage: noop,
    formatPrice,
    rates: FIXED_RATES,
    country: "IN",
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
};
