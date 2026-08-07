import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const path = "/meditation/techniques-compared";

const faqs = [
  {
    question: "Which meditation technique is most effective?",
    answer:
      "There is no single 'most effective' technique — effectiveness depends on temperament and goal. Vipassana suits analytical minds seeking insight; TM suits those wanting a simple, effortless daily practice; Bhakti-oriented practitioners prefer Kriya Yoga or mantra japa; philosophically inclined seekers gravitate to 'Who Am I?' self-enquiry. Any technique done consistently for 6+ months produces measurable benefit.",
  },
  {
    question: "What is Vipassana meditation technique?",
    answer:
      "Vipassana ('insight' in Pali) is the meditation technique taught by Gautama Buddha. Practitioners systematically observe bodily sensations without reacting — cultivating direct awareness of the impermanent nature of experience. It is traditionally learned in a 10-day silent retreat.",
  },
  {
    question: "What is Transcendental Meditation (TM) technique?",
    answer:
      "TM is a mantra-based technique brought to the West by Maharishi Mahesh Yogi. Practitioners silently repeat a personal mantra for 20 minutes, twice daily, seated comfortably with eyes closed. TM emphasizes effortlessness — no concentration, no monitoring of thoughts.",
  },
  {
    question: "What is Kriya Yoga meditation technique?",
    answer:
      "Kriya Yoga is a pranayama-based technique popularised by Paramahansa Yogananda in Autobiography of a Yogi. It combines specific breathing, mudras and mantra to accelerate spiritual evolution. Formal initiation (Kriya Diksha) is required from a recognised teacher of the SRF or YSS lineage.",
  },
  {
    question: "What is Zen meditation technique?",
    answer:
      "Zen meditation (zazen) is the seated meditation of Zen Buddhism. The practitioner sits in lotus or half-lotus, gazes at a spot on the wall or floor with half-open eyes, and either follows the breath (shikantaza — 'just sitting') or contemplates a koan.",
  },
  {
    question: "What is the Who-Am-I meditation technique?",
    answer:
      "Atma Vichara ('Who am I?') is the self-enquiry method taught by Ramana Maharshi. When a thought arises, the practitioner asks 'To whom does this thought occur?' and traces attention back to the source — the sense of 'I'. This continuous enquiry dissolves the ego-thought and reveals the true Self.",
  },
];

const rows = [
  {
    name: "Vipassana",
    tradition: "Buddhist (Theravada)",
    focus: "Body sensations, impermanence",
    posture: "Cross-legged, still",
    duration: "1–2 hr / day; 10-day retreat to learn",
    bestFor: "Analytical minds; insight into anatta",
  },
  {
    name: "Zen (Zazen)",
    tradition: "Japanese Zen Buddhism",
    focus: "'Just sitting' or koan",
    posture: "Lotus or half-lotus, half-open eyes",
    duration: "25–40 min sits",
    bestFor: "Direct, no-frills seekers",
  },
  {
    name: "Transcendental Meditation",
    tradition: "Vedic (Maharishi Mahesh Yogi)",
    focus: "Silent mantra repetition",
    posture: "Comfortable chair, eyes closed",
    duration: "20 min × 2 daily",
    bestFor: "Householders wanting effortless practice",
  },
  {
    name: "Kriya Yoga",
    tradition: "Vedic (Yogananda / SRF-YSS)",
    focus: "Pranayama + mantra + mudra",
    posture: "Erect spine, formal seat",
    duration: "20–60 min daily after initiation",
    bestFor: "Devotional seekers with a guru",
  },
  {
    name: "Who-Am-I (Atma Vichara)",
    tradition: "Advaita Vedanta (Ramana Maharshi)",
    focus: "Self-enquiry into the 'I'",
    posture: "Any — technique is mental",
    duration: "Continuous throughout the day",
    bestFor: "Philosophically inclined; jnana-path",
  },
];

const TechniquesCompared = () => {
  useSEO({
    title: "Vipassana vs Zen vs TM vs Kriya vs Who-Am-I — Compared",
    description:
      "Side-by-side comparison of the five most-asked meditation techniques — Vipassana, Zen, Transcendental Meditation, Kriya Yoga and Ramana Maharshi's Who-Am-I self-enquiry.",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "5 Meditation Techniques Compared — Vipassana, Zen, TM, Kriya, Who-Am-I",
        description: "Side-by-side comparison of the world's most-practised meditation techniques.",
        path,
        inLanguage: "en",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Meditation", path: "/meditation" },
        { name: "Techniques Compared", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Meditation techniques compared</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">Comparison Hub</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            Vipassana, Zen, TM, Kriya & Who-Am-I — Compared
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            The five most-asked meditation techniques, side-by-side: what each is, where it comes from,
            how it's done, and who it suits.
          </p>
        </header>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Technique</TableHead>
                <TableHead>Tradition</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead>Posture</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Best for</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-semibold text-primary">{r.name}</TableCell>
                  <TableCell>{r.tradition}</TableCell>
                  <TableCell>{r.focus}</TableCell>
                  <TableCell>{r.posture}</TableCell>
                  <TableCell>{r.duration}</TableCell>
                  <TableCell>{r.bestFor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-8 mt-12">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Vipassana</h2>
            <p>
              Rediscovered and re-taught by S.N. Goenka in the 20th century, Vipassana is the
              observation of bodily sensations as they arise and pass. The insight it cultivates is
              direct — not intellectual — awareness of impermanence (anicca). Learned in a strict
              10-day silent retreat and offered free worldwide by Goenka centres.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Zen (Zazen)</h2>
            <p>
              Zen strips meditation to essentials — sitting. In Soto Zen, that's shikantaza ('just
              sitting'), effortless awareness. In Rinzai Zen, the practitioner contemplates a koan
              (paradoxical question) until conceptual mind exhausts itself. Both aim at direct
              recognition of one's original nature.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Transcendental Meditation (TM)</h2>
            <p>
              TM is deliberately simple: sit comfortably, close the eyes, silently repeat a mantra
              given by a certified teacher, and let the mind settle by itself. No concentration, no
              posture requirements. Roughly 20 minutes twice a day. Extensive research supports its
              effects on blood pressure, anxiety and cognitive performance.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Kriya Yoga</h2>
            <p>
              Kriya Yoga is a controlled-breath technique that Paramahansa Yogananda described as
              accelerating one year of natural spiritual evolution into a single day of practice.
              Formal initiation from an authorised teacher of the Self-Realization Fellowship (SRF)
              or Yogoda Satsanga Society (YSS) is required — the technique is not taught in books.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Atma Vichara — Who Am I?</h2>
            <p>
              Sri Ramana Maharshi's self-enquiry is the most direct method in the Advaita tradition.
              Whenever a thought or feeling arises, ask 'To whom does this occur?' — 'To me' —
              'Who is this me?' Trace attention to the source. Sustained enquiry dissolves the
              ego-sense and reveals the ever-present Self. No posture, no timing — practised
              continuously.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">How to choose</h2>
            <p>
              If you want <strong>a proven, effortless daily practice</strong>: TM. If you want{" "}
              <strong>deep insight into the nature of experience</strong>: Vipassana. If you're
              drawn to <strong>a devotional path with a guru</strong>: Kriya Yoga. If you're
              philosophically inclined and want <strong>the shortest route</strong>: Who-Am-I. If
              you value <strong>simplicity and lineage</strong>: Zen. Whichever you choose, commit
              for at least 6 months before evaluating.
            </p>
          </section>
        </div>

        <FaqAccordion items={faqs} />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Related reading</h2>
          <ul className="space-y-2">
            <li><Link to="/hindi/dhyan-kaise-karein" className="text-primary hover:underline">ध्यान कैसे करें — Meditation guide in Hindi →</Link></li>
            <li><Link to="/meditation/for-anxiety" className="text-primary hover:underline">Meditation for anxiety — techniques that work →</Link></li>
            <li><Link to="/meditation/for-stress" className="text-primary hover:underline">Meditation for stress relief →</Link></li>
            <li><Link to="/texts/bhagavad-gita" className="text-primary hover:underline">Bhagavad Gita — Dhyana Yoga chapter →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default TechniquesCompared;
