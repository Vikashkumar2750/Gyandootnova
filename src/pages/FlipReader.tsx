import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link, Navigate } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
// Note: heavy anti-copy watermark disabled here — it was obscuring page text.
import useSEO from "@/hooks/useSEO";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Sun, Moon, Palette, Minus, Plus, List, Loader2, X, BookOpen,
} from "lucide-react";

type Theme = "light" | "sepia" | "dark";
const themeStyles: Record<Theme, { bg: string; fg: string; page: string }> = {
  light: { bg: "#f6f1e6", fg: "#1a1a1a", page: "#fffdf7" },
  sepia: { bg: "#efe6d0", fg: "#3b2410", page: "#fbf3dd" },
  dark:  { bg: "#0f0f10", fg: "#e8e6e1", page: "#1a1a1c" },
};

/** Split HTML into fixed-height "pages" using an off-screen measuring element. */
function useHtmlPages(html: string, pageHeight: number, pageWidth: number, fontSize: number) {
  const [pages, setPages] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !html) { setPages([]); return; }
    const measurer = document.createElement("div");
    measurer.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;width:${pageWidth - 64}px;font-size:${fontSize}px;line-height:1.75;font-family:'Playfair Display',Georgia,serif;`;
    measurer.innerHTML = html;
    document.body.appendChild(measurer);
    const blocks = Array.from(measurer.children) as HTMLElement[];
    if (blocks.length === 0) {
      const p = document.createElement("p");
      p.innerHTML = html;
      measurer.appendChild(p);
      blocks.push(p);
    }
    const out: string[] = [];
    let currentHTML = "";
    const test = document.createElement("div");
    test.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;width:${pageWidth - 64}px;font-size:${fontSize}px;line-height:1.75;font-family:'Playfair Display',Georgia,serif;`;
    document.body.appendChild(test);
    const targetHeight = pageHeight - 100;
    for (const block of blocks) {
      const h = block.outerHTML;
      test.innerHTML = currentHTML + h;
      if (test.getBoundingClientRect().height > targetHeight && currentHTML) {
        out.push(currentHTML);
        currentHTML = h;
      } else {
        currentHTML += h;
      }
    }
    if (currentHTML) out.push(currentHTML);
    document.body.removeChild(measurer);
    document.body.removeChild(test);
    setPages(out);
  }, [html, pageHeight, pageWidth, fontSize]);
  return pages;
}

const FlipReader = () => {
  // useAntiCopy intentionally not used here — its watermark grid made text unreadable.
  const { slug } = useParams<{ slug: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("reader:theme") as Theme) || "sepia");
  const [fontSize, setFontSize] = useState<number>(() => parseInt(localStorage.getItem("reader:fontSize") || "18"));
  const [showTOC, setShowTOC] = useState(false);
  const flipRef = useRef<any>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 500, h: 700 });

  useEffect(() => { localStorage.setItem("reader:theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("reader:fontSize", String(fontSize)); }, [fontSize]);

  const progressKey = slug && sp.get("chapter") ? `reader:flip:progress:${slug}:${sp.get("chapter")}` : "";
  const savedPage = useMemo(() => {
    if (!progressKey) return 0;
    const v = parseInt(localStorage.getItem(progressKey) || "0", 10);
    return isNaN(v) ? 0 : v;
  }, [progressKey]);

  const { data: book } = useQuery({
    queryKey: ["flip-book", slug],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("id, title, slug, author, cover_url, is_free, preview_chapters").eq("slug", slug!).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: chapters } = useQuery({
    queryKey: ["flip-chapters", book?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_book_chapter_index" as any, { _book_id: book!.id });
      return data ?? [];
    },
    enabled: !!book?.id,
  });

  const chapterSlug = sp.get("chapter") || chapters?.[0]?.slug;
  const chapter = chapters?.find((c: any) => c.slug === chapterSlug);

  const { data: content, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ["flip-content", chapter?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_chapter_content", { _chapter_id: chapter!.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row?.content ?? "") as string;
    },
    enabled: !!chapter?.id,
    retry: false,
  });

  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 40, 1100);
      const h = Math.min(window.innerHeight - 160, 820);
      // pages come in pairs on desktop, single on mobile
      const isMobile = window.innerWidth < 768;
      const pageW = isMobile ? w : Math.floor(w / 2);
      setDims({ w: pageW, h });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pages = useHtmlPages(content || "", dims.h, dims.w, fontSize);

  useSEO({
    title: book && chapter ? `${chapter.title} — ${book.title} (Flip) | GyandootNova` : "Flip Reader | GyandootNova",
    description: "Kindle-jaisa page-flip reader — dharmik granth ka ananya anubhav.",
    noindex: true,
  });

  const currentIdx = chapters?.findIndex((c: any) => c.slug === chapterSlug) ?? -1;
  const nextChapter = chapters && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const prevChapter = currentIdx > 0 ? chapters?.[currentIdx - 1] : null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flipRef.current?.pageFlip()?.flipNext();
      if (e.key === "ArrowLeft") flipRef.current?.pageFlip()?.flipPrev();
      if (e.key === "Escape") setShowTOC(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!slug) return <Navigate to="/books" replace />;

  const t = themeStyles[theme];

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: t.bg, color: t.fg }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2 border-b" style={{ borderColor: `${t.fg}22`, background: `${t.bg}ee`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => navigate(book ? `/books/${book.slug}` : "/books")}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div className="min-w-0">
            <div className="text-sm font-serif truncate">{book?.title}</div>
            <div className="text-[10px] opacity-70 truncate">{chapter ? `Ch ${chapter.chapter_number} · ${chapter.title}` : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowTOC(true)} title="Chapters"><List className="h-4 w-4"/></Button>
          <Button size="sm" variant="ghost" onClick={() => setFontSize((s) => Math.max(14, s-1))} title="Font smaller"><Minus className="h-4 w-4"/></Button>
          <span className="text-xs tabular-nums w-6 text-center">{fontSize}</span>
          <Button size="sm" variant="ghost" onClick={() => setFontSize((s) => Math.min(28, s+1))} title="Font larger"><Plus className="h-4 w-4"/></Button>
          <Button size="sm" variant="ghost" onClick={() => setTheme(theme === "light" ? "sepia" : theme === "sepia" ? "dark" : "light")} title="Theme">
            {theme === "dark" ? <Moon className="h-4 w-4"/> : theme === "sepia" ? <Palette className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}
          </Button>
          {book && chapterSlug && (
            <Button asChild size="sm" variant="ghost">
              <Link to={`/books/${book.slug}/${chapterSlug}`} title="Scroll mode">Scroll</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Book */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center py-6 relative">
        {contentLoading ? (
          <Loader2 className="h-8 w-8 animate-spin"/>
        ) : contentError ? (
          <div className="text-center max-w-md p-6">
            <BookOpen className="mx-auto h-8 w-8 opacity-60"/>
            <p className="mt-3">Yeh adhyay locked hai.</p>
            {book && <Button asChild className="mt-4"><Link to={`/books/${book.slug}`}>Book kholein</Link></Button>}
          </div>
        ) : pages.length === 0 ? (
          <Loader2 className="h-8 w-8 animate-spin"/>
        ) : (
          <div className="shadow-2xl">
            {/* @ts-ignore */}
            <HTMLFlipBook
              key={`${progressKey}:${fontSize}:${dims.w}x${dims.h}:${pages.length}`}
              width={dims.w}
              height={dims.h}
              size="fixed"
              minWidth={280}
              maxWidth={700}
              minHeight={400}
              maxHeight={900}
              showCover={false}
              mobileScrollSupport
              flippingTime={700}
              drawShadow
              usePortrait
              startPage={Math.min(savedPage, Math.max(0, pages.length - 1))}
              ref={flipRef}
              onFlip={(e: any) => {
                setPageIdx(e.data);
                if (progressKey) localStorage.setItem(progressKey, String(e.data));
              }}
              className="reader-flipbook"
              style={{}}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.5}
              clickEventForward
              useMouseEvents
              swipeDistance={30}
              showPageCorners
              disableFlipByClick={false}
            >
              {pages.map((html, i) => (
                <div key={i} className="rf-page" style={{ background: t.page, color: t.fg }}>
                  <div className="rf-page-inner" style={{ fontSize, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: html }} />
                  <div className="rf-page-footer">
                    <span>{book?.title}</span>
                    <span>{i + 1} / {pages.length}</span>
                  </div>
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <footer className="sticky bottom-0 z-40 flex items-center justify-between gap-2 px-3 py-2 border-t" style={{ borderColor: `${t.fg}22`, background: `${t.bg}ee`, backdropFilter: "blur(8px)" }}>
        <Button size="sm" variant="ghost" onClick={() => flipRef.current?.pageFlip()?.flipPrev()}><ChevronLeft className="h-4 w-4 mr-1"/>Piche</Button>
        <div className="flex-1 mx-2">
          <div className="h-1 rounded-full" style={{ background: `${t.fg}22` }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pages.length ? ((pageIdx+1)/pages.length)*100 : 0}%`, background: t.fg }}/>
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-center opacity-75">
            Panna {pages.length ? pageIdx + 1 : 0} / {pages.length} {chapter ? `· Adhyay ${chapter.chapter_number}` : ""}{chapters?.length ? ` (kul ${chapters.length} adhyay)` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prevChapter && <Button asChild size="sm" variant="outline"><Link to={`/read/${slug}/flip?chapter=${prevChapter.slug}`}>◄ Ch {prevChapter.chapter_number}</Link></Button>}
          {nextChapter && <Button asChild size="sm" variant="outline"><Link to={`/read/${slug}/flip?chapter=${nextChapter.slug}`}>Ch {nextChapter.chapter_number} ►</Link></Button>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => flipRef.current?.pageFlip()?.flipNext()}>Aage<ChevronRight className="h-4 w-4 ml-1"/></Button>
      </footer>

      {/* TOC drawer */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowTOC(false)}>
          <div className="w-80 max-w-[85vw] h-full overflow-y-auto shadow-2xl" style={{ background: t.page, color: t.fg }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: `${t.fg}22` }}>
              <div className="font-serif">Adhyay soochi</div>
              <Button size="sm" variant="ghost" onClick={() => setShowTOC(false)}><X className="h-4 w-4"/></Button>
            </div>
            <div className="divide-y" style={{ borderColor: `${t.fg}22` }}>
              {(chapters ?? []).map((c: any) => (
                <button
                  key={c.id}
                  className="w-full text-left p-3 text-sm hover:opacity-80"
                  style={{ fontWeight: c.slug === chapterSlug ? 600 : 400 }}
                  onClick={() => { navigate(`/read/${slug}/flip?chapter=${c.slug}`); setShowTOC(false); }}
                >
                  Ch {c.chapter_number} · {c.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1"/>
        </div>
      )}

      <style>{`
        .reader-flipbook .rf-page {
          position: relative;
          padding: 32px 32px 44px;
          overflow: hidden;
          box-sizing: border-box;
          font-family: 'Playfair Display', Georgia, serif;
        }
        .reader-flipbook .rf-page-inner {
          max-height: calc(100% - 24px);
          overflow: hidden;
          text-align: justify;
          hyphens: auto;
        }
        .reader-flipbook .rf-page-inner p { margin: 0 0 0.8em; }
        .reader-flipbook .rf-page-inner h1,
        .reader-flipbook .rf-page-inner h2,
        .reader-flipbook .rf-page-inner h3 { font-family: 'Playfair Display', Georgia, serif; margin: 0.6em 0 0.4em; }
        .reader-flipbook .rf-page-footer {
          position: absolute; left: 32px; right: 32px; bottom: 14px;
          display: flex; justify-content: space-between;
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default FlipReader;
