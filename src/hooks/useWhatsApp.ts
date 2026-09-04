import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const WHATSAPP_DEFAULTS = {
  whatsapp_message_general:
    "Namaste GyandootNova team! 🙏\n\nMujhe support chahiye.\n\nPage: {page}\nEmail: {email}\n\nMeri problem: ",
  whatsapp_message_book:
    "Namaste GyandootNova team! 🙏\n\nBook: {book}\nLink: {url}\nEmail: {email}\n\nIs book me meri problem: ",
};

export type WhatsAppContext = {
  /** Book title — agar diya gaya to book template use hoga */
  book?: string | null;
  /** Book / page ka full URL */
  url?: string | null;
};

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "");

export function useWhatsApp() {
  const location = useLocation();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value ?? ""; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const number = (settings?.whatsapp_number ?? "").replace(/[^\d]/g, "");

  const buildLink = (ctx: WhatsAppContext = {}) => {
    if (!number) return null;
    const isBook = !!ctx.book;
    const template =
      (isBook ? settings?.whatsapp_message_book : settings?.whatsapp_message_general)?.trim() ||
      (isBook ? WHATSAPP_DEFAULTS.whatsapp_message_book : WHATSAPP_DEFAULTS.whatsapp_message_general);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = fill(template, {
      book: ctx.book ?? "",
      url: ctx.url ?? `${origin}${location.pathname}`,
      page: `${origin}${location.pathname}`,
      email: user?.email ?? "guest",
      site: settings?.site_name ?? "GyandootNova",
    });

    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  return { number, enabled: !!number, buildLink, settings };
}

export default useWhatsApp;
