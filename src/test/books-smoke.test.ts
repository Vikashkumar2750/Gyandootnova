import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * /books smoke test — runs against the prerendered HTML in dist/ after
 * `npm run build`. Prevents regressions where the books listing page
 * ships with browser-translated Swedish text, foreign currency codes,
 * a currency/language switcher, a stale countdown banner, wrong nav labels,
 * wrong CTA labels, or the buggy ₹1 "Bhagavad Gita Simplified" price.
 * Skips locally when there is no dist/ yet.
 */

const DIST_CANDIDATES = ["/books/index.html", "/books.html"].map((p) =>
  join(process.cwd(), "dist" + p),
);

function loadBooksHtml(): string | null {
  for (const p of DIST_CANDIDATES) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  return null;
}

const html = loadBooksHtml();

describe("/books prerendered smoke test", () => {
  it.skipIf(!html)("has no Swedish or foreign-currency leakage", () => {
    const body = html!;
    const banned: { name: string; re: RegExp }[] = [
      { name: "Swedish 'Köp'", re: /\bKöp\b/ },
      { name: "Swedish 'Köp nu'", re: /Köp\s+nu/ },
      { name: "Swedish 'Tillägga'", re: /Tillägga/ },
      { name: "Swedish 'Snabbvy'", re: /Snabbvy/ },
      { name: "Swedish 'Böcker'", re: /Böcker/ },
      { name: "Swedish 'Artiklar'", re: /Artiklar/ },
      { name: "Swedish 'Hem'", re: />\s*Hem\s*</ },
      { name: "Swedish 'lager'", re: /I lager/ },
      { name: "Swedish bare 'lager'", re: /\blager\b/ },
      { name: "Swedish 'tillgång'", re: /tillgång/ },
      { name: "Swedish 'kr' currency", re: /(^|[\s>(])\d[\d.,]*\s*kr(\s|[<),.]|$)/ },
      { name: "Swedish 'Konstnär'", re: /Konstnär/ },
      { name: "Swedish 'Riggade'", re: /Riggade/ },
      { name: "SEK currency code", re: /\bSEK\b/ },
      { name: "EUR currency code", re: /\bEUR\b/ },
      { name: "USD currency code", re: /\bUSD\b/ },
      { name: "EUR currency selector option", re: /<option[^>]*>\s*EUR\s*</ },
      { name: "USD currency selector option", re: /<option[^>]*>\s*USD\s*</ },
      { name: "countdown Hindi banner", re: /खत्म होने में/ },
      { name: "countdown HH:MM:SS", re: /tabular-nums["'][^>]*>\s*\d{2}:\d{2}:\d{2}/ },
      { name: "Google Translate cookie", re: /googtrans/ },
    ];
    const failures = banned.filter(({ re }) => re.test(body)).map((b) => b.name);
    expect(failures, failures.join(", ")).toEqual([]);
  });

  it.skipIf(!html)("keeps INR/₹ as the only visible currency and includes an anti-translate hint", () => {
    const body = html!;
    // Should reference INR/₹ somewhere on a books listing page.
    expect(body.includes("₹") || /\bINR\b/.test(body)).toBe(true);
    // Must have the notranslate hint we set in index.html so browsers stop
    // auto-translating Hindi/Sanskrit titles into Swedish.
    expect(/name=["']google["'][^>]*content=["']notranslate["']/i.test(body)).toBe(true);
  });

  it.skipIf(!html)("does not show the confusing ₹1 / ₹2 Bhagavad Gita price", () => {
    const body = html!;
    // The buggy render was "₹1" with a "₹2" strikethrough sibling right next to it.
    // Book was moved to Free in the DB, so this pattern must not reappear.
    expect(/₹\s*1(?![\d.,])[\s\S]{0,80}₹\s*2(?![\d.,])/.test(body)).toBe(false);
  });

  it.skipIf(!html)("renders expected /books nav, INR price, and Buy Now CTA", () => {
    const body = html!;
    for (const label of ["Home", "About", "Books", "Articles"]) {
      expect(body).toContain(label);
    }
    expect(body).toContain("₹");
    expect(body).toContain("Buy Now");
  });
});
