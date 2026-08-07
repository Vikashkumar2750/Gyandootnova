import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  type FAQItem,
} from "@/lib/jsonLd";

interface RelatedLink {
  label: string;
  to: string;
}

interface Props {
  slug: string; // /qa/<slug>
  question: string;
  shortAnswer: string;
  seoTitle: string;
  seoDescription: string;
  sections: { heading: string; body: string | React.ReactNode }[];
  faqs: FAQItem[];
  readerCta?: { label: string; description: string; to: string };
  related?: RelatedLink[];
  inLanguage?: string;
}

const QAPage = ({
  slug,
  question,
  shortAnswer,
  seoTitle,
  seoDescription,
  sections,
  faqs,
  readerCta,
  related,
  inLanguage = "en",
}: Props) => {
  const path = `/qa/${slug}`;
  const jsonLd = [
    buildArticleSchema({
      headline: question,
      description: seoDescription,
      path,
      inLanguage,
    }),
    buildFAQSchema([{ question, answer: shortAnswer }, ...faqs]),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Questions & Answers", path: "/qa" },
      { name: question, path },
    ]),
  ];

  useSEO({
    title: seoTitle,
    description: seoDescription,
    canonical: path,
    ogType: "article",
    jsonLd,
    hreflang: true,
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span>Q&amp;A</span>
          <span className="mx-2">/</span>
          <span className="text-foreground line-clamp-1">{question}</span>
        </nav>

        <header className="mb-6">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">
            Question &amp; Answer
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary mt-2 leading-tight">
            {question}
          </h1>
        </header>

        <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 md:p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">Short answer</p>
          <p className="mt-1 text-base md:text-lg leading-relaxed">{shortAnswer}</p>
        </div>

        <div className="mt-8 space-y-6 prose prose-lg max-w-none dark:prose-invert">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-serif text-2xl font-bold text-primary">{s.heading}</h2>
              {typeof s.body === "string" ? <p>{s.body}</p> : s.body}
            </section>
          ))}
        </div>

        {readerCta && (
          <div className="mt-10 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">
              Read the text yourself
            </p>
            <p className="mt-1 text-base md:text-lg">{readerCta.description}</p>
            <Link
              to={readerCta.to}
              className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {readerCta.label} →
            </Link>
          </div>
        )}

        <FaqAccordion items={faqs} />

        {related && related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-primary mb-4">Related questions</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.to}>
                  <Link to={r.to} className="text-primary hover:underline">
                    {r.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </Layout>
  );
};

export default QAPage;
