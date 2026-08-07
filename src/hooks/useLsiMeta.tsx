import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch active LSI keywords for injecting into page <meta name="keywords">
 * and JSON-LD `about` schema on book/article pages.
 */
export function useLsiMeta() {
  return useQuery({
    queryKey: ["lsi-meta-keywords"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lsi_keywords")
        .select("term, related_terms")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(60);
      if (error) return { keywords: "", terms: [] as string[] };
      const all = (data || []).flatMap((r: any) => [r.term, ...(r.related_terms || [])]).filter(Boolean);
      const unique = Array.from(new Set(all));
      return { keywords: unique.join(", "), terms: unique };
    },
  });
}
