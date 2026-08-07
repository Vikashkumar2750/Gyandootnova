import { describe, it, expect, beforeAll } from "vitest";

/**
 * Live /books e2e — fetches the deployed site and fails if the rendered HTML
 * contains Swedish leakage, foreign-currency pricing, or non-"Buy Now" CTAs.
 *
 * Enable by setting BOOKS_E2E_URL (defaults to production when RUN_LIVE_E2E=1).
 * Skips otherwise so local unit test runs stay hermetic.
 */

const URL =
  process.env.BOOKS_E2E_URL ||
  (process.env.RUN_LIVE_E2E === "1"
    ? "https://gyandootnova.in/books"
    : "");

let html = "";
let status = 0;

beforeAll(async () => {
  if (!URL) return;
  const res = await fetch(URL, {
    headers: { "user-agent": "gyandoot-e2e/1.0" },
  });
  status = res.status;
  html = await res.text();
}, 30_000);

describe("/books live e2e", () => {
  it.skipIf(!URL)("returns 200 OK", () => {
    expect(status).toBe(200);
  });

  it.skipIf(!URL)("has no Swedish text or foreign-currency pricing", () => {
    const banned: { name: string; re: RegExp }[] = [
      { name: "Swedish 'Köp'", re: /\bKöp\b/ },
      { name: "Swedish 'Köp nu'", re: /Köp\s+nu/ },
      { name: "Swedish 'Hem'", re: />\s*Hem\s*</ },
      { name: "Swedish 'Böcker'", re: /Böcker/ },
      { name: "Swedish 'Artiklar'", re: /Artiklar/ },
      { name: "Swedish 'Tillägga'", re: /Tillägga/ },
      { name: "Swedish 'Snabbvy'", re: /Snabbvy/ },
      { name: "Swedish 'Konstnär'", re: /Konstnär/ },
      { name: "Swedish 'Riggade'", re: /Riggade/ },
      { name: "Swedish 'I lager'", re: /I lager/ },
      { name: "'kr' currency price", re: /(^|[\s>(])\d[\d.,]*\s*kr(\s|[<),.]|$)/ },
      { name: "SEK code", re: /\bSEK\b/ },
      { name: "EUR code", re: /\bEUR\b/ },
      { name: "USD code", re: /\bUSD\b/ },
      { name: "EUR price", re: /€\s*\d/ },
      { name: "USD price", re: /\$\s*\d/ },
    ];
    const failures = banned.filter(({ re }) => re.test(html)).map((b) => b.name);
    expect(failures, failures.join(", ")).toEqual([]);
  });

  it.skipIf(!URL)("uses 'Buy Now' CTA (no localized variants)", () => {
    expect(html).toContain("Buy Now");
    for (const bad of ["Köp nu", "Köp", "Kaufen", "Comprar", "Acheter"]) {
      expect(html).not.toContain(bad);
    }
  });

  it.skipIf(!URL)("renders INR (₹) prices and English nav", () => {
    expect(html).toContain("₹");
    for (const label of ["Home", "About", "Books", "Articles"]) {
      expect(html).toContain(label);
    }
  });
});
