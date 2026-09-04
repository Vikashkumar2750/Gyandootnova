import { useParams, Link, useNavigate } from "react-router-dom";
import AskScripture from "@/components/AskScripture";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, BookOpen, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useMemo } from "react";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import { useAntiCopy } from "@/hooks/useAntiCopy";
import logoImg from "@/assets/logo.jpeg";
import useSEO from "@/hooks/useSEO";

const FileBookReader = () => {
  useAntiCopy();
  useSEO({ title: "Read Book | GyandootNova", canonical: "/", noindex: true });
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // On sign out → immediately revoke access & redirect
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Clear all cached file URLs
        queryClient.removeQueries({ queryKey: ["book-file-url"] });
        navigate(`/books/${slug}`, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient, navigate, slug]);

  const { data: book } = useQuery({
    queryKey: ["book", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, slug, author, file_type, is_free, price")
        .eq("slug", slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  const progressKey = book?.id && user?.id ? `book-progress-${book.id}-${user.id}` : null;
  const savedPage = useMemo(() => progressKey ? parseInt(localStorage.getItem(progressKey) || "1", 10) : 1, [progressKey]);
  const handlePageChange = useCallback((page: number) => {
    if (progressKey) localStorage.setItem(progressKey, String(page));
  }, [progressKey]);

  const { data: fileData, isLoading, error } = useQuery({
    queryKey: ["book-file-url", book?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-book-file-url", {
        body: { book_id: book!.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { url: string; file_type: string };
    },
    enabled: !!book?.id && !authLoading,
    // Short stale time - URL expires in 5 min
    staleTime: 4 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    // Refetch when window regains focus to keep URL fresh
    refetchOnWindowFocus: true,
  });

  // Prevent right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // Anti-screenshot: blur content when page not visible or window loses focus
  useEffect(() => {
    const root = document.getElementById("reader-secure-root");
    if (!root) return;

    const blurContent = () => { root.style.filter = "blur(40px)"; };
    const unblurContent = () => { root.style.filter = "none"; };

    const handleVisibility = () => {
      if (document.hidden) blurContent(); else unblurContent();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", blurContent);
    window.addEventListener("focus", unblurContent);
    // Mouse leaving the window (often happens during snipping tools)
    document.addEventListener("mouseleave", blurContent);
    document.addEventListener("mouseenter", unblurContent);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", blurContent);
      window.removeEventListener("focus", unblurContent);
      document.removeEventListener("mouseleave", blurContent);
      document.removeEventListener("mouseenter", unblurContent);
      root.style.filter = "none";
    };
  }, []);

  // Prevent keyboard shortcuts for saving/printing/developer tools
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+P, Ctrl+Shift+I, F12
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p" || e.key === "S" || e.key === "P")) {
        e.preventDefault();
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) {
        e.preventDefault();
        return false;
      }
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Block drag & drop events globally
  useEffect(() => {
    const handler = (e: DragEvent) => {
      e.preventDefault();
    };
    document.addEventListener("dragstart", handler);
    document.addEventListener("drop", handler);
    return () => {
      document.removeEventListener("dragstart", handler);
      document.removeEventListener("drop", handler);
    };
  }, []);

  // Anti-screenshot: detect screenshot keys and blur content + show warning
  useEffect(() => {
    const root = document.getElementById("reader-secure-root");
    if (!root) return;

    const blurWithWarning = () => {
      root.style.filter = "blur(40px)";
      const warn = document.getElementById("screenshot-warning");
      if (warn) warn.style.display = "flex";
      // Try to overwrite clipboard so any captured content is replaced
      try { navigator.clipboard?.writeText("⚠ Screenshot blocked — GyandootNova copyrighted content"); } catch {}
      setTimeout(() => {
        root.style.filter = "none";
        if (warn) warn.style.display = "none";
      }, 3000);
    };

    const keyHandler = (e: KeyboardEvent) => {
      // PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+Shift+S
      if (
        e.key === "PrintScreen" ||
        (e.shiftKey && (e.metaKey || e.ctrlKey) && ["s", "S", "3", "4", "5"].includes(e.key))
      ) {
        e.preventDefault();
        blurWithWarning();
      }
    };

    // Detect PrintScreen on keyup too (some OS trap keydown)
    const upHandler = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") blurWithWarning();
    };

    document.addEventListener("keydown", keyHandler);
    document.addEventListener("keyup", upHandler);
    return () => {
      document.removeEventListener("keydown", keyHandler);
      document.removeEventListener("keyup", upHandler);
    };
  }, []);

  // Inject @media print CSS — hide content when printing
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "secure-reader-print-block";
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        body::after {
          content: "⚠ Printing is disabled for copyrighted content.";
          visibility: visible !important;
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px; font-weight: bold; color: #B71C1C;
        }
      }
      #reader-secure-root canvas, #reader-secure-root img {
        -webkit-user-drag: none !important;
        user-drag: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("secure-reader-print-block")?.remove(); };
  }, []);

  // DevTools detection — blur if devtools opens
  useEffect(() => {
    const root = document.getElementById("reader-secure-root");
    if (!root) return;
    const threshold = 160;
    const check = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        root.style.filter = "blur(30px)";
      } else {
        if (root.style.filter.includes("blur(30")) root.style.filter = "none";
      }
    };
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in → redirect to auth
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-semibold">Login Required</p>
        <p className="text-sm text-muted-foreground text-center">You must be logged in to read this book.</p>
        <Button asChild>
          <Link to={`/auth?redirect=/books/${slug}/read-file`}>Login / Sign Up</Link>
        </Button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fileType = fileData?.file_type ?? book.file_type ?? "";
  const isImage = ["jpeg", "jpg", "png", "webp"].includes(fileType);
  const isPdf = fileType === "pdf";
  const isDoc = ["doc", "docx"].includes(fileType);

  // Watermark text — user email for traceability
  const watermarkText = user?.email || "GyandootNova";

  const WatermarkOverlay = ({ blocking = false }: { blocking?: boolean }) => (
    <div
      className={`absolute inset-0 z-20 overflow-hidden ${blocking ? "" : "pointer-events-none"}`}
      aria-hidden="true"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 180px,
            rgba(0,0,0,0.03) 180px,
            rgba(0,0,0,0.03) 181px
          )`,
        }}
      />
      {/* Logo watermarks */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <div
            key={`logo-${row}-${col}`}
            className="absolute flex flex-col items-center gap-1"
            style={{
              top: `${8 + row * 16}%`,
              left: `${10 + col * 35}%`,
              transform: "rotate(-35deg)",
              opacity: 0.06,
              pointerEvents: "none",
            }}
          >
            <img
              src={logoImg}
              alt=""
              className="h-10 w-10 rounded-full"
              draggable={false}
              style={{ filter: darkMode ? "invert(1)" : "none" }}
            />
            <span
              className="text-[10px] font-semibold whitespace-nowrap"
              style={{
                color: darkMode ? "#ffffff" : "#000000",
                letterSpacing: "2px",
              }}
            >
              {watermarkText}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div
      id="reader-secure-root"
      className={`min-h-screen select-none reader-secure ${darkMode ? "bg-gray-900 text-gray-100" : "bg-background text-foreground"}`}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      {/* Screenshot warning overlay */}
      <div
        id="screenshot-warning"
        style={{ display: "none" }}
        className="fixed inset-0 z-[100] items-center justify-center bg-destructive/95 text-destructive-foreground flex-col gap-3 p-6 text-center"
      >
        <AlertTriangle className="h-12 w-12" />
        <p className="text-xl font-bold">⚠ Screenshot Blocked</p>
        <p className="text-sm">This content is copyrighted by GyandootNova.<br/>Captured by: <strong>{user?.email}</strong></p>
      </div>

      {/* Toolbar */}
      <div className={`sticky top-0 z-40 border-b px-2 sm:px-4 py-1.5 sm:py-2 ${darkMode ? "border-gray-700 bg-gray-900/95" : "bg-background/95 backdrop-blur"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3" asChild>
            <Link to={`/books/${slug}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline text-sm truncate max-w-[200px]">{book.title}</span>
              <span className="sm:hidden text-xs">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">{fileType}</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "☀️" : "🌙"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content - minimal padding on mobile for max reading area */}
      <div className="mx-auto max-w-6xl px-1 sm:px-3 md:px-4 py-2 sm:py-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading book file...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-destructive font-medium">{(error as Error).message}</p>
            {!user && (
              <p className="text-sm text-muted-foreground">Please sign in to read this book.</p>
            )}
            <Button asChild variant="outline">
              <Link to={`/books/${slug}`}>Back to Book</Link>
            </Button>
          </div>
        )}

        {fileData?.url && isPdf && (
          <div className="relative">
            <SecurePdfViewer url={fileData.url} title={book.title} darkMode={darkMode} initialPage={savedPage} onPageChange={handlePageChange} />
            <WatermarkOverlay />
          </div>
        )}

        {fileData?.url && isImage && (
          <div className="relative flex justify-center">
            <img
              src={fileData.url}
              alt={book.title}
              className="max-w-full rounded-lg shadow-lg pointer-events-none"
              style={{ maxHeight: "calc(100vh - 100px)" }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
            <WatermarkOverlay />
          </div>
        )}

        {fileData?.url && isDoc && (
          <div className="relative" onContextMenu={(e) => e.preventDefault()}>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileData.url)}`}
              className="w-full rounded-lg border border-border"
              style={{ height: "calc(100vh - 100px)" }}
              title={book.title}
              sandbox="allow-scripts allow-same-origin"
            />
            {/* Blocking overlay — prevents interaction with Office Online menus */}
            <WatermarkOverlay blocking />
          </div>
        )}

        {fileData?.url && !isPdf && !isImage && !isDoc && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">This file format ({fileType}) cannot be previewed inline.</p>
          </div>
        )}
      </div>
      {book && <AskScripture bookId={book.id} bookTitle={book.title} />}
    </div>
  );
};

export default FileBookReader;
