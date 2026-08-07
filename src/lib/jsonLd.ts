// Typed JSON-LD schema builders. Keep these output-only — no DOM, no React.
// Consumers pass the returned object to useSEO({ jsonLd }).

export const SITE = "https://gyandootnova.in";
export const ORG_NAME = "GyandootNova";
export const ORG_LOGO = `${SITE}/og-default.jpg`;

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CrumbItem {
  name: string;
  path: string;
}

export function buildFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(crumbs: CrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path.startsWith("http") ? c.path : `${SITE}${c.path}`,
    })),
  };
}

export function buildArticleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
  inLanguage?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE}${opts.path}`,
    },
    author: { "@type": "Organization", name: ORG_NAME, url: SITE },
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      logo: { "@type": "ImageObject", url: ORG_LOGO },
    },
    datePublished: opts.datePublished ?? "2024-01-01",
    dateModified: opts.dateModified ?? new Date().toISOString().slice(0, 10),
    inLanguage: opts.inLanguage ?? "en",
    image: opts.image ?? ORG_LOGO,
  };
}

export function buildBookSchema(opts: {
  name: string;
  alternateName?: string[];
  description: string;
  path: string;
  author?: string;
  language?: string;
  numberOfPages?: number;
  bookFormat?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: opts.name,
    alternateName: opts.alternateName,
    description: opts.description,
    url: `${SITE}${opts.path}`,
    author: opts.author ? { "@type": "Person", name: opts.author } : undefined,
    inLanguage: opts.language ?? "sa",
    numberOfPages: opts.numberOfPages,
    bookFormat: opts.bookFormat ?? "https://schema.org/EBook",
    publisher: { "@type": "Organization", name: ORG_NAME },
  };
}

export function buildOrganizationSchema(overrides: Record<string, unknown> = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    alternateName: ["Gyandoot", "Gyandoot Nova", "gyandootnova.in"],
    url: SITE,
    logo: ORG_LOGO,
    email: "amrendra8765@gmail.com",
    telephone: "+91-91615-33353",
    foundingDate: "2024",
    description:
      "A mission-driven publishing house dedicated to authentic spiritual texts — Bhagavad Gita, Vedas, Upanishads, Ramayana and more — for Hindi and English readers.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bhagwan Khera",
      addressLocality: "Unnao",
      addressRegion: "Uttar Pradesh",
      postalCode: "209863",
      addressCountry: "IN",
    },
    areaServed: ["IN", "US", "GB", "CA", "AU"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "amrendra8765@gmail.com",
        telephone: "+91-91615-33353",
        availableLanguage: ["Hindi", "English"],
      },
    ],
    ...overrides,
  };
}

// ---------- validators ----------
// Pure schema-shape checks that mirror what Google's Rich Results test cares
// about. Run in the test suite so any regression in a page's JSON-LD is
// caught before merge.

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const isAbsoluteUrl = (v: unknown): v is string =>
  typeof v === "string" && /^https?:\/\//i.test(v);

function baseChecks(node: any, expectedType: string): string[] {
  const issues: string[] = [];
  if (!node || typeof node !== "object") {
    issues.push("node must be an object");
    return issues;
  }
  if (node["@context"] !== "https://schema.org") {
    issues.push('@context must be "https://schema.org"');
  }
  if (node["@type"] !== expectedType) {
    issues.push(`@type must be "${expectedType}", got ${JSON.stringify(node["@type"])}`);
  }
  return issues;
}

export function validateBreadcrumbList(node: any): ValidationResult {
  const issues = baseChecks(node, "BreadcrumbList");
  const items = node?.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    issues.push("itemListElement must be a non-empty array");
    return { valid: false, issues };
  }
  items.forEach((it: any, i: number) => {
    if (it?.["@type"] !== "ListItem") issues.push(`item[${i}].@type must be ListItem`);
    if (it?.position !== i + 1) issues.push(`item[${i}].position must be ${i + 1}`);
    if (!isNonEmptyString(it?.name)) issues.push(`item[${i}].name must be a non-empty string`);
    if (!isAbsoluteUrl(it?.item)) issues.push(`item[${i}].item must be an absolute URL`);
  });
  return { valid: issues.length === 0, issues };
}

export function validateOrganization(node: any): ValidationResult {
  const issues = baseChecks(node, "Organization");
  if (!isNonEmptyString(node?.name)) issues.push("name required");
  if (!isAbsoluteUrl(node?.url)) issues.push("url must be absolute");
  if (!isAbsoluteUrl(node?.logo)) issues.push("logo must be an absolute URL");
  if (node?.contactPoint && !Array.isArray(node.contactPoint)) {
    issues.push("contactPoint must be an array when present");
  }
  return { valid: issues.length === 0, issues };
}

export function validateArticle(node: any): ValidationResult {
  const issues = baseChecks(node, "Article");
  if (!isNonEmptyString(node?.headline)) issues.push("headline required");
  if (!isNonEmptyString(node?.description)) issues.push("description required");
  const publisher = node?.publisher;
  if (!publisher || publisher["@type"] !== "Organization")
    issues.push("publisher must be an Organization node");
  else if (!isAbsoluteUrl(publisher?.logo?.url))
    issues.push("publisher.logo.url must be an absolute URL");
  const author = node?.author;
  if (!author || (author["@type"] !== "Organization" && author["@type"] !== "Person"))
    issues.push("author must be an Organization or Person");
  return { valid: issues.length === 0, issues };
}
