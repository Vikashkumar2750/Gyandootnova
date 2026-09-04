import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";

const path = "/how-to-read/bhagavad-gita";

const faqs = [
  {
    question: "How should a beginner start reading the Bhagavad Gita?",
    answer:
      "Begin with Chapter 2 (Sankhya Yoga), which contains the philosophical core of the entire Gita. Then start from Chapter 1 and read one chapter a day in order, with a trusted commentary alongside the verses. Reading the whole text takes 18 days at this pace.",
  },
  {
    question: "Which is the best translation of the Bhagavad Gita?",
    answer:
      "For Hindi readers, Gita Press Gorakhpur remains the most trusted edition. In English, Swami Chinmayananda's 'Holy Geeta', Eknath Easwaran's translation, and Paramahansa Yogananda's 'God Talks with Arjuna' are widely recommended. Choose one and stay with it for a first reading.",
  },
  {
    question: "How long does it take to read the entire Bhagavad Gita?",
    answer:
      "At one chapter a day it takes 18 days. Reading with detailed commentary takes 6–12 weeks. Cover-to-cover in one sitting (verse only) takes around 4–6 hours.",
  },
  {
    question: "Can I read the Bhagavad Gita during menstruation?",
    answer:
      "There is no scriptural restriction — the Gita itself contains no such rule. Modern spiritual teachers including Swami Sivananda have said the Gita may be read at any time. Family customs vary; follow what brings you peace.",
  },
  {
    question: "Can I read the Bhagavad Gita on the bed?",
    answer:
      "The Gita may be read anywhere the mind is calm and attentive. Traditional practice recommends a clean seat and upright posture as a mark of respect, but the essential requirement is focused attention — not the specific piece of furniture.",
  },
  {
    question: "Should I read the Gita in Sanskrit, Hindi or English?",
    answer:
      "Read it in the language you understand most easily. A well-translated Hindi or English edition with commentary is far more valuable than an unread Sanskrit copy. Sanskrit chanting can be added later once the meaning is familiar.",
  },
];

const HowToReadBhagavadGita = () => {
  useSEO({
    title: "How to Read the Bhagavad Gita — Step-by-Step Guide",
    description:
      "How to read the Bhagavad Gita properly: which chapter to start with, the best Hindi and English translations, an 18-day reading plan, how long it takes, and answers to common doubts.",
    canonical: path,

    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "How to Read the Bhagavad Gita — Beginner's Guide",
        description: "Where to start, which translation to choose, and a proven daily reading plan.",
        path,
        inLanguage: "en",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "How to Read", path: "/how-to-read" },
        { name: "Bhagavad Gita", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/texts/bhagavad-gita" className="hover:text-primary">Bhagavad Gita</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">How to read</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">Beginner's Guide</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            How to Read the Bhagavad Gita
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            A proven, no-nonsense plan for reading the Gita for the first time — where to start,
            which edition to pick, and how much to read each day.
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-8">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Step 1 — Start with Chapter 2</h2>
            <p>
              Chapter 1 (Arjuna Vishada Yoga) is Arjuna's despair on the battlefield — necessary
              context, but not the teaching itself. The philosophical core begins in Chapter 2
              (Sankhya Yoga) where Krishna introduces the immortality of the atman, karma yoga, and
              the stitha-prajna — the person of steady wisdom. Read Chapter 2 first, then return to
              Chapter 1 and continue in order. This single change makes the Gita much easier to grasp.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Step 2 — Choose one trusted translation</h2>
            <p>Read one edition all the way through before switching. Recommended:</p>
            <ul>
              <li><strong>Hindi:</strong> Gita Press Gorakhpur — the gold standard.</li>
              <li><strong>English (devotional):</strong> Paramahansa Yogananda, <em>God Talks with Arjuna</em>.</li>
              <li><strong>English (philosophical):</strong> Swami Chinmayananda, <em>The Holy Geeta</em>.</li>
              <li><strong>English (poetic):</strong> Eknath Easwaran translation.</li>
              <li><strong>English (short):</strong> Swami Prabhavananda &amp; Christopher Isherwood.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Step 3 — Follow a 21-day reading plan</h2>
            <p>The Gita has 18 chapters. A sustainable schedule:</p>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Days</th><th>What to read</th><th>Why</th></tr>
                </thead>
                <tbody>
                  <tr><td>Day 1</td><td>Chapter 2 — Sankhya Yoga</td><td>The philosophical core of the whole Gita</td></tr>
                  <tr><td>Days 2–3</td><td>Chapters 1 and 3</td><td>Context, then karma yoga in practice</td></tr>
                  <tr><td>Days 4–18</td><td>One chapter per day, in order</td><td>Steady 15–30 minute sessions</td></tr>
                  <tr><td>Days 19–21</td><td>Re-read Chapters 2, 12, 18</td><td>Wisdom, devotion and liberation summarised</td></tr>
                </tbody>
              </table>
            </div>
            <p>15–30 minutes a day is enough. Consistency matters more than duration.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">How to read the Bhagavad Gita in Hindi</h2>
            <p>
              हिंदी पाठकों के लिए क्रम सरल है — पहले श्लोक का हिंदी अनुवाद पढ़ें, फिर संस्कृत श्लोक को
              धीरे-धीरे उच्चारण के साथ पढ़ें, और अंत में भावार्थ पर 5 मिनट चिंतन करें। रोज़ एक अध्याय
              इसी विधि से पढ़ने पर 18 दिन में पूरी गीता पूर्ण हो जाती है। GyandootNova के ऑनलाइन रीडर
              में हिंदी अनुवाद के साथ अध्याय-वार पाठ उपलब्ध है।
            </p>
          </section>


          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Step 4 — Reflect, don't rush</h2>
            <p>
              After each chapter, sit quietly for 5 minutes with one verse that struck you. Write it
              down. The Gita is not a novel; each shloka is meant to be chewed and digested. Reading
              the whole book once is a good start; contemplating one chapter deeply for a month
              transforms understanding.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Step 5 — Return to it every year</h2>
            <p>
              The Gita reveals different meanings at different stages of life. Practitioners read it
              annually — often during Gita Jayanti (Margashirsha Shukla Ekadashi). Each reading is
              genuinely new.
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">
            Start reading today
          </p>
          <p className="mt-1 text-base md:text-lg leading-relaxed">
            Open the Bhagavad Gita on GyandootNova — Chapter 2 (the philosophical core) is free to
            read online, no signup required.
          </p>
          <Link
            to="/books"
            className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse the reader →
          </Link>
        </div>

        <FaqAccordion items={faqs} />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Related reading</h2>
          <ul className="space-y-2">
            <li><Link to="/texts/bhagavad-gita" className="text-primary hover:underline">Bhagavad Gita — full guide, chapters and author →</Link></li>
            <li><Link to="/qa/who-wrote-bhagavad-gita" className="text-primary hover:underline">Who wrote the Bhagavad Gita? →</Link></li>
            <li><Link to="/qa/how-many-slokas-in-bhagavad-gita" className="text-primary hover:underline">How many slokas are in the Bhagavad Gita? →</Link></li>
            <li><Link to="/texts/upanishads" className="text-primary hover:underline">The Upanishads — the philosophical foundation of the Gita →</Link></li>
            <li><Link to="/hindi/dhyan-kaise-karein" className="text-primary hover:underline">ध्यान कैसे करें — Meditation guide in Hindi →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default HowToReadBhagavadGita;
