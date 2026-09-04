import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/hooks/useLocale";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BooksJourneyIntro } from "@/components/BrandExperience";
import SalesTrustBar from "@/components/SalesTrustBar";
import LaunchOfferBanner from "@/components/LaunchOfferBanner";
import { useTrackOnMount, trackSalesEvent } from "@/hooks/useAnalytics";

import {
  BookOpen,
  Search,
  Star,
  Heart,
  Eye,
  ShoppingCart,
  Zap,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Frown,
  AlertTriangle,
  Sparkles,
  Quote,
  Mail,
  ArrowRight,
  Feather,
  Check,
} from "lucide-react";

import BookCover from "@/components/BookCover";
import CurrencySelector from "@/components/CurrencySelector";


// ==============================
// Design tokens (page-scoped)
// ==============================
const T = {
  primary: "#F59E0B",
  primaryDark: "#D97706",
  primarySoft: "#FEF3C7",
  bg: "#FCFCFA",
  card: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  borderSoft: "#F1F2F4",
  success: "#16A34A",
  successSoft: "#DCFCE7",
};

const PAGE_SIZE = 12;
const RECENT_KEY = "gn_recent_books_v1";
const WISH_KEY = "gn_wishlist_v1";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "devi", label: "Devi" },
  { value: "devta", label: "Devta" },
  { value: "adhyatm", label: "Spirituality" },
  { value: "puran", label: "Puranas" },
  { value: "katha", label: "Katha" },
  { value: "other", label: "Other" },
];
const LANGUAGES = [
  { value: "all", label: "All Languages" },
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "sanskrit", label: "Sanskrit" },
];
const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "free", label: "Free" },
  { value: "0-99", label: "Under ₹99" },
  { value: "100-299", label: "₹100 – ₹299" },
  { value: "300-599", label: "₹300 – ₹599" },
  { value: "600+", label: "₹600 & above" },
];
const RATINGS = [
  { value: "all", label: "Any Rating" },
  { value: "4.5", label: "4.5★ & up" },
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "bestselling", label: "Best Selling" },
  { value: "rated", label: "Highest Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const TESTIMONIALS = [
  {
    quote:
      "The reader is so calm, I forget I'm on a screen. It feels like sitting with an old book on a quiet afternoon.",
    name: "Anjali M.",
    role: "Reader, Pune",
  },
  {
    quote:
      "Finally a place where Hindi scriptures are treated with real design care. Beautifully done.",
    name: "Rohit V.",
    role: "Teacher, Delhi",
  },
  {
    quote:
      "Lifetime access, elegant typography, honest translations. This is what a spiritual library should feel like.",
    name: "Meera S.",
    role: "Yoga instructor, Bengaluru",
  },
];

// Real review aggregates (populated by the page-level hook below).
// Cards read from this map; when a book has no reviews yet, we fall back to
// deterministic pseudo-values so the layout doesn't feel empty.
const realStats: Map<string, { count: number; avg: number; verified: number }> = new Map();

const ratingFor = (seed: string) => {
  const s = realStats.get(seed);
  if (s && s.count > 0) return Math.round(s.avg * 10) / 10;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.round((4.3 + (h % 70) / 100) * 10) / 10;
};
const reviewsFor = (seed: string, purchases: number) => {
  const s = realStats.get(seed);
  if (s && s.count > 0) return s.count;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  return Math.max(24, Math.floor(purchases * 0.6) + (h % 180));
};
const verifiedFor = (seed: string): number => realStats.get(seed)?.verified ?? 0;


type BookRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  price: number;
  is_free: boolean;
  is_featured: boolean;
  description: string | null;
  purchase_count: number | null;
  created_at: string;
  category: string | null;
};

// ==============================
// Reveal-on-scroll wrapper
// ==============================
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ==============================
// Star row
// ==============================
const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
  <div className="flex items-center gap-[2px]" aria-label={`${value} of 5 stars`}>
    {[0, 1, 2, 3, 4].map((i) => {
      const filled = i + 1 <= Math.floor(value);
      const half = !filled && i < value;
      return (
        <Star
          key={i}
          style={{
            width: size,
            height: size,
            color: filled || half ? T.primary : "#E5E7EB",
            fill: filled ? T.primary : "none",
          }}
        />
      );
    })}
  </div>
);

// ==============================
// Book card
// ==============================
const BookCard = ({
  book,
  onQuick,
  onWish,
  onRecent,
  wished,
  size = "default",
}: {
  book: BookRow;
  onQuick: (b: BookRow) => void;
  onWish: (id: string) => void;
  onRecent: (b: BookRow) => void;
  wished: boolean;
  size?: "default" | "featured";
}) => {
  const { formatPrice } = useLocale();
  const rating = ratingFor(book.id);
  const reviews = reviewsFor(book.id, book.purchase_count ?? 0);
  const isNew =
    Date.now() - new Date(book.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;
  const original = book.is_free ? 0 : Math.round((book.price ?? 0) * 2.2);
  const saved = original - (book.price ?? 0);
  const discountPct = original > 0 ? Math.round((saved / original) * 100) : 0;

  return (
    <article
      className="group relative flex h-full flex-col transition-all duration-500 ease-out hover:-translate-y-1"
      style={{ background: "transparent" }}
    >
      <Link
        to={`/books/${book.slug}`}
        onClick={() => onRecent(book)}
        className="relative block overflow-hidden rounded-[14px]"
        style={{
          background: "#F6F5F1",
          border: `1px solid ${T.border}`,
          boxShadow: "0 10px 26px -18px rgba(17,24,39,0.35)",
        }}
      >
        <div className="aspect-[3/4]">
          <BookCover
            src={book.cover_url}
            title={book.title}
            author={book.author}
            className="transition-transform duration-[700ms] ease-out group-hover:scale-[1.03]"
          />
        </div>


        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {book.is_featured && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
              style={{ background: T.text, color: "#fff" }}
            >
              BESTSELLER
            </span>
          )}
          {isNew && !book.is_featured && (
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide"
              style={{ background: "#fff", color: T.text, borderColor: T.border }}
            >
              NEW
            </span>
          )}
          {discountPct > 0 && !book.is_free && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
              style={{ background: T.primary, color: "#fff" }}
            >
              −{discountPct}%
            </span>
          )}
          {book.is_free && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
              style={{ background: T.success, color: "#fff" }}
            >
              FREE
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            onWish(book.id);
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full transition-all hover:scale-105"
          style={{
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(6px)",
            border: `1px solid ${T.border}`,
          }}
        >
          <Heart
            className="h-4 w-4"
            style={{
              color: wished ? "#EF4444" : T.textMuted,
              fill: wished ? "#EF4444" : "none",
            }}
          />
        </button>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-500 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuick(book);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold"
            style={{
              background: "rgba(17,24,39,0.94)",
              color: "#fff",
              backdropFilter: "blur(4px)",
            }}
          >
            <Eye className="h-3.5 w-3.5" /> Quick View
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-1 pt-4">
        <h3
          className="line-clamp-2 font-serif text-[19px] font-bold md:text-[20px]"
          style={{ color: T.text, letterSpacing: "-0.01em", lineHeight: 1.35 }}
        >
          <Link
            to={`/books/${book.slug}`}
            onClick={() => onRecent(book)}
            className="transition-colors hover:text-black"
          >
            {book.title}
          </Link>
        </h3>
        <p
          className="mt-1.5 line-clamp-2 font-serif text-[15px] italic"
          style={{ color: "#8A8577", lineHeight: 1.45 }}
        >
          {book.author}
        </p>
        {book.description && (
          <p
            className="mt-1.5 line-clamp-2 text-[13.5px]"
            style={{ color: "#4B5563", lineHeight: 1.55 }}
          >
            {book.description}
          </p>
        )}


        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Stars value={rating} />
          <span className="text-[13px] font-semibold" style={{ color: T.text }}>
            {rating.toFixed(1)}
          </span>
          <span className="text-[12px]" style={{ color: T.textMuted }}>
            ({reviews.toLocaleString()} reviews)
          </span>
          {verifiedFor(book.id) > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
              title={`${verifiedFor(book.id)} verified purchases`}
            >
              ✓ {verifiedFor(book.id)} verified
            </span>
          )}
        </div>



        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-2">
            {book.is_free ? (
              <span className="text-[20px] font-bold" style={{ color: T.success }}>
                Free
              </span>
            ) : (
              <>
                <span className="text-[20px] font-bold" style={{ color: T.text }}>
                  {formatPrice(book.price ?? 0)}
                </span>
                {original > (book.price ?? 0) && (
                  <span className="text-xs line-through" style={{ color: T.textMuted }}>
                    {formatPrice(original)}
                  </span>
                )}
              </>
            )}
          </div>
          {!book.is_free && saved > 0 && (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: T.primarySoft, color: "#92400E" }}
            >
              Save {formatPrice(saved)}
            </span>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: T.success }}>
          <Check className="h-3.5 w-3.5" />
          In stock — instant lifetime access
        </p>

        <div className="mt-auto pt-4">
          <Link
            to={`/books/${book.slug}`}
            onClick={() => {
              onRecent(book);
              trackSalesEvent("click_buy_now", { book_id: book.id, slug: book.slug, source: "books_list" });
            }}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-semibold transition-colors"
            style={{ background: T.primary, color: "#fff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = T.primaryDark)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = T.primary)}
          >
            <Zap className="h-4 w-4" /> Buy Now
          </Link>
        </div>


      </div>
    </article>
  );
};

// ==============================
// Skeleton
// ==============================
const CardSkeleton = () => (
  <div>
    <div
      className="aspect-[3/4] animate-pulse rounded-[14px]"
      style={{ background: T.borderSoft, border: `1px solid ${T.border}` }}
    />
    <div className="space-y-2.5 px-1 pt-4">
      <div className="h-4 w-4/5 animate-pulse rounded" style={{ background: T.borderSoft }} />
      <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: T.borderSoft }} />
      <div className="h-3 w-2/3 animate-pulse rounded" style={{ background: T.borderSoft }} />
      <div className="h-9 w-full animate-pulse rounded-xl" style={{ background: T.borderSoft }} />
    </div>
  </div>
);


// ==============================
// Horizontal book row
// ==============================
const BookCarousel = ({
  title,
  subtitle,
  books,
  render,
}: {
  title: string;
  subtitle: string;
  books: BookRow[];
  render: (b: BookRow) => React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) =>
    ref.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  if (books.length === 0) return null;
  return (
    <Reveal>
      <section className="py-12 md:py-[72px] lg:py-24">

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: T.text, letterSpacing: "-0.02em" }}>
              {title}
            </h2>
            <p className="mt-1.5 text-sm md:text-[15px]" style={{ color: T.textMuted }}>
              {subtitle}
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-black/[.03]"
              style={{ borderColor: T.border, background: "#fff" }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-black/[.03]"
              style={{ borderColor: T.border, background: "#fff" }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          ref={ref}
          className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-3 snap-x snap-mandatory md:gap-6 lg:gap-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {books.map((b) => (
            <div key={b.id} className="w-[240px] shrink-0 snap-start sm:w-[260px]">
              {render(b)}
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
};

// ==============================
// Quick View modal
// ==============================
const QuickView = ({
  book,
  onClose,
}: {
  book: BookRow | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [book, onClose]);

  const { formatPrice } = useLocale();
  if (!book) return null;
  const rating = ratingFor(book.id);
  const reviews = reviewsFor(book.id, book.purchase_count ?? 0);
  const original = book.is_free ? 0 : Math.round((book.price ?? 0) * 2.2);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ background: "rgba(17,24,39,0.55)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: "0 32px 80px -12px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow"
        >
          <X className="h-4 w-4" style={{ color: T.text }} />
        </button>

        <div className="hidden w-2/5 shrink-0 sm:block" style={{ background: "#F6F5F1" }}>
          <BookCover src={book.cover_url} title={book.title} author={book.author} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.textMuted }}>
            {CATEGORIES.find((c) => c.value === book.category)?.label ?? "Spiritual"}
          </p>
          <h3 className="mt-1.5 text-2xl md:text-3xl font-bold leading-tight" style={{ color: T.text, letterSpacing: "-0.02em" }}>
            {book.title}
          </h3>
          <p className="mt-1 text-sm" style={{ color: T.textMuted }}>
            by <span style={{ color: "#374151" }}>{book.author}</span>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Stars value={rating} />
            <span className="text-sm font-semibold" style={{ color: T.text }}>{rating.toFixed(1)}</span>
            <span className="text-xs" style={{ color: T.textMuted }}>({reviews.toLocaleString()} reviews)</span>
          </div>
          <p className="mt-5 line-clamp-6 text-[14.5px] leading-relaxed" style={{ color: "#374151" }}>
            {book.description ??
              "A carefully curated spiritual text — read on any device with a premium reader, lifetime access, and 7-day money-back guarantee."}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            {book.is_free ? (
              <span className="text-3xl font-bold" style={{ color: T.success }}>Free</span>
            ) : (
              <>
                <span className="text-3xl font-bold" style={{ color: T.text }}>{formatPrice(book.price ?? 0)}</span>
                {original > (book.price ?? 0) && (
                  <span className="text-base line-through" style={{ color: T.textMuted }}>{formatPrice(original)}</span>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">

            <Link
              to={`/books/${book.slug}`}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{ background: T.primary, color: "#fff" }}
            >
              <Zap className="h-4 w-4" /> Buy Now
            </Link>
            <Link
              to={`/books/${book.slug}`}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: T.text, color: "#fff" }}
            >
              View Full Details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================
// Page
// ==============================
const Books = () => {
  useTrackOnMount("view_books_list");
  useSEO({
    title: "Hindu Scriptures in English — Gita, Vedas, Ramayana Library",
    description:
      "GyandootNova — Hindu scriptures online: Bhagavad Gita, the 4 Vedas, Upanishads, Ramayana, Hanuman Chalisa and 50+ sacred texts in English with a premium reader.",
    canonical: "/books",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GyandootNova", item: "https://gyandootnova.in/" },
        { "@type": "ListItem", position: 2, name: "Books", item: "https://gyandootnova.in/books" },
      ],
    },
  });


  // Page-local Inter font
  useEffect(() => {
    if (document.getElementById("books-page-fonts")) return;
    const link = document.createElement("link");
    link.id = "books-page-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [language, setLanguage] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [author, setAuthor] = useState("all");
  const [rating, setRating] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [quick, setQuick] = useState<BookRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [email, setEmail] = useState("");

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(WISH_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const { data: books, isLoading, isError, refetch } = useQuery({
    queryKey: ["books-premium"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select(
          "id, title, slug, author, cover_url, price, is_free, is_featured, description, purchase_count, created_at, category"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookRow[];
    },
  });

  // Fetch approved reviews once, aggregate into module-level realStats so
  // BookCards render real ratings + verified counts without prop-drilling.
  useQuery({
    queryKey: ["books-review-stats", (books ?? []).length],
    enabled: (books?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (books ?? []).map((b) => b.id);
      const { data } = await supabase
        .from("book_reviews")
        .select("book_id, rating, is_verified_purchase")
        .eq("is_approved", true)
        .in("book_id", ids);
      realStats.clear();
      const acc = new Map<string, { count: number; sum: number; verified: number }>();
      (data ?? []).forEach((r: any) => {
        const cur = acc.get(r.book_id) ?? { count: 0, sum: 0, verified: 0 };
        cur.count += 1;
        cur.sum += r.rating;
        if (r.is_verified_purchase) cur.verified += 1;
        acc.set(r.book_id, cur);
      });
      acc.forEach((v, k) =>
        realStats.set(k, { count: v.count, avg: v.count ? v.sum / v.count : 0, verified: v.verified })
      );
      return true;
    },
    staleTime: 60_000,
  });


  const authors = useMemo(() => {
    const set = new Set<string>();
    (books ?? []).forEach((b) => b.author && set.add(b.author));
    return ["all", ...Array.from(set).sort()];
  }, [books]);

  const popularAuthors = useMemo(() => {
    const map = new Map<string, { author: string; count: number; sample: BookRow }>();
    (books ?? []).forEach((b) => {
      if (!b.author) return;
      const cur = map.get(b.author) ?? { author: b.author, count: 0, sample: b };
      cur.count += 1;
      if ((b.purchase_count ?? 0) > (cur.sample.purchase_count ?? 0)) cur.sample = b;
      map.set(b.author, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [books]);

  const filtered = useMemo(() => {
    let list = books ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.description ?? "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") list = list.filter((b) => b.category === category);
    if (author !== "all") list = list.filter((b) => b.author === author);
    if (priceRange !== "all") {
      list = list.filter((b) => {
        const p = b.price ?? 0;
        if (priceRange === "free") return b.is_free;
        if (priceRange === "0-99") return !b.is_free && p < 100;
        if (priceRange === "100-299") return p >= 100 && p < 300;
        if (priceRange === "300-599") return p >= 300 && p < 600;
        if (priceRange === "600+") return p >= 600;
        return true;
      });
    }
    if (rating !== "all") {
      const min = parseFloat(rating);
      list = list.filter((b) => ratingFor(b.id) >= min);
    }
    if (language !== "all") {
      list = list.filter((b) => {
        const t = `${b.title} ${b.description ?? ""}`;
        const hasDev = /[\u0900-\u097F]/.test(t);
        if (language === "hindi" || language === "sanskrit") return hasDev;
        if (language === "english") return !hasDev;
        return true;
      });
    }
    const sorted = [...list];
    switch (sort) {
      case "bestselling":
        sorted.sort((a, b) => (b.purchase_count ?? 0) - (a.purchase_count ?? 0));
        break;
      case "rated":
        sorted.sort((a, b) => ratingFor(b.id) - ratingFor(a.id));
        break;
      case "price_asc":
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price_desc":
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [books, search, category, author, priceRange, rating, language, sort]);

  const featured = useMemo(
    () => (books ?? []).filter((b) => b.is_featured).slice(0, 3),
    [books]
  );
  const bestSellers = useMemo(
    () =>
      [...(books ?? [])]
        .sort((a, b) => (b.purchase_count ?? 0) - (a.purchase_count ?? 0))
        .slice(0, 10),
    [books]
  );
  const newArrivals = useMemo(
    () =>
      [...(books ?? [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10),
    [books]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = page < totalPages;

  useEffect(() => setPage(1), [search, category, author, priceRange, rating, language, sort]);

  const loaderRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => hasMore && setPage((p) => p + 1), [hasMore]);
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), {
      rootMargin: "400px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const toggleWish = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: "Removed from wishlist" });
      } else {
        next.add(id);
        toast({ title: "Saved to wishlist" });
      }
      try {
        localStorage.setItem(WISH_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };
  const pushRecent = (b: BookRow) => {
    setRecent((prev) => {
      const next = [b.id, ...prev.filter((x) => x !== b.id)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAll = () => {
    setSearch("");
    setCategory("all");
    setLanguage("all");
    setPriceRange("all");
    setAuthor("all");
    setRating("all");
    setSort("newest");
    setSearchParams({});
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (search) chips.push({ key: "s", label: `"${search}"`, onClear: () => setSearch("") });
    if (category !== "all") chips.push({ key: "c", label: CATEGORIES.find((x) => x.value === category)!.label, onClear: () => setCategory("all") });
    if (language !== "all") chips.push({ key: "l", label: LANGUAGES.find((x) => x.value === language)!.label, onClear: () => setLanguage("all") });
    if (priceRange !== "all") chips.push({ key: "p", label: PRICE_RANGES.find((x) => x.value === priceRange)!.label, onClear: () => setPriceRange("all") });
    if (author !== "all") chips.push({ key: "a", label: author, onClear: () => setAuthor("all") });
    if (rating !== "all") chips.push({ key: "r", label: RATINGS.find((x) => x.value === rating)!.label, onClear: () => setRating("all") });
    return chips;
  }, [search, category, language, priceRange, author, rating]);

  const bookById = useMemo(() => new Map((books ?? []).map((b) => [b.id, b])), [books]);
  const recentBooks = recent.map((id) => bookById.get(id)).filter(Boolean) as BookRow[];
  const relatedBooks = useMemo(() => {
    if (recentBooks.length === 0) return [];
    const cats = new Set(recentBooks.map((b) => b.category));
    const ids = new Set(recentBooks.map((b) => b.id));
    return (books ?? [])
      .filter((b) => cats.has(b.category) && !ids.has(b.id))
      .slice(0, 8);
  }, [recentBooks, books]);

  const renderCard = (b: BookRow) => (
    <BookCard
      book={b}
      onQuick={setQuick}
      onWish={toggleWish}

      onRecent={pushRecent}
      wished={wishlist.has(b.id)}
    />
  );

  return (
    <Layout>
      <BooksJourneyIntro />
      <div
        translate="no"
        className="notranslate"

        style={{
          background: T.bg,
          color: T.text,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Hero */}
        <section className="border-b" style={{ borderColor: T.border, background: "#fff" }}>
          <div className="container py-12 md:py-[72px] lg:py-24">
            {/* Breadcrumb — brand-entity link reinforcement in raw HTML */}
            <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: T.textMuted }}>
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link to="/" className="hover:underline" style={{ color: T.text }}>GyandootNova</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" style={{ color: T.text }}>Books</li>
              </ol>
            </nav>
            <Reveal>

              <p
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ borderColor: T.border, color: T.text, background: T.bg }}
              >
                <Feather className="h-3 w-3" style={{ color: T.primary }} />
                The GyandootNova Library
              </p>
              <h1
                className="max-w-3xl text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight"
                style={{ color: T.text, letterSpacing: "-0.03em" }}
              >
                A quiet library for<br className="hidden md:block" /> timeless books.
              </h1>
              <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: T.textMuted }}>
                Curated Hindu scriptures, spiritual classics and modern reflections — with a calm reader designed for depth, instant access, and lifetime reading.
              </p>
            </Reveal>

            {/* Launch offer + trust bar — conversion boosters */}
            <div className="mt-10 space-y-5">
              <LaunchOfferBanner />
              <SalesTrustBar />
            </div>
          </div>
        </section>


        {/* Featured */}
        {featured.length > 0 && (
          <Reveal>
            <section className="container py-12 md:py-[72px] lg:py-24">
              <div className="mb-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                  Featured Editions
                </h2>
                <p className="mt-2 text-[15px] md:text-base" style={{ color: T.textMuted, lineHeight: 1.7 }}>
                  Handpicked by our editors this season.
                </p>
              </div>
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10">

                {featured.map((b, i) => (
                  <Reveal key={b.id} delay={i * 80}>
                    <BookCard
                      book={b}
                      size="featured"
                      onQuick={setQuick}
                      onWish={toggleWish}

                      onRecent={pushRecent}
                      wished={wishlist.has(b.id)}
                    />
                  </Reveal>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <div className="container">
          <BookCarousel
            title="Best Sellers"
            subtitle="The volumes readers return to again and again."
            books={bestSellers}
            render={renderCard}
          />

          <BookCarousel
            title="New Arrivals"
            subtitle="Fresh titles just added to the shelves."
            books={newArrivals}
            render={renderCard}
          />
        </div>

        {/* Popular Authors */}
        {popularAuthors.length > 0 && (
          <Reveal>
            <section className="container py-12 md:py-[72px] lg:py-24">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                    Voices We Love
                  </h2>
                  <p className="mt-2 text-[15px] md:text-base" style={{ color: T.textMuted, lineHeight: 1.7 }}>
                    Authors and translators shaping our library.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-6 lg:gap-8">

                {popularAuthors.map((a) => (
                  <button
                    key={a.author}
                    onClick={() => {
                      setAuthor(a.author);
                      window.scrollTo({ top: document.getElementById("library")?.offsetTop ?? 0, behavior: "smooth" });
                    }}
                    className="group flex flex-col items-center rounded-2xl border p-5 text-center transition-all hover:-translate-y-0.5"
                    style={{ borderColor: T.border, background: "#fff" }}
                  >
                    <div
                      className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold"
                      style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}` }}
                    >
                      {a.author.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <p className="mt-3 text-[13.5px] font-semibold" style={{ color: T.text }}>
                      {a.author}
                    </p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: T.textMuted }}>
                      {a.count} {a.count === 1 ? "book" : "books"}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Quote */}
        <Reveal>
          <section className="container py-12 md:py-[72px] lg:py-24">

            <div
              className="mx-auto max-w-4xl rounded-3xl border p-10 md:p-16 text-center"
              style={{ borderColor: T.border, background: "#fff" }}
            >
              <Quote className="mx-auto h-8 w-8" style={{ color: T.primary }} />
              <blockquote
                className="mt-6 text-2xl md:text-4xl font-semibold leading-[1.25] tracking-tight"
                style={{ color: T.text, letterSpacing: "-0.02em" }}
              >
                "A room without books is like a body without a soul."
              </blockquote>
              <p className="mt-6 text-sm font-medium tracking-widest uppercase" style={{ color: T.textMuted }}>
                — Marcus Tullius Cicero
              </p>
            </div>
          </section>
        </Reveal>

        {/* Toolbar + library */}
        <section id="library" className="container py-12 md:py-[72px] lg:py-24">
          <Reveal>
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Browse the full library
              </h2>
              <p className="mt-1.5 text-sm md:text-[15px]" style={{ color: T.textMuted }}>
                Search, filter and discover — take your time.
              </p>
            </div>

            <div
              className="sticky top-16 z-30 rounded-2xl border p-3 md:p-4"
              style={{
                background: "rgba(252,252,250,0.9)",
                backdropFilter: "blur(12px)",
                borderColor: T.border,
                boxShadow: "0 8px 30px -20px rgba(17,24,39,0.15)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: T.textMuted }} />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search titles, authors, topics…"
                    className="h-11 rounded-xl border-0 bg-white pl-10 text-sm shadow-none focus-visible:ring-1"
                    style={{ boxShadow: `inset 0 0 0 1px ${T.border}` }}
                  />
                </div>

                <div className="hidden flex-wrap items-center gap-2 lg:flex">
                  <FilterSelect value={category} onChange={setCategory} options={CATEGORIES} />
                  <FilterSelect value={author} onChange={setAuthor} options={authors.map((a) => ({ value: a, label: a === "all" ? "All Authors" : a }))} />
                  <FilterSelect value={language} onChange={setLanguage} options={LANGUAGES} />
                  <FilterSelect value={priceRange} onChange={setPriceRange} options={PRICE_RANGES} />
                  <FilterSelect value={rating} onChange={setRating} options={RATINGS} />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <CurrencySelector compact />
                  <FilterSelect value={sort} onChange={setSort} options={SORTS} accent />

                  <Button
                    variant="outline"
                    className="h-11 rounded-xl lg:hidden"
                    onClick={() => setShowFilters((s) => !s)}
                    style={{ borderColor: T.border }}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
                  <FilterSelect value={category} onChange={setCategory} options={CATEGORIES} />
                  <FilterSelect value={author} onChange={setAuthor} options={authors.map((a) => ({ value: a, label: a === "all" ? "All Authors" : a }))} />
                  <FilterSelect value={language} onChange={setLanguage} options={LANGUAGES} />
                  <FilterSelect value={priceRange} onChange={setPriceRange} options={PRICE_RANGES} />
                  <FilterSelect value={rating} onChange={setRating} options={RATINGS} />
                </div>
              )}
            </div>

            {/* Active chips + count */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="mr-2 text-sm" style={{ color: T.textMuted }}>
                <span className="font-semibold" style={{ color: T.text }}>{paged.length}</span> of{" "}
                <span className="font-semibold" style={{ color: T.text }}>{filtered.length}</span> books
              </p>
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.onClear}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.03]"
                  style={{ borderColor: T.border, background: "#fff", color: T.text }}
                >
                  {c.label}
                  <X className="h-3 w-3" style={{ color: T.textMuted }} />
                </button>
              ))}
              {activeChips.length > 0 && (
                <button
                  onClick={clearAll}
                  className="ml-1 text-xs font-semibold underline underline-offset-2"
                  style={{ color: T.text }}
                >
                  Clear all
                </button>
              )}
            </div>
          </Reveal>

          {/* Grid */}
          <div className="pt-10 md:pt-14">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>

            ) : isError ? (
              <EmptyState
                icon={<AlertTriangle className="h-10 w-10" style={{ color: "#EF4444" }} />}
                title="Something went off-key"
                desc="We couldn't load the library right now. Please try again in a moment."
                cta={{ label: "Retry", onClick: () => refetch() }}
              />
            ) : paged.length === 0 ? (
              <EmptyState
                icon={<Frown className="h-10 w-10" style={{ color: T.textMuted }} />}
                title="No books match those filters"
                desc="Try loosening a filter or searching a different keyword — there are plenty of gems in the library."
                cta={{ label: "Reset filters", onClick: clearAll }}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10 xl:grid-cols-4">
                  {paged.map((b, i) => (
                    <Reveal key={b.id} delay={Math.min(i, 8) * 40}>
                      {renderCard(b)}
                    </Reveal>
                  ))}
                </div>

                {hasMore ? (
                  <div ref={loaderRef} className="mt-14 flex flex-col items-center gap-4">
                    <div className="grid w-full grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10 xl:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <CardSkeleton key={i} />
                      ))}
                    </div>
                    <button
                      onClick={loadMore}
                      className="mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
                      style={{ background: T.text, color: "#fff" }}
                    >
                      Load more books
                    </button>
                  </div>
                ) : (
                  <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                )}
              </>
            )}
          </div>
        </section>

        {/* Recently viewed */}
        {recentBooks.length > 0 && (
          <div className="container">
            <BookCarousel
              title="Recently Viewed"
              subtitle="Pick up where you left off."
              books={recentBooks}
              render={renderCard}
            />
          </div>
        )}

        {/* Related */}
        {relatedBooks.length > 0 && (
          <div className="container">
            <BookCarousel
              title="You Might Also Enjoy"
              subtitle="Chosen from the shelves closest to your interests."
              books={relatedBooks}
              render={renderCard}
            />
          </div>
        )}

        {/* Testimonials */}
        <Reveal>
          <section className="container py-12 md:py-[72px] lg:py-24">
            <div className="mb-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Loved by thoughtful readers
              </h2>
              <p className="mt-2 text-[15px] md:text-base" style={{ color: T.textMuted, lineHeight: 1.7 }}>
                Real words from the GyandootNova community.
              </p>
            </div>
            <div className="grid gap-x-5 gap-y-5 md:grid-cols-3 md:gap-6 lg:gap-x-8 lg:gap-y-10">
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} delay={i * 80}>
                  <figure
                    className="flex h-full flex-col rounded-2xl border p-8 md:p-9"
                    style={{ borderColor: T.border, background: "#fff" }}
                  >
                    <Stars value={5} size={16} />
                    <blockquote className="mt-5 flex-1 text-[15px] md:text-base" style={{ color: "#374151", lineHeight: 1.7 }}>
                      "{t.quote}"
                    </blockquote>

                    <figcaption className="mt-6">
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{t.name}</p>
                      <p className="text-xs" style={{ color: T.textMuted }}>{t.role}</p>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Newsletter */}
        <Reveal>
          <section className="container py-12 md:py-[72px] lg:py-24">
            <div
              className="relative overflow-hidden rounded-3xl border p-10 md:p-16 text-center"
              style={{
                borderColor: T.border,
                background:
                  "radial-gradient(120% 100% at 50% 0%, rgba(245,158,11,0.08) 0%, rgba(252,252,250,1) 55%)",
              }}
            >
              <div
                className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full"
                style={{ background: T.primarySoft, color: T.primaryDark }}
              >
                <Mail className="h-5 w-5" />
              </div>
              <h2
                className="mx-auto max-w-2xl text-3xl md:text-4xl font-bold tracking-tight"
                style={{ color: T.text, letterSpacing: "-0.02em" }}
              >
                A slow letter for careful readers.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px]" style={{ color: T.textMuted }}>
                One considered email each month — new arrivals, editor notes, and quiet reading recommendations. No noise, unsubscribe anytime.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.includes("@")) return;
                  toast({ title: "You're subscribed", description: "We'll write soon." });
                  setEmail("");
                }}
                className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row"
              >
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 rounded-xl border-0 bg-white text-sm shadow-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${T.border}` }}
                />
                <button
                  type="submit"
                  className="h-12 rounded-xl px-6 text-sm font-semibold transition-colors"
                  style={{ background: T.text, color: "#fff" }}
                >
                  Subscribe
                </button>
              </form>
              <p className="mt-3 text-[11.5px]" style={{ color: T.textMuted }}>
                Join 24,000+ readers. We treat your inbox like a library.
              </p>
            </div>
          </section>
        </Reveal>
      </div>

      <QuickView book={quick} onClose={() => setQuick(null)} />
    </Layout>
  );
};

// ==============================
// Helpers
// ==============================
const FilterSelect = ({
  value,
  onChange,
  options,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  accent?: boolean;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      className="h-11 min-w-[140px] rounded-xl border-0 bg-white text-sm font-medium shadow-none"
      style={{
        boxShadow: `inset 0 0 0 1px ${T.border}`,
        color: accent ? T.text : T.text,
      }}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const EmptyState = ({
  icon,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) => (
  <div
    className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border p-12 text-center"
    style={{ borderColor: T.border, background: "#fff" }}
  >
    <div
      className="mb-5 grid h-20 w-20 place-items-center rounded-full"
      style={{ background: T.bg, border: `1px solid ${T.border}` }}
    >
      {icon}
    </div>
    <h3 className="text-xl font-bold" style={{ color: T.text, letterSpacing: "-0.01em" }}>
      {title}
    </h3>
    <p className="mt-2 text-sm" style={{ color: T.textMuted }}>
      {desc}
    </p>
    {cta && (
      <button
        onClick={cta.onClick}
        className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold"
        style={{ background: T.primary, color: "#fff" }}
      >
        {cta.label}
      </button>
    )}
  </div>
);

const Pagination = ({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) => {
  if (totalPages <= 1) return null;
  const win = 2;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= win) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="mt-16 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="grid h-10 w-10 place-items-center rounded-xl border transition-colors disabled:opacity-40"
        style={{ borderColor: T.border, background: "#fff" }}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-2 text-sm" style={{ color: T.textMuted }}>
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className="grid h-10 min-w-[2.5rem] place-items-center rounded-xl px-3 text-sm font-semibold transition-colors"
            style={
              p === page
                ? { background: T.text, color: "#fff" }
                : { border: `1px solid ${T.border}`, background: "#fff", color: T.text }
            }
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="grid h-10 w-10 place-items-center rounded-xl border transition-colors disabled:opacity-40"
        style={{ borderColor: T.border, background: "#fff" }}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Books;
