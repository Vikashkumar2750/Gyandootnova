// Minimal dependency-free PDF writer for the daily SEO report.
// Renders plain text lines (Helvetica / Helvetica-Bold) across A4 pages.

export type PdfLine = { text: string; bold?: boolean; size?: number; gap?: number };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const LINE_H = 15;

// PDF strings must be Latin-1; strip anything else so we never emit garbage.
function pdfEscape(s: string): string {
  return (s || "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00B7/g, "-")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}


function wrap(text: string, size: number, maxWidth: number): string[] {
  // Helvetica average glyph width ~0.5em; conservative estimate avoids overflow.
  const perChar = size * 0.52;
  const maxChars = Math.max(20, Math.floor(maxWidth / perChar));
  const words = String(text || "").split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) { cur = candidate; continue; }
    if (cur) out.push(cur);
    if (w.length > maxChars) {
      let rest = w;
      while (rest.length > maxChars) { out.push(rest.slice(0, maxChars)); rest = rest.slice(maxChars); }
      cur = rest;
    } else cur = w;
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

export function buildPdf(lines: PdfLine[]): Uint8Array {
  const usable = PAGE_W - MARGIN * 2;
  const pages: string[][] = [];
  let current: string[] = [];
  let y = PAGE_H - MARGIN;

  const push = (op: string) => current.push(op);
  const newPage = () => { pages.push(current); current = []; y = PAGE_H - MARGIN; };

  for (const l of lines) {
    const size = l.size ?? 10;
    const font = l.bold ? "/F2" : "/F1";
    const gap = l.gap ?? 0;
    y -= gap;
    for (const seg of wrap(l.text, size, usable)) {
      if (y < MARGIN + LINE_H) newPage();
      push(`BT ${font} ${size} Tf 1 0 0 1 ${MARGIN.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(seg)}) Tj ET`);
      y -= Math.max(LINE_H, size + 4);
    }
  }
  pages.push(current);

  const objects: string[] = [];
  const pageCount = pages.length;
  // 1 catalog, 2 pages, 3..(2+n) page objects, then content streams, then fonts
  const kids = pages.map((_, i) => `${3 + i} 0 R`).join(" ");
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>`);
  const contentStart = 3 + pageCount;
  const fontF1 = contentStart + pageCount;
  const fontF2 = fontF1 + 1;
  pages.forEach((_, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R >> >> ` +
      `/Contents ${contentStart + i} 0 R >>`,
    );
  });
  pages.forEach((ops) => {
    const stream = ops.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
