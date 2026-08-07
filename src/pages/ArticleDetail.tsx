<<<<<<< HEAD
import DOMPurify from "dompurify";
import { useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
=======
import { useParams, Link } from "react-router-dom";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";
import Layout from "@/components/layout/Layout";
<<<<<<< HEAD
import { Loader2, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { ContinueReadingInvite } from "@/components/BrandExperience";


// Hindi + English stopwords to strip when building keyword set
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","with","is","are","was","were","be","by","at","from","as","that","this","it","its","how","what","why","who","when","where","which",
  "ka","ke","ki","ko","se","me","mein","hai","hain","tha","the","aur","ya","par","bhi","kya","kaise","kyun","kaun","kab","kahan","ek","do","yeh","ye","vo","wo",
]);

function extractKeywords(post: { title?: string; meta_title?: string; excerpt?: string } | null | undefined): string[] {
  if (!post) return [];
  const text = `${post.meta_title ?? ""} ${post.title ?? ""} ${(post.excerpt ?? "").replace(/<[^>]*>/g, "")}`;
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  // Dedupe preserving order, keep top 6 by frequency
  const freq = new Map<string, number>();
  tokens.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);
}

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
=======
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
<<<<<<< HEAD
      const requestedSlug = slug;
      if (!requestedSlug) return null;

      const safeDecode = (value: string) => {
        try {
          return decodeURIComponent(value);
        } catch {
          return value;
        }
      };

      const normalize = (value: string) =>
        value
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\p{L}\p{N}]+/gu, "")
          .trim();

      const toStoredSlugShape = (value: string) =>
        value
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      const decoded = safeDecode(requestedSlug);

      // 1) Exact + canonical slug match. React Router normally decodes params,
      //    but keep both shapes to support encoded legacy URLs and copied links.
      const storedShape = toStoredSlugShape(decoded);
      const exactSlugs = Array.from(new Set([requestedSlug, decoded, storedShape].filter(Boolean)));
      for (const candidateSlug of exactSlugs) {
        const exact = await supabase
          .from("posts")
          .select("*")
          .eq("slug", candidateSlug)
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .maybeSingle();
        if (exact.data) return exact.data;
      }

      // 2) Legacy fallback for old indexed/shared URLs with spaces or punctuation.
      //    Compare normalized forms on both sides so stored hyphenated slugs like
      //    "the-bhagavad-gita-summary" match legacy paths like
      //    "the bhagavad gita summary". Prefix filters are only a fast path; if
      //    they do not produce one unique normalized match, fetch all approved
      //    post slugs and run the same comparison safely.
      const target = normalize(decoded);
      if (target.length < 3) return null;

      type CandidatePost = { id: string; slug: string };

      const addCandidates = (candidateMap: Map<string, CandidatePost>, candidates: CandidatePost[] | null) => {
        (candidates ?? []).forEach((candidate) => candidateMap.set(candidate.id, candidate));
      };

      const findMatches = (candidates: CandidatePost[]) => {
        const exactMatches = candidates.filter((candidate) => normalize(candidate.slug) === target);
        if (exactMatches.length > 0) return exactMatches;
        return candidates.filter((candidate) => {
          const candidateSlug = normalize(candidate.slug);
          return candidateSlug.startsWith(target) || target.startsWith(candidateSlug);
        });
      };

      const loadAllApprovedCandidates = async () => {
        const { data } = await supabase
          .from("posts")
          .select("id, slug")
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .limit(5000);
        return data ?? [];
      };

      const prefixes = Array.from(new Set([
        storedShape.slice(0, 8),
        storedShape.split("-").filter(Boolean)[0],
      ].filter((prefix) => prefix.length >= 3)));

      const candidateMap = new Map<string, CandidatePost>();
      const candidateResults = await Promise.all(
        prefixes.map((prefix) =>
          supabase
            .from("posts")
            .select("id, slug")
            .eq("is_published", true)
            .eq("approval_status", "approved")
            .ilike("slug", `${prefix}%`)
            .limit(100)
        )
      );
      candidateResults.forEach(({ data }) => addCandidates(candidateMap, data));

      let matches = findMatches([...candidateMap.values()]);

      // If the prefix fast path was empty, too broad, or missed the specific
      // article because of query limits, restore the previous safe behavior:
      // compare every approved post's normalized slug on the client.
      if (matches.length !== 1) {
        matches = findMatches(await loadAllApprovedCandidates());
      }

      if (matches.length !== 1) return null;

      const { data: full } = await supabase
        .from("posts")
        .select("*")
        .eq("id", matches[0].id)
        .eq("is_published", true)
        .eq("approval_status", "approved")
        .maybeSingle();
      return full ?? null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5m
    gcTime: 30 * 60 * 1000,
  });

  const keywords = useMemo(() => extractKeywords(post), [post]);

  useEffect(() => {
    if (!slug || !post?.slug) return;
    if (slug !== post.slug) {
      navigate(`/articles/${post.slug}`, { replace: true });
    }
  }, [navigate, post?.slug, slug]);

  // Prev / Next Navigation
  const { data: navPosts } = useQuery({
    queryKey: ["post-nav", post?.id],
    queryFn: async () => {
      if (!post) return { older: null, newer: null };
      const createdAt = post.created_at;
      const [olderRes, newerRes] = await Promise.all([
        supabase.from("posts").select("title, slug").eq("is_published", true).eq("approval_status", "approved").lt("created_at", createdAt).order("created_at", { ascending: false }).limit(1),
        supabase.from("posts").select("title, slug").eq("is_published", true).eq("approval_status", "approved").gt("created_at", createdAt).order("created_at", { ascending: true }).limit(1),
      ]);
      return { older: olderRes.data?.[0] ?? null, newer: newerRes.data?.[0] ?? null };
    },
    enabled: !!post,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Related posts — keyword-matching first, category fallback. Aggressively cached.
  const { data: relatedPosts } = useQuery({
    queryKey: ["post-related-v2", post?.id, keywords.join("|")],
    queryFn: async () => {
      if (!post) return [];
      const results = new Map<string, { title: string; slug: string; cover_url: string | null; excerpt: string | null; score: number }>();

      // 1) Keyword ilike OR match across title + excerpt (limited to 12 candidates)
      if (keywords.length) {
        const orExpr = keywords
          .flatMap((k) => [`title.ilike.%${k}%`, `excerpt.ilike.%${k}%`])
          .join(",");
        const { data } = await supabase
          .from("posts")
          .select("id, title, slug, cover_url, excerpt, post_type")
          .eq("is_published", true).eq("approval_status", "approved")
          .neq("id", post.id)
          .or(orExpr)
          .limit(12);
        (data ?? []).forEach((r) => {
          const hay = `${r.title} ${r.excerpt ?? ""}`.toLowerCase();
          const score = keywords.reduce((s, k) => (hay.includes(k) ? s + 1 : s), 0)
            + (r.post_type === post.post_type ? 0.5 : 0);
          results.set(r.id, { title: r.title, slug: r.slug, cover_url: r.cover_url, excerpt: r.excerpt, score });
        });
      }

      // 2) Category fallback to guarantee at least 4
      if (results.size < 4) {
        const { data } = await supabase
          .from("posts")
          .select("id, title, slug, cover_url, excerpt")
          .eq("is_published", true).eq("approval_status", "approved")
          .eq("post_type", post.post_type)
          .neq("id", post.id)
          .order("created_at", { ascending: false })
          .limit(8);
        (data ?? []).forEach((r) => {
          if (!results.has(r.id)) results.set(r.id, { title: r.title, slug: r.slug, cover_url: r.cover_url, excerpt: r.excerpt, score: 0.25 });
        });
      }

      return [...results.values()].sort((a, b) => b.score - a.score).slice(0, 4);
    },
    enabled: !!post,
    staleTime: 10 * 60 * 1000, // 10m — matches feel stable
    gcTime: 60 * 60 * 1000,
  });

  const rawDesc = (post?.meta_description || post?.excerpt?.replace(/<[^>]*>/g, "").trim() || "").slice(0, 155);
  const articleDesc = (rawDesc && rawDesc.length >= 20)
    ? rawDesc
    : (post ? `${post.title} — GyandootNova पर आध्यात्मिक लेख, विचार और ज्ञान पढ़ें।` : "Spiritual articles and insights at GyandootNova.");

  const breadcrumbJsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "GyandootNova", "item": "https://gyandootnova.in/" },
      { "@type": "ListItem", "position": 2, "name": "Articles", "item": "https://gyandootnova.in/articles" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://gyandootnova.in/articles/${post.slug}` },
    ],
  } : undefined;
=======
      const { data } = await supabase.from("posts").select("*").eq("slug", slug!).eq("is_published", true).single();
      return data;
    },
    enabled: !!slug,
  });

  // Fetch older and newer posts for navigation
  const { data: navPosts } = useQuery({
    queryKey: ["post-nav", post?.created_at],
    queryFn: async () => {
      const createdAt = post!.created_at;
      const [olderRes, newerRes] = await Promise.all([
        supabase
          .from("posts")
          .select("title, slug")
          .eq("is_published", true)
          .lt("created_at", createdAt)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("posts")
          .select("title, slug")
          .eq("is_published", true)
          .gt("created_at", createdAt)
          .order("created_at", { ascending: true })
          .limit(1),
      ]);
      return {
        older: olderRes.data?.[0] ?? null,
        newer: newerRes.data?.[0] ?? null,
      };
    },
    enabled: !!post,
  });

  const articleDesc = post?.meta_description || post?.excerpt?.replace(/<[^>]*>/g, "").slice(0, 155) || (post ? `Read ${post.title} on GyandootNova.` : "Spiritual articles and insights at GyandootNova.");
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  const articleJsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": articleDesc,
    "url": `https://gyandootnova.in/articles/${post.slug}`,
<<<<<<< HEAD
    "mainEntityOfPage": { "@type": "WebPage", "@id": `https://gyandootnova.in/articles/${post.slug}` },
    "datePublished": post.created_at,
    "dateModified": post.updated_at,
    "inLanguage": "hi-IN",
    ...(post.cover_url && { "image": post.cover_url }),
    "author": { "@type": "Organization", "name": "GyandootNova", "url": "https://gyandootnova.in" },
    "publisher": {
      "@type": "Organization", "name": "GyandootNova", "url": "https://gyandootnova.in",
      "logo": { "@type": "ImageObject", "url": "https://gyandootnova.in/favicon.ico" },
    },
  } : undefined;

  const faqJsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `${post.title} किस बारे में है?`,
        "acceptedAnswer": { "@type": "Answer", "text": (post.excerpt || articleDesc).slice(0, 500) },
      },
      {
        "@type": "Question",
        "name": "क्या यह लेख निःशुल्क है?",
        "acceptedAnswer": { "@type": "Answer", "text": "हाँ, GyandootNova पर सभी आध्यात्मिक लेख निःशुल्क पढ़ सकते हैं।" },
      },
      {
        "@type": "Question",
        "name": "और आध्यात्मिक लेख कहाँ मिलेंगे?",
        "acceptedAnswer": { "@type": "Answer", "text": "हमारे Articles सेक्शन में वेद, उपनिषद, गीता और आधुनिक आध्यात्मिक विषयों पर सैकड़ों लेख उपलब्ध हैं।" },
      },
      {
        "@type": "Question",
        "name": "क्या मैं इस लेख को साझा कर सकता हूँ?",
        "acceptedAnswer": { "@type": "Answer", "text": "बिल्कुल — WhatsApp, Facebook, X या LinkedIn पर share बटन से आप इसे तुरंत साझा कर सकते हैं।" },
      },
    ],
  } : undefined;

=======
    "datePublished": post.created_at,
    "dateModified": post.updated_at,
    ...(post.cover_url && { "image": post.cover_url }),
    "publisher": {
      "@type": "Organization",
      "name": "GyandootNova",
      "url": "https://gyandootnova.in",
    },
  } : undefined;

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  useSEO({
    title: post ? (post.meta_title || post.title) : "Loading Article... | GyandootNova",
    description: articleDesc,
    canonical: post ? `/articles/${post.slug}` : undefined,
    ogImage: post?.cover_url ?? undefined,
    ogType: "article",
<<<<<<< HEAD
    jsonLd: post ? [articleJsonLd, breadcrumbJsonLd, faqJsonLd] : undefined,
=======
    jsonLd: articleJsonLd,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  });

  if (isLoading) {
    return <Layout><div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!post) {
    return <Layout><div className="py-32 text-center text-muted-foreground">Article not found.</div></Layout>;
  }

  return (
    <Layout>
      <article className="py-12">
        <div className="container max-w-3xl">
<<<<<<< HEAD
          {/* Breadcrumb — SEO-friendly navigation */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                  <Home className="h-3.5 w-3.5" /> GyandootNova
                </Link>

              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link to="/articles" className="hover:text-primary transition-colors">Articles</Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="text-foreground line-clamp-1" aria-current="page">{post.title}</li>
            </ol>
          </nav>

          <span className="text-xs font-medium uppercase tracking-wider text-primary">{post.post_type}</span>
          <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl notranslate" translate="no">{post.title}</h1>
=======
          <span className="text-xs font-medium uppercase tracking-wider text-primary">{post.post_type}</span>
          <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">{post.title}</h1>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          <p className="mt-2 text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          {post.cover_url && (
            <div className="mt-6 aspect-video overflow-hidden rounded-lg">
              <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover" />
            </div>
          )}
          <div
<<<<<<< HEAD
            className="prose prose-lg mt-8 max-w-none leading-relaxed notranslate"
            translate="no"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content ?? "") }}
          />

          {navPosts && (navPosts.older || navPosts.newer) && (
            <nav className="mt-12 border-t border-border pt-8 grid grid-cols-2 gap-4">
              {navPosts.older ? (
                <Link to={`/articles/${navPosts.older.slug}`} className="group flex items-start gap-2 text-left">
                  <ChevronLeft className="mt-1 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previous</span>
                    <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{navPosts.older.title}</p>
                  </div>
                </Link>
              ) : <div />}
              {navPosts.newer ? (
                <Link to={`/articles/${navPosts.newer.slug}`} className="group flex items-start gap-2 text-right justify-end">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next</span>
                    <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{navPosts.newer.title}</p>
=======
            className="prose prose-lg mt-8 max-w-none leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          />

          {/* Prev / Next Navigation */}
          {navPosts && (navPosts.older || navPosts.newer) && (
            <nav className="mt-12 border-t border-border pt-8 grid grid-cols-2 gap-4">
              {navPosts.older ? (
                <Link
                  to={`/articles/${navPosts.older.slug}`}
                  className="group flex items-start gap-2 text-left"
                >
                  <ChevronLeft className="mt-1 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previous</span>
                    <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {navPosts.older.title}
                    </p>
                  </div>
                </Link>
              ) : <div />}

              {navPosts.newer ? (
                <Link
                  to={`/articles/${navPosts.newer.slug}`}
                  className="group flex items-start gap-2 text-right justify-end"
                >
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next</span>
                    <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {navPosts.newer.title}
                    </p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ) : <div />}
            </nav>
          )}
<<<<<<< HEAD

          {relatedPosts && relatedPosts.length > 0 && (
            <section className="mt-16 border-t border-border pt-10">
              <h2 className="font-serif text-2xl font-bold">Related Articles</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {relatedPosts.map((rp) => (
                  <Link key={rp.slug} to={`/articles/${rp.slug}`} className="group flex gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary">
                    {rp.cover_url && (
                      <img src={rp.cover_url} alt={rp.title} loading="lazy" width={80} height={80} className="h-20 w-20 shrink-0 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h3>
                      {rp.excerpt && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {rp.excerpt.replace(/<[^>]*>/g, "").slice(0, 120)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl font-bold">Explore More on GyandootNova</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 text-sm">
              <div>
                <h3 className="font-semibold text-foreground">Sacred Texts</h3>
                <ul className="mt-2 space-y-1.5">
                  <li><Link to="/texts/bhagavad-gita" className="text-muted-foreground hover:text-primary">Bhagavad Gita — full guide</Link></li>
                  <li><Link to="/texts/vedas" className="text-muted-foreground hover:text-primary">The four Vedas</Link></li>
                  <li><Link to="/texts/rig-veda" className="text-muted-foreground hover:text-primary">Rig Veda</Link></li>
                  <li><Link to="/texts/upanishads" className="text-muted-foreground hover:text-primary">Upanishads</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Popular Questions</h3>
                <ul className="mt-2 space-y-1.5">
                  <li><Link to="/qa/who-wrote-bhagavad-gita" className="text-muted-foreground hover:text-primary">Who wrote the Bhagavad Gita?</Link></li>
                  <li><Link to="/qa/how-many-slokas-in-bhagavad-gita" className="text-muted-foreground hover:text-primary">How many slokas in the Gita?</Link></li>
                  <li><Link to="/qa/how-many-vedas" className="text-muted-foreground hover:text-primary">How many Vedas are there?</Link></li>
                  <li><Link to="/qa/how-many-upanishads" className="text-muted-foreground hover:text-primary">How many Upanishads?</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Practice & Reading</h3>
                <ul className="mt-2 space-y-1.5">
                  <li><Link to="/how-to-read/bhagavad-gita" className="text-muted-foreground hover:text-primary">How to read the Bhagavad Gita</Link></li>
                  <li><Link to="/hindi/dhyan-kaise-karein" className="text-muted-foreground hover:text-primary">ध्यान कैसे करें</Link></li>
                  <li><Link to="/meditation/for-stress" className="text-muted-foreground hover:text-primary">Meditation for stress</Link></li>
                  <li><Link to="/books" className="text-muted-foreground hover:text-primary">Browse all books</Link></li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Return to <Link to="/" className="font-semibold text-primary hover:underline">GyandootNova</Link> — the home of Hindi spiritual texts, discourses, and sacred readings.
            </p>
          </section>
        </div>
      </article>
      <ContinueReadingInvite />
    </Layout>

=======
        </div>
      </article>
    </Layout>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  );
};

export default ArticleDetail;
