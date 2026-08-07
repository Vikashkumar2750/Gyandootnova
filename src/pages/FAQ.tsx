import Layout from "@/components/layout/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import useSEO from "@/hooks/useSEO";
<<<<<<< HEAD
import { ShieldCheck, Lock, Infinity as InfinityIcon, RefreshCw } from "lucide-react";

const faqs = [
  {
    q: "Why isn't there a file to download?",
    a: "Because we put reader convenience first. Lose your phone, switch devices, or run out of storage — your library stays exactly where it is. Just sign in and start reading on any device. Pages don't break, fonts don't distort.",
  },
  {
    q: "Is access really for life?",
    a: "Yes. Once a title is added to your account, it stays forever. No monthly fee, no renewal. Any future revisions the author makes reach you at no extra cost.",
  },
  {
    q: "What if I don't enjoy the book?",
    a: "One message within the first 7 days is enough — a full refund is issued within 24 hours. No reason asked, no formalities.",
  },
  {
    q: "Is anything free?",
    a: "Absolutely. The first chapter of every paid title unlocks the moment you sign in. In addition, over 100 titles are fully free — look for the 'Free' tag.",
  },
  {
    q: "Which payment methods work?",
    a: "UPI, credit/debit card, net banking, and wallets all work. Razorpay for India and PayPal for international readers. Card details are never stored with us.",
  },
  {
    q: "Will reading on mobile strain my eyes?",
    a: "The reader is built with that in mind. A gentle night tint, adjustable font size, and 'resume where you left off' — long reading sessions stay comfortable.",
  },
  {
    q: "How reliable are your translations?",
    a: "Every text is first vetted by Sanskrit scholars, then rendered into clear, modern English. The original shloka sits alongside so readers can verify. Any reported error is corrected in the next revision.",
  },
  {
    q: "What if the website shuts down someday?",
    a: "GyandootNova is a duly registered Indian entity and grows steadily. Even so — for any major change, readers receive a 90-day advance notice by email, so nothing feels abrupt.",
  },
  {
    q: "Do I need to create an account?",
    a: "Yes, but it takes half a minute. Google sign-in works in a single tap. Your account keeps your bookmarks, notes, and half-read books all safe.",
  },
  {
    q: "How do I suggest a new title?",
    a: "Write to us via the contact form or WhatsApp. The editorial team reads every suggestion. Last month, 12 new titles were added on reader requests.",
  },
  {
    q: "Can I highlight or take notes while reading?",
    a: "Yes. Select any line to highlight it or add a short note. Everything is right there next time you sign in — your own private digital library.",
  },
  {
    q: "How do I buy multiple books or gift one?",
    a: "Add 3 or more titles at once and the discount applies automatically. To gift a title to a loved one, contact us — we'll prepare a gift link.",
=======

const faqs = [
  {
    q: "How can I read books on GyandootNova?",
    a: "All books on GyandootNova are readable online directly in your browser. Simply visit the book page, select a chapter, and start reading. Our reader supports font size adjustments, dark/light mode, and tracks your reading progress.",
  },
  {
    q: "Are the books available for download?",
    a: "No, books are available for online reading only. This helps us protect the authors' content and ensure the best reading experience on our platform.",
  },
  {
    q: "Are there free books available?",
    a: "Yes! Many of our books are completely free to read. Look for the 'Free' badge on book cards. Premium books require a one-time purchase.",
  },
  {
    q: "How do I purchase a paid book?",
    a: "Click on the book you wish to read, then click 'Purchase to Read'. You'll be directed to our secure Razorpay payment gateway. Once payment is confirmed, the full book becomes accessible in your account.",
  },
  {
    q: "Can I donate to support GyandootNova?",
    a: "Absolutely! Visit our Donate page to contribute any amount. Your donations help us publish more spiritual books and make knowledge accessible to all seekers.",
  },
  {
    q: "Do I need an account to read books?",
    a: "Free preview chapters are accessible without an account. However, to read full books (free or purchased), you'll need to create a free account.",
  },
  {
    q: "What types of content does GyandootNova publish?",
    a: "We publish spiritual books, articles, discourses, and program guides covering topics like meditation, self-realization, dharma, yoga, and conscious living.",
  },
  {
    q: "How can I contact GyandootNova for queries?",
    a: "You can reach us via email at contact@gyandootnova.com or use the contact form on our Contact page. We typically respond within 24-48 hours.",
  },
  {
    q: "Is there a refund policy for purchased books?",
    a: "Yes, we offer refunds within 7 days of purchase if you haven't read more than 20% of the book. Please visit our Refund & Cancellation Policy page for details.",
  },
  {
    q: "Can I suggest a book or topic?",
    a: "We welcome suggestions! Please reach out to us through the Contact page with your recommendations, and our editorial team will review them.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.a,
    },
  })),
};

const FAQ = () => {
  useSEO({
<<<<<<< HEAD
    title: "Frequently Asked Questions — GyandootNova",
    description:
      "Straight answers about reading, payment, refunds and accounts — no runaround, nothing hidden.",
=======
    title: "FAQ — GyandootNova Spiritual Books & Reading Platform",
    description: "Find answers about reading books online, purchases, payments, account issues & more at GyandootNova. Dharmik granth FAQ.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    canonical: "/faq",
    jsonLd: faqJsonLd,
  });

  return (
    <Layout>
<<<<<<< HEAD
      <main className="container py-12 md:py-16 max-w-3xl mx-auto">
=======
      <main className="container py-16 max-w-3xl mx-auto">
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a href="/" itemProp="item"><span itemProp="name">Home</span></a>
              <meta itemProp="position" content="1" />
            </li>
<<<<<<< HEAD
            <li className="text-muted-foreground" aria-hidden="true">/</li>
=======
            <li className="text-muted-foreground/50">/</li>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-foreground font-medium">FAQ</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>

<<<<<<< HEAD
        <section className="text-center mb-10">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-primary mb-3">
            Every question, answered clearly
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Ask everything before you spend — we answer straight.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs md:text-sm text-foreground/80">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> 7-day full refund</span>
            <span className="inline-flex items-center gap-1.5"><InfinityIcon className="h-4 w-4 text-primary" /> Lifetime access</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" /> Secure payment</span>
            <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-primary" /> Free future editions</span>
          </div>
=======
        <section className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about GyandootNova.
          </p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        </section>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
<<<<<<< HEAD
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/75 leading-relaxed text-[15px]">
=======
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium text-foreground">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
<<<<<<< HEAD

        <div className="mt-12 rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 md:p-8 text-center">
          <h2 className="font-serif text-xl md:text-2xl font-bold text-foreground">Still have a question?</h2>
          <p className="mt-2 text-sm text-muted-foreground">WhatsApp or email — whichever suits you. Reply the same day.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/contact" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
              Talk to us
            </a>
            <a href="/books" className="inline-flex items-center justify-center rounded-md border-2 border-primary px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground">
              Browse the library →
            </a>
          </div>
        </div>
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      </main>
    </Layout>
  );
};

export default FAQ;
