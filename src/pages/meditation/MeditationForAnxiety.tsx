import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";
import { Clock } from "lucide-react";

const path = "/meditation/for-anxiety";
const READING_MIN = 6;

const faqs = [
  {
    question: "Which meditation is best for anxiety?",
    answer:
      "Mindfulness-of-breath and body-scan meditation are the two most researched techniques for anxiety. Both work by shifting attention from anxious thoughts (future) to present-moment sensation. Studies from Harvard, Johns Hopkins and NIMHANS show 8–10 weeks of daily practice produces measurable reduction in generalised anxiety symptoms.",
  },
  {
    question: "How long does it take for meditation to reduce anxiety?",
    answer:
      "Most practitioners notice reduced reactivity within 2–3 weeks of daily practice. Clinically measurable reduction in anxiety scores appears at around 8 weeks — the length of the standard MBSR programme (Mindfulness-Based Stress Reduction).",
  },
  {
    question: "Can meditation replace medication for anxiety?",
    answer:
      "Meditation is a proven complement to treatment, not a replacement. If you are on prescribed medication, continue it and add meditation. Discontinue medication only under medical supervision.",
  },
  {
    question: "What if meditation increases my anxiety?",
    answer:
      "This is common in the first two weeks — suppressed emotions can surface. Reduce session length to 3–5 minutes, keep eyes half-open, and prefer walking meditation over seated. If anxiety persists after several sessions, consult a qualified teacher or therapist before continuing.",
  },
];

const MeditationForAnxiety = () => {
  useSEO({
    title: "Meditation for Anxiety — Techniques That Actually Work",
    description:
      "Evidence-based meditation for anxiety: mindfulness-of-breath, body scan, 4-7-8 breathing and mantra japa. Step-by-step guide with a 21-day plan and clinical research summary.",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "Meditation for Anxiety — Techniques That Actually Work",
        description: "Evidence-based meditation techniques for anxiety with a 21-day practice plan.",
        path,
        inLanguage: "en",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Meditation", path: "/meditation" },
        { name: "For Anxiety", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span>Meditation</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">For Anxiety</span>
        </nav>

        <header className="mb-6">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">Mental Wellbeing</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            Meditation for Anxiety — Techniques That Actually Work
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            Four evidence-based techniques and a 21-day plan to calm an anxious mind.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {READING_MIN} min read
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-8">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Why meditation works for anxiety</h2>
            <p>
              Anxiety is essentially the mind rehearsing threats that haven't yet happened. Meditation
              interrupts this rehearsal by anchoring attention in a present-moment sensation — usually
              the breath. Neuroimaging shows regular practitioners have reduced activity in the
              amygdala (the brain's threat centre) and increased grey-matter density in the prefrontal
              cortex, which regulates emotional response.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Technique 1 — Mindfulness of breath</h2>
            <p>
              Sit comfortably. Close your eyes. Notice the sensation of air entering and leaving the
              nostrils. When thought pulls you away — and it will — gently return to the breath. That's
              the entire technique. 10 minutes twice a day.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Technique 2 — Body scan</h2>
            <p>
              Lie down. Slowly move attention from the crown of the head to the toes, resting a few
              breaths at each region — face, throat, chest, belly, arms, legs. Don't try to relax;
              just observe. Anxiety often lives as physical tension the body scan releases.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Technique 3 — 4-7-8 breathing</h2>
            <p>
              Inhale through the nose for 4 counts. Hold for 7. Exhale through the mouth for 8.
              Repeat 4 rounds. Popularised by Dr Andrew Weil, this pattern activates the
              parasympathetic nervous system within 90 seconds — the fastest tool for an acute
              anxiety spike.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Technique 4 — Mantra japa</h2>
            <p>
              Choose a short mantra — <em>Om</em>, <em>So-Hum</em>, or a phrase from your tradition.
              Repeat it silently in rhythm with the breath. The mantra gives the anxious mind
              something benign to hold, replacing the rumination loop.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">A 21-day plan</h2>
            <ul>
              <li><strong>Days 1–7:</strong> Mindfulness of breath, 5 min morning + 5 min evening.</li>
              <li><strong>Days 8–14:</strong> Add body scan, 10 min before bed.</li>
              <li><strong>Days 15–21:</strong> Extend morning session to 15 min. Use 4-7-8 breathing whenever anxiety spikes during the day.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">When to seek help</h2>
            <p>
              Meditation complements — never replaces — professional care. If anxiety disrupts sleep,
              work or relationships for more than two weeks, or if you experience panic attacks,
              consult a qualified therapist. Meditation is best begun alongside, not instead of,
              treatment.
            </p>
          </section>
        </div>

        <FaqAccordion items={faqs} />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Related articles</h2>
          <ul className="space-y-2">
            <li><Link to="/meditation/for-stress" className="text-primary hover:underline">Meditation for stress relief →</Link></li>
            <li><Link to="/meditation/techniques-compared" className="text-primary hover:underline">Vipassana, Zen, TM, Kriya & Who-Am-I compared →</Link></li>
            <li><Link to="/hindi/dhyan-kaise-karein" className="text-primary hover:underline">ध्यान कैसे करें — Hindi meditation guide →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default MeditationForAnxiety;
