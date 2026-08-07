import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import useSEO from "@/hooks/useSEO";

type Kw = {
  id: string;
  term: string;
  category: string | null;
  related_terms: string[] | null;
  description: string | null;
  priority: number;
};

const Keywords = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["lsi-keywords-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lsi_keywords")
        .select("id, term, category, related_terms, description, priority")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("term", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Kw[];
    },
  });

  const terms = data ?? [];

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "GyandootNova — Sanatan Dharma & Hindu Scripture Keywords",
      description:
        "सनातन धर्म, वेद, उपनिषद, गीता, रामायण, महाभारत और आध्यात्मिक विषयों के प्रामाणिक कीवर्ड्स।",
      url: "https://gyandootnova.in/keywords",
      inLanguage: ["hi", "en", "sa"],
      hasDefinedTerm: terms.map((t) => ({
        "@type": "DefinedTerm",
        name: t.term,
        description: t.description || undefined,
        inDefinedTermSet: "https://gyandootnova.in/keywords",
        termCode: t.category || undefined,
        alternateName: t.related_terms || undefined,
      })),
    }),
    [terms]
  );

  useSEO({
    title: "Keywords & Topics — Sanatan Dharma, Vedas, Gita",
    description:
      "GyandootNova का प्रामाणिक कीवर्ड हब — भगवद्गीता, रामायण, महाभारत, वेद, उपनिषद, योग, भक्ति और सनातन धर्म से जुड़े सभी विषय एक जगह।",
    canonical: "/keywords",
    ogType: "website",
    jsonLd,
  });

  const grouped = terms.reduce<Record<string, Kw[]>>((acc, k) => {
    const cat = k.category || "General";
    (acc[cat] ||= []).push(k);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-3">
            विषय-सूची एवं कीवर्ड्स
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            सनातन धर्म, वेद, उपनिषद, गीता, रामायण, महाभारत और आध्यात्मिक विषयों से जुड़े
            प्रमुख कीवर्ड्स। AI सर्च और Google पर हमारा प्रामाणिक हिंदी-संस्कृत ज्ञान
            भंडार यहाँ से खोजें।
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : terms.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            जल्द ही कीवर्ड्स जोड़े जाएंगे।
          </p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, list]) => (
              <section key={cat}>
                <h2 className="font-serif text-2xl font-semibold text-primary mb-4 border-b border-border pb-2">
                  {cat}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((k) => (
                    <Card key={k.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{k.term}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {k.description && (
                          <p className="text-sm text-muted-foreground">{k.description}</p>
                        )}
                        {k.related_terms && k.related_terms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {k.related_terms.map((r, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">और अधिक पढ़ें —</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/books" className="text-primary hover:underline">सभी पुस्तकें</Link>
                <span className="text-muted-foreground">•</span>
                <Link to="/articles" className="text-primary hover:underline">आध्यात्मिक लेख</Link>
                <span className="text-muted-foreground">•</span>
                <Link to="/about" className="text-primary hover:underline">हमारे बारे में</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Keywords;
