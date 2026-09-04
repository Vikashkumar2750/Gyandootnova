import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Compass,
  Library,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Users,
  Feather,
  ArrowRight,
} from "lucide-react";
import useSEO from "@/hooks/useSEO";
import { MissionVisionValues } from "@/components/BrandExperience";


const About = () => {
  useSEO({
    title: "About GyandootNova — A Home for Timeless Knowledge",
    description:
      "GyandootNova is a mission-driven publishing house dedicated to discovering, preserving and sharing meaningful books that bring timeless knowledge closer to every reader.",
    canonical: "/about",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GyandootNova", item: "https://gyandootnova.in/" },
          { "@type": "ListItem", position: 2, name: "About", item: "https://gyandootnova.in/about" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About GyandootNova",
        url: "https://gyandootnova.in/about",
        description:
          "The mission, values and team behind GyandootNova — a small, dedicated publishing effort for authentic spiritual texts in Hindi and English.",
        isPartOf: { "@type": "WebSite", name: "GyandootNova", url: "https://gyandootnova.in" },
        publisher: { "@type": "Organization", name: "GyandootNova", url: "https://gyandootnova.in" },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "GyandootNova",
        alternateName: ["Gyandoot", "Gyandoot Nova", "gyandootnova.in"],
        url: "https://gyandootnova.in",
        logo: "https://gyandootnova.in/gyandoot-nova-icon.ico",
        email: "gyandootnova57@gmail.com",
        telephone: "+91-91615-33353",
        foundingDate: "2024",
        description:
          "A mission-driven publishing house dedicated to authentic spiritual texts — Bhagavad Gita, Vedas, Upanishads, Ramayana and more — for Hindi and English readers.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Bhagwan Khera",
          addressLocality: "Unnao",
          addressRegion: "Uttar Pradesh",
          postalCode: "209863",
          addressCountry: "IN",
        },
        areaServed: ["IN", "US", "GB", "CA", "AU"],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "gyandootnova57@gmail.com",
            telephone: "+91-91615-33353",
            availableLanguage: ["Hindi", "English"],
          },
        ],
      },
    ],
  });



  const values = [
    {
      icon: BookOpen,
      title: "Knowledge",
      text: "Books that expand understanding and stay with the reader long after the last page.",
    },
    {
      icon: ShieldCheck,
      title: "Authenticity",
      text: "Meaningful, trustworthy content — reviewed with care before it ever reaches you.",
    },
    {
      icon: HeartHandshake,
      title: "Accessibility",
      text: "Reading made available to everyone, in a form that feels welcoming and calm.",
    },
    {
      icon: Users,
      title: "Reader First",
      text: "Every choice we make is measured against one question — is this good for the reader?",
    },
  ];

  const pillars = [
    {
      icon: Library,
      title: "Curated Book Collection",
      text: "Thoughtfully selected titles across interests — chosen for depth, not for noise.",
    },
    {
      icon: Feather,
      title: "Quality Reading Experience",
      text: "Typography, spacing and pacing designed for comfortable, unhurried discovery.",
    },
    {
      icon: Sparkles,
      title: "Growing Reader Community",
      text: "A quiet, curious circle of readers connected by the books that shape them.",
    },
  ];

  return (
    <Layout>
      <main className="bg-background">
        {/* 1. HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/10 via-background to-background"
          />
          <div className="container py-20 md:py-28 lg:py-32">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <Compass className="h-3.5 w-3.5 text-primary" />
                About GyandootNova
              </span>
              <h1 className="mt-8 font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.15] tracking-tight">
                Bringing timeless knowledge closer to every reader
              </h1>
              <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-[1.8] max-w-2xl mx-auto">
                GyandootNova is a publishing house devoted to discovering, publishing and sharing
                meaningful books — the kind that quietly stay with you, and gently change the way
                you see the world.
              </p>
            </div>
          </div>
        </section>

        {/* 2. OUR STORY */}
        <section className="container py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary text-center">
              Our Story
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground text-center leading-tight">
              Why GyandootNova started
            </h2>
            <div className="mt-10 space-y-6 text-lg text-muted-foreground leading-[1.9]">
              <p>
                It began with a simple ache — the feeling that so much of what truly matters is
                slipping quietly out of reach. Books that once shaped generations were becoming
                harder to find, harder to read, harder to return to.
              </p>
              <p>
                We started GyandootNova because we believe knowledge is not a product. It is an
                inheritance. It is meant to be carried forward — from a page to a reader, from a
                reader to a life, from a life to the world around it.
              </p>
              <p>
                Every book we publish is chosen with that thought in mind. Not to fill a shelf,
                but to offer a reader something worth their time, their attention, and their
                belief.
              </p>
            </div>
          </div>
        </section>

        {/* 3. OUR MISSION & 4. OUR VISION */}
        <section className="container pb-16 md:pb-24">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            <article className="rounded-3xl bg-card border border-border/70 p-10 md:p-12 shadow-card">
              <span className="inline-block text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Our Mission
              </span>
              <h3 className="mt-4 font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Make valuable knowledge accessible to every reader
              </h3>
              <p className="mt-6 text-muted-foreground leading-[1.9]">
                Through thoughtfully selected books and meaningful reading experiences, we want
                learning, growth and quiet wisdom to feel within reach — for the student, the
                seeker and the lifelong reader alike.
              </p>
            </article>

            <article className="rounded-3xl bg-card border border-border/70 p-10 md:p-12 shadow-card">
              <span className="inline-block text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Our Vision
              </span>
              <h3 className="mt-4 font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Where we want to go
              </h3>
              <p className="mt-6 text-muted-foreground leading-[1.9]">
                To build a trusted destination where readers discover books that inspire, educate
                and transform lives — a calm, lasting home for knowledge in a world that too often
                rushes past it.
              </p>
            </article>
          </div>
        </section>

        {/* 5. OUR VALUES */}
        <section className="bg-muted/30 border-y border-border/60">
          <div className="container py-16 md:py-24">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Our Values
              </p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
                The principles that guide every book we publish
              </h2>
            </div>

            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl bg-card border border-border/70 p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-serif text-xl font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-[1.8]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5b. HAMARI TEEM — Our Team (honest, role-based) */}
        <section className="container py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Hamari Teem · Our Team
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
              A small, dedicated circle behind every book
            </h2>
            <p className="mt-6 text-muted-foreground leading-[1.9]">
              GyandootNova is a small effort — not a large corporation. What you read here has passed
              through the care of a few committed hands, each of them attentive to a different part of
              the work.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                role: "Scripture reviewers",
                text: "Readers of Sanskrit and Hindi who check every translation against the source text before it goes online.",
              },
              {
                role: "Content curators",
                text: "The quiet work of tracking down authentic manuscripts, editions and lineage-verified sources.",
              },
              {
                role: "Design & reading experience",
                text: "A small development effort focused on one goal — a calm, distraction-free reader that respects your time.",
              },
              {
                role: "Reader support",
                text: "Personal replies on WhatsApp and email — usually the founder himself, not a ticketing system.",
              },
            ].map((m) => (
              <div
                key={m.role}
                className="rounded-2xl bg-card border border-border/70 p-8 shadow-card"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                  Role
                </p>
                <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">
                  {m.role}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground leading-[1.8]">{m.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl mx-auto text-center text-sm text-muted-foreground italic">
            We deliberately keep the team small so the reader stays at the centre of every decision.
          </p>
        </section>

        {/* 6. WHY GYANDOOTNOVA */}

        <section className="container py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Why GyandootNova
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
              A quieter, more considered place to read
            </h2>
            <p className="mt-6 text-muted-foreground leading-[1.9]">
              We are not trying to be the largest bookstore. We are trying to be the one you
              return to — when you want something worth reading.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/70 bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-[1.8]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6b. WHERE WE'RE HEADED — future vision, honest */}
        <section className="bg-muted/30 border-y border-border/60">
          <div className="container py-16 md:py-24">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Aage Ki Raah · Where We're Headed
              </p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Quiet plans, taken one at a time
              </h2>
              <p className="mt-6 text-muted-foreground leading-[1.9]">
                We are not in a hurry. Each of these is being built with the same care as the books
                themselves — some are already live, others are gently on their way.
              </p>
            </div>

            <div className="mt-14 grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {[
                {
                  tag: "Live now",
                  tagTone: "text-primary bg-primary/10 border-primary/20",
                  title: "Daily shlok on WhatsApp",
                  text: "A single verse each morning, sent to readers who have asked to receive it — no ads, no forwarded noise.",
                },
                {
                  tag: "In progress",
                  tagTone: "text-foreground bg-muted border-border",
                  title: "Audio narration of scriptures",
                  text: "Slow, unhurried recitations of key texts — meant for the morning walk or the last hour of the day.",
                },
                {
                  tag: "Coming soon",
                  tagTone: "text-foreground bg-muted border-border",
                  title: "A dedicated reading app",
                  text: "The same calm reader you already know — carried into a lighter, offline-first mobile experience.",
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl bg-card border border-border/70 p-8 shadow-card"
                >
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${p.tagTone}`}
                  >
                    {p.tag}
                  </span>
                  <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-[1.8]">{p.text}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-2xl mx-auto text-center text-sm text-muted-foreground italic">
              If something you'd like to see is missing here, write to us — many of our best decisions
              have started as a reader's message.
            </p>
          </div>
        </section>

        {/* 7. READER EMOTIONAL QUOTE */}

        <section className="bg-muted/40 border-y border-border/60">
          <div className="container py-20 md:py-28">
            <figure className="max-w-3xl mx-auto text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Feather className="h-5 w-5" />
              </div>
              <blockquote className="mt-8 font-serif text-2xl md:text-4xl lg:text-[2.75rem] font-semibold text-foreground leading-[1.35] tracking-tight">
                “Every book carries a story, every reader carries a journey.”
              </blockquote>
              <figcaption className="mt-8 text-sm uppercase tracking-[0.22em] text-muted-foreground">
                The GyandootNova belief
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section className="container py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Begin your reading journey
            </h2>
            <p className="mt-6 text-muted-foreground leading-[1.9]">
              Step into a quietly curated collection — and find the book that has been waiting
              for you.
            </p>
            <div className="mt-10 flex justify-center">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to="/books" className="inline-flex items-center gap-2">
                  Explore Books
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <MissionVisionValues />
      </main>
    </Layout>

  );
};

export default About;
