import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalesEventName =
  | "view_books_list"
  | "view_book"
  | "view_offer_landing"
  | "click_buy_now"
  | "begin_checkout"
  | "begin_guest_checkout"
  | "coupon_applied"
  | "payment_success"
  | "payment_failed"
  | "add_to_wishlist"
  | "share_book"
  | "submit_review";

function getUtms(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    utm_content: p.get("utm_content"),
    utm_term: p.get("utm_term"),
  };
}

// Persist UTMs for the session so events after nav still carry them.
const UTM_KEY = "gn_utm_v1";
function persistUtmsOnce() {
  if (typeof window === "undefined") return;
  const utms = getUtms();
  const hasAny = Object.values(utms).some(Boolean);
  if (hasAny) {
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utms));
    } catch {}
  }
}
function readUtms(): Record<string, string | null> {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getUtms();
}

export function trackSalesEvent(
  event: SalesEventName,
  payload: Record<string, unknown> = {}
) {
  persistUtmsOnce();
  const utms = readUtms();
  const body = {
    event,
    payload,
    utms,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    ts: new Date().toISOString(),
  };
  // Fire and forget — never block UI on analytics.
  try {
    supabase.functions.invoke("track-event", { body }).catch(() => {});
  } catch {}
  // Dev visibility
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, payload);
  }
}

/** Fire an event once when a component mounts. */
export function useTrackOnMount(event: SalesEventName, payload: Record<string, unknown> = {}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackSalesEvent(event, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
