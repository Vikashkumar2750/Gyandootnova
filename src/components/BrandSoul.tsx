import { Link } from "react-router-dom";
import {
  Sparkles,
  HeartHandshake,
  Leaf,
  ArrowRight,
  Sunrise,
  Wind,
  BookOpen,
  Layers,
} from "lucide-react";

/**
 * Editorial trilogy for the homepage:
 *  I.   Brand Purpose        — the dharma
 *  II.  Emotional Connection — moments of transcendence (asymmetric, dark middle card)
 *  III. Calm Feeling         — the sanctuary (deep primary with gold rule)
 *
 * Cormorant Garamond display + Manrope body, all through semantic tokens.
 * English-only copy, no emojis, Lucide icons only.
 */

const displayFont = { fontFamily: "'Cormorant Garamond', 'Manrope', serif" };
const bodyFont = { fontFamily: "'Manrope', 'Inter', sans-serif" };

// ────────────────────────────────────────────────────────────
// I. Brand Purpose
// ────────────────────────────────────────────────────────────
export const BrandPurpose = () => (
  <section className="relative bg-background py-20 md:py-28">
    <div className="container max-w-6xl px-4">
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary" style={bodyFont}>
              Chapter I · Our Purpose
            </span>
          </div>
          <h2
            className="text-4xl md:text-6xl lg:text-7xl leading-[1.08] text-foreground"
            style={displayFont}
          >
            Preserving the{" "}
            <span className="italic text-primary">eternal echo</span> of the
            ancients — for today's reader.
          </h2>
          <p
            className="mt-8 text-lg md:text-xl leading-[1.8] text-foreground/75 max-w-xl font-medium"
            style={bodyFont}
          >
            We are a publishing brand, not another app. Every scripture carries
            a verified source, every translation is shaped by a scholar, and
            every reader is given a quiet place — so reading becomes an
            experience again.
          </p>
          <div className="mt-10 h-px w-24 bg-gradient-to-r from-secondary via-secondary/60 to-transparent" />
        </div>

        <div className="lg:col-span-5 flex lg:justify-end">
          <div className="relative group">
            <div className="absolute -inset-4 border-2 border-secondary/50 translate-x-4 translate-y-4 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2" />
            <div className="relative w-64 h-80 md:w-72 md:h-96 bg-primary flex items-center justify-center shadow-2xl ring-1 ring-primary/20">
              <Sparkles className="absolute h-64 w-64 text-primary-foreground/15" strokeWidth={0.5} />
              <div className="relative text-center px-7">
                <p
                  className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary-foreground"
                  style={bodyFont}
                >
                  Volume One
                </p>
                <div className="h-0.5 w-14 mx-auto my-6 bg-secondary" />
                <p
                  className="text-3xl md:text-[34px] italic text-primary-foreground leading-tight"
                  style={displayFont}
                >
                  The unhurried library
                </p>
                <div className="h-0.5 w-14 mx-auto my-6 bg-secondary" />
                <p
                  className="text-sm font-extrabold uppercase tracking-[0.14em] text-primary-foreground"
                  style={bodyFont}
                >
                  Est. GyandootNova
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// II. Emotional Connection
// ────────────────────────────────────────────────────────────
const moments = [
  {
    icon: Sunrise,
    when: "With the morning tea",
    sub: "A calm start",
    line: "One shloka, one breath — the day begins a little lighter, a little clearer.",
    dark: false,
  },
  {
    icon: Wind,
    when: "On a half-hour commute",
    sub: "Stillness in the crowd",
    line: "No noise, no ads — just one chapter of the Gita, and quiet inside the rush.",
    dark: true,
  },
  {
    icon: BookOpen,
    when: "By the evening lamp",
    sub: "A family ritual",
    line: "Father reads in a larger font, the children sit close and listen — the ritual returns.",
    dark: false,
  },
];

export const EmotionalConnection = () => (
  <section className="relative bg-gradient-cream py-24 md:py-32 border-y border-secondary/10">
    <div className="container max-w-6xl px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
        <div>
          <span
            className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary block mb-4"
            style={bodyFont}
          >
            Chapter II · Emotional Connection
          </span>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-foreground max-w-2xl"
            style={displayFont}
          >
            Moments a book <span className="italic">quietly enters.</span>
          </h2>
        </div>
        <p
          className="max-w-xs text-base italic leading-relaxed text-foreground/70 font-medium"
          style={bodyFont}
        >
          Wisdom isn't read — it's felt, in the small spaces between the day.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {moments.map(({ icon: Icon, when, sub, line, dark }, i) => (
          <article
            key={when}
            className={[
              "group relative min-h-[380px] p-8 flex flex-col justify-between transition-all duration-500",
              dark
                ? "bg-royal text-primary-foreground shadow-2xl md:mt-12"
                : "bg-card border border-secondary/15 hover:-translate-y-2 hover:shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.25)]",
            ].join(" ")}
          >
            <div className="flex items-start justify-between">
              <Icon
                className={dark ? "h-14 w-14 text-secondary" : "h-14 w-14 text-secondary"}
                strokeWidth={1.5}
              />
              <span
                className={[
                  "text-xs font-extrabold uppercase tracking-[0.14em]",
                  dark ? "text-primary-foreground/75" : "text-foreground/55",
                ].join(" ")}
                style={bodyFont}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <p
                className={[
                  "text-xs font-extrabold uppercase tracking-[0.14em] mb-3",
                  dark ? "text-secondary" : "text-primary",
                ].join(" ")}
                style={bodyFont}
              >
                {sub}
              </p>
              <h3
                className={[
                  "text-2xl md:text-[1.75rem] leading-tight mb-4",
                  dark ? "text-primary-foreground" : "text-foreground",
                ].join(" ")}
                style={displayFont}
              >
                {when}
              </h3>
              <p
                className={[
                  "text-base leading-relaxed font-medium",
                  dark ? "text-primary-foreground/85" : "text-foreground/70",
                ].join(" ")}
                style={bodyFont}
              >
                {line}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link
          to="/testimonials"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          style={bodyFont}
        >
          Read more reader stories
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  </section>
);

// ────────────────────────────────────────────────────────────
// III. Calm Feeling
// ────────────────────────────────────────────────────────────
const calmPromises = [
  { title: "No pop-ups", sub: "Ever" },
  { title: "No ads", sub: "Never sold" },
  { title: "No noisy alerts", sub: "Silent by default" },
  { title: "No tracking traps", sub: "Your reading is yours" },
];

export const CalmFeeling = () => (
  <section className="relative overflow-hidden" style={{ backgroundColor: "#C3D7D6" }}>
    {/* Maroon radial glow from center */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.18) 0%, transparent 60%)",
      }}
    />

    <div className="container relative max-w-5xl px-4 py-24 md:py-32 text-center">
      <span
        className="text-xs font-extrabold uppercase tracking-[0.28em] text-primary inline-flex items-center gap-3 mb-8"
        style={bodyFont}
      >
        <Leaf className="h-4 w-4" />
        Chapter III · The Sanctuary
      </span>

      <h2
        className="text-4xl md:text-6xl lg:text-7xl font-light leading-[1.1] text-ink max-w-3xl mx-auto"
        style={displayFont}
      >
        An island of <span className="italic text-primary">stillness</span>
        <br className="hidden md:block" /> in a sea of noise.
      </h2>

      <div className="my-10 flex items-center justify-center gap-4">
        <div className="h-px w-14 bg-ink/30" />
        <div className="w-2.5 h-2.5 rotate-45 border border-primary bg-primary" />
        <div className="h-px w-14 bg-ink/30" />
      </div>

      <p
        className="mx-auto max-w-2xl text-lg leading-[1.85] text-ink/80 font-medium"
        style={bodyFont}
      >
        We built a reader that quietly steps back — so nothing stands between
        you and the scripture in front of you.
      </p>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {calmPromises.map((p, i) => (
          <div
            key={p.title}
            className="group relative p-8 border border-ink/15 bg-white/40 backdrop-blur-sm text-left transition-all duration-300 hover:border-primary/50 hover:bg-white/60 overflow-hidden"
          >
            <span
              className="absolute top-3 right-5 text-6xl text-ink/10 select-none pointer-events-none group-hover:text-primary/20 transition-colors font-light"
              style={displayFont}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-primary/70 bg-primary/10 flex items-center justify-center mb-5">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>
              <h3
                className="text-2xl text-ink mb-1.5"
                style={displayFont}
              >
                {p.title}
              </h3>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80"
                style={bodyFont}
              >
                {p.sub}
              </p>
            </div>
          </div>
        ))}
      </div>


      <div className="mt-16">
        <Link
          to="/books?filter=free"
          className="inline-flex items-center gap-3 px-10 py-4 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-[0.28em] hover:bg-secondary/90 hover:-translate-y-0.5 transition-all shadow-xl"
          style={bodyFont}
        >
          <HeartHandshake className="h-5 w-5" />
          Begin your journey
        </Link>
      </div>
    </div>
  </section>
);

