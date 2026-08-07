import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = join(process.cwd(), "dist");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

const banned: { name: string; re: RegExp }[] = [
  { name: "urgency countdown text", re: /खत्म होने में/ },
  { name: "urgency countdown HH:MM:SS", re: /tabular-nums["'][^>]*>\s*\d{2}:\d{2}:\d{2}/ },
  { name: "Swedish 'kr' currency", re: /(^|[\s>(])kr(\s|[<),.]|$)/ },
  { name: "SEK currency code", re: /\bSEK\b/ },
  { name: "Swedish 'Köp'", re: /Köp/ },
  { name: "Swedish 'Lägg'", re: /Lägg/ },
  { name: "Swedish 'tillgång'", re: /tillgång/ },
  { name: "Google Translate cookie", re: /googtrans/ },
  { name: "localhost URL leak", re: /https?:\/\/localhost:\d+/ },
];

const hasDist = existsSync(DIST);

describe("prerender output regression", () => {
  it.skipIf(!hasDist)("has no urgency countdown or Swedish/SEK text in prerendered HTML", () => {
    const files = walk(DIST);
    expect(files.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const file of files) {
      const html = readFileSync(file, "utf8");
      for (const { name, re } of banned) {
        if (re.test(html)) failures.push(`${file}: ${name}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
