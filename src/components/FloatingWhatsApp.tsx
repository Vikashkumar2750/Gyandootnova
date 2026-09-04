import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import useWhatsApp from "@/hooks/useWhatsApp";

const FloatingWhatsApp = () => {
  const location = useLocation();
  const { buildLink } = useWhatsApp();

  // /books/:slug, /read/:slug, /read/:slug/flip → book context
  const slug = location.pathname.match(/^\/(?:books|read)\/([^/]+)/)?.[1] ?? null;

  const { data: book } = useQuery({
    queryKey: ["whatsapp-book-title", slug],
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("books").select("title, slug").eq("slug", slug!).maybeSingle();
      return data;
    },
  });

  const whatsappLink = buildLink({
    book: book?.title ?? null,
    url: book ? `${window.location.origin}/books/${book.slug}` : null,
  });

  if (!whatsappLink) return null;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={book ? `WhatsApp support for ${book.title}` : "Chat on WhatsApp"}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform duration-200"
    >
      <MessageCircle className="h-7 w-7 fill-white stroke-none" />
    </a>
  );
};

export default FloatingWhatsApp;
