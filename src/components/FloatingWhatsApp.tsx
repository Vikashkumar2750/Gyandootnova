import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

const FloatingWhatsApp = () => {
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

  const whatsappNumber = settings?.whatsapp_number?.replace(/\s+/g, "").replace("+", "") ?? "";
  if (!whatsappNumber) return null;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Namaste! I have a question about GyandootNova.")}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform duration-200"
    >
      <MessageCircle className="h-7 w-7 fill-white stroke-none" />
    </a>
  );
};

export default FloatingWhatsApp;
