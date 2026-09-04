import { useParams, Link, useNavigate, Navigate } from "react-router-dom";
import AskScripture from "@/components/AskScripture";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Sun, Moon, Minus, Plus,
  BookOpen, Bookmark, BookmarkCheck, StickyNote, X, Save, Highlighter, Trash2, List, Check, Palette,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SecureRichReader from "@/components/SecureRichReader";
import { useAntiCopy } from "@/hooks/useAntiCopy";
import useSEO from "@/hooks/useSEO";
import { applyHighlights, captureSelection, type StoredHighlight } from "@/lib/readerHighlights";


/* ─── Types ─────────────────────────────────────────────────────────── */
interface Highlight {
  id: string;
  selected_text: string;
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  color: string;
}

/* ─── Highlight color config ─────────────────────────────────────────── */
const HIGHLIGHT_COLORS: { id: string; label: string; swatch: string; markClass: string; panelClass: string; dotClass: string }[] = [
  {
    id: "yellow",
    label: "Yellow",
    swatch: "bg-yellow-300",
    markClass: "bg-yellow-200 dark:bg-yellow-600/60",
    panelClass: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/40",
    dotClass: "bg-yellow-400",
  },
  {
    id: "green",
    label: "Green",
    swatch: "bg-green-400",
    markClass: "bg-green-200 dark:bg-green-600/60",
    panelClass: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/40",
    dotClass: "bg-green-500",
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "bg-blue-400",
    markClass: "bg-blue-200 dark:bg-blue-600/60",
    panelClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40",
    dotClass: "bg-blue-500",
  },
  {
    id: "pink",
    label: "Pink",
    swatch: "bg-pink-400",
    markClass: "bg-pink-200 dark:bg-pink-600/60",
    panelClass: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700/40",
    dotClass: "bg-pink-500",
  },
];

const getColorConfig = (color: string) =>
  HIGHLIGHT_COLORS.find((c) => c.id === color) ?? HIGHLIGHT_COLORS[0];

/* ─── Main Component ─────────────────────────────────────────────────── */
const BookReader = () => {
  useAntiCopy();
  const { slug, chapterSlug } = useParams<{ slug: string; chapterSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reader settings (persisted)
  type ReaderTheme = "light" | "sepia" | "dark";
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return 19;
    const v = parseInt(localStorage.getItem("reader:fontSize") ?? "");
    return Number.isFinite(v) && v >= 14 && v <= 32 ? v : 19;
  });
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    if (typeof window === "undefined") return "light";
    const v = localStorage.getItem("reader:theme") as ReaderTheme | null;
    return v === "sepia" || v === "dark" || v === "light" ? v : "light";
  });
  const darkMode = theme === "dark";
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => { localStorage.setItem("reader:fontSize", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader:theme", theme); }, [theme]);

  const cycleTheme = () => setTheme((t) => (t === "light" ? "sepia" : t === "sepia" ? "dark" : "light"));

  // Panels
  const [showNotes, setShowNotes] = useState(false);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [highlightColorFilter, setHighlightColorFilter] = useState<string | null>(null);
  const [tocSearch, setTocSearch] = useState("");

  // Highlight selection
  const [showHighlightBar, setShowHighlightBar] = useState(false);
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string; paraIdx: number; start: number; end: number;
  } | null>(null);
  const [highlightBarPos, setHighlightBarPos] = useState({ x: 0, y: 0 });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /* ─── Queries ──────────────────────────────────────────────────────── */
  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ["book", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("id, title, slug, author, cover_url, price, is_free, is_featured, description, preview_chapters, purchase_count, file_type, created_at, updated_at").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ["all-chapters", book?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_book_chapter_index" as any, { _book_id: book!.id });
      return data ?? [];
    },
    enabled: !!book?.id,
    staleTime: 5 * 60 * 1000,
  });

  const chapter = chapters?.find((c) => c.slug === chapterSlug);
  const isPreviewChapter = !!chapter && (
    chapter.is_preview || chapter.chapter_number <= (book?.preview_chapters ?? 0)
  );
  const purchaseRequired = !!book && !book.is_free && !isPreviewChapter;


  const { data: hasPurchased, isLoading: purchaseLoading } = useQuery({
    queryKey: ["purchase-check", book?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_purchased_book", { _user_id: user!.id, _book_id: book!.id });
      return !!data;
    },
    enabled: !!book?.id && !!user?.id && purchaseRequired,
    staleTime: 60 * 1000,
  });

  // Saved reading progress for this book (single row per user+book).
  const { data: savedProgress } = useQuery({
    queryKey: ["reading-progress", book?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("chapter_id, chapter_number, scroll_percent")
        .eq("user_id", user!.id)
        .eq("book_id", book!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!book?.id && !!user?.id,
  });


  // Securely fetch chapter content via RPC (enforces access server-side)
  const { data: chapterContent, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ["chapter-content", chapter?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_chapter_content", { _chapter_id: chapter!.id });
      if (error) throw error;
      // RPC returns TABLE(content text) → array with one row
      const row = Array.isArray(data) ? data[0] : data;
      return (row?.content ?? "") as string;
    },
    enabled: !!chapter?.id && (!!book?.is_free || isPreviewChapter || !!user),
    retry: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const currentIndex = chapters?.findIndex((c) => c.slug === chapterSlug) ?? -1;
  const prevChapter = currentIndex > 0 ? chapters?.[currentIndex - 1] : null;
  const nextChapter = chapters && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const totalChapters = chapters?.length ?? 1;
  const chapterProgress = totalChapters > 0 ? ((currentIndex + 1) / totalChapters) * 100 : 0;
  const readerDescription = book && chapter
    ? `${book.title} ka ${chapter.title} Hindi mein padhein. Sanskrit shlok, saral Hindi arth aur spiritual study ke liye GyandootNova reader.`
    : "GyandootNova reader mein dharmik granth Hindi mein padhein.";
  const readerJsonLd = book ? {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "inLanguage": "hi-IN",
    "bookFormat": "https://schema.org/EBook",
    "author": { "@type": "Person", "name": book.author },
    "description": (book.description ?? readerDescription).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    "url": `https://gyandootnova.in/books/${book.slug}`,
    ...(book.cover_url && { "image": book.cover_url }),
    "publisher": {
      "@type": "Organization",
      "name": "GyandootNova",
      "url": "https://gyandootnova.in",
    },
    ...(chapter && {
      "workExample": {
        "@type": "Chapter",
        "name": chapter.title,
        "position": chapter.chapter_number,
        "url": `https://gyandootnova.in/books/${book.slug}/${chapter.slug}`,
      },
    }),
  } : undefined;

  useSEO({
    title: book && chapter ? `${chapter.title} — ${book.title} | GyandootNova` : "Reader | GyandootNova",
    description: readerDescription,
    // Canonical points to the book detail page — chapter reader URLs are premium
    // content and should not rank; only the book page should appear in search.
    canonical: book ? `/books/${book.slug}` : undefined,
    ogImage: book?.cover_url ?? undefined,
    ogType: "book",
    jsonLd: readerJsonLd,
    noindex: true,
  });

  /* ─── Highlights ───────────────────────────────────────────────────── */
  const { data: highlights = [] } = useQuery<Highlight[]>({
    queryKey: ["highlights", chapter?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("text_highlights")
        .select("id, selected_text, paragraph_index, start_offset, end_offset, color")
        .eq("chapter_id", chapter!.id)
        .eq("user_id", user!.id);
      return (data ?? []) as Highlight[];
    },
    enabled: !!chapter?.id && !!user?.id,
  });

  const addHighlightMutation = useMutation({
    mutationFn: async (h: Omit<Highlight, "id">) => {
      await supabase.from("text_highlights").insert({
        user_id: user!.id,
        book_id: book!.id,
        chapter_id: chapter!.id,
        selected_text: h.selected_text,
        paragraph_index: h.paragraph_index,
        start_offset: h.start_offset,
        end_offset: h.end_offset,
        color: h.color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights", chapter?.id, user?.id] });
      toast({ title: "Highlighted!", description: "Text saved to your highlights." });
    },
  });

  const deleteHighlightMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("text_highlights").delete().eq("id", id).eq("user_id", user!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["highlights", chapter?.id, user?.id] }),
  });

  /* ─── Notes ────────────────────────────────────────────────────────── */
  const { data: existingNote } = useQuery({
    queryKey: ["chapter-note", chapter?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chapter_notes")
        .select("id, content")
        .eq("chapter_id", chapter!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!chapter?.id && !!user?.id,
  });

  useEffect(() => {
    if (existingNote) setNoteText(existingNote.content);
    else setNoteText("");
  }, [existingNote]);

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (existingNote?.id) {
        await supabase.from("chapter_notes").update({ content }).eq("id", existingNote.id);
      } else {
        await supabase.from("chapter_notes").insert({
          user_id: user!.id,
          book_id: book!.id,
          chapter_id: chapter!.id,
          content,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-note", chapter?.id, user?.id] });
      toast({ title: "Note saved!" });
    },
  });

  /* ─── Bookmarks ────────────────────────────────────────────────────── */
  const { data: isBookmarked } = useQuery({
    queryKey: ["bookmark", chapter?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("chapter_id", chapter!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!chapter?.id && !!user?.id,
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await supabase.from("bookmarks").delete()
          .eq("chapter_id", chapter!.id).eq("user_id", user!.id);
      } else {
        await supabase.from("bookmarks").insert({
          user_id: user!.id,
          book_id: book!.id,
          chapter_id: chapter!.id,
          chapter_number: chapter!.chapter_number,
          chapter_title: chapter!.title,
          book_title: book!.title,
          book_slug: slug!,
          chapter_slug: chapter!.slug,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", chapter?.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-bookmarks", user?.id] });
      toast({ title: isBookmarked ? "Bookmark removed" : "Chapter bookmarked!" });
    },
  });

  /* ─── Reading progress ─────────────────────────────────────────────── */
  const saveProgressMutation = useMutation({
    mutationFn: async ({ scrollPct }: { scrollPct: number }) => {
      if (!user || !book?.id || !chapter?.id) return;
      await supabase.from("reading_progress").upsert(
        {
          user_id: user.id,
          book_id: book.id,
          chapter_id: chapter.id,
          chapter_number: chapter.chapter_number,
          scroll_percent: Math.round(scrollPct),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,book_id" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-progress", book?.id, user?.id] });
    },
  });

  const handleScroll = useCallback(() => {
    const el = document.documentElement;
    const scrolled = el.scrollTop / (el.scrollHeight - el.clientHeight);
    const pct = Math.min(scrolled * 100, 100) || 0;
    setScrollProgress(pct);
    if (user && book?.id && chapter?.id) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveProgressMutation.mutate({ scrollPct: pct });
      }, 1500);
    }
  }, [user, book?.id, chapter?.id]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [handleScroll]);

  // Keyboard shortcuts: ← / → chapter nav, j/k page scroll, +/- font, t theme cycle, b bookmark, / TOC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "ArrowRight":
        case "n":
          if (nextChapter) { e.preventDefault(); navigate(`/books/${slug}/${nextChapter.slug}`); }
          break;
        case "ArrowLeft":
        case "p":
          if (prevChapter) { e.preventDefault(); navigate(`/books/${slug}/${prevChapter.slug}`); }
          break;
        case "j":
          e.preventDefault();
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
          break;
        case "k":
          e.preventDefault();
          window.scrollBy({ top: -window.innerHeight * 0.85, behavior: "smooth" });
          break;
        case "+":
        case "=":
          e.preventDefault();
          setFontSize((s) => Math.min(32, s + 1));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setFontSize((s) => Math.max(14, s - 1));
          break;
        case "0":
          e.preventDefault();
          setFontSize(19);
          break;
        case "t":
          e.preventDefault();
          cycleTheme();
          break;
        case "b":
          if (user) { e.preventDefault(); toggleBookmarkMutation.mutate(); }
          break;
        case "/":
          e.preventDefault();
          setShowTOC((v) => !v);
          break;
        case "Escape":
          setShowTOC(false);
          setShowNotes(false);
          setShowHighlightsPanel(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextChapter?.slug, prevChapter?.slug, slug, user, theme]);

  // Restore saved scroll position when a chapter loads. If this chapter matches
  // the user's last-read chapter for this book AND we have content, jump to
  // the saved percent. Otherwise start at the top.
  const restoredForChapterRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chapter?.id) return;
    // Guard: only restore once per chapter mount.
    if (restoredForChapterRef.current === chapter.id) return;
    // Wait until chapter content is actually rendered.
    if (contentLoading || !chapterContent) return;

    const shouldRestore =
      user &&
      savedProgress &&
      savedProgress.chapter_id === chapter.id &&
      typeof savedProgress.scroll_percent === "number" &&
      savedProgress.scroll_percent > 2 &&
      savedProgress.scroll_percent < 98;

    // Let the DOM settle so scrollHeight is final.
    const t = setTimeout(() => {
      if (shouldRestore) {
        const el = document.documentElement;
        const target = ((el.scrollHeight - el.clientHeight) * savedProgress!.scroll_percent) / 100;
        window.scrollTo({ top: target, behavior: "auto" });
        toast({
          title: "Resuming where you left off",
          description: `${savedProgress!.scroll_percent}% into this chapter.`,
        });
      } else {
        window.scrollTo(0, 0);
      }
      restoredForChapterRef.current = chapter.id;
    }, 120);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id, chapterContent, contentLoading, savedProgress?.chapter_id, savedProgress?.scroll_percent, user?.id]);


  /* ─── Text selection / highlight bar ──────────────────────────────── */
  const handleSelection = useCallback(() => {
    if (!user) return;
    const cap = captureSelection(contentRef.current);
    if (!cap) {
      setShowHighlightBar(false);
      setSelectionInfo(null);
      return;
    }
    setHighlightBarPos({
      x: cap.rect.left + cap.rect.width / 2,
      y: cap.rect.top + window.scrollY - 56,
    });
    setSelectionInfo({ text: cap.text, paraIdx: cap.paraIdx, start: cap.start, end: cap.end });
    setShowHighlightBar(true);
  }, [user]);

  const saveHighlight = (color: string) => {
    if (!selectionInfo) return;
    addHighlightMutation.mutate({
      selected_text: selectionInfo.text,
      paragraph_index: selectionInfo.paraIdx,
      start_offset: selectionInfo.start,
      end_offset: selectionInfo.end,
      color,
    });
    setSelectedColor(color);
    window.getSelection()?.removeAllRanges();
    setShowHighlightBar(false);
    setSelectionInfo(null);
  };

  /* ─── Re-apply saved highlights on the rendered chapter ────────────── */
  useEffect(() => {
    if (!contentRef.current) return;
    const root = contentRef.current;
    const raf = requestAnimationFrame(() => {
      applyHighlights(root, highlights as StoredHighlight[], (c) => getColorConfig(c).markClass);
    });
    return () => cancelAnimationFrame(raf);
  }, [highlights, chapterContent, fontSize, theme]);

  /* Click a highlight mark to remove it */
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement | null)?.closest?.("mark[data-hl-id]");
      const id = mark?.getAttribute("data-hl-id");
      if (id) deleteHighlightMutation.mutate(id);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent]);



  /* ─── Access check ─────────────────────────────────────────────────── */
  const canRead = !!book?.is_free || isPreviewChapter || !!hasPurchased;

  // Loading state — while book/chapters are being fetched
  if (bookLoading || (book && chaptersLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Book truly doesn't exist
  if (!book) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-serif text-2xl font-bold">Book not found</h2>
        <p className="text-muted-foreground text-sm">यह book उपलब्ध नहीं है या हटा दी गई है।</p>
        <Button asChild><Link to="/books">Browse Books</Link></Button>
      </div>
    );
  }

  // Chapter slug doesn't match — admin likely updated chapter slugs.
  // Auto-redirect to the first available chapter so user is not stuck on a 404.
  if (!chapter) {
    if (chapters && chapters.length > 0) {
      return <Navigate to={`/books/${slug}/${chapters[0].slug}`} replace />;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-serif text-2xl font-bold">कोई chapter उपलब्ध नहीं है</h2>
        <p className="text-muted-foreground text-sm">इस book में अभी कोई chapter add नहीं किया गया है।</p>
        <Button asChild><Link to={`/books/${slug}`}>Back to Book</Link></Button>
      </div>
    );
  }


  if (purchaseRequired && user && purchaseLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Reading access check ho raha hai…</p>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-primary" />
        <h2 className="font-serif text-2xl font-bold">Purchase Required</h2>
        <p className="text-muted-foreground">This chapter requires purchasing the book.</p>
        <Button asChild><Link to={`/books/${slug}`}>Back to Book</Link></Button>
      </div>
    );
  }

  if (contentLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-40 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/books/${slug}`}><ArrowLeft className="mr-1 h-4 w-4" />{book.title}</Link>
            </Button>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
        <article className="mx-auto max-w-4xl px-6 py-10">
          <div className="mb-2 text-sm text-muted-foreground">Chapter {chapter.chapter_number} of {totalChapters}</div>
          <h1 className="mb-6 font-serif text-3xl font-bold">{chapter.title}</h1>
          <div className="space-y-4" aria-label="Chapter loading">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
          </div>
        </article>
      </div>
    );
  }

  const rawContent = (chapterContent ?? "") as string;
  const watermarkText = user?.email ? `GyandootNova • ${user.email}` : "GyandootNova • Protected";

  const themeShellClass =
    theme === "dark"
      ? "bg-gray-900 text-gray-100"
      : theme === "sepia"
      ? "bg-[#f4ecd8] text-[#3a2a12]"
      : "bg-background text-foreground";
  const toolbarClass =
    theme === "dark"
      ? "border-gray-700 bg-gray-900/95"
      : theme === "sepia"
      ? "border-[#e6d9b8] bg-[#f4ecd8]/95 backdrop-blur"
      : "bg-background/95 backdrop-blur";

  return (
    <div className={`min-h-screen transition-colors ${themeShellClass}`}>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={scrollProgress} className="h-1 rounded-none" />
      </div>

      {/* TOC Sidebar overlay */}
      {showTOC && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTOC(false)}
          />
          {/* Drawer */}
          <aside className={`fixed top-0 left-0 z-[56] h-full w-72 shadow-2xl flex flex-col ${darkMode ? "bg-gray-900 border-r border-gray-700" : "bg-background border-r border-border"}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? "border-gray-700" : "border-border"}`}>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Table of Contents</p>
                <h3 className="font-serif font-bold text-sm leading-tight mt-0.5 line-clamp-1">{book.title}</h3>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowTOC(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Search */}
            <div className={`px-3 py-2 border-b ${darkMode ? "border-gray-700" : "border-border"}`}>
              <input
                type="text"
                value={tocSearch}
                onChange={(e) => setTocSearch(e.target.value)}
                placeholder="Search chapters…"
                className={`w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary ${darkMode ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-300" : "bg-background border-input placeholder:text-muted-foreground"}`}
              />
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {chapters?.filter((ch) => !tocSearch || ch.title.toLowerCase().includes(tocSearch.toLowerCase())).map((ch, i) => {
                const isCurrent = ch.slug === chapterSlug;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      navigate(`/books/${slug}/${ch.slug}`);
                      setShowTOC(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors group ${
                      isCurrent
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : darkMode
                        ? "hover:bg-gray-800 text-gray-200"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className={`text-xs shrink-0 mt-0.5 font-mono w-5 text-right ${isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {ch.chapter_number}
                    </span>
                    <span className={`text-sm leading-snug ${isCurrent ? "font-semibold" : ""}`}>
                      {ch.title}
                      {ch.is_preview && (
                        <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1 rounded">Preview</span>
                      )}
                    </span>
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 ml-auto mt-0.5 text-primary" />}
                  </button>
                );
              })}
            </div>
            {/* Progress footer */}
            <div className={`px-4 py-3 border-t ${darkMode ? "border-gray-700" : "border-border"}`}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Chapter {currentIndex + 1} of {totalChapters}</span>
                <span>{Math.round(chapterProgress)}%</span>
              </div>
              <Progress value={chapterProgress} className="h-1.5" />
            </div>
          </aside>
        </>
      )}

      {/* Toolbar */}
      <div className={`sticky top-0 z-40 border-b px-4 py-2 ${toolbarClass}`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-1">
            {/* TOC button */}
            <Button
              variant="ghost"
              size="icon"
              title="Table of Contents"
              onClick={() => setShowTOC(!showTOC)}
              className={showTOC ? "text-primary" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/books/${slug}`}><ArrowLeft className="mr-1 h-4 w-4" /><span className="hidden sm:inline">{book.title}</span></Link>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setFontSize((s) => Math.max(14, s - 2))}><Minus className="h-4 w-4" /></Button>
            <span className="text-xs w-6 text-center">{fontSize}</span>
            <Button variant="ghost" size="icon" onClick={() => setFontSize((s) => Math.min(28, s + 2))}><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Theme: ${theme}`}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : theme === "sepia" ? <Palette className="h-4 w-4 text-amber-700" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Notes"
                  onClick={() => { setShowNotes(!showNotes); setShowHighlightsPanel(false); }}
                  className={showNotes ? "text-primary" : ""}
                >
                  <StickyNote className="h-4 w-4" />
                </Button>
                {highlights.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Highlights"
                    onClick={() => { setShowHighlightsPanel(!showHighlightsPanel); setShowNotes(false); }}
                    className={showHighlightsPanel ? "text-primary" : ""}
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title={isBookmarked ? "Remove bookmark" : "Bookmark chapter"}
                  onClick={() => toggleBookmarkMutation.mutate()}
                  disabled={toggleBookmarkMutation.isPending}
                >
                  {isBookmarked
                    ? <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                    : <Bookmark className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes panel */}
      {showNotes && user && (
        <div className={`sticky top-[49px] z-30 border-b px-4 py-3 ${darkMode ? "border-gray-700 bg-gray-800" : "bg-muted/60 backdrop-blur"}`}>
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-primary" /> My Notes — {chapter.title}
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}><X className="h-4 w-4" /></Button>
            </div>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your notes for this chapter…"
              className="min-h-[80px] text-sm resize-none bg-background"
            />
            <div className="flex justify-end mt-2 gap-2">
              <Button
                size="sm"
                onClick={() => saveNoteMutation.mutate(noteText)}
                disabled={saveNoteMutation.isPending}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveNoteMutation.isPending ? "Saving…" : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Highlights panel */}
      {showHighlightsPanel && user && highlights.length > 0 && (
        <div className={`sticky top-[49px] z-30 border-b px-4 py-3 ${darkMode ? "border-gray-700 bg-gray-800" : "bg-muted/60 backdrop-blur"}`}>
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Highlighter className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {highlights.length} Highlight{highlights.length !== 1 ? "s" : ""} — {chapter.title}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowHighlightsPanel(false)}><X className="h-4 w-4" /></Button>
            </div>
            {/* Color filter buttons */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <button
                onClick={() => setHighlightColorFilter(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${highlightColorFilter === null ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"}`}
              >
                All ({highlights.length})
              </button>
              {HIGHLIGHT_COLORS.filter((c) => highlights.some((h) => h.color === c.id)).map((c) => {
                const count = highlights.filter((h) => h.color === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setHighlightColorFilter(highlightColorFilter === c.id ? null : c.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${highlightColorFilter === c.id ? `${c.markClass} border-current font-semibold` : "border-border text-muted-foreground hover:border-foreground"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${c.dotClass}`} />
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
              {highlights.filter((h) => !highlightColorFilter || h.color === highlightColorFilter).map((h, i) => {
                const cc = getColorConfig(h.color);
                return (
                  <div
                    key={h.id}
                    className={`flex items-start gap-2 group rounded-md p-2.5 border cursor-pointer transition-colors hover:opacity-90 ${cc.panelClass}`}
                    onClick={() => {
                      const el = contentRef.current?.querySelector(`p[data-para-idx="${h.paragraph_index}"]`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      setShowHighlightsPanel(false);
                    }}
                  >
                    <span className={`h-3 w-3 rounded-full ${cc.dotClass} shrink-0 mt-0.5`} />
                    <p className="text-xs text-foreground flex-1 line-clamp-2">"{h.selected_text}"</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); deleteHighlightMutation.mutate(h.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chapter content */}
      <article className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-2 text-sm text-muted-foreground">
          Chapter {chapter.chapter_number} of {totalChapters}
        </div>
        <h1 className="font-serif text-3xl font-bold mb-4">{chapter.title}</h1>
        {user && highlights.length > 0 && (
          <div className="mb-8 flex items-center gap-2 flex-wrap">
            {HIGHLIGHT_COLORS.filter((c) => highlights.some((h) => h.color === c.id)).map((c) => (
              <span key={c.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.markClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.dotClass}`} />
                {highlights.filter((h) => h.color === c.id).length} {c.label}
              </span>
            ))}
            <button
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
              onClick={() => setShowHighlightsPanel(true)}
            >
              — View all ↗
            </button>
          </div>
        )}
        <div
          ref={contentRef}
          className="max-w-none"
          onMouseUp={handleSelection}
          onTouchEnd={handleSelection}
        >

          <SecureRichReader
            content={rawContent}
            fontSize={fontSize}
            darkMode={darkMode}
            theme={theme}
            watermarkText={watermarkText}
          />
        </div>
      </article>

      {/* Book progress bar */}
      <div className="mx-auto max-w-4xl px-6 pb-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="shrink-0">Chapter {currentIndex + 1}/{totalChapters}</span>
          <Progress value={chapterProgress} className="flex-1 h-2" />
          <span className="shrink-0">{Math.round(chapterProgress)}%</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-auto max-w-4xl px-6 pb-10">
        <div className="flex justify-between">
          {prevChapter ? (
            <Button variant="outline" onClick={() => navigate(`/books/${slug}/${prevChapter.slug}`)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
          ) : <div />}
          {nextChapter ? (
            <Button onClick={() => navigate(`/books/${slug}/${nextChapter.slug}`)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to={`/books/${slug}`}>Finished! Back to Book</Link>
            </Button>
          )}
        </div>
      </div>
      {/* Floating highlight toolbar (appears on text selection) */}
      {showHighlightBar && user && selectionInfo && (
        <div
          className="fixed z-[60] -translate-x-1/2 rounded-full border bg-background shadow-lg px-2 py-1.5 flex items-center gap-1.5"
          style={{ left: highlightBarPos.x, top: Math.max(8, highlightBarPos.y - window.scrollY) }}
        >
          <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              title={`Highlight ${c.label}`}
              onClick={() => saveHighlight(c.id)}
              className={`h-5 w-5 rounded-full border border-border ${c.swatch} ${selectedColor === c.id ? "ring-2 ring-primary ring-offset-1" : ""}`}
            />
          ))}
          <button
            title="Add note"
            onClick={() => {
              setNoteText((t) => `${t ? `${t}\n\n` : ""}“${selectionInfo.text.trim()}” — `);
              setShowNotes(true);
              setShowHighlightBar(false);
              window.getSelection()?.removeAllRanges();
            }}
            className="ml-1 rounded-full p-1 hover:bg-muted"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {book && <AskScripture bookId={book.id} bookTitle={book.title} />}

    </div>
  );
};

export default BookReader;
