import QAPage from "@/components/QAPage";

const WhoWroteVedas = () => (
  <QAPage
    slug="who-wrote-vedas"
    question="Who wrote the Vedas?"
    shortAnswer="The Vedas have no single human author. They are called apaurusheya — 'not of human origin' — and are believed to have been revealed to many rishis (seers) in deep meditation. Maharishi Veda Vyasa later organized the vast body of mantras into four collections: Rig, Sama, Yajur and Atharva."
    seoTitle="Who Wrote the Vedas? Author, Origin & Composers Explained"
    seoDescription="The Vedas were not written by any single person. They are apaurusheya — revealed to rishis. Learn about Vishvamitra, Vasishtha, Vyasa and the true origin of the four Vedas."
    sections={[
      {
        heading: "Apaurusheya — 'not of human authorship'",
        body: "Sanatana Dharma holds that the Vedas were not composed by human minds. They are apaurusheya — eternal cosmic knowledge that was 'heard' (shruti) by rishis in states of deep meditative absorption. The rishis are therefore called drashta — 'seers' — not kartā ('authors'). This is why the Vedas are treated as revealed knowledge, comparable to the way other traditions view scripture as divinely revealed.",
      },
      {
        heading: "The rishis who received the mantras",
        body: "Hundreds of rishis are named as recipients of Vedic mantras. Among the most prominent: Vishvamitra (received the Gayatri mantra, Rig Veda 3.62.10), Vasishtha (Mandala 7 of the Rig Veda), Atri (Mandala 5), Bharadvaja (Mandala 6), Gritsamada (Mandala 2), Vamadeva (Mandala 4), and the female seers Ghosha, Apala, Lopamudra and Vishvavara. Each mandala of the Rig Veda has a specific rishi (or family of rishis) associated with it.",
      },
      {
        heading: "Veda Vyasa — the compiler, not the author",
        body: "Maharishi Krishna Dvaipayana earned the title Veda Vyasa — literally 'divider of the Vedas' — because he organized the enormous body of accumulated mantras into four distinct collections: Rig, Sama, Yajur and Atharva. His role was editorial. He did not compose the mantras; he arranged them for preservation and ritual use.",
      },
      {
        heading: "How were the Vedas preserved without writing?",
        body: "For over a thousand years the Vedas were preserved entirely by oral transmission — recited by memory from teacher to student with zero variation. This was achieved using specialized recitation techniques: samhita-patha (continuous), pada-patha (word by word), krama-patha (each word paired with the next), jata-patha, and ghana-patha (each word interwoven multiple times). These built-in checksums make the Vedas one of the most textually stable documents in human history.",
      },
    ]}
    faqs={[
      {
        question: "Did Vyasa write the Vedas?",
        answer: "No. Vyasa organized (divided) the existing mantras into four collections. He is called the compiler of the Vedas, not their author. The mantras themselves are attributed to many rishis.",
      },
      {
        question: "How old are the Vedas?",
        answer: "The Rig Veda's core hymns are dated by mainstream linguistics to roughly 1500–1200 BCE. Traditional chronology places them much earlier. Either way, they are among the oldest surviving religious texts in the world.",
      },
      {
        question: "Were any women rishis mentioned as Veda authors?",
        answer: "Yes. The Rig Veda names at least 27 female rishis (called rishikas or brahmavadinis) including Ghosha, Apala, Lopamudra, Vishvavara, Godha and Romasha. They are the recipients of specific hymns and are named alongside male rishis.",
      },
      {
        question: "Who wrote the Rig Veda specifically?",
        answer: "The Rig Veda is a collection of hymns from many rishis. Vishvamitra received the Gayatri mantra; Vasishtha, Atri, Bharadvaja, Gritsamada and Vamadeva each authored one of the 'family books' (Mandalas 2–7). Mandalas 1 and 10 combine hymns from many seers.",
      },
    ]}
    readerCta={{
      label: "Explore Vedic literature",
      description: "Read authoritative Hindi editions of the Vedas and Upanishads — free preview chapters on GyandootNova.",
      to: "/books",
    }}
    related={[
      { label: "The four Vedas — full guide", to: "/texts/vedas" },
      { label: "Rig Veda — the oldest Veda, 1028 hymns", to: "/texts/rig-veda" },
      { label: "How many Vedas are there?", to: "/qa/how-many-vedas" },
      { label: "वेद का अर्थ हिंदी में", to: "/hindi/vedas-meaning-in-hindi" },
    ]}
  />
);

export default WhoWroteVedas;
