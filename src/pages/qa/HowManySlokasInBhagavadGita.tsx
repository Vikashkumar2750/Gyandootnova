import QAPage from "@/components/QAPage";

const HowManySlokasInBhagavadGita = () => (
  <QAPage
    slug="how-many-slokas-in-bhagavad-gita"
    question="How many slokas are in the Bhagavad Gita?"
    shortAnswer="The Bhagavad Gita contains 700 slokas (verses) distributed across 18 chapters. Chapter 18 (Moksha Sannyasa Yoga) is the longest with 78 verses; Chapter 12 (Bhakti Yoga) is the shortest with 20 verses."
    seoTitle="How Many Slokas Are in the Bhagavad Gita? Chapter-Wise Count"
    seoDescription="The Bhagavad Gita has 700 slokas in 18 chapters. See the exact verse count for every chapter, the longest and shortest chapters, and why one verse is counted separately."
    sections={[
      {
        heading: "700 slokas across 18 chapters",
        body: "The Bhagavad Gita has 700 verses (slokas) organized into 18 chapters (adhyayas). Some traditions count 701, including a single half-verse spoken by Sanjaya. The generally accepted count — used by Gita Press, ISKCON and academic editions — is 700. Every verse is composed in Sanskrit, primarily in the anushtubh meter (32 syllables per verse).",
      },
      {
        heading: "Chapter-wise sloka count",
        body: "Chapter 1 (Arjuna Vishada Yoga) — 47 verses. Chapter 2 (Sankhya Yoga) — 72. Chapter 3 (Karma Yoga) — 43. Chapter 4 (Jnana Karma Sannyasa Yoga) — 42. Chapter 5 (Karma Sannyasa Yoga) — 29. Chapter 6 (Dhyana Yoga) — 47. Chapter 7 (Jnana Vijnana Yoga) — 30. Chapter 8 (Akshara Brahma Yoga) — 28. Chapter 9 (Raja Vidya Yoga) — 34. Chapter 10 (Vibhuti Yoga) — 42. Chapter 11 (Vishwaroopa Darshana Yoga) — 55. Chapter 12 (Bhakti Yoga) — 20. Chapter 13 (Kshetra Kshetrajna Yoga) — 35. Chapter 14 (Gunatraya Vibhaga Yoga) — 27. Chapter 15 (Purushottama Yoga) — 20. Chapter 16 (Daivasura Sampad Yoga) — 24. Chapter 17 (Shraddhatraya Vibhaga Yoga) — 28. Chapter 18 (Moksha Sannyasa Yoga) — 78.",
      },
      {
        heading: "Longest and shortest chapters",
        body: "The longest chapter is Chapter 18 (Moksha Sannyasa Yoga) with 78 verses — Krishna's final summary and Arjuna's decision. The shortest chapters are Chapter 12 (Bhakti Yoga, 20 verses) and Chapter 15 (Purushottama Yoga, 20 verses). Chapter 12 is often recommended for daily recitation because of its brevity and its clear teaching on devotion.",
      },
      {
        heading: "Who speaks the verses?",
        body: "Of the 700 verses: Sri Krishna speaks 574, Arjuna speaks 84, Sanjaya (narrating to King Dhritarashtra) speaks 41, and Dhritarashtra himself speaks the opening verse — the only verse he speaks in the entire Gita. The whole text is technically Sanjaya's report to Dhritarashtra of a battlefield conversation.",
      },
    ]}
    faqs={[
      {
        question: "How many chapters are in the Bhagavad Gita?",
        answer: "The Bhagavad Gita has 18 chapters, called adhyayas, divided thematically into three groups of six: Karma Yoga (action, chapters 1–6), Bhakti Yoga (devotion, chapters 7–12), and Jnana Yoga (knowledge, chapters 13–18).",
      },
      {
        question: "How many words are in the Bhagavad Gita?",
        answer: "The Bhagavad Gita contains approximately 24,000 Sanskrit words. In English translation the word count varies from about 45,000 (verse-only) to 150,000+ (with detailed commentary).",
      },
      {
        question: "Which chapter of the Gita has the most verses?",
        answer: "Chapter 18 (Moksha Sannyasa Yoga) has the most verses — 78. It is Krishna's summary of the entire teaching and Arjuna's final decision to fight.",
      },
      {
        question: "Which chapter of the Gita is the most important?",
        answer: "Chapter 2 (Sankhya Yoga) contains the philosophical core — the immortality of the atman and the introduction to karma yoga. Chapter 12 (Bhakti Yoga) and Chapter 15 (Purushottama Yoga) are commonly memorized for daily recitation.",
      },
      {
        question: "How long does it take to recite all 700 slokas?",
        answer: "Continuous Sanskrit recitation of the entire Bhagavad Gita takes approximately 4 to 5 hours. Reading with reflection at one chapter per day completes the text in 18 days.",
      },
    ]}
    readerCta={{
      label: "Read the Gita online",
      description: "Study the Bhagavad Gita chapter by chapter in Hindi — free preview chapters on GyandootNova.",
      to: "/books",
    }}
    related={[
      { label: "Bhagavad Gita — full guide", to: "/texts/bhagavad-gita" },
      { label: "How to read the Bhagavad Gita — beginner's guide", to: "/how-to-read/bhagavad-gita" },
      { label: "Who wrote the Bhagavad Gita?", to: "/qa/who-wrote-bhagavad-gita" },
      { label: "How many Upanishads are there?", to: "/qa/how-many-upanishads" },
    ]}
  />
);

export default HowManySlokasInBhagavadGita;
