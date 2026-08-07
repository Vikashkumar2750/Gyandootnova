import { describe, it, expect } from "vitest";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  validateArticle,
  validateBreadcrumbList,
  validateOrganization,
  SITE,
} from "@/lib/jsonLd";

// Mirrors of the JSON-LD blocks embedded in real pages (About, Articles,
// ArticleDetail). If a page's inline schema drifts, add or update a fixture
// here so the test catches missing/misshapen fields at build time.
const AboutBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "GyandootNova", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about` },
  ],
};

const ArticlesBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "GyandootNova", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE}/articles` },
  ],
};

const ArticleDetailArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Sample article",
  description: "A sample description long enough to be useful for SERP snippets.",
  url: `${SITE}/articles/sample`,
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/articles/sample` },
  datePublished: "2024-01-01",
  dateModified: "2024-02-01",
  inLanguage: "hi-IN",
  author: { "@type": "Organization", name: "GyandootNova", url: SITE },
  publisher: {
    "@type": "Organization",
    name: "GyandootNova",
    url: SITE,
    logo: { "@type": "ImageObject", url: `${SITE}/favicon.ico` },
  },
};

describe("JSON-LD validators", () => {
  describe("BreadcrumbList", () => {
    it("accepts real About-page breadcrumb", () => {
      const r = validateBreadcrumbList(AboutBreadcrumb);
      expect(r.issues).toEqual([]);
      expect(r.valid).toBe(true);
    });

    it("accepts real Articles-page breadcrumb", () => {
      expect(validateBreadcrumbList(ArticlesBreadcrumb).valid).toBe(true);
    });

    it("accepts builder output for any depth", () => {
      const node = buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Articles", path: "/articles" },
        { name: "Post", path: "/articles/x" },
      ]);
      expect(validateBreadcrumbList(node).valid).toBe(true);
    });

    it("rejects wrong @type", () => {
      const bad = { ...AboutBreadcrumb, "@type": "Breadcrumbs" };
      const r = validateBreadcrumbList(bad);
      expect(r.valid).toBe(false);
      expect(r.issues.join(" ")).toMatch(/BreadcrumbList/);
    });

    it("rejects non-sequential positions", () => {
      const r = validateBreadcrumbList({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "A", item: `${SITE}/a` },
          { "@type": "ListItem", position: 3, name: "B", item: `${SITE}/b` },
        ],
      });
      expect(r.valid).toBe(false);
    });

    it("rejects relative item URLs", () => {
      const r = validateBreadcrumbList({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        ],
      });
      expect(r.valid).toBe(false);
    });

    it("rejects empty item list", () => {
      const r = validateBreadcrumbList({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [],
      });
      expect(r.valid).toBe(false);
    });
  });

  describe("Organization", () => {
    it("accepts the shared organization builder", () => {
      const r = validateOrganization(buildOrganizationSchema());
      expect(r.issues).toEqual([]);
      expect(r.valid).toBe(true);
    });

    it("rejects missing logo", () => {
      const org: any = buildOrganizationSchema();
      delete org.logo;
      expect(validateOrganization(org).valid).toBe(false);
    });

    it("rejects malformed contactPoint", () => {
      const org: any = { ...buildOrganizationSchema(), contactPoint: "email@example.com" };
      expect(validateOrganization(org).valid).toBe(false);
    });

    it("rejects wrong @type", () => {
      const bad = { ...buildOrganizationSchema(), "@type": "LocalBusiness" };
      expect(validateOrganization(bad).valid).toBe(false);
    });
  });

  describe("Article", () => {
    it("accepts real ArticleDetail schema", () => {
      const r = validateArticle(ArticleDetailArticle);
      expect(r.issues).toEqual([]);
      expect(r.valid).toBe(true);
    });

    it("accepts builder output", () => {
      const node = buildArticleSchema({
        headline: "Title",
        description: "Some description of the article.",
        path: "/articles/x",
      });
      const r = validateArticle(node);
      expect(r.valid).toBe(true);
    });

    it("rejects missing headline", () => {
      const bad = { ...ArticleDetailArticle, headline: "" };
      expect(validateArticle(bad).valid).toBe(false);
    });

    it("rejects publisher without logo URL", () => {
      const bad = {
        ...ArticleDetailArticle,
        publisher: { "@type": "Organization", name: "X" },
      };
      expect(validateArticle(bad).valid).toBe(false);
    });

    it("rejects author of wrong type", () => {
      const bad = { ...ArticleDetailArticle, author: { "@type": "Thing", name: "X" } };
      expect(validateArticle(bad).valid).toBe(false);
    });
  });
});
