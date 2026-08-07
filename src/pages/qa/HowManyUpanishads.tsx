import QAPage from "@/components/QAPage";

const HowManyUpanishads = () => (
  <QAPage
    slug="how-many-upanishads"
    question="How many Upanishads are there?"
    shortAnswer="There are 108 Upanishads according to the Muktika Upanishad canon. Of these, 10 are considered the principal (mukhya) Upanishads because Adi Shankaracharya wrote commentaries on them: Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya and Brihadaranyaka."
    seoTitle="How Many Upanishads Are There? 108 Upanishads Explained"
    seoDescription="There are 108 Upanishads, of which 10 are principal. Learn the full list, which Upanishad belongs to which Veda, and why 108 is the traditional count."
    sections={[
      {
        heading: "108 Upanishads — the traditional count",
        body: "The Muktika Upanishad, itself an Upanishad addressed by Lord Rama to Hanuman, lists exactly 108 Upanishads. This is the canonical count accepted across all Vedanta traditions. The number 108 is itself sacred in Hindu, Buddhist and Jain traditions — appearing in mantra repetition (japa mala has 108 beads) and in temple architecture.",
      },
      {
        heading: "The 10 Principal (mukhya) Upanishads",
        body: "Adi Shankaracharya (8th century) wrote formal Sanskrit commentaries on 10 Upanishads, elevating them to 'mukhya' status: Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya, and Brihadaranyaka. These 10 are the primary source of Advaita Vedanta and are what most people mean when they say 'the Upanishads'. Some traditions add the Shvetashvatara and Kaushitaki, giving 12 or 13.",
      },
      {
        heading: "Which Upanishad belongs to which Veda?",
        body: "Rig Veda: Aitareya, Kaushitaki. Yajur Veda (Shukla): Brihadaranyaka, Isha. Yajur Veda (Krishna): Katha, Taittiriya, Shvetashvatara. Sama Veda: Chandogya, Kena. Atharva Veda: Mundaka, Prashna, Mandukya. Every Upanishad forms the concluding philosophical portion of one of the four Vedas — which is why they are collectively called Vedanta ('the end/culmination of the Vedas').",
      },
      {
        heading: "Sectarian Upanishads within the 108",
        body: "The 108 include several thematic groups: Samanya (general Vedanta), Yoga (methods of practice — e.g. Yogatattva, Dhyanabindu), Sannyasa (renunciation), Vaishnava (devotion to Vishnu), Shaiva (devotion to Shiva), and Shakta (devotion to the Divine Mother). This diversity is why the Upanishadic literature is often called the most philosophically rich body of religious writing in the ancient world.",
      },
    ]}
    faqs={[
      {
        question: "Which is the oldest Upanishad?",
        answer: "The Brihadaranyaka and Chandogya Upanishads are considered the oldest, dating to roughly 800–600 BCE. Both contain the famous dialogues of the sage Yajnavalkya and the teaching 'Tat Tvam Asi' — 'That Thou Art'.",
      },
      {
        question: "Which is the shortest Upanishad?",
        answer: "The Mandukya Upanishad is the shortest at just 12 verses. It analyzes the sacred syllable OM and the four states of consciousness — waking, dream, deep sleep, and turiya (the fourth, pure awareness). Despite its length, it is considered one of the most profound.",
      },
      {
        question: "Which Upanishads did Shankaracharya comment on?",
        answer: "Adi Shankaracharya wrote commentaries on 10 Upanishads: Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya, and Brihadaranyaka. These are known as the 10 principal Upanishads.",
      },
      {
        question: "Are the Upanishads part of the Vedas?",
        answer: "Yes. Each Upanishad is the concluding philosophical section of a specific Veda. This is why they are collectively called Vedanta — 'the end of the Vedas' — meaning both their literal position and their status as the philosophical culmination.",
      },
      {
        question: "What language are the Upanishads written in?",
        answer: "The Upanishads are written in Sanskrit — a mix of late Vedic Sanskrit (in the oldest Upanishads) and Classical Sanskrit (in later ones).",
      },
    ]}
    readerCta={{
      label: "Read Upanishad commentaries",
      description: "Study the principal Upanishads in Hindi with verse-by-verse commentary — free preview chapters available.",
      to: "/books",
    }}
    related={[
      { label: "Upanishads — full English guide", to: "/texts/upanishads" },
      { label: "उपनिषद का अर्थ हिंदी में", to: "/hindi/upanishad-meaning-in-hindi" },
      { label: "How many Vedas are there?", to: "/qa/how-many-vedas" },
      { label: "Who wrote the Vedas?", to: "/qa/who-wrote-vedas" },
    ]}
  />
);

export default HowManyUpanishads;
