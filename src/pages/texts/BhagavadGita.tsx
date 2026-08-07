import TextHub from "@/components/TextHub";

const BhagavadGita = () => (
  <TextHub
    slug="bhagavad-gita"
    english="Bhagavad Gita"
    hindi="भगवद्‌ गीता"
    sanskrit="भगवद्गीता"
    tagline="The 700-verse dialogue between Krishna and Arjuna on duty, devotion and the path to liberation."
    seoTitle="Bhagavad Gita — Chapters, Meaning, Author & How to Read"
    seoDescription="Complete guide to the Bhagavad Gita: 18 chapters, 700 shlokas, who wrote it, what it teaches, and how to read it. Available in Hindi, English and Sanskrit on GyandootNova."
    intro="The Bhagavad Gita is a 700-verse Sanskrit scripture that forms part of the Mahabharata (Bhishma Parva, chapters 23–40). Spoken by Lord Krishna to the warrior Arjuna on the Kurukshetra battlefield, it is the single most-read spiritual text in India and one of the most-translated works in world literature."
    sections={[
      {
        heading: "Who wrote the Bhagavad Gita?",
        body: "Tradition attributes the Bhagavad Gita to the sage Veda Vyasa, who is also credited with compiling the four Vedas and composing the Mahabharata. Vyasa is said to have dictated the entire Mahabharata — including the Gita — to Lord Ganesha. Scholars date the text between the 5th and 2nd century BCE.",
      },
      {
        heading: "How many chapters and shlokas are in the Gita?",
        body: "The Bhagavad Gita has 18 chapters (called Adhyayas) and 700 verses (shlokas) in total. The chapters are grouped into three sections of six chapters each — Karma Yoga (action), Bhakti Yoga (devotion) and Jnana Yoga (knowledge) — corresponding to the three paths to liberation.",
      },
      {
        heading: "What does the Bhagavad Gita teach?",
        body: "The Gita answers a single question: how should one act when duty conflicts with attachment? Krishna's answer synthesizes Karma (selfless action), Bhakti (loving devotion) and Jnana (self-knowledge) into an integrated spiritual practice. Central teachings include the immortality of the atman (self), the necessity of nishkama karma (action without attachment to results), and surrender to the Divine.",
      },
      {
        heading: "How to read the Bhagavad Gita for the first time",
        body: "Beginners are best served by reading a translation with commentary — Swami Chinmayananda, Eknath Easwaran and Paramahansa Yogananda all have accessible English editions; Gita Press's Hindi edition remains the most trusted in India. Start with Chapter 2 (the philosophical core), then read chapters 1–18 in order. A single chapter a day completes the Gita in under three weeks.",
      },
      {
        heading: "Best translations available online",
        body: "GyandootNova offers the Bhagavad Gita in Hindi with verse-by-verse commentary, alongside English and Sanskrit editions of related Vedic literature. See our online reader for free preview chapters.",
      },
    ]}
    faqs={[
      {
        question: "Who wrote the Bhagavad Gita?",
        answer: "The Bhagavad Gita is traditionally attributed to the sage Veda Vyasa, who compiled it as part of the Mahabharata. The verses themselves are Lord Krishna's teachings to the warrior Arjuna, spoken on the Kurukshetra battlefield.",
      },
      {
        question: "How many chapters are there in the Bhagavad Gita?",
        answer: "The Bhagavad Gita has 18 chapters, called Adhyayas, containing 700 verses (shlokas) in total.",
      },
      {
        question: "How many shlokas are in the Bhagavad Gita?",
        answer: "There are 700 shlokas in the Bhagavad Gita. Chapter 18 is the longest with 78 shlokas; Chapter 12 (Bhakti Yoga) is the shortest with 20 shlokas.",
      },
      {
        question: "How many pages is the Bhagavad Gita?",
        answer: "Page count varies by edition and language. Standard Hindi translations from Gita Press run 500–700 pages including commentary. Compact pocket editions with verse-only text run 200–250 pages.",
      },
      {
        question: "How to read the Bhagavad Gita?",
        answer: "Read one chapter a day with a trusted commentary — Swami Chinmayananda, Eknath Easwaran or Gita Press are widely recommended. Begin with Chapter 2 which contains the philosophical core, then proceed from Chapter 1 through 18 in order. Reflect after each reading rather than rushing.",
      },
      {
        question: "Can I read the Bhagavad Gita during periods, or on the bed?",
        answer: "Modern spiritual teachers including Swami Sivananda have repeatedly stated there are no scriptural restrictions on when or where a woman may read the Gita. The text is meant to be read whenever the mind is willing. Traditional customs vary by family; follow what brings you peace.",
      },
      {
        question: "Is the Bhagavad Gita real?",
        answer: "The Bhagavad Gita exists as a real, historically documented Sanskrit text dating from roughly 500–200 BCE. Whether the Kurukshetra battle it depicts is literal history or spiritual allegory is a question devotees and scholars answer differently — the philosophical teaching remains equally valid either way.",
      },
      {
        question: "Who translated the Bhagavad Gita into English first?",
        answer: "Charles Wilkins produced the first English translation of the Bhagavad Gita in 1785, published in London. Sir Edwin Arnold's verse translation 'The Song Celestial' (1885) became widely popular and influenced Mahatma Gandhi.",
      },
    ]}
    bookMeta={{
      alternateName: ["भगवद्‌ गीता", "श्रीमद्भगवद्गीता", "Shrimad Bhagavad Gita", "Bhagwat Geeta"],
      author: "Veda Vyasa",
      language: "sa",
      numberOfPages: 700,
    }}
    readerCta={{
      label: "Read the Bhagavad Gita online",
      description: "Study Hindi commentaries on the Bhagavad Gita — verse-by-verse, with free preview chapters. Perfect for a first-time reader.",
      to: "/books",
    }}
    related={[
      { label: "How to read the Bhagavad Gita — a beginner's guide", to: "/how-to-read/bhagavad-gita" },
      { label: "Who wrote the Bhagavad Gita?", to: "/qa/who-wrote-bhagavad-gita" },
      { label: "How many slokas are in the Bhagavad Gita?", to: "/qa/how-many-slokas-in-bhagavad-gita" },
      { label: "The four Vedas — an overview", to: "/texts/vedas" },
      { label: "Upanishads — the philosophical core of the Vedas", to: "/texts/upanishads" },
      { label: "ध्यान कैसे करें — शुरुआती लोगों के लिए गाइड", to: "/hindi/dhyan-kaise-karein" },
    ]}
  />
);

export default BhagavadGita;
