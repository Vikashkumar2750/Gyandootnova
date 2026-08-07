import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const REFERRAL_KEY = "gdn_ref";
const REFERRAL_EXPIRY_KEY = "gdn_ref_exp";
const REFERRAL_DAYS = 7;

/**
 * Captures ?ref= param from any page URL and stores in localStorage for 7 days.
 * Returns the stored referrer_id (or null).
 */
export const useReferralCapture = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const expiry = Date.now() + REFERRAL_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(REFERRAL_KEY, ref);
      localStorage.setItem(REFERRAL_EXPIRY_KEY, String(expiry));
    }
  }, [searchParams]);
};

export const getReferrerId = (): string | null => {
  const ref = localStorage.getItem(REFERRAL_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  if (!ref || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    localStorage.removeItem(REFERRAL_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    return null;
  }
  return ref;
};
