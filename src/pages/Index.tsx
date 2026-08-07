<<<<<<< HEAD
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
=======
import { Link } from "react-router-dom";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Heart,
  FileText,
  Sparkles,
  Users,
  Globe,
  BookMarked,
  Quote,
  ArrowRight,
  TrendingUp,
<<<<<<< HEAD
  ShieldCheck,
  Infinity as InfinityIcon,
  RefreshCw,
  Lock,
  CheckCircle2,
  Star,
  XCircle,
  Smartphone,
  HardDrive,
  FileWarning,
  Unlock,
  Ban,
  Cloud,
  Gift,
  Landmark,
  ScrollText,
  Flame,
  Music2,
  Feather,
  Baby,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Bookmark,
  GraduationCap,
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
<<<<<<< HEAD
import { lazy, Suspense, useEffect, useRef, useState } from "react";

// Eager (above-the-fold) — BrandPurpose renders the very first section after the hero.
import { BrandPurpose } from "@/components/BrandSoul";

// Below-the-fold: lazy-loaded so they don't inflate the initial mobile bundle.
// Each is code-split into its own chunk and mounted only when React reaches
// that point in the tree (browser has already painted the hero by then).
const LiveReaderStrip = lazy(() => import("@/components/LiveReaderStrip"));
const RecentPurchasesToast = lazy(() => import("@/components/RecentPurchasesToast"));
const ContinueReadingSection = lazy(() => import("@/components/ContinueReadingSection"));
const CompareSection = lazy(() => import("@/components/CompareSection"));
const GuaranteeSection = lazy(() => import("@/components/GuaranteeSection"));
const FaqStrip = lazy(() => import("@/components/FaqStrip"));
const NewsletterCta = lazy(() => import("@/components/NewsletterCta"));
const WhyWeExist = lazy(() => import("@/components/BrandExperience").then(m => ({ default: m.WhyWeExist })));
const ReaderJourney = lazy(() => import("@/components/BrandExperience").then(m => ({ default: m.ReaderJourney })));
const TrustPillars = lazy(() => import("@/components/BrandExperience").then(m => ({ default: m.TrustPillars })));
const EmotionalConnection = lazy(() => import("@/components/BrandSoul").then(m => ({ default: m.EmotionalConnection })));
const CalmFeeling = lazy(() => import("@/components/BrandSoul").then(m => ({ default: m.CalmFeeling })));

// Idle-mounted wrapper: only renders children after the browser is idle
// (or 2s later as a fallback). Keeps the initial paint clean on mobile.
const IdleMount = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as any;
    if ("requestIdleCallback" in w) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
};

// Section fallback: a fixed-height placeholder so lazy sections don't cause CLS.
const SectionSkeleton = ({ h = "10rem" }: { h?: string }) => (
  <div aria-hidden style={{ minHeight: h }} className="w-full" />
);


/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  // Start at the real target so the number is ALWAYS visible, even if the
  // IntersectionObserver never fires (short viewports, prerender, JS delay).
  // The count-up animation is a progressive enhancement.
  const [count, setCount] = useState(target);
=======
import { useEffect, useRef, useState } from "react";

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
<<<<<<< HEAD
    const startAnimation = () => {
      if (started.current) return;
      started.current = true;
      let current = 0;
      setCount(0);
      const step = Math.max(1, Math.ceil(target / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setCount(current);
      }, 30);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startAnimation();
      },
      { threshold: 0.25 },
    );
    if (ref.current) observer.observe(ref.current);
    const fallback = window.setTimeout(() => {
      if (!started.current) setCount(target);
    }, 2000);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [target]);

  return (
    <div ref={ref} translate="no" className="font-serif text-4xl font-bold text-secondary md:text-5xl">
=======
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let current = 0;
          const step = Math.ceil(target / 40);
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            setCount(current);
          }, 30);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-serif text-4xl font-bold text-secondary md:text-5xl">
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      {count.toLocaleString()}
      {suffix}
    </div>
  );
};

/* ─── Main Page ─── */
const Index = () => {
<<<<<<< HEAD
  const { user, loading: authLoading } = useAuth();
  const shouldRedirect = !authLoading && !!user;
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const { data: featuredBooks } = useQuery({
    queryKey: ["featured-books"],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, slug, author, cover_url, price, is_free")
        .eq("is_featured", true)
<<<<<<< HEAD
        .limit(5);
=======
        .limit(4);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      return data ?? [];
    },
  });

  const { data: latestPosts } = useQuery({
    queryKey: ["latest-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, cover_url, post_type, created_at")
<<<<<<< HEAD
        .eq("is_published", true).eq("approval_status", "approved")
=======
        .eq("is_published", true)
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

<<<<<<< HEAD
  // Read social profile URLs from the same settings table the footer uses so
  // the Organization `sameAs` array reflects the site's real, live profiles.
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-brand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["facebook_url", "instagram_url", "linkedin_url", "youtube_url", "whatsapp_number"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = (r.value ?? "").trim(); });
      return map;
    },
  });

  const toAbsoluteUrl = (raw?: string | null): string | null => {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return `https://${trimmed.replace(/^\/+/, "")}`;
  };

  const sameAs = [
    toAbsoluteUrl(siteSettings?.facebook_url),
    toAbsoluteUrl(siteSettings?.instagram_url),
    toAbsoluteUrl(siteSettings?.linkedin_url),
    toAbsoluteUrl(siteSettings?.youtube_url),
    siteSettings?.whatsapp_number
      ? `https://wa.me/${siteSettings.whatsapp_number.replace(/\s+/g, "").replace(/^\+/, "")}`
      : null,
  ].filter((u): u is string => !!u && /^https?:\/\//.test(u));

  const brandDescription =
    "GyandootNova (also known as Gyandoot Nova or Gyandoot) is an online Hindi platform for reading sacred Hindu texts — Bhagavad Gita, Vedas, Upanishads, Ramayana, Hanuman Chalisa and Vishnu Sahasranama — with a free, distraction-free reader.";

  useSEO({
    title: "GyandootNova — Bhagavad Gita, Vedas & Ramayana Online",
    description:
      "Read the Bhagavad Gita, Vedas, Upanishads, Ramayana and Hanuman Chalisa in clear, modern English on GyandootNova — a trusted spiritual publisher with a free online reader.",
    canonical: "/",
    ogImage: "https://gyandootnova.in/og-image.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://gyandootnova.in/#website",
          "url": "https://gyandootnova.in/",
          "name": "GyandootNova",
          "alternateName": ["Gyandoot Nova", "Gyandoot", "Gyan Doot", "gyandootnova.in"],
          "inLanguage": "hi-IN",
          "description": brandDescription,
          "publisher": { "@id": "https://gyandootnova.in/#organization" },
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://gyandootnova.in/books?search={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Organization",
          "@id": "https://gyandootnova.in/#organization",
          "name": "GyandootNova",
          "alternateName": ["Gyandoot Nova", "Gyandoot", "Gyan Doot"],
          "url": "https://gyandootnova.in/",
          "logo": {
            "@type": "ImageObject",
            "url": "https://gyandootnova.in/gyandoot-nova-icon.ico",
          },
          "description": brandDescription,
          ...(sameAs.length > 0 ? { sameAs } : {}),
        },
        ...((featuredBooks ?? []).length > 0
          ? [{
              "@type": "ItemList",
              "name": "Featured Dharmik Granth",
              "itemListElement": (featuredBooks ?? []).map((b, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "url": `https://gyandootnova.in/books/${b.slug}`,
                "name": b.title,
              })),
            }]
          : []),
      ],
    },
  });



  if (shouldRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      {/* Idle-only widgets — don't block the hero on mobile. */}
      <IdleMount><LiveReaderStrip /></IdleMount>
      <IdleMount><RecentPurchasesToast /></IdleMount>
      <Suspense fallback={<SectionSkeleton h="4rem" />}>
        <ContinueReadingSection />
      </Suspense>
      <BrandPurpose />
      <Suspense fallback={<SectionSkeleton h="18rem" />}>
        <WhyWeExist />
        <EmotionalConnection />
        <ReaderJourney />
        <TrustPillars />
        <CalmFeeling />
      </Suspense>
      {/* ─── 1. HERO — calm publishing-house entrance ─── */}

      <section className="relative overflow-hidden bg-primary py-20 md:py-28 lg:py-32">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, hsl(45 97% 58%) 0%, transparent 55%), radial-gradient(circle at 85% 80%, hsl(0 60% 55%) 0%, transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-primary/40"
        />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-secondary mb-8">
              <Star className="h-3 w-3 fill-secondary" />
              A quiet home for sacred reading
            </div>
            <h1 style={{ fontFamily: "'Noto Serif', 'Noto Serif Devanagari', Georgia, serif" }} className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.15] tracking-tight text-primary-foreground">
              Timeless Indian scriptures,
              <br className="hidden md:block" />
              gathered in one <span className="text-secondary italic font-normal">unhurried</span> library.
            </h1>
            <p style={{ fontFamily: "'Noto Serif', 'Noto Serif Devanagari', Georgia, serif" }} className="mx-auto mt-8 max-w-2xl text-lg md:text-xl lg:text-2xl leading-[1.85] text-primary-foreground/85">
              Bhagavad Gita, the Vedas, Upanishads, Ramayana, Hanuman Chalisa and Vishnu Sahasranama —
              carefully translated into clear Hindi and English, and offered in a reader made for
              slow, thoughtful discovery.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 shadow-lg rounded-full px-8 text-base"
                asChild
              >
                <Link to="/books?filter=free">
                  <BookOpen className="mr-2 h-4 w-4" /> Begin reading — free
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 rounded-full px-8"
                asChild
              >
                <Link to="/our-story">Discover our story</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-primary-foreground/70">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-secondary/80" /> Private &amp; secure</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-secondary/80" /> 7-day refund</span>
              <span className="inline-flex items-center gap-1.5"><InfinityIcon className="h-3.5 w-3.5 text-secondary/80" /> Lifetime access</span>
              <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 text-secondary/80" /> Free future editions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 1.05 CATEGORY-WISE BROWSING (Hindi-first, crawlable in SSR) ─── */}
      <section aria-labelledby="granth-categories" className="bg-background py-16 md:py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Browse by Topic
            </span>
            <h2 id="granth-categories" className="mt-3 font-serif text-3xl font-bold md:text-4xl">
              Scriptures by <span className="text-primary">Category</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              50+ sacred texts — Vedas, Upanishads, epics, devotion and stotras, all in one library.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ScrollText,
                title: "Vedas & Upanishads",
                subtitle: "Vedic Texts",
                desc: "English translations of the Rigveda, Yajurveda, Samaveda, Atharvaveda and the major Upanishads.",
                to: "/books?category=adhyatm",
              },
              {
                icon: Landmark,
                title: "Itihasa · Epics",
                subtitle: "Ramayana & Mahabharata",
                desc: "Ramayana, Mahabharata, Sundarkand — the original stories in clear, modern English.",
                to: "/books?category=katha",
              },
              {
                icon: Heart,
                title: "The Path of Devotion",
                subtitle: "Bhagavad Gita & Commentaries",
                desc: "The Srimad Bhagavad Gita with plain-language commentary — for everyday life.",
                to: "/books?category=devta",
              },
              {
                icon: Music2,
                title: "Stotras & Mantras",
                subtitle: "Stotra & Mantra Sangrah",
                desc: "Vishnu Sahasranama, Hanuman Chalisa, aartis and mantras for daily practice.",
                to: "/books?category=devi",
              },
              {
                icon: Flame,
                title: "Puranas & Stories",
                subtitle: "Puranas & Devotional Stories",
                desc: "Srimad Bhagavatam, Vishnu Purana and stories rich with devotion.",
                to: "/books?category=puran",
              },
              {
                icon: Feather,
                title: "Yoga & Sadhana",
                subtitle: "Yoga & Sadhna Guides",
                desc: "Guidance on meditation, pranayama and spiritual practice.",
                to: "/books?category=other",
              },
            ].map((cat) => (
              <Link key={cat.title} to={cat.to} className="group block">
                <Card className="h-full border-border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-primary/10 p-3 shrink-0">
                      <cat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs font-medium uppercase tracking-wider text-secondary mt-0.5">
                        {cat.subtitle}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{cat.desc}</p>
                      <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary">
                        Start reading <ArrowRight className="ml-1 h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
=======
  useSEO({
    title: "Dharmik Granth Online — Geeta, Ramayana | GyandootNova",
    description:
      "Dharmik granth online padhein — Vishnu Sahasraname, Bhagwat Geeta, Ramayana, Hanuman Chalisa aur anek spiritual books Hindi mein. GyandootNova par padhein.",
    canonical: "/",
    ogImage: "https://gyandootnova.in/og-image.png",
  });

  return (
    <Layout>
      {/* ─── 1. HERO ─── */}
      <section className="relative overflow-hidden bg-primary py-14 md:py-20">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 40%, hsl(45 97% 58%) 0%, transparent 50%), radial-gradient(circle at 80% 60%, hsl(0 82% 60%) 0%, transparent 50%)",
          }}
        />
        <div className="container relative text-center">
          <h1 className="font-serif text-4xl font-extrabold leading-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Authentic <span className="text-secondary">Dharmik Granth</span> — Vishnu Sahasraname, Geeta, Ramayana
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
            Buy and read spiritual books online — Vishnu Sahasraname, Bhagwat Geeta, Ramayana, Hanuman Chalisa & more.
            India's trusted platform for sacred literature.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary-foreground text-primary font-semibold hover:bg-primary-foreground/90 shadow-lg px-8"
              asChild
            >
              <Link to="/books">
                <BookOpen className="mr-2 h-5 w-5" /> Explore Books
              </Link>
            </Button>
            <Button
              size="lg"
              className="bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 shadow-lg px-8"
              asChild
            >
              <Link to="/support-us">
                <Heart className="mr-2 h-5 w-5" /> Support Us
              </Link>
            </Button>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </div>
        </div>
      </section>

<<<<<<< HEAD

      {/* Brand entity confirmation — plain, crawlable text stating that
          "GyandootNova", "Gyandoot Nova" and "Gyandoot" all refer to the
          same site. Prerender captures this into the raw HTML. */}
      <section aria-labelledby="about-brand" className="border-b border-border bg-background py-10">
        <div className="container max-w-3xl text-center">
          <h2 id="about-brand" className="font-serif text-xl md:text-2xl font-semibold text-foreground">
            About <Link to="/" className="text-primary hover:underline">GyandootNova</Link>
          </h2>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-muted-foreground">
            <strong>GyandootNova</strong>, also known as <strong>Gyandoot Nova</strong> or <strong>Gyandoot</strong>,
            is an online Hindi platform for reading sacred Hindu texts — including the Bhagavad Gita,
            the four Vedas, the Upanishads, Ramayana, Hanuman Chalisa and Vishnu Sahasranama —
            with a free, distraction-free reader. Visit <Link to="/" className="underline">gyandootnova.in</Link> to
            browse the full library.
          </p>
        </div>
      </section>


      {/* ─── 1.1 TRUST SECTION (C.2) ─── */}
      <section className="border-b border-border bg-background py-10 md:py-14">
        <div className="container max-w-5xl text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold">
            Why <span className="text-primary">Thousands of Readers</span> Trust GyandootNova
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            Every scripture is translated from original Sanskrit into clear English and Hindi, curated by scholars. No hidden charges, no app downloads — read instantly in your browser.
          </p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Lock, label: "Safe & Secure Payments" },
              { icon: CheckCircle2, label: "Scholar-verified content" },
              { icon: BookOpen, label: "Read on any device" },
              { icon: ShieldCheck, label: "7-day refund guarantee" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm"
              >
                <b.icon className="h-6 w-6 text-primary" />
                <span className="text-xs md:text-sm font-semibold text-card-foreground leading-tight">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── 1.5. WHY NO DOWNLOAD — Objection → Trust ─── */}
      <section className="bg-muted/40 py-14">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Designed with care
            </span>
            <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold">
              Why we don't hand out PDFs? <span className="text-primary">For your peace of mind.</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">The old e-book headaches are a thing of the past.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
              <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> The old PDF world
              </h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                {[
                  { Icon: Smartphone, text: "Phone lost — your whole library gone with it" },
                  { Icon: HardDrive, text: "GBs fill up, new apps can't be installed" },
                  { Icon: FileWarning, text: "Text breaks, pages refuse to open" },
                  { Icon: Unlock, text: "Anyone can forward it on WhatsApp" },
                  { Icon: Ban, text: "Fixes and updates never reach you" },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-destructive/70 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 shadow-md">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> The GyandootNova way
              </h3>
              <ul className="space-y-2 text-sm text-foreground/90 font-medium">
                {[
                  { Icon: Lock, text: "One ID — your library on every device" },
                  { Icon: Cloud, text: "Zero bytes taken from your phone's memory" },
                  { Icon: BookOpen, text: "Always crisp, HD and easy to read" },
                  { Icon: ShieldCheck, text: "For your eyes only — nobody else's" },
                  { Icon: Gift, text: "Every author update reaches you, free" },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </section>


=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      {/* ─── 2. ABOUT ─── */}
      <section className="py-20">
        <div className="container">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-bold md:text-4xl">
<<<<<<< HEAD
                Where scriptures meet <span className="text-primary">curious minds</span>
              </h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-primary" />
              <p className="mt-6 text-muted-foreground leading-relaxed">
                GyandootNova is a small effort to bring the sacred texts once locked in
                grandmothers' cupboards back into your hands. We track down old manuscripts,
                work with Sanskrit scholars, and deliver them to you in language that
                actually reads well today.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Reading a scripture shouldn't feel like homework. Our reader is designed
                so a five-minute break is enough for a shloka and its meaning to land.
=======
                A Platform for <span className="text-primary">Spiritual Seekers</span>
              </h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-primary" />
              <p className="mt-6 text-muted-foreground leading-relaxed">
                We are dedicated to preserving and sharing timeless spiritual wisdom through carefully curated books,
                insightful articles, and transformative discourse programs. Our mission is to make sacred knowledge
                accessible to every seeker, everywhere.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                From ancient scriptures to contemporary spiritual thought, explore a growing library designed to guide
                you on your path to self-realization and inner peace.
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              </p>
              <Button
                variant="outline"
                className="mt-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                asChild
              >
                <Link to="/articles">
                  Read Our Articles <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
<<<<<<< HEAD
                { icon: BookMarked, label: "Ancient Scriptures", desc: "Original text, verified translations" },
                { icon: FileText, label: "Life-Sutra Articles", desc: "Today's questions, timeless answers" },
                { icon: Users, label: "Global Community", desc: "Readers from across the world" },
                { icon: Globe, label: "Anywhere You Are", desc: "Wherever there's internet, your library follows" },
=======
                { icon: BookMarked, label: "Sacred Books", desc: "Curated spiritual literature" },
                { icon: FileText, label: "Articles", desc: "Insights for daily life" },
                { icon: Users, label: "Community", desc: "Global seekers network" },
                { icon: Globe, label: "Accessible", desc: "Read anywhere, anytime" },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-card p-5 text-center transition-shadow hover:shadow-md"
                >
                  <item.icon className="mx-auto h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-serif font-semibold text-card-foreground">{item.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
<<<<<<< HEAD

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ─── 2.5 HAMARA UDDESHYA · Our Mission (3 pillars) ─── */}
      <section aria-labelledby="our-mission" className="bg-muted/30 py-20">
        <div className="container max-w-6xl">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary-foreground uppercase tracking-wider">
              Our Purpose
            </span>
            <h2 id="our-mission" className="mt-3 font-serif text-3xl font-bold md:text-4xl">
              Our Mission · <span className="text-primary">Three Commitments</span>
            </h2>
            <div className="mt-3 mx-auto h-1 w-16 rounded-full bg-secondary" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ScrollText,
                pillar: "Preservation",
                title: "Faithful preservation of ancient scriptures",
                desc: "Keeping the Sanskrit and English source texts in their pure form, under scholarly supervision, safeguarded in digital form.",
              },
              {
                icon: Globe,
                pillar: "Accessibility",
                title: "Scripture within reach of every reader",
                desc: "From a village to a distant city — wherever there is internet, every reader deserves access to authentic scriptures for free or at a minimal cost.",
              },
              {
                icon: Sparkles,
                pillar: "Modernity",
                title: "Ancient wisdom, today's technology",
                desc: "A clean reader, dark mode, bookmarks and notes — reading the ancient scriptures should feel as easy as reading a newspaper.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-7 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <p.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-secondary">{p.pillar}</span>
                <h3 className="mt-2 font-serif text-lg font-semibold text-card-foreground">{p.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUR REACH — honest, no fabricated global scale ─── */}
      <section aria-labelledby="our-reach" className="bg-background border-y border-border/60 py-16 md:py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Hamari Pahunch · Our Reach
            </p>
            <h2 id="our-reach" className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
              A growing readership across India and beyond
            </h2>
            <p className="mt-6 text-muted-foreground leading-[1.9]">
              We are not everywhere yet — and we don't pretend to be. But quietly, readers from a
              handful of countries have made GyandootNova a part of their daily reading.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto">
            {[
              { flag: "🇮🇳", name: "India", note: "Home base" },
              { flag: "🇺🇸", name: "United States", note: "Diaspora readers" },
              { flag: "🇬🇧", name: "United Kingdom", note: "Diaspora readers" },
              { flag: "🇨🇦", name: "Canada", note: "Diaspora readers" },
              { flag: "🇦🇺", name: "Australia", note: "Diaspora readers" },
            ].map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-border/70 bg-card px-5 py-6 text-center shadow-card"
              >
                <div className="text-2xl leading-none" aria-hidden>{c.flag}</div>
                <p className="mt-3 text-sm font-semibold text-foreground">{c.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {c.note}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-2xl mx-auto text-center text-xs text-muted-foreground">
            Countries listed are based on real reader traffic. We only add a country when we can
            honestly say readers are there.
          </p>
        </div>
      </section>

      {/* ─── 3. FEATURED BOOKS ─── */}

      <section className="bg-muted/40 py-20">

        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Readers' Favourites</h2>
            <p className="mt-2 text-muted-foreground">The most-read and most-loved editions in our library</p>

          </div>
          {featuredBooks && featuredBooks.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featuredBooks.map((book) => (
                <Link key={book.id} to={`/books/${book.slug}`} className="group">
                  <Card className="overflow-hidden border-border transition-all hover:shadow-xl hover:-translate-y-1 h-full flex flex-col relative">
                    <div className="absolute top-2 left-2 z-10">
                      {book.is_free ? (
                        <span className="inline-block rounded-md bg-green-600 text-white px-2 py-0.5 text-[10px] font-bold shadow">FREE</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-bold shadow"><Star className="h-2.5 w-2.5 fill-current" /> BESTSELLER</span>
                      )}
                    </div>
                    {!book.is_free && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-block rounded-md bg-primary/95 text-primary-foreground px-2 py-0.5 text-[10px] font-bold shadow">LIFETIME</span>
                      </div>
                    )}
                    <div className="aspect-[3/4] bg-gradient-to-br from-primary/90 via-primary to-primary/70 flex flex-col items-center justify-center overflow-hidden p-4 text-center relative">
                      {book.cover_url && /\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i.test(book.cover_url) ? (
                        <img
                          src={book.cover_url}
                          alt={`${book.title} cover`}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, hsl(var(--secondary)) 0%, transparent 55%)" }} />
                          <BookOpen className="h-8 w-8 text-secondary/90 relative" />
                          <div className="mt-3 h-px w-10 bg-secondary/60 relative" />
                          <p className="mt-3 font-serif text-sm font-semibold text-primary-foreground line-clamp-3 leading-snug relative">
                            {book.title}
                          </p>
                        </>
                      )}
                    </div>
                    <CardContent className="p-3 md:p-4 flex flex-col flex-1">
                      <h3 className="font-serif font-semibold text-[15px] leading-snug text-card-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[2.6rem]">
                        {book.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Star className="h-3 w-3 fill-secondary text-secondary" />
                        <span className="font-medium text-foreground">4.8</span>
                        <span>• Verified</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {book.is_free ? (
                          <span className="text-base font-bold text-green-700">₹0</span>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-primary">₹{book.price}</span>
                            <span className="text-[10px] text-muted-foreground line-through">₹{Math.round((book.price as number) * 2.5)}</span>
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-primary group-hover:underline">
                          {book.is_free ? "Read →" : "Buy Now →"}
                        </span>

                      </div>
=======
      {/* ─── 3. FEATURED BOOKS ─── */}
      <section className="bg-muted/40 py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Featured Books</h2>
            <p className="mt-2 text-muted-foreground">Handpicked spiritual literature for seekers</p>
          </div>
          {featuredBooks && featuredBooks.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredBooks.map((book) => (
                <Link key={book.id} to={`/books/${book.slug}`}>
                  <Card className="group overflow-hidden border-border transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-serif font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          book.is_free ? "bg-green-100 text-green-700" : "bg-secondary/20 text-secondary-foreground"
                        }`}
                      >
                        {book.is_free ? "Free" : `₹${book.price}`}
                      </span>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="mx-auto h-10 w-10 text-secondary" />
              <p className="mt-3 text-muted-foreground">Books coming soon. Stay tuned!</p>
            </div>
          )}
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              asChild
            >
              <Link to="/books">
<<<<<<< HEAD
                Browse the Full Library <ArrowRight className="ml-2 h-4 w-4" />

=======
                View All Books <ArrowRight className="ml-2 h-4 w-4" />
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              </Link>
            </Button>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ─── 3.5. COMPARE — printed vs PDF vs us ─── */}
      <Suspense fallback={<SectionSkeleton h="20rem" />}><CompareSection /></Suspense>

      {/* ─── 3.7 HAMARI SEVAYEN · Our Offerings ─── */}
      <section aria-labelledby="hamari-sevayen" className="bg-background py-20">
        <div className="container max-w-6xl">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Our Offerings
            </span>
            <h2 id="hamari-sevayen" className="mt-3 font-serif text-3xl font-bold md:text-4xl">
              What We <span className="text-primary">Offer</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              More than books — the full companionship of reading, understanding and going deeper.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Bookmark,
                title: "Premium Reader",
                sub: "A quiet, distraction-free reader",
                desc: "Dark mode, bookmarks, notes, and typography built for reading at night.",
                to: "/books",
              },
              {
                icon: MessageCircle,
                title: "Daily Shloka on WhatsApp",
                sub: "Daily Shlok",
                desc: "One shloka every morning, its meaning, and how it applies to today — delivered on WhatsApp.",
                to: "/contact",
              },
              {
                icon: FileText,
                title: "Articles & Discourses",
                sub: "Articles & Discourses",
                desc: "Scripture-grounded essays and selected discourses — simple answers to everyday questions.",
                to: "/articles",
              },
              {
                icon: GraduationCap,
                title: "Programs & Workshops",
                sub: "Programs & Workshops",
                desc: "Silent practice, scripture study, and self-awareness workshops.",
                to: "/articles",
              },
            ].map((s) => (
              <Link key={s.title} to={s.to} className="group block">
                <Card className="h-full border-border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-serif text-base font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mt-0.5">
                    {s.sub}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. PROGRAMS / DISCOURSES ─── */}

=======
      {/* ─── 4. PROGRAMS / DISCOURSES ─── */}
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      <section className="py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Programs & Discourses</h2>
<<<<<<< HEAD
            <p className="mt-2 text-muted-foreground">Beyond reading — a chance to listen and experience</p>
=======
            <p className="mt-2 text-muted-foreground">Transformative sessions for spiritual growth</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
<<<<<<< HEAD
                title: "Silence Retreat",
                desc: "Give a tired mind a few days of rest — breath, meditation and a simple practice for turning inward.",
                icon: Sparkles,
              },
              {
                title: "Shloka Discourse",
                desc: "Short sessions on chosen sutras from the Upanishads and the Gita — one verse, one direction for life.",
                icon: BookOpen,
              },
              {
                title: "Self-Awakening Workshop",
                desc: "How the scriptures help with everyday knots — conversation, practice and real experience.",
                icon: TrendingUp,
              },

=======
                title: "Meditation Retreats",
                desc: "Guided meditation programs to help you find inner stillness and clarity of mind.",
                icon: Sparkles,
              },
              {
                title: "Scripture Discourses",
                desc: "Deep dives into ancient spiritual texts, decoded for modern seekers.",
                icon: BookOpen,
              },
              {
                title: "Spiritual Workshops",
                desc: "Interactive sessions on mindfulness, self-awareness, and personal transformation.",
                icon: TrendingUp,
              },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            ].map((program) => (
              <Card
                key={program.title}
                className="group border-border p-6 transition-all hover:shadow-md hover:border-primary/30"
              >
                <program.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 font-serif text-lg font-semibold text-card-foreground">{program.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{program.desc}</p>
                <Link
                  to="/articles"
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
<<<<<<< HEAD
                  View details <ArrowRight className="ml-1 h-3 w-3" />
=======
                  Learn More <ArrowRight className="ml-1 h-3 w-3" />
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. BLOG / ARTICLES ─── */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <div className="mb-10 text-center">
<<<<<<< HEAD
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Fresh Thinking, New Articles</h2>
            <p className="mt-2 text-muted-foreground">Simple, scripture-rooted takes on everyday questions</p>

=======
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Latest Articles & Insights</h2>
            <p className="mt-2 text-muted-foreground">Wisdom for daily life from spiritual traditions</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </div>
          {latestPosts && latestPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {latestPosts.map((post) => (
                <Link key={post.id} to={`/articles/${post.slug}`}>
                  <article>
                    <Card className="group h-full border-border transition-all hover:shadow-lg hover:-translate-y-1">
<<<<<<< HEAD
                      {/* cover image intentionally removed */}
=======
                      {post.cover_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.cover_url}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                      <CardContent className="p-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {post.post_type}
                        </span>
                        <h3 className="mt-1.5 font-serif text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                        )}
                        <span className="mt-3 inline-flex items-center text-sm font-medium text-primary">
<<<<<<< HEAD
                          Read full article <ArrowRight className="ml-1 h-3 w-3" />

=======
                          Read More <ArrowRight className="ml-1 h-3 w-3" />
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                        </span>
                      </CardContent>
                    </Card>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
<<<<<<< HEAD
              <p className="mt-3 text-muted-foreground">New articles are on the way.</p>
=======
              <p className="mt-3 text-muted-foreground">Articles coming soon.</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            </div>
          )}
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              asChild
            >
              <Link to="/articles">
<<<<<<< HEAD
                See all articles <ArrowRight className="ml-2 h-4 w-4" />

=======
                View All Articles <ArrowRight className="ml-2 h-4 w-4" />
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 6. IMPACT / STATS ─── */}
      <section className="bg-primary py-16">
        <div className="container">
          <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
<<<<<<< HEAD
              { target: 500, suffix: "+", label: "Published titles" },
              { target: 10000, suffix: "+", label: "Readers joined" },
              { target: 200, suffix: "+", label: "Articles & sutras" },
              { target: 50, suffix: "+", label: "Discourse events" },

=======
              { target: 500, suffix: "+", label: "Books Published" },
              { target: 10000, suffix: "+", label: "Readers Worldwide" },
              { target: 200, suffix: "+", label: "Articles Written" },
              { target: 50, suffix: "+", label: "Programs Hosted" },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            ].map((stat) => (
              <div key={stat.label}>
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                <p className="mt-2 text-sm font-medium text-primary-foreground/90">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. TESTIMONIALS ─── */}
      <section className="py-20">
        <div className="container">
          <div className="mb-10 text-center">
<<<<<<< HEAD
            <span className="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary-foreground uppercase tracking-wider">
              Reader Voices
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
              Voices of <span className="text-primary">faith and trust</span> from our readers
            </h2>
            <p className="mt-2 text-muted-foreground">What our readers say about GyandootNova</p>
=======
            <h2 className="font-serif text-3xl font-bold md:text-4xl">What Readers Say</h2>
            <p className="mt-2 text-muted-foreground">Voices from our community of seekers</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
<<<<<<< HEAD
                quote: "One chapter of the Gita on my metro ride home — that's all I do, and the noise in my head is already half gone. Knowing the book is always with me is the best part.",
                name: "Anil Tiwari",
                role: "Software Engineer, Bengaluru",
                rating: 5,
              },
              {
                quote: "At first I worried — no download, how will this work? Then I logged in on my new phone and everything was exactly where I left it. Genuinely effortless.",
                name: "Seema Agarwal",
                role: "Teacher & Homemaker, Indore",
                rating: 5,
              },
              {
                quote: "My father struggled to read fine print. We enlarged the font, turned on night mode, and now he reads the Hanuman Chalisa for half an hour every evening. Thank you to this team.",
                name: "Gaurav Mishra",
                role: "Business Owner, Varanasi",
                rating: 5,
              },

            ].map((t) => (
              <Card key={t.name} className="border-border p-6 relative">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <Quote className="h-6 w-6 text-secondary/40" />
                <p className="mt-3 text-sm text-foreground/85 leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-serif font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified Reader
                  </span>

=======
                quote:
                  "These books have transformed my understanding of spirituality. Every page carries profound wisdom.",
                name: "Aarav S.",
                role: "Spiritual Seeker",
              },
              {
                quote:
                  "The articles are beautifully written and deeply insightful. A treasure trove for anyone on the spiritual path.",
                name: "Priya M.",
                role: "Daily Reader",
              },
              {
                quote:
                  "The meditation programs helped me find inner peace during the most challenging time of my life.",
                name: "Rajan K.",
                role: "Program Participant",
              },
            ].map((t) => (
              <Card key={t.name} className="border-border p-6">
                <Quote className="h-8 w-8 text-secondary" />
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="font-serif font-semibold text-card-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* ─── 7.4 SAMPARK · Prominent Contact Block (trust signal) ─── */}
      <section aria-labelledby="sampark" className="bg-primary/5 py-16">
        <div className="container max-w-5xl">
          <div className="rounded-2xl border border-primary/20 bg-card p-8 md:p-10 shadow-sm">
            <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
                  Get in touch
                </span>
                <h2 id="sampark" className="mt-3 font-serif text-2xl md:text-3xl font-bold text-card-foreground">
                  A question, suggestion, or a scripture request?
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  GyandootNova is a real, human team. Write to us on WhatsApp, phone, or email — you'll hear back the same day.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/contact">
                      <Mail className="mr-2 h-4 w-4" /> Send a message
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <a href="https://wa.me/919161533353" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <a
                  href="tel:+919161533353"
                  className="flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone / WhatsApp</p>
                    <p className="font-serif text-lg font-semibold text-card-foreground mt-0.5">+91 91615 33353</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Mon–Sat · 10 AM – 6 PM (IST)</p>
                  </div>
                </a>
                <a
                  href="mailto:amrendra8765@gmail.com"
                  className="flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                    <p className="font-serif text-base font-semibold text-card-foreground mt-0.5 break-all">
                      amrendra8765@gmail.com
                    </p>
                  </div>
                </a>
                <div className="flex items-start gap-4 rounded-xl border border-border p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Office</p>
                    <p className="font-serif text-base font-semibold text-card-foreground mt-0.5">
                      Bhagwan Khera, Unnao
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Uttar Pradesh 209863 · India</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7.5. GUARANTEE / TRUST ─── */}

      <Suspense fallback={<SectionSkeleton h="14rem" />}>
        <GuaranteeSection />
      </Suspense>

      {/* ─── 7.7. FAQ STRIP ─── */}
      <Suspense fallback={<SectionSkeleton h="18rem" />}><FaqStrip /></Suspense>

      {/* ─── 7.9. NEWSLETTER ─── */}
      <Suspense fallback={<SectionSkeleton h="12rem" />}><NewsletterCta /></Suspense>

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      {/* ─── 8. SEO CONTENT — KEYWORD-RICH ─── */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <h2 className="font-serif text-3xl font-bold md:text-4xl text-center">
            Dharmik Granth Online — Buy Spiritual Books at GyandootNova
          </h2>
          <div className="mt-3 mx-auto h-1 w-16 rounded-full bg-primary" />
          <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
            <p>
              GyandootNova is India's trusted online platform for{" "}
              <strong className="text-foreground">dharmik granth</strong>, sacred spiritual books, and religious
              literature. Whether you are looking for a{" "}
              <strong className="text-foreground">Vishnu Sahasraname book</strong> with meaning in Hindi and English,
              the complete <strong className="text-foreground">Bhagwat Geeta in Hindi</strong>, or the timeless{" "}
              <strong className="text-foreground">Ramayana book</strong> — we have an ever-growing library of authentic
              spiritual texts available to read online instantly.
            </p>
            <p>
              Our collection includes beloved titles such as{" "}
              <strong className="text-foreground">Hanuman Chalisa book</strong>,{" "}
              <strong className="text-foreground">Mahabharat in Hindi</strong>,{" "}
              <strong className="text-foreground">Sundarkand path book</strong>,{" "}
              <strong className="text-foreground">Vishnu Purana</strong>,{" "}
              <strong className="text-foreground">Shrimad Bhagwatam</strong>, and{" "}
              <strong className="text-foreground">Chalisa Sangrah</strong>. Every book is published with care,
              preserving the sanctity of the original Sanskrit shlokas while providing clear Hindi and English
              translations for modern readers.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-2">
              Why Choose GyandootNova for Spiritual Books?
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Read Online Instantly</strong> — No downloads required. Our
                distraction-free reader supports dark mode, font resizing, bookmarks, and reading progress tracking.
              </li>
              <li>
                <strong className="text-foreground">Authentic & Verified Content</strong> — Every text is carefully
                curated from trusted spiritual sources and ancient manuscripts.
              </li>
              <li>
                <strong className="text-foreground">Free & Premium Books</strong> — Many dharmik granth are completely
                free. Premium books start at just ₹99.
              </li>
              <li>
                <strong className="text-foreground">Secure Payments</strong> — Pay safely via Razorpay (India) or PayPal
                (international). UPI, cards, and net banking accepted.
              </li>
              <li>
                <strong className="text-foreground">Available Worldwide</strong> — Readers from India, USA, UK, Canada,
                Australia, and Japan access our books daily.
              </li>
            </ul>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-2">
              Popular Dharmik Books on GyandootNova
            </h3>
            <p>
              Our most-read books include the{" "}
              <strong className="text-foreground">Vishnu Sahasraname with meaning in English</strong> — a complete guide
              to the 1000 divine names of Lord Vishnu, the{" "}
              <strong className="text-foreground">Bhagavad Gita simplified</strong> for daily guidance, and the{" "}
              <strong className="text-foreground">Ramayana in Hindi</strong> narrating the divine journey of Shri Ram.
              We also feature <strong className="text-foreground">stotra sangrah</strong>,{" "}
              <strong className="text-foreground">aarti sangrah</strong>, and mantra collections for daily pooja.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-2">Spiritual Articles & Insights</h3>
            <p>
              Beyond books, GyandootNova publishes insightful articles on meditation techniques, the significance of{" "}
              <strong className="text-foreground">Sanskrit shlokas</strong>, guides to performing{" "}
              <strong className="text-foreground">Ramayana path at home</strong>, deep dives into Geeta's 18 chapters,
              and the spiritual meaning behind Hindu festivals. Our content helps seekers worldwide deepen their
              understanding of Sanatan Dharma.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-2">How to Buy Hindu Books Online</h3>
            <p>
              Buying <strong className="text-foreground">Hindu books online</strong> at GyandootNova is simple: browse
              our{" "}
              <Link to="/books" className="text-primary hover:underline font-medium">
                Books Library
              </Link>
              , select a title, and start reading — free books open instantly. For premium titles, complete a quick
              secure payment and the full book unlocks in your account forever. No subscription needed. Have questions?
              Visit our{" "}
              <Link to="/faq" className="text-primary hover:underline font-medium">
                FAQ
              </Link>{" "}
              or{" "}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Contact Us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ─── 9. SUPPORT US CTA ─── */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl bg-primary p-10 text-center md:p-16 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle at 70% 30%, hsl(45 97% 58%) 0%, transparent 50%)",
              }}
            />
            <div className="relative">
              <Heart className="mx-auto h-12 w-12 text-secondary" />
              <h2 className="mt-5 font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
<<<<<<< HEAD
                A small hand, a great service
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90 leading-relaxed">
                Every contribution helps revive a scripture that was slipping away and puts
                it in the hands of a new reader. Join this effort — give whatever you can.
=======
                Support Our Mission
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90 leading-relaxed">
                Your generosity helps us publish and share spiritual knowledge with seekers worldwide. Every
                contribution makes a difference in preserving dharmik granth for future generations.
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              </p>
              <Button
                size="lg"
                className="mt-8 bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 shadow-lg px-10"
                asChild
              >
                <Link to="/support-us">
<<<<<<< HEAD
                  Contribute <Heart className="ml-2 h-4 w-4" />

=======
                  Support Us <Heart className="ml-2 h-4 w-4" />
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
