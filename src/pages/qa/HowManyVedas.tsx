import QAPage from "@/components/QAPage";

const HowManyVedas = () => (
  <QAPage
    slug="how-many-vedas"
    question="How many Vedas are there? Types and parts of the Vedas"
    shortAnswer="There are four Vedas — Rig Veda, Sama Veda, Yajur Veda and Atharva Veda. Every Veda is further divided into four parts: Samhita (mantras), Brahmana (ritual), Aranyaka (contemplation) and Upanishad (philosophy). So there are 4 types of Veda and 4 parts of Veda."
    seoTitle="How Many Vedas Are There? 4 Types & 4 Parts of Veda"
    seoDescription="There are 4 Vedas — Rig, Sama, Yajur, Atharva. Learn the 4 types of Veda, the 4 parts of every Veda (Samhita, Brahmana, Aranyaka, Upanishad), what each contains, and the order to study them."
    sections={[
      {
        heading: "How many Vedas are there? — four",
        body: "There are exactly four Vedas, in this traditional order: Rig Veda (hymns of praise), Sama Veda (chants set to music), Yajur Veda (ritual prose formulas), and Atharva Veda (hymns for daily life, healing and protection). Together they form the Shruti — the revealed foundation of Sanatana Dharma. When people ask how many types of Veda there are, this set of four is the answer.",
      },
      {
        heading: "The 4 types of Veda and what each contains",
        body: "Rig Veda: 1,028 hymns to Agni, Indra, Varuna, Soma and other divine forces. Sama Veda: 1,875 verses (most drawn from the Rig) set to musical chant — the origin of Indian classical music. Yajur Veda: prose formulas (yajus) used by priests during yajna, in two branches — Shukla (white) and Krishna (black). Atharva Veda: 730 hymns covering medicine, healing mantras, protection charms, marriage, kingship, and philosophy.",
      },
      {
        heading: "The 4 parts of every Veda (Samhita, Brahmana, Aranyaka, Upanishad)",
        body: "Each of the four Vedas has four internal parts: (1) Samhita — the core collection of mantras; (2) Brahmana — prose commentaries explaining how mantras are used in ritual; (3) Aranyaka — 'forest books' for renunciates practicing in solitude; (4) Upanishad — philosophical dialogues on the nature of Brahman and atman. These are the 4 parts of Veda referred to in traditional study, and the Upanishad portions collectively form Vedanta.",
      },
      {
        heading: "Quick summary table",
        body: (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Veda</th>
                  <th>Focus</th>
                  <th>Approx. size</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Rig Veda</td><td>Hymns of praise</td><td>1,028 hymns / 10 mandalas</td></tr>
                <tr><td>Sama Veda</td><td>Chant and melody</td><td>1,875 verses</td></tr>
                <tr><td>Yajur Veda</td><td>Ritual formulas</td><td>Shukla &amp; Krishna branches</td></tr>
                <tr><td>Atharva Veda</td><td>Healing, daily life</td><td>730 hymns / 20 books</td></tr>
              </tbody>
            </table>
            <p className="text-sm text-muted-foreground">
              Every row above is itself divided into the same four parts — Samhita, Brahmana,
              Aranyaka and Upanishad.
            </p>
          </div>
        ),
      },
      {
        heading: "Why exactly four, and not more?",
        body: "The Rig Veda itself refers to three Vedas — Rig, Sama and Yajur — collectively called the trayi vidya. The Atharva Veda was accepted as the fourth later, once its distinct role in healing and household life was formalized. Some sources also mention lost 'branches' (shakhas) of each Veda; only a few of the original branches survive intact today.",
      },
    ]}
    faqs={[
      {
        question: "How many types of Veda are there?",
        answer: "Four types: Rig Veda, Sama Veda, Yajur Veda and Atharva Veda. Each type serves a different purpose — praise, chant, ritual and daily life respectively.",
      },
      {
        question: "What are the 4 parts of the Vedas?",
        answer: "Samhita (mantra collection), Brahmana (ritual commentary), Aranyaka (forest/contemplative texts) and Upanishad (philosophy). Every one of the four Vedas contains all four parts.",
      },
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
      { label: "वेद का अर्थ — Hindi guide", to: "/hindi/vedas-meaning-in-hindi" },
    ]}
  />
);

export default HowManyVedas;
