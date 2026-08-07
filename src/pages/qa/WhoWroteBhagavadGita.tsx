import QAPage from "@/components/QAPage";

const WhoWroteBhagavadGita = () => (
  <QAPage
    slug="who-wrote-bhagavad-gita"
    question="Who wrote the Bhagavad Gita?"
    shortAnswer="The Bhagavad Gita is traditionally attributed to the sage Veda Vyasa, who compiled it as part of the Mahabharata around the 5th–2nd century BCE. The verses themselves are the words of Lord Krishna spoken to the warrior Arjuna on the Kurukshetra battlefield."
    seoTitle="Who Wrote the Bhagavad Gita? Author, Date & History"
    seoDescription="Veda Vyasa wrote the Bhagavad Gita as part of the Mahabharata around 500–200 BCE. Learn about Vyasa, why the text is 'spoken by Krishna', and how it was preserved."
    sections={[
      {
        heading: "Veda Vyasa — the traditional author",
        body: "The Bhagavad Gita is attributed to Maharishi Veda Vyasa (also called Krishna Dvaipayana Vyasa), the sage credited with compiling the four Vedas, composing the Mahabharata, and authoring the 18 Puranas. Within the Mahabharata, the Gita appears in the Bhishma Parva (Book 6), chapters 23–40 — 700 verses framed as a conversation between Lord Krishna and the warrior Arjuna on the battlefield of Kurukshetra.",
      },
      {
        heading: "Who was Veda Vyasa?",
        body: "Vyasa (literally 'the compiler') was the son of Rishi Parashara and Satyavati. He is one of the seven immortals (chiranjeevi) in Hindu tradition. According to legend, he dictated the entire Mahabharata to Lord Ganesha, who wrote it down. The Gita is embedded within this larger epic — spoken by Krishna, narrated by Sanjaya to the blind king Dhritarashtra, and recorded by Vyasa.",
      },
      {
        heading: "When was the Bhagavad Gita written?",
        body: "Mainstream scholars date the Bhagavad Gita to roughly 500–200 BCE based on linguistic and doctrinal features. Traditional Hindu chronology places the Kurukshetra war — and therefore the Gita's spoken origin — at approximately 3138 BCE, at the transition from Dwapara Yuga to Kali Yuga. The text as we have it today has been remarkably stable for over 2,000 years.",
      },
      {
        heading: "'Written by' vs 'spoken by'",
        body: "A subtle but important distinction: the Gita's teaching is spoken by Krishna (Bhagavan), narrated by Sanjaya, and written down by Vyasa. When Hindus say 'Krishna gave us the Gita', they mean the wisdom itself is Krishna's; the literary work is Vyasa's compilation.",
      },
    ]}
    faqs={[
      {
        question: "Did Krishna write the Bhagavad Gita?",
        answer: "Krishna spoke the teachings but did not write them. The verses were recorded by Veda Vyasa within the Mahabharata. In tradition, Krishna's role is that of the divine teacher; Vyasa's role is that of the compiler.",
      },
      {
        question: "Is Veda Vyasa a real historical person?",
        answer: "Vyasa is considered a real historical sage in the Hindu tradition, though also a title. Some scholars argue 'Vyasa' was passed down across generations of editors of the Vedic corpus. Either way, the Bhagavad Gita's textual transmission is unusually well documented.",
      },
      {
        question: "Who wrote the commentaries on the Bhagavad Gita?",
        answer: "The three most influential Sanskrit commentaries were written by Adi Shankaracharya (8th century, Advaita), Ramanujacharya (11th century, Vishishtadvaita), and Madhvacharya (13th century, Dvaita). Modern commentaries include those of Swami Chinmayananda, Paramahansa Yogananda, and Bal Gangadhar Tilak.",
      },
      {
        question: "In what language was the Bhagavad Gita originally written?",
        answer: "The Bhagavad Gita was originally composed in Classical Sanskrit and is written in a poetic meter called anushtubh (32 syllables per verse), making it well suited to memorization and chanting.",
      },
    ]}
    readerCta={{
      label: "Read the Bhagavad Gita online",
      description: "Study Hindi commentaries on the Bhagavad Gita — free preview chapters available.",
      to: "/books",
    }}
    related={[
      { label: "Bhagavad Gita — full guide, chapters and meaning", to: "/texts/bhagavad-gita" },
      { label: "How to read the Bhagavad Gita — beginner's guide", to: "/how-to-read/bhagavad-gita" },
      { label: "How many slokas are in the Bhagavad Gita?", to: "/qa/how-many-slokas-in-bhagavad-gita" },
      { label: "Who wrote the Vedas?", to: "/qa/who-wrote-vedas" },
    ]}
  />
);

export default WhoWroteBhagavadGita;
