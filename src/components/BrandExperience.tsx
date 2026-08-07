import { Link } from "react-router-dom";
import { BookOpen, Compass, Sparkles, HeartHandshake, ShieldCheck, Library, Feather, ArrowRight } from "lucide-react";

/**
 * Premium publishing-brand experience blocks.
 * English copy, semantic tokens only. Additive — safe to drop into any page.
 */

// ────────────────────────────────────────────────────────────
// Why GyandootNova Exists
// ────────────────────────────────────────────────────────────
export const WhyWeExist = () => (
  <section className="relative py-20 md:py-28 bg-background">
    <div className="container max-w-5xl px-4">
      <div className="text-center">
        <span className="section-eyebrow">Our Purpose</span>
        <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight text-foreground">
          Books are more than pages —
          <br className="hidden md:block" />
          <span className="text-primary"> they are ideas, experiences and wisdom.</span>
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground">
          Books quietly shape our journey. GyandootNova exists to bring timeless scriptures and
          meaningful ideas closer to modern readers — a trusted, unhurried space for knowledge,
          imagination and lifelong learning.
        </p>
        <div className="divider-gold mt-10" />
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// Reader Journey — four archetypes
// ────────────────────────────────────────────────────────────
const journeys = [
  {
    icon: Compass,
    title: "Curious Readers",
    line: "In search of new ideas and unexplored worlds.",
    href: "/books",
  },
  {
    icon: BookOpen,
    title: "Lifelong Learners",
    line: "A little knowledge every day — that is how depth is built.",
    href: "/articles",
  },
  {
    icon: Sparkles,
    title: "Knowledge Seekers",
    line: "Deep study of ancient scriptures, one chapter at a time.",
    href: "/books?category=adhyatm",
  },
  {
    icon: Feather,
    title: "Story Lovers",
    line: "Stories that have travelled with humanity for centuries.",
    href: "/books?category=katha",
  },
];

export const ReaderJourney = () => (
  <section className="relative py-20 md:py-28 bg-gradient-cream">
    <div className="container max-w-6xl px-4">
      <div className="text-center max-w-2xl mx-auto">
        <span className="section-eyebrow">Your Reading Journey</span>
        <h2 className="mt-5 text-3xl md:text-4xl font-bold text-foreground">
          Every reader walks their own path
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Whatever your journey looks like, GyandootNova has something for you.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {journeys.map(({ icon: Icon, title, line, href }) => (
          <Link
            key={title}
            to={href}
            className="group surface-card p-8 flex flex-col"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground flex-1">
              {line}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// Trust triad
// ────────────────────────────────────────────────────────────
const trustPillars = [
  {
    icon: Library,
    title: "Curated Quality",
    body: "Every scripture is reviewed and refined with patience — nothing rushed to publish.",
  },
  {
    icon: HeartHandshake,
    title: "Reader First",
    body: "Your experience — calm, easy to navigate, always trustworthy — is our first priority.",
  },
  {
    icon: ShieldCheck,
    title: "Authentic Sources",
    body: "Every text arrives with its original source — untouched, unaltered, verifiable.",
  },
];

export const TrustPillars = () => (
  <section className="relative py-20 md:py-28 bg-background">
    <div className="container max-w-6xl px-4">
      <div className="text-center max-w-2xl mx-auto">
        <span className="section-eyebrow">Trust</span>
        <h2 className="mt-5 text-3xl md:text-4xl font-bold text-foreground">
          A publishing brand you can rely on
        </h2>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {trustPillars.map(({ icon: Icon, title, body }) => (
          <div key={title} className="text-center px-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-xs mx-auto">
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// Books-listing hero intro
// ────────────────────────────────────────────────────────────
export const BooksJourneyIntro = () => (
  <section className="relative py-16 md:py-24 bg-gradient-cream border-b border-border/60">
    <div className="container max-w-4xl px-4 text-center">
      <span className="section-eyebrow">Our Library</span>
      <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
        Explore books for your journey
      </h1>
      <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground">
        A calm, curated collection — every book chosen with care.
        Browse without pressure. Find something that stays with you.
      </p>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// Book-detail "Why this book matters" strip
// ────────────────────────────────────────────────────────────
interface WhyBookMattersProps {
  title?: string;
}
export const WhyBookMatters = ({ title }: WhyBookMattersProps) => (
  <section className="py-16 md:py-20 bg-gradient-cream border-y border-border/60">
    <div className="container max-w-5xl px-4">
      <div className="text-center mb-12">
        <span className="section-eyebrow">Why This Book Matters</span>
        <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
          {title ? `What you will find inside "${title}"` : "What you will find inside this book"}
        </h2>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {[
          {
            icon: BookOpen,
            head: "Deep understanding",
            body: "Read beyond the words — with context, meaning and the emotion behind every verse.",
          },
          {
            icon: Sparkles,
            head: "New perspectives",
            body: "Ancient wisdom translated for how we live and think today.",
          },
          {
            icon: HeartHandshake,
            head: "A quiet companion",
            body: "A book that reveals something new each time you return to it.",
          },
        ].map(({ icon: Icon, head, body }) => (
          <div key={head} className="surface-card p-8">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-foreground">{head}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// Mission · Vision · Values triad — for About page
// ────────────────────────────────────────────────────────────
export const MissionVisionValues = () => {
  const items = [
    {
      head: "Our Mission",
      body: "To bring timeless wisdom to modern readers — without shortcuts, without dilution.",
    },
    {
      head: "Our Vision",
      body: "A digital home where reading is calm, authentic, and truly trustworthy.",
    },
    {
      head: "Our Values",
      body: "Authenticity, patience, respect for the reader, and reverence for the source.",
    },
  ];
  return (
    <section className="py-20 md:py-28 bg-gradient-cream border-y border-border/60">
      <div className="container max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-eyebrow">Our Foundation</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold text-foreground">
            The principles behind every decision we make
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.head} className="surface-card p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{it.head}</p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────
// Continue-your-reading invitation — for ArticleDetail
// ────────────────────────────────────────────────────────────
export const ContinueReadingInvite = () => (
  <section className="py-16 md:py-20 bg-gradient-cream border-t border-border/60">
    <div className="container max-w-3xl px-4 text-center">
      <span className="section-eyebrow">Continue Your Reading Journey</span>
      <h2 className="mt-5 text-3xl md:text-4xl font-bold text-foreground">
        One idea ends — the next is waiting
      </h2>
      <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
        Every article is a small journey. Begin the next one — chosen for what you already enjoy.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          More articles <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/books"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          Browse books
        </Link>
      </div>
    </div>
  </section>
);
