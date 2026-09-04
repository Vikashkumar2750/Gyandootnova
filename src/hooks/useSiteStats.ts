import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real, verifiable catalogue counts used anywhere we show numbers to visitors.
 * Never invent or simulate these — inflated claims are an E-E-A-T / trust risk.
 */
export function useSiteStats() {
  return useQuery({
    queryKey: ["site-stats"],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    queryFn: async () => {
      const [books, articles] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
      ]);
      return {
        books: books.count ?? 0,
        articles: articles.count ?? 0,
      };
    },
  });
}
