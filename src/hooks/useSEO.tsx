import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** If true, emits hreflang link tags for en-US/GB/AU/CA/IN + hi-IN + x-default pointing at the current canonical URL. */
  hreflang?: boolean;
  /** If true, emits <meta name="robots" content="noindex, nofollow"> so search engines skip this page. Used for premium chapter reader URLs. */
  noindex?: boolean;
}

const BASE_URL = "https://gyandootnova.in";
const DEFAULT_OG = "/og-default.jpg";
const DEFAULT_OG_W = "1216";
const DEFAULT_OG_H = "640";

const HREFLANGS = ["en", "en-US", "en-GB", "en-AU", "en-CA", "en-IN", "hi-IN", "x-default"] as const;

/**
 * Returns the single meta tag for this key, creating it if missing and removing
 * any duplicates (prerendered head + client head can otherwise both emit one).
 */
const getOrCreateMeta = (attr: string, value: string): HTMLMetaElement => {
  const found = Array.from(
    document.querySelectorAll(`meta[${attr}="${value}"]`),
  ) as HTMLMetaElement[];
  // Keep the first, drop every duplicate.
  found.slice(1).forEach((n) => n.remove());
  let el = found[0];
  if (!el) {
    el = document.createElement("meta");
    const [key] = attr === "property" ? ["property"] : ["name"];
    el.setAttribute(key, value);
    document.head.appendChild(el);
  }
  return el;
};


const useSEO = ({ title, description, canonical, ogImage, ogType, jsonLd, hreflang, noindex }: SEOProps) => {
  useEffect(() => {
    // Title
    document.title = title.includes("GyandootNova") ? title : `${title} | GyandootNova`;

    // Meta description
    if (description) {
      getOrCreateMeta("name", "description").content = description;
    }

    // Robots — noindex premium/reader pages so book listings rank instead of chapters.
    const robotsEl = getOrCreateMeta("name", "robots");
    robotsEl.content = noindex ? "noindex, nofollow" : "index, follow";

    // Resolve og:image
    const rawImage = ogImage && ogImage.trim().length > 0 ? ogImage : DEFAULT_OG;
    const absImage = rawImage.startsWith("http") ? rawImage : `${BASE_URL}${rawImage}`;
    const isDefault = rawImage === DEFAULT_OG;

    // OG tags
    const setOG = (property: string, content: string) => {
      getOrCreateMeta("property", property).content = content;
    };
    setOG("og:title", document.title);
    if (description) setOG("og:description", description);
    if (ogType) setOG("og:type", ogType);
    setOG("og:image", absImage);
    setOG("og:image:alt", title);
    if (isDefault) {
      setOG("og:image:width", DEFAULT_OG_W);
      setOG("og:image:height", DEFAULT_OG_H);
      setOG("og:image:type", "image/jpeg");
    }
    if (canonical) setOG("og:url", `${BASE_URL}${canonical}`);

    // Twitter
    const setTwitter = (name: string, content: string) => {
      getOrCreateMeta("name", name).content = content;
    };
    setTwitter("twitter:card", "summary_large_image");
    setTwitter("twitter:title", document.title);
    if (description) setTwitter("twitter:description", description);
    setTwitter("twitter:image", absImage);
    setTwitter("twitter:image:alt", title);

    // Canonical — exactly one per page; drop any duplicates from the static head.
    if (canonical) {
      const links = Array.from(
        document.querySelectorAll('link[rel="canonical"]'),
      ) as HTMLLinkElement[];
      links.slice(1).forEach((n) => n.remove());
      let link = links[0];
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = `${BASE_URL}${canonical}`;
    }

    // hreflang alternates — mark the current URL as valid for every English
    // market we're targeting (US/UK/AU/CA/IN) plus Hindi (India) and x-default.
    const hreflangEls: HTMLLinkElement[] = [];
    if (hreflang && canonical) {
      // Remove every existing alternate (dynamic or prerendered) so each
      // hreflang value appears exactly once.
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
      HREFLANGS.forEach((lang) => {
        const l = document.createElement("link");
        l.rel = "alternate";
        l.hreflang = lang;
        l.href = `${BASE_URL}${canonical}`;
        l.setAttribute("data-dyn-hreflang", "1");
        document.head.appendChild(l);
        hreflangEls.push(l);
      });
    }


    // JSON-LD — accepts a single object or an array; each renders as its own <script>.
    const scriptEls: HTMLScriptElement[] = [];
    if (jsonLd) {
      document.querySelectorAll('script[data-dyn-jsonld="1"]').forEach((n) => n.remove());
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      blocks.forEach((block, idx) => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.setAttribute("data-dyn-jsonld", "1");
        s.setAttribute("data-idx", String(idx));
        s.textContent = JSON.stringify(block);
        document.head.appendChild(s);
        scriptEls.push(s);
      });
    }

    return () => {
      scriptEls.forEach((s) => s.remove());
      hreflangEls.forEach((l) => l.remove());
    };
  }, [title, description, canonical, ogImage, ogType, jsonLd, hreflang, noindex]);
};

export default useSEO;
