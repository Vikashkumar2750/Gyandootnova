import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import {
  buildArticleSchema,
  buildBookSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  type FAQItem,
} from "@/lib/jsonLd";
import { Card, CardContent } from "@/components/ui/card";

interface Section {
  heading: string;
  body: string | React.ReactNode;
}

interface RelatedLink {
  label: string;
  to: string;
}

interface Props {
  english: string;
  hindi: string;
  sanskrit?: string;
  slug: string; // /texts/<slug>
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  sections: Section[];
  faqs: FAQItem[];
  bookMeta: {
    alternateName?: string[];
    author?: string;
    language?: string;
    numberOfPages?: number;
  };
  related?: RelatedLink[];
  readerCta?: {
    label: string;
    description: string;
    to: string;
  };
}

const TextHub = ({
  english,
  hindi,
  sanskrit,
  slug,
  tagline,
  seoTitle,
  seoDescription,
  intro,
  sections,
  faqs,
  bookMeta,
  related,
  readerCta,
}: Props) => {
  const path = `/texts/${slug}`;

  const jsonLd = [
    buildArticleSchema({
      headline: english,
      description: seoDescription,
      path,
      inLanguage: "en",
    }),
    buildBookSchema({
      name: english,
      alternateName: bookMeta.alternateName ?? [hindi, sanskrit].filter(Boolean) as string[],
      description: seoDescription,
      path,
      author: bookMeta.author,
      language: bookMeta.language,
      numberOfPages: bookMeta.numberOfPages,
    }),
    buildFAQSchema(faqs),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Sacred Texts", path: "/texts" },
      { name: english, path },
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
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span>Sacred Texts</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">{english}</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">
            {sanskrit ? `${sanskrit} · ${hindi}` : hindi}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            {english}
          </h1>
          <p className="text-lg text-muted-foreground mt-3">{tagline}</p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p className="lead text-base md:text-lg leading-relaxed">{intro}</p>
        </div>

        {readerCta && (
          <div className="mt-8 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">
              Read online — free preview
            </p>
            <p className="mt-1 text-base md:text-lg text-foreground/90">{readerCta.description}</p>
            <Link
              to={readerCta.to}
              className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {readerCta.label} →
            </Link>
          </div>
        )}

        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i} aria-labelledby={`sec-${i}`}>
              <h2 id={`sec-${i}`} className="font-serif text-2xl md:text-3xl font-bold text-primary mb-3">
                {s.heading}
              </h2>
              <div className="text-base leading-relaxed text-foreground/90 prose max-w-none dark:prose-invert">
                {typeof s.body === "string" ? <p>{s.body}</p> : s.body}
              </div>
            </section>
          ))}
        </div>

        {readerCta && (
          <div className="mt-10 rounded-lg border bg-muted/30 p-5 md:p-6 text-center">
            <p className="text-base md:text-lg font-medium">{readerCta.description}</p>
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
          <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-serif text-2xl font-bold text-primary mb-4">
              Related reading
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Card key={r.to} className="hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <Link to={r.to} className="font-medium text-primary hover:underline">
                      {r.label} →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
};

export default TextHub;
