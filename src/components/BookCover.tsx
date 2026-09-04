import { useState } from "react";

/** Only real image files can be used as covers (legacy rows stored docs/empty strings). */
export const isDisplayableCover = (url?: string | null): boolean => {
  if (!url) return false;
  const clean = url.trim().split("?")[0].toLowerCase();
  if (!clean.startsWith("http") && !clean.startsWith("/")) return false;
  if (/\.(docx?|pdf|txt|epub|xlsx?|pptx?)$/.test(clean)) return false;
  return /\.(png|jpe?g|webp|avif|gif|svg)$/.test(clean) || !/\.[a-z0-9]{2,5}$/.test(clean);
};

const PALETTES = [
  ["hsl(35 82% 92%)", "hsl(30 60% 74%)"],
  ["hsl(15 70% 92%)", "hsl(10 48% 72%)"],
  ["hsl(150 40% 92%)", "hsl(160 30% 70%)"],
  ["hsl(220 45% 93%)", "hsl(225 32% 72%)"],
  ["hsl(280 40% 93%)", "hsl(285 28% 74%)"],
];

const pickPalette = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
};

interface Props {
  src?: string | null;
  title: string;
  author?: string | null;
  className?: string;
  eager?: boolean;
}

/**
 * Book cover with a designed fallback: when no usable image exists we render a
 * typographic cover (title + author) instead of an empty box.
 */
const BookCover = ({ src, title, author, className = "", eager }: Props) => {
  const [failed, setFailed] = useState(false);
  const usable = isDisplayableCover(src) && !failed;

  if (usable) {
    return (
      <img
        src={src!}
        alt={`${title} book cover`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const [from, to] = pickPalette(title || "book");

  return (
    <div
      role="img"
      aria-label={`${title} book cover`}
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-center ${className}`}
      style={{ background: `linear-gradient(150deg, ${from}, ${to})` }}
    >
      <div
        className="pointer-events-none absolute inset-2 rounded-[6px]"
        style={{ border: "1px solid rgba(255,255,255,0.55)" }}
        aria-hidden="true"
      />
      <span className="relative text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/50">
        GyandootNova
      </span>
      <span className="relative line-clamp-4 font-serif text-base md:text-lg font-semibold leading-snug text-foreground/85">
        {title}
      </span>
      <span className="relative truncate text-[10px] italic text-foreground/55">
        {author || "GyandootNova"}
      </span>
    </div>
  );
};

export default BookCover;
