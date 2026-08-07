import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import useSEO from "@/hooks/useSEO";
import heroLibrary from "@/assets/story-hero-library.jpg";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Feather,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

/**
 * Our Story — premium brand narrative page.
 * Nine calm, editorial sections that carry the reader from
 * first impression → purpose → belief → journey → connection →
 * trust → quote → community → invitation.
 */
const OurStory = () => {
  useSEO({
    title: "Our Story — GyandootNova | A Home for Timeless Knowledge",
    description:
      "Every book holds a journey. Every reader creates a story. Discover the purpose, belief and quiet mission behind GyandootNova — a trusted home for meaningful books.",
    canonical: "/our-story",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GyandootNova", item: "https://gyandootnova.in/" },
          { "@type": "ListItem", position: 2, name: "Our Story", item: "https://gyandootnova.in/our-story" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "The GyandootNova Story",
        url: "https://gyandootnova.in/our-story",
        description:
          "The purpose, belief and journey behind GyandootNova — a trusted publishing home for meaningful books.",
        isPartOf: { "@type": "WebSite", name: "GyandootNova", url: "https://gyandootnova.in" },
      },
    ],
  });

  const readerCards = [
    {
      icon: Lightbulb,
      title: "For The Curious Mind",
      text: "Discover ideas that quietly expand the way you understand the world.",
    },
    {
      icon: GraduationCap,
      title: "For The Learner",
      text: "Find knowledge that supports growth — patient, structured, meant to last.",
    },
    {
      icon: Sparkles,
      title: "For The Dreamer",
      text: "Explore stories that give imagination a room to wander freely.",
    },
    {
      icon: Compass,
      title: "For The Seeker",
      text: "Experience wisdom that creates deeper, quieter connections within.",
    },
  ];

  const trustCards = [
    {
      icon: BookOpen,
      title: "Thoughtfully Selected Books",
      text: "We focus on bringing books that offer genuine value and meaningful experiences — not noise.",
    },
    {
      icon: HeartHandshake,
      title: "Reader First Experience",
      text: "Every interaction is designed to make discovering books simple, comfortable, and unhurried.",
    },
    {
      icon: ShieldCheck,
      title: "Quality & Authenticity",
      text: "We believe every reader deserves a trustworthy, honest and satisfying experience.",
    },
    {
      icon: Sparkles,
      title: "Knowledge Driven",
      text: "Our purpose is to encourage lifelong learning through the quiet company of books.",
    },
  ];

  const journey = [
    {
      step: "01",
      title: "A Simple Thought",
      text: "To make meaningful books easier to discover — for anyone, anywhere.",
    },
    {
      step: "02",
      title: "A Growing Vision",
      text: "To create a trusted destination for readers seeking knowledge and inspiration.",
    },
    {
      step: "03",
      title: "A Bigger Mission",
      text: "To build a community where books connect people with ideas that matter.",
    },
  ];

  return (
    <Layout>
      <main className="bg-[hsl(var(--cream))]">
        {/* ── 1. HERO ───────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(var(--cream))] via-background to-[hsl(var(--cream))]"
          />
          <div className="container grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-20 items-center py-20 md:py-28 lg:py-32">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <Feather className="h-3.5 w-3.5 text-primary" />
                The GyandootNova Story
              </span>
              <h1 className="mt-8 font-serif text-[2.5rem] md:text-5xl lg:text-[3.75rem] font-semibold text-foreground leading-[1.1] tracking-tight">
                Every book holds a journey.
                <br className="hidden md:block" />
                <span className="italic font-normal text-primary">Every reader</span> creates a story.
              </h1>
              <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-[1.85] max-w-xl">
                At GyandootNova, we believe books are more than pages. They are ideas that inspire,
                knowledge that transforms, and stories that quietly stay with us — long after the
                last page.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link to="/books" className="inline-flex items-center gap-2">
                    Explore Books
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-border/70"
                >
                  <a href="#our-purpose">Discover Our Story</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[2rem] border border-border/60 shadow-lift">
                <img
                  src={heroLibrary}
                  alt="A quiet reading corner with an open book and warm library light"
                  width={1536}
                  height={1280}
                  className="w-full h-auto object-cover"
                  loading="eager"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden md:flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-card">
                <Star className="h-5 w-5 text-primary fill-primary/40" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">A quiet home</p>
                  <p className="font-serif text-sm text-foreground">for timeless knowledge</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. OUR PURPOSE ────────────────────────────────── */}
        <section id="our-purpose" className="container py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Our Purpose
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
              Why GyandootNova exists
            </h2>
            <div className="mt-10 space-y-6 text-lg text-muted-foreground leading-[1.9]">
              <p>
                Knowledge has the power to shape thoughts, inspire curiosity, and create meaningful
                change. It is not a product — it is an inheritance, meant to be carried forward.
              </p>
              <p>
                GyandootNova was created with a simple purpose — to bring valuable books closer to
                readers, and to create a trusted space where people can discover ideas that enrich
                their lives.
              </p>
            </div>
            <div className="mt-14 flex justify-center">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            </div>
          </div>
        </section>

        {/* ── 3. OUR BELIEF ─────────────────────────────────── */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="container py-20 md:py-28">
            <figure className="max-w-3xl mx-auto text-center">
              <Quote className="mx-auto h-8 w-8 text-primary/70" />
              <blockquote className="mt-8 font-serif text-2xl md:text-4xl lg:text-[2.75rem] font-semibold text-foreground leading-[1.35] tracking-tight">
                “A great book is not just something we read.
                <br className="hidden md:block" />
                It is a <span className="italic text-primary">conversation with ideas</span>,
                a connection with experiences, a source of learning, imagination, and growth.”
              </blockquote>
              <figcaption className="mt-10 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Our Belief
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── 4. OUR JOURNEY ────────────────────────────────── */}
        <section className="container py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Our Journey
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
              From a thought to a mission
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-[1.85]">
              Each step has been taken slowly — because the things worth building rarely happen
              in a hurry.
            </p>
          </div>

          <div className="relative mt-16 max-w-5xl mx-auto">
            {/* connecting line */}
            <div
              aria-hidden
              className="hidden md:block absolute top-14 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            />
            <ol className="grid md:grid-cols-3 gap-8 md:gap-6">
              {journey.map((j) => (
                <li key={j.step} className="relative">
                  <div className="flex md:flex-col items-start md:items-center gap-5 md:gap-6 md:text-center">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card font-serif text-lg font-semibold text-primary shadow-card">
                      {j.step}
                    </div>
                    <div className="md:px-4">
                      <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground">
                        {j.title}
                      </h3>
                      <p className="mt-3 text-muted-foreground leading-[1.85]">{j.text}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 5. READER CONNECTION ─────────────────────────── */}
        <section className="border-y border-border/60 bg-[hsl(var(--cream))]">
          <div className="container py-20 md:py-28">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                Books For Every Journey
              </p>
              <h2 className="mt-4 font-serif text-3xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
                Whoever you are — there is a page waiting
              </h2>
            </div>

            <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {readerCards.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="group rounded-3xl border border-border/70 bg-card p-8 md:p-9 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-7 font-serif text-xl font-semibold text-foreground leading-tight">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-[1.85]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. TRUST BUILDING ────────────────────────────── */}
        <section className="container py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              Why Readers Choose GyandootNova
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
              A place built on trust, not urgency
            </h2>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {trustCards.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="flex gap-6 rounded-3xl border border-border/70 bg-card p-8 md:p-10 shadow-card"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground leading-tight">
                    {title}
                  </h3>
                  <p className="mt-3 text-muted-foreground leading-[1.85]">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 7. EMOTIONAL QUOTE ───────────────────────────── */}
        <section className="border-y border-border/60 bg-muted/40">
          <div className="container py-24 md:py-32">
            <figure className="max-w-3xl mx-auto text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Feather className="h-5 w-5" />
              </div>
              <blockquote className="mt-8 font-serif text-2xl md:text-4xl lg:text-[2.75rem] font-semibold text-foreground leading-[1.35] tracking-tight">
                “Books do not just fill shelves.
                <br className="hidden md:block" />
                They shape thoughts, create memories, and become part of our journey.”
              </blockquote>
            </figure>
          </div>
        </section>

        {/* ── 8. COMMUNITY ─────────────────────────────────── */}
        <section className="container py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
              A Growing Community Of Readers
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
              Different journeys. One quiet love of reading.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-[1.85]">
              Every reader arrives at a book for a different reason. GyandootNova brings together
              people who believe in learning, imagination, and the endless possibilities of pages
              turned slowly.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "The reader is calm. There are no popups, no noise — just the book and me. That is rare online.",
                who: "A reader from Pune",
              },
                {
                quote:
                  "I opened the Gita here on a difficult morning. Something about the pace of this site helped me stay with it.",
                who: "A reader from Delhi",
              },
              {
                quote:
                  "It feels like a small, honest publishing house — not a store trying to sell me something.",
                who: "A reader from Toronto",
              },
            ].map((t) => (
              <figure
                key={t.who}
                className="rounded-3xl border border-border/70 bg-card p-8 shadow-card"
              >
                <Quote className="h-5 w-5 text-primary/70" />
                <blockquote className="mt-5 font-serif text-lg text-foreground leading-[1.7]">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t.who}
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-10 max-w-xl mx-auto text-center text-sm text-muted-foreground italic">
            Shared with permission. Names withheld to keep the focus on the words, not the writer.
          </p>
        </section>

        {/* ── 9. FINAL BRAND MESSAGE ───────────────────────── */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, hsl(45 97% 58%) 0%, transparent 55%), radial-gradient(circle at 80% 80%, hsl(0 60% 55%) 0%, transparent 55%)",
            }}
          />
          <div className="container relative py-24 md:py-32">
            <div className="max-w-2xl mx-auto text-center">
              <Users className="mx-auto h-6 w-6 text-secondary" />
              <h2 className="mt-6 font-serif text-3xl md:text-5xl font-bold leading-[1.15] tracking-tight">
                Begin your next meaningful reading journey
              </h2>
              <p className="mt-6 text-lg text-primary-foreground/80 leading-[1.85]">
                Discover books that inspire ideas, nurture curiosity, and stay with you beyond the
                final page.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Link to="/books" className="inline-flex items-center gap-2">
                    Explore Collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Link to="/about">About GyandootNova</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default OurStory;
