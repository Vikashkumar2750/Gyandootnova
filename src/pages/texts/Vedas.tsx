import TextHub from "@/components/TextHub";

const Vedas = () => (
  <TextHub
    slug="vedas"
    english="The Four Vedas"
    hindi="चारों वेद"
    sanskrit="वेदाः"
    tagline="The oldest sacred texts of Hinduism — Rig, Sama, Yajur and Atharva — the foundation of Sanatana Dharma."
    seoTitle="The Four Vedas — Rig, Sama, Yajur & Atharva Explained"
    seoDescription="Complete introduction to the four Vedas — how many there are, who wrote them, which is oldest, and what each Veda contains. Trusted guide from GyandootNova."
    intro="The Vedas are the oldest scriptures of Hinduism and the primary source of Sanatana Dharma. Composed in Vedic Sanskrit and preserved by oral tradition for millennia, the four Vedas — Rigveda, Samaveda, Yajurveda and Atharvaveda — form the śruti (that which was heard) canon and remain the ultimate authority for Hindu philosophy, ritual and cosmology."
    sections={[
      {
        heading: "How many Vedas are there?",
        body: "There are four Vedas: Rigveda, Samaveda, Yajurveda and Atharvaveda. Each Veda has four subdivisions — Samhitas (hymns), Brahmanas (ritual manuals), Aranyakas (forest treatises) and Upanishads (philosophical dialogues).",
      },
      {
        heading: "Which is the oldest Veda?",
        body: "The Rigveda is the oldest of the four Vedas, and one of the oldest religious texts in continuous use anywhere in the world. Its 1,028 hymns (suktas) are traditionally dated to roughly 1500–1200 BCE, with some hymns considered even older. UNESCO added the tradition of Vedic chanting to its Representative List of the Intangible Cultural Heritage of Humanity in 2008.",
      },
      {
        heading: "Who wrote the Vedas?",
        body: "The Vedas are considered apauruṣeya — 'not of human origin' — revealed to the ancient rishis (seers) in deep meditation. The hymns of the Rigveda are attributed to families of rishis including Vishwamitra, Vasistha, Bharadvaja, Atri, Gritsamada, Kanva and Angiras. The sage Veda Vyasa (Krishna Dvaipayana) is credited with dividing the vast body of Vedic mantras into the four Vedas we know today.",
      },
      {
        heading: "What does each Veda contain?",
        body: "Rigveda contains 1,028 hymns of praise to the Vedic deities. Samaveda is the Veda of melody — most of its verses are drawn from the Rigveda and set to musical notation for chanting. Yajurveda gives the sacrificial formulas (yajus) used by priests in ritual. Atharvaveda contains hymns for daily life — healing, protection, prosperity and philosophical speculation.",
      },
      {
        heading: "When were the Vedas written down?",
        body: "For thousands of years the Vedas were preserved entirely by memory using elaborate mnemonic techniques (pada, krama, jata and ghana pathas) that produced flawless transmission. They were first committed to writing much later — most scholars date the earliest manuscripts to the 1st millennium CE, though the oral tradition is far older.",
      },
    ]}
    faqs={[
      {
        question: "How many Vedas are there?",
        answer: "There are four Vedas: Rigveda, Samaveda, Yajurveda and Atharvaveda.",
      },
      {
        question: "What are the 4 main Vedas?",
        answer: "The four main Vedas are Rigveda (hymns of praise), Samaveda (melodic chants), Yajurveda (ritual formulas) and Atharvaveda (hymns for daily life and healing).",
      },
      {
        question: "Which is the oldest Veda?",
        answer: "The Rigveda is the oldest of the four Vedas, traditionally dated to roughly 1500–1200 BCE and considered one of the oldest religious texts in continuous use.",
      },
      {
        question: "Who wrote the Vedas?",
        answer: "The Vedas were not authored by any single human — they are considered apauruṣeya (not of human origin), revealed to ancient rishis in deep meditation. Sage Veda Vyasa is credited with organising the mantras into the four Vedas we have today.",
      },
      {
        question: "When were the Vedas written?",
        answer: "The Vedic hymns were composed roughly between 1500 BCE and 500 BCE and preserved orally for centuries. They were first committed to writing in the 1st millennium CE.",
      },
      {
        question: "What is the meaning of Veda?",
        answer: "The Sanskrit word 'Veda' comes from the root vid, meaning 'to know'. So 'Veda' literally means 'knowledge' — specifically, the sacred knowledge revealed to the rishis.",
      },
      {
        question: "What is Atharvaveda?",
        answer: "The Atharvaveda is the fourth Veda. Unlike the other three, which focus on ritual sacrifice, the Atharvaveda contains hymns and mantras for daily life — healing illness, ensuring prosperity, protection from harm and philosophical questions about the nature of reality.",
      },
      {
        question: "How many types of Vedas are there?",
        answer: "There are four types (or four Vedas): Rigveda, Samaveda, Yajurveda and Atharvaveda. Each Veda is further divided into Samhitas, Brahmanas, Aranyakas and Upanishads.",
      },
    ]}
    bookMeta={{
      alternateName: ["वेद", "Vedas", "चारों वेद"],
      author: "Rishis (revealed); compiled by Veda Vyasa",
      language: "sa",
    }}
    readerCta={{
      label: "Read Vedic literature online",
      description: "Explore Hindi editions of the Vedas, Upanishads and related scriptures — free preview chapters, verse-by-verse commentary.",
      to: "/books",
    }}
    related={[
      { label: "Rig Veda — the oldest Veda, in detail", to: "/texts/rig-veda" },
      { label: "Upanishads — the philosophical crown of the Vedas", to: "/texts/upanishads" },
      { label: "Bhagavad Gita — meaning, chapters and how to read", to: "/texts/bhagavad-gita" },
      { label: "How many Vedas are there?", to: "/qa/how-many-vedas" },
      { label: "Who wrote the Vedas?", to: "/qa/who-wrote-vedas" },
      { label: "उपनिषद का अर्थ (Upanishad meaning in Hindi)", to: "/hindi/upanishad-meaning-in-hindi" },
      { label: "वेद का अर्थ (Vedas meaning in Hindi)", to: "/hindi/vedas-meaning-in-hindi" },
    ]}
  />
);

export default Vedas;
