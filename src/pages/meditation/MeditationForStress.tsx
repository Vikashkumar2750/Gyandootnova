import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";
import { Clock } from "lucide-react";

const path = "/meditation/for-stress";
const READING_MIN = 5;

const faqs = [
  {
    question: "How does meditation reduce stress?",
    answer:
      "Meditation activates the parasympathetic nervous system, lowering cortisol (the primary stress hormone), heart rate and blood pressure. Meta-analyses of MBSR (Mindfulness-Based Stress Reduction) programmes show 25–35% reduction in perceived stress after 8 weeks.",
  },
  {
    question: "How long should I meditate daily to manage stress?",
    answer:
      "Research suggests 10–20 minutes twice daily is optimal for stress reduction. Consistency matters more than duration — 10 minutes every day beats an hour once a week.",
  },
  {
    question: "What is the fastest way to calm down using meditation?",
    answer:
      "Box breathing — inhale 4 counts, hold 4, exhale 4, hold 4 — practised for 2 minutes activates the vagus nerve and drops the acute stress response within minutes. Used by Navy SEALs and emergency responders.",
  },
  {
    question: "Is guided or silent meditation better for stress?",
    answer:
      "Guided meditation is easier for beginners because the voice occupies the mental space that would otherwise fill with worry. After 4–6 weeks most practitioners transition to silent meditation for deeper effect.",
  },
];

const MeditationForStress = () => {
  useSEO({
    title: "Meditation for Stress — A Practical Guide That Works",
    description:
      "How meditation lowers cortisol and blood pressure — with box breathing, body scan and mindfulness techniques. Research-backed 8-week plan for stress management.",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "Meditation for Stress — A Practical Guide That Works",
        description: "Evidence-based meditation techniques for stress, with an 8-week plan.",
        path,
        inLanguage: "en",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Meditation", path: "/meditation" },
        { name: "For Stress", path },
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
          <span className="text-foreground">For Stress</span>
        </nav>

        <header className="mb-6">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">Stress Management</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            Meditation for Stress — A Practical Guide That Works
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            Techniques that lower cortisol in minutes, plus a research-backed 8-week plan.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {READING_MIN} min read
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-8">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">The science in one paragraph</h2>
            <p>
              Chronic stress keeps the sympathetic nervous system elevated — the fight-or-flight
              response never turns off. Meditation flips the switch to the parasympathetic (rest-and-digest)
              side. Measurable effects: cortisol drops within a single session; blood pressure decreases
              after 4 weeks; anxiety and perceived stress fall 25–35% after 8 weeks of daily practice.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">The fastest tool — box breathing</h2>
            <p>
              For an acute stress spike: inhale for 4 counts, hold for 4, exhale for 4, hold for 4.
              Repeat 8 rounds. Used by Navy SEALs before high-pressure operations. Works because the
              extended exhale activates the vagus nerve and pulls the body out of fight-or-flight.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">The daily habit — mindfulness of breath</h2>
            <p>
              Sit for 10 minutes twice daily — once on waking, once before dinner. Follow the natural
              breath. When you notice the mind has wandered, that noticing <em>is</em> the practice —
              return to the breath. This is the technique researched in every major MBSR study.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">The evening reset — body scan</h2>
            <p>
              Before bed, lie down and slowly move attention from head to toe. Notice tension without
              trying to remove it. This alone often improves sleep quality within a week — one of the
              first indicators that stress is coming down.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">An 8-week plan</h2>
            <ul>
              <li><strong>Weeks 1–2:</strong> 10 min mindfulness of breath, morning only.</li>
              <li><strong>Weeks 3–4:</strong> Add 10 min body scan before bed.</li>
              <li><strong>Weeks 5–6:</strong> Extend morning session to 15 min. Use box breathing for daytime spikes.</li>
              <li><strong>Weeks 7–8:</strong> 20 min morning + 15 min evening. Consider adding a mantra or walking meditation.</li>
            </ul>
            <p>By week 8, most people report a distinct baseline change — not the absence of stress, but a faster recovery from it.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Stack it with sleep, movement and time offline</h2>
            <p>
              Meditation compounds when combined with 7+ hours of sleep, 30 minutes of daily movement,
              and one screen-free hour before bed. None of these replace meditation, but meditation
              alone can't offset chronic sleep debt or 12 hours of screens.
            </p>
          </section>
        </div>

        <FaqAccordion items={faqs} />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Related articles</h2>
          <ul className="space-y-2">
            <li><Link to="/meditation/for-anxiety" className="text-primary hover:underline">Meditation for anxiety →</Link></li>
            <li><Link to="/meditation/techniques-compared" className="text-primary hover:underline">Compare Vipassana, Zen, TM, Kriya & Who-Am-I →</Link></li>
            <li><Link to="/hindi/dhyan-kaise-karein" className="text-primary hover:underline">ध्यान कैसे करें — Hindi meditation guide →</Link></li>
            <li><Link to="/texts/bhagavad-gita" className="text-primary hover:underline">Bhagavad Gita — the classical text on meditation →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default MeditationForStress;
