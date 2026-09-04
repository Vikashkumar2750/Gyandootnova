import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Search } from "lucide-react";

const Articles = () => {
  const [search, setSearch] = useState("");

  useSEO({
    title: "Spiritual Articles & Insights — GyandootNova (Gyandoot Nova)",
    description: "GyandootNova (Gyandoot Nova) — Read spiritual articles, discourses, and insights on Vishnu Sahasraname, Bhagwat Geeta, meditation & more.",
    canonical: "/articles",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GyandootNova", item: "https://gyandootnova.in/" },
          { "@type": "ListItem", position: 2, name: "Articles", item: "https://gyandootnova.in/articles" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Spiritual Articles & Insights",
        url: "https://gyandootnova.in/articles",
        description:
          "A curated collection of spiritual articles, discourses and reflections on Bhagavad Gita, Vedas, Upanishads, meditation and Sanatan wisdom.",
        inLanguage: ["hi-IN", "en"],
        isPartOf: { "@type": "WebSite", name: "GyandootNova", url: "https://gyandootnova.in" },
        publisher: {
          "@type": "Organization",
          name: "GyandootNova",
          url: "https://gyandootnova.in",
          logo: "https://gyandootnova.in/gyandoot-nova-icon.ico",
        },
      },
    ],
  });



  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("is_published", true).eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!posts) return [];
    if (!search.trim()) return posts;
    const q = search.trim().toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? "").toLowerCase().includes(q) ||
        p.post_type.toLowerCase().includes(q)
    );
  }, [posts, search]);

  return (
    <Layout>
      {/* Editorial hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/10 via-background to-background" />
        <div className="container py-20 md:py-28 lg:py-32">
          <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <ol className="flex flex-wrap items-center justify-center gap-2">
              <li><Link to="/" className="hover:text-primary transition-colors">GyandootNova</Link></li>
              <li aria-hidden="true" className="opacity-60">/</li>
              <li aria-current="page" className="text-foreground/70">Journal</li>
            </ol>
          </nav>
          <div className="mt-6 max-w-3xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.15] tracking-tight">
              Reflections, readings & quiet insight
            </h1>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-[1.8]">
              A slow journal of essays and discourses — thoughts we return to, drawn from the books
              and traditions that shape GyandootNova.
            </p>
            <div className="mt-10 relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the journal…"
                className="pl-11 h-12 rounded-full border-border/70 bg-card/70 backdrop-blur"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-8 md:gap-10 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">

              {filtered.map((post) => (
                <Link key={post.id} to={`/articles/${post.slug}`} className="group block">
                  <article className="h-full rounded-2xl overflow-hidden bg-card border border-border/70 shadow-card transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lift">
                    {post.cover_url && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                      </div>
                    )}
                    <div className="p-7 md:p-8">
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">{post.post_type}</span>
                      <h2 className="mt-3 font-serif text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p
                          className="mt-4 text-[15px] text-muted-foreground line-clamp-3 leading-[1.8]"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.excerpt) }}
                        />
                      )}
                      <p className="mt-6 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}

            </div>
          ) : (
            <div className="py-20 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">{search ? "No articles found." : "No articles published yet."}</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Articles;
