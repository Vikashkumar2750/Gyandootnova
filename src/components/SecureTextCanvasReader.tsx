import { useEffect, useMemo, useRef, useState } from "react";

type TextBlock = { text: string; type: "body" | "heading" | "quote" };
type CanvasLine = { text: string; y: number; font: string; type: TextBlock["type"] };
type CanvasPage = { lines: CanvasLine[]; height: number };

interface SecureTextCanvasReaderProps {
  content: string;
  fontSize: number;
  darkMode: boolean;
  watermarkText: string;
}

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

const parseContent = (content: string): TextBlock[] => {
  const raw = content.trim();
  if (!raw) return [{ text: "इस अध्याय की सामग्री उपलब्ध नहीं है।", type: "body" }];

  const isHtml = /<\/?(p|div|span|strong|em|br|h[1-6]|ul|ol|li|blockquote|img|a)\b/i.test(raw);
  if (!isHtml || typeof document === "undefined") {
    return raw
      .split(/\n{2,}|\n/)
      .map((line) => normalizeText(line))
      .filter(Boolean)
      .map((text) => ({ text, type: "body" as const }));
  }

  const doc = document.implementation.createHTMLDocument("secure-reader");
  const root = doc.createElement("div");
  root.innerHTML = raw.replace(/<br\s*\/?>(?!\n)/gi, "\n");

  const blocks: TextBlock[] = [];
  root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote").forEach((el) => {
    const text = normalizeText(el.textContent || "");
    if (!text) return;
    const tag = el.tagName.toLowerCase();
    blocks.push({
      text: tag === "li" ? `• ${text}` : text,
      type: tag.startsWith("h") ? "heading" : tag === "blockquote" ? "quote" : "body",
    });
  });

  if (!blocks.length) {
    const fallback = normalizeText(root.textContent || "");
    if (fallback) blocks.push({ text: fallback, type: "body" });
  }

  return blocks.length ? blocks : [{ text: "इस अध्याय की सामग्री उपलब्ध नहीं है।", type: "body" }];
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }

    let chunk = "";
    Array.from(word).forEach((char) => {
      const testChunk = `${chunk}${char}`;
      if (ctx.measureText(testChunk).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = testChunk;
      }
    });
    current = chunk;
  });

  if (current) lines.push(current);
  return lines;
};

const buildPages = (blocks: TextBlock[], width: number, fontSize: number): CanvasPage[] => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const padding = width < 520 ? 22 : 44;
  const maxTextWidth = width - padding * 2;
  const pageHeight = Math.max(720, Math.min(1120, Math.round(width * 1.42)));
  const pages: CanvasPage[] = [{ lines: [], height: pageHeight }];
  let y = padding + fontSize;

  const addPage = () => {
    pages.push({ lines: [], height: pageHeight });
    y = padding + fontSize;
  };

  blocks.forEach((block) => {
    const size = block.type === "heading" ? fontSize + 8 : fontSize;
    const lineHeight = block.type === "heading" ? size * 1.45 : size * 1.7;
    const font = block.type === "heading"
      ? `700 ${size}px Playfair Display, Georgia, serif`
      : `${block.type === "quote" ? "600" : "400"} ${size}px Inter, system-ui, sans-serif`;

    ctx.font = font;
    const lines = wrapText(ctx, block.text, maxTextWidth);
    if (y + lineHeight * lines.length > pageHeight - padding && pages[pages.length - 1].lines.length) addPage();

    lines.forEach((line) => {
      if (y + lineHeight > pageHeight - padding) addPage();
      pages[pages.length - 1].lines.push({ text: line, y, font, type: block.type });
      y += lineHeight;
    });
    y += block.type === "heading" ? fontSize * 0.85 : fontSize * 0.65;
  });

  return pages;
};

const cssHsl = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};

const SecureCanvasPage = ({ page, width, darkMode, watermarkText, pageNumber, totalPages }: {
  page: CanvasPage;
  width: number;
  darkMode: boolean;
  watermarkText: string;
  pageNumber: number;
  totalPages: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !width) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(page.height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${page.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = darkMode ? "#111827" : cssHsl("--background", "#ffffff");
    const fg = darkMode ? "#f3f4f6" : cssHsl("--foreground", "#222222");
    const muted = darkMode ? "rgba(243,244,246,0.62)" : "rgba(34,34,34,0.58)";
    const primary = cssHsl("--primary", "#B71C1C");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, page.height);

    ctx.save();
    ctx.globalAlpha = darkMode ? 0.13 : 0.18;
    ctx.fillStyle = primary;
    ctx.translate(width / 2, page.height / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.font = "800 18px Inter, system-ui, sans-serif";
    for (let y = -page.height; y < page.height * 1.5; y += 92) {
      for (let x = -width; x < width * 1.5; x += 280) {
        ctx.fillText(watermarkText, x, y);
      }
    }
    ctx.restore();

    page.lines.forEach((line) => {
      ctx.font = line.font;
      ctx.fillStyle = line.type === "quote" ? muted : fg;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(line.text, width < 520 ? 22 : 44, line.y);
    });

    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.fillText(`${pageNumber}/${totalPages}`, width / 2, page.height - 18);
    ctx.textAlign = "left";
  }, [darkMode, page, pageNumber, totalPages, watermarkText, width]);

  return <canvas ref={canvasRef} className="block w-full rounded-md border border-border shadow-sm" aria-hidden="true" />;
};

const SecureTextCanvasReader = ({ content, fontSize, darkMode, watermarkText }: SecureTextCanvasReaderProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const update = () => setWidth(Math.max(280, Math.min(780, shell.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const blocks = useMemo(() => parseContent(content), [content]);
  const pages = useMemo(() => (width ? buildPages(blocks, width, fontSize) : []), [blocks, fontSize, width]);

  return (
    <div ref={shellRef} className="secure-canvas-reader flex w-full flex-col items-center gap-5" data-secure-reader="true">
      {pages.map((page, index) => (
        <SecureCanvasPage
          key={`${index}-${fontSize}-${width}`}
          page={page}
          width={width}
          darkMode={darkMode}
          watermarkText={watermarkText}
          pageNumber={index + 1}
          totalPages={pages.length}
        />
      ))}
    </div>
  );
};

export default SecureTextCanvasReader;