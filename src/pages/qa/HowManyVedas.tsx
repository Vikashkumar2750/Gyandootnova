import QAPage from "@/components/QAPage";

const HowManyVedas = () => (
  <QAPage
    slug="how-many-vedas"
    question="How many Vedas are there?"
    shortAnswer="There are four Vedas: Rig Veda, Sama Veda, Yajur Veda and Atharva Veda. Each is subdivided into four parts — Samhita (mantras), Brahmana (ritual), Aranyaka (contemplation) and Upanishad (philosophy)."
    seoTitle="How Many Vedas Are There? Names, Order & Contents"
    seoDescription="There are 4 Vedas — Rig, Sama, Yajur and Atharva. Learn what each Veda contains, the four sections within every Veda, and the order in which they are traditionally studied."
    sections={[
      {
        heading: "The four Vedas",
        body: "There are exactly four Vedas, in this traditional order: Rig Veda (hymns of praise), Sama Veda (chants set to music), Yajur Veda (ritual prose formulas), and Atharva Veda (hymns for daily life, healing and protection). Together they form the Shruti — the revealed foundation of Sanatana Dharma.",
      },
      {
        heading: "What each Veda contains",
        body: "Rig Veda: 1,028 hymns to Agni, Indra, Varuna, Soma and other divine forces. Sama Veda: 1,875 verses (most drawn from the Rig) set to musical chant — the origin of Indian classical music. Yajur Veda: prose formulas (yajus) used by priests during yajna, in two branches — Shukla (white) and Krishna (black). Atharva Veda: 730 hymns covering medicine, healing mantras, protection charms, marriage, kingship, and philosophy.",
      },
      {
        heading: "The four parts within every Veda",
        body: "Each Veda has four internal divisions: (1) Samhita — the core collection of mantras; (2) Brahmana — prose commentaries explaining how mantras are used in ritual; (3) Aranyaka — 'forest books' for renunciates practicing in solitude; (4) Upanishad — philosophical dialogues on the nature of Brahman and atman. The Upanishad portions collectively form Vedanta.",
      },
      {
        heading: "Why exactly four, and not more?",
        body: "The Rig Veda itself refers to three Vedas — Rig, Sama and Yajur — collectively called the trayi vidya. The Atharva Veda was accepted as the fourth later, once its distinct role in healing and household life was formalized. Some sources also mention lost 'branches' (shakhas) of each Veda; only a few of the original branches survive intact today.",
      },
    ]}
    faqs={[
      {
        question: "Which Veda is the oldest?",
        answer: "The Rig Veda is the oldest of the four Vedas, composed roughly 1500–1200 BCE. The Sama and Yajur Vedas draw substantially from Rig Vedic material; the Atharva Veda contains the youngest layer.",
      },
      {
        question: "Which Veda is about music?",
        answer: "The Sama Veda is the Veda of chant and melody. It takes Rig Vedic verses and sets them to seven musical notes (sapta svara), making it the historical root of Indian classical music.",
      },
      {
        question: "Which Veda is about medicine?",
        answer: "The Atharva Veda contains the largest body of healing mantras, herbal knowledge, and Ayurvedic precursors. This is why Ayurveda is traditionally considered an Upaveda ('minor Veda') of the Atharva Veda.",
      },
      {
        question: "What are the Upavedas?",
        answer: "The four Upavedas are auxiliary bodies of knowledge, one for each Veda: Ayurveda (medicine, from Atharva), Dhanurveda (archery/warfare, from Yajur), Gandharvaveda (music/arts, from Sama), and Sthapatyaveda (architecture, from Rig).",
      },
      {
        question: "In what order should the Vedas be studied?",
        answer: "Traditionally: Rig first (as it is the source), then Sama, then Yajur, then Atharva. Modern seekers usually begin with the Upanishad portions (Vedanta) since they contain the direct philosophical teaching.",
      },
    ]}
    readerCta={{
      label: "Browse Vedic books",
      description: "Study the four Vedas and their Upanishads in Hindi — start with free preview chapters.",
      to: "/books",
    }}
    related={[
      { label: "The four Vedas — full guide", to: "/texts/vedas" },
      { label: "Rig Veda — the oldest Veda", to: "/texts/rig-veda" },
      { label: "Who wrote the Vedas?", to: "/qa/who-wrote-vedas" },
      { label: "How many Upanishads are there?", to: "/qa/how-many-upanishads" },
    ]}
  />
);

export default HowManyVedas;
