import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function detectDevice(ua: string): string {
  if (/mobile/i.test(ua) && !/tablet|ipad/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  if (/opera|opr\//i.test(ua)) return "Opera";
  return "Unknown";
}

function detectOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

export function useVisitorTracker() {
  useEffect(() => {
    const KEY = "visitor_logged_at";
    try {
      const last = sessionStorage.getItem(KEY);
      if (last) return; // one log per session
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {}

    (async () => {
      try {
        const ua = navigator.userAgent;
        let geo: any = {};
        try {
          const r = await fetch("https://ipapi.co/json/");
          if (r.ok) geo = await r.json();
        } catch {}

        // Identity is derived server-side from the JWT. We never send
        // user_id / email / phone from the browser — the edge function
        // ignores them regardless.
        await supabase.functions.invoke("track-visit", {
          body: {
            country: geo.country_name ?? null,
            country_code: geo.country_code ?? null,
            region: geo.region ?? null,
            city: geo.city ?? null,
            latitude: geo.latitude ?? null,
            longitude: geo.longitude ?? null,
            timezone: geo.timezone ?? null,
            isp: geo.org ?? null,
            ip_address: geo.ip ?? null,
            user_agent: ua,
            device_type: detectDevice(ua),
            browser: detectBrowser(ua),
            os: detectOS(ua),
            referrer: document.referrer || null,
            landing_path: window.location.pathname + window.location.search,
            language: navigator.language || null,
            screen: `${window.screen.width}x${window.screen.height}`,
          },
        });
      } catch {
        // silent fail
      }
    })();
  }, []);
}
