import TextHub from "@/components/TextHub";

const Upanishads = () => (
  <TextHub
    slug="upanishads"
    english="The Upanishads"
    hindi="उपनिषद्"
    sanskrit="उपनिषद्"
    tagline="The philosophical heart of the Vedas — dialogues on Brahman, Atman and the nature of reality."
    seoTitle="The Upanishads — Meaning, Number, Author & Key Teachings"
    seoDescription="Complete guide to the Upanishads: what the word means, how many exist, who wrote them, and the main teachings. Available in Hindi and English on GyandootNova."
    intro="The Upanishads are the philosophical culmination of the Vedas. Composed between roughly 800 and 200 BCE as recorded dialogues between teacher and student, they explore the nature of ultimate reality (Brahman), the innermost self (Atman) and the identity between the two — the insight expressed in the mahavakya 'Tat Tvam Asi' (That Thou Art)."
    sections={[
      {
        heading: "What is the Upanishad?",
        body: "The word Upanishad comes from three Sanskrit parts: upa (near), ni (down) and sad (to sit) — literally 'sitting down near', meaning a student sitting close to a teacher to receive esoteric knowledge. The Upanishads are therefore the recorded conversations in which the deepest Vedic teachings were transmitted from guru to disciple.",
      },
      {
        heading: "How many Upanishads are there?",
        body: "The Muktikā Upanishad lists 108 Upanishads in total. Of these, 10 are considered principal or 'mukhya' Upanishads and are commented on by Adi Shankaracharya: Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya and Brihadaranyaka.",
      },
      {
        heading: "Which is the oldest Upanishad?",
        body: "The Brihadaranyaka Upanishad and the Chandogya Upanishad are generally considered the oldest, both dating to roughly the 8th–7th century BCE. Brihadaranyaka is also the longest of the principal Upanishads and contains the famous dialogue between the sage Yajnavalkya and his wife Maitreyi.",
      },
      {
        heading: "Who wrote the Upanishads?",
        body: "The Upanishads have no single author. They preserve the teachings of many sages including Yajnavalkya, Uddalaka Aruni, Shvetaketu, Sanatkumara and others. Like the rest of the Vedas they are considered śruti — revealed knowledge — and were transmitted orally for centuries before being written down.",
      },
      {
        heading: "Main teachings of the Upanishads",
        body: "Three ideas run through every principal Upanishad. Brahman is the one ultimate reality underlying all existence. Atman is the innermost self of every being. Atman is Brahman — the individual self and the absolute are identical, and realising this identity is moksha (liberation). The Upanishads teach that this realisation is achieved through discrimination (viveka), dispassion (vairagya) and meditation (dhyana), not through ritual alone.",
      },
      {
        heading: "Are Upanishads part of the Vedas?",
        body: "Yes. Each Upanishad belongs to one of the four Vedas and forms the fourth and final layer of that Veda — after the Samhitas, Brahmanas and Aranyakas. Because they conclude the Vedic corpus, the Upanishads are collectively called Vedanta — 'the end of the Vedas'.",
      },
    ]}
    faqs={[
      {
        question: "How many Upanishads are there?",
        answer: "There are 108 Upanishads in total, as listed in the Muktikā Upanishad. Of these, 10 are principal Upanishads commented on by Adi Shankaracharya.",
      },
      {
        question: "What is the meaning of Upanishad?",
        answer: "Upanishad literally means 'sitting down near' — from upa (near), ni (down) and sad (to sit). It refers to a student sitting close to a teacher to receive sacred, esoteric knowledge.",
      },
      {
        question: "Who wrote the Upanishads?",
        answer: "The Upanishads have no single author. They record the teachings of many rishis including Yajnavalkya, Uddalaka Aruni and Sanatkumara, transmitted orally for centuries before being written down.",
      },
      {
        question: "Which is the oldest Upanishad?",
        answer: "The Brihadaranyaka and Chandogya Upanishads are generally considered the oldest, dating to roughly the 8th–7th century BCE.",
      },
      {
        question: "Are Upanishads part of the Vedas?",
        answer: "Yes. Each Upanishad is attached to one of the four Vedas as its concluding philosophical section, which is why the Upanishads are collectively called Vedanta ('the end of the Vedas').",
      },
      {
        question: "What are the main teachings of the Upanishads?",
        answer: "The Upanishads teach three linked ideas: Brahman is the one ultimate reality; Atman is the innermost self; Atman is Brahman. Realising this identity is moksha — liberation from the cycle of birth and death.",
      },
      {
        question: "How to pronounce Upanishad?",
        answer: "Upanishad is pronounced 'oo-puh-nee-shad' — four short syllables, with the emphasis on the second (nee).",
      },
    ]}
    bookMeta={{
      alternateName: ["उपनिषद्", "Upanishads", "Vedanta"],
      author: "Multiple rishis including Yajnavalkya, Uddalaka Aruni",
      language: "sa",
    }}
    readerCta={{
      label: "Read Upanishad commentaries",
      description: "Study the principal Upanishads in Hindi — verse-by-verse commentary with free preview chapters.",
      to: "/books",
    }}
    related={[
      { label: "The four Vedas — Rig, Sama, Yajur, Atharva", to: "/texts/vedas" },
      { label: "Rig Veda — the oldest Veda in detail", to: "/texts/rig-veda" },
      { label: "Bhagavad Gita — companion text of Vedanta", to: "/texts/bhagavad-gita" },
      { label: "How many Upanishads are there?", to: "/qa/how-many-upanishads" },
      { label: "उपनिषद का अर्थ हिंदी में", to: "/hindi/upanishad-meaning-in-hindi" },
    ]}
  />
);

export default Upanishads;
