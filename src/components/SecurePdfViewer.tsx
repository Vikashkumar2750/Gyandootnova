import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
<<<<<<< HEAD
=======
  Highlighter,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  Loader2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

<<<<<<< HEAD
=======
// Set worker
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface SecurePdfViewerProps {
  url: string;
  title: string;
  darkMode: boolean;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

interface Highlight {
  page: number;
  rects: { x: number; y: number; w: number; h: number }[];
  color: string;
}

<<<<<<< HEAD
=======
const HIGHLIGHT_COLORS = ["#FFEB3B", "#4CAF50", "#2196F3", "#FF9800", "#E91E63"];

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
const SecurePdfViewer = ({ url, title, darkMode, initialPage, onPageChange }: SecurePdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement>(null);
<<<<<<< HEAD
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pageRendering, setPageRendering] = useState(false);
  const [isFitWidth, setIsFitWidth] = useState(true);
  const [pageInput, setPageInput] = useState("");

  // Calculate fit-to-width scale
  const calcFitScale = useCallback(() => {
    const container = containerRef.current;
    if (!container || !pdfDocRef.current) return 1;
    const containerWidth = container.clientWidth - 16; // small padding
    // We need a page to measure — use page 1
    return containerWidth / 612; // standard PDF width in points
  }, []);

  // Load PDF
=======
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pageRendering, setPageRendering] = useState(false);

  // Load PDF document
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      try {
<<<<<<< HEAD
        const loadingTask = pdfjsLib.getDocument({ url, disableAutoFetch: true, disableStream: false });
=======
        const loadingTask = pdfjsLib.getDocument({
          url,
          disableAutoFetch: true,
          disableStream: false,
        });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
<<<<<<< HEAD

        // Calculate fit scale from first page
        const page = await pdf.getPage(1);
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.clientWidth - 16;
          const pageWidth = page.getViewport({ scale: 1 }).width;
          const fit = containerWidth / pageWidth;
          setFitScale(fit);
          setScale(fit);
        }

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        const startPage = initialPage && initialPage >= 1 && initialPage <= pdf.numPages ? initialPage : 1;
        setCurrentPage(startPage);
        setLoading(false);
      } catch (err) {
        console.error("PDF load error:", err);
        setLoading(false);
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

<<<<<<< HEAD
  // Recalculate fit scale on resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const pdf = pdfDocRef.current;
      if (!container || !pdf) return;
      pdf.getPage(currentPage).then((page) => {
        const containerWidth = container.clientWidth - 16;
        const pageWidth = page.getViewport({ scale: 1 }).width;
        const fit = containerWidth / pageWidth;
        setFitScale(fit);
        if (isFitWidth) setScale(fit);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPage, isFitWidth]);

  // Render page
=======
  // Render current page
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const highlightCanvas = highlightCanvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!pdf || !canvas || !highlightCanvas || !textLayerDiv) return;

    setPageRendering(true);
<<<<<<< HEAD
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const outputScale = Math.max(dpr, 2);

      const ctx = canvas.getContext("2d")!;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      highlightCanvas.width = Math.floor(viewport.width * outputScale);
      highlightCanvas.height = Math.floor(viewport.height * outputScale);
      highlightCanvas.style.width = `${viewport.width}px`;
      highlightCanvas.style.height = `${viewport.height}px`;

=======

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Setup main canvas
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Setup highlight canvas
      highlightCanvas.height = viewport.height;
      highlightCanvas.width = viewport.width;

      // Clear text layer
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

<<<<<<< HEAD
      ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      await page.render({ canvasContext: ctx, viewport }).promise;

      textLayerDiv.textContent = "";

=======
      // Render PDF page to canvas
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Render text layer for selection/highlighting
      const textContent = await page.getTextContent();
      const textItems = textContent.items as any[];

      textItems.forEach((item) => {
        if (!item.str) return;
        const tx = pdfjsLib.Util.transform(
          viewport.transform,
          item.transform
        );
        const span = document.createElement("span");
        span.textContent = item.str;
        span.style.position = "absolute";
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5] - item.height * scale}px`;
        span.style.fontSize = `${item.height * scale}px`;
        span.style.fontFamily = item.fontName || "sans-serif";
        span.style.color = "transparent";
        span.style.whiteSpace = "pre";
        span.style.transformOrigin = "0% 0%";
        textLayerDiv.appendChild(span);
      });

      // Redraw highlights for this page
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      drawHighlights(pageNum);
    } catch (err) {
      console.error("Page render error:", err);
    }
<<<<<<< HEAD
    setPageRendering(false);
  }, [scale]);

  // Draw highlights
=======

    setPageRendering(false);
  }, [scale]);

  // Draw highlights on canvas
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const drawHighlights = useCallback((pageNum: number) => {
    const highlightCanvas = highlightCanvasRef.current;
    if (!highlightCanvas) return;
    const ctx = highlightCanvas.getContext("2d")!;
<<<<<<< HEAD
    const dpr = window.devicePixelRatio || 1;
    const outputScale = Math.max(dpr, 2);
    ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    ctx.clearRect(0, 0, highlightCanvas.width / outputScale, highlightCanvas.height / outputScale);

    highlights.filter((h) => h.page === pageNum).forEach((h) => {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = h.color;
      h.rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
=======
    ctx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);

    const pageHighlights = highlights.filter((h) => h.page === pageNum);
    pageHighlights.forEach((h) => {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = h.color;
      h.rects.forEach((r) => {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    });
    ctx.globalAlpha = 1;
  }, [highlights]);

<<<<<<< HEAD
=======
  // Re-render when page or scale changes
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  useEffect(() => {
    if (numPages > 0) {
      renderPage(currentPage);
      onPageChange?.(currentPage);
<<<<<<< HEAD
      // Scroll to top when page changes
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [currentPage, scale, numPages, renderPage]);

=======
    }
  }, [currentPage, scale, numPages, renderPage]);

  // Redraw highlights when they change
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  useEffect(() => {
    drawHighlights(currentPage);
  }, [highlights, currentPage, drawHighlights]);

<<<<<<< HEAD
  // PDF is rendered canvas-only; no text layer is exposed for copy/select.

  // Touch swipe for page navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Horizontal swipe: fast, mostly horizontal
    if (dt < 400 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && currentPage < numPages) {
        setCurrentPage((p) => p + 1);
      } else if (dx > 0 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    }
  }, [currentPage, numPages]);

  // Fit to width toggle
  const toggleFitWidth = useCallback(() => {
    if (isFitWidth) {
      setIsFitWidth(false);
    } else {
      setScale(fitScale);
      setIsFitWidth(true);
    }
  }, [isFitWidth, fitScale]);

  const handleZoom = useCallback((delta: number) => {
    setIsFitWidth(false);
    setScale((s) => Math.max(0.5, Math.min(3, s + delta)));
  }, []);

  // Page jump
  const handlePageJump = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (p >= 1 && p <= numPages) {
      setCurrentPage(p);
      setPageInput("");
    }
  }, [pageInput, numPages]);
=======
  // Handle text selection for highlighting
  const handleMouseUp = useCallback(() => {
    if (!highlightMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const textLayerDiv = textLayerRef.current;
    if (!textLayerDiv || rects.length === 0) return;

    const containerRect = textLayerDiv.getBoundingClientRect();
    const highlightRects: { x: number; y: number; w: number; h: number }[] = [];

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      highlightRects.push({
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        w: r.width,
        h: r.height,
      });
    }

    if (highlightRects.length > 0) {
      setHighlights((prev) => [
        ...prev,
        { page: currentPage, rects: highlightRects, color: highlightColor },
      ]);
    }

    selection.removeAllRanges();
  }, [highlightMode, highlightColor, currentPage]);

  // Auto-fit width on mount
  useEffect(() => {
    const container = containerRef.current;
    if (container && numPages > 0) {
      const containerWidth = container.clientWidth - 32;
      // We'll use a reasonable default scale
      if (containerWidth < 600) {
        setScale(1.0);
      } else if (containerWidth < 900) {
        setScale(1.3);
      } else {
        setScale(1.5);
      }
    }
  }, [numPages]);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading PDF...</p>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div ref={containerRef} className="flex flex-col items-center gap-0 w-full">
      {/* Compact responsive toolbar */}
      <div
        className={`sticky top-[49px] z-30 w-full flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2 ${
          darkMode ? "border-gray-700 bg-gray-800/95" : "border-border bg-muted/95 backdrop-blur"
        }`}
      >
        {/* Left: Page nav */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
=======
    <div ref={containerRef} className="flex flex-col items-center gap-3">
      {/* Controls */}
      <div
        className={`sticky top-[49px] z-30 flex flex-wrap items-center justify-center gap-2 rounded-lg border px-3 py-2 ${
          darkMode
            ? "border-gray-700 bg-gray-800/95"
            : "border-border bg-muted/95 backdrop-blur"
        }`}
      >
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || pageRendering}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
<<<<<<< HEAD

          {/* Page indicator - tap to jump */}
          <form onSubmit={handlePageJump} className="flex items-center">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageInput || currentPage}
              onChange={(e) => setPageInput(e.target.value)}
              onFocus={() => setPageInput(String(currentPage))}
              onBlur={() => setPageInput("")}
              className={`w-8 sm:w-10 text-center text-xs sm:text-sm rounded border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary ${
                darkMode ? "text-gray-100" : "text-foreground"
              }`}
              style={{ appearance: "textfield", MozAppearance: "textfield", WebkitAppearance: "none" } as any}
            />
            <span className="text-xs text-muted-foreground">/{numPages}</span>
          </form>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
=======
          <span className="text-sm min-w-[80px] text-center">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || pageRendering}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

<<<<<<< HEAD
        {/* Center: Zoom */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => handleZoom(-0.15)}
            disabled={pageRendering}
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <button
            onClick={toggleFitWidth}
            className={`text-[10px] sm:text-xs min-w-[36px] sm:min-w-[44px] text-center px-1 py-0.5 rounded transition-colors ${
              isFitWidth
                ? "bg-primary/10 text-primary font-semibold"
                : darkMode ? "text-gray-300" : "text-muted-foreground"
            }`}
            title="Fit to width"
          >
            {isFitWidth ? "FIT" : `${Math.round(scale * 100)}%`}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => handleZoom(0.15)}
            disabled={pageRendering}
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="w-7 sm:w-8" aria-hidden="true" />
      </div>

      {/* PDF Canvas area with touch support */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-auto w-full flex justify-center mt-2"
        style={{ maxHeight: "calc(100vh - 110px)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            className="block rounded shadow-lg"
            style={{
              filter: darkMode ? "invert(0.88) hue-rotate(180deg)" : "none",
              maxWidth: isFitWidth ? "100%" : "none",
            }}
          />
          <canvas
            ref={highlightCanvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ mixBlendMode: "multiply" }}
          />
          <div
            ref={textLayerRef}
            className="absolute top-0 left-0"
            style={{
              cursor: "default",
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          />
        </div>
      </div>

      {/* Loading indicator */}
      {pageRendering && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Rendering...
        </div>
      )}

      {/* Mobile swipe hint - shown briefly */}
      <p className="text-[10px] text-muted-foreground mt-1 sm:hidden">
        ← Swipe to turn pages →
      </p>
=======
        <div className="w-px h-6 bg-border" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            disabled={pageRendering}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            disabled={pageRendering}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Highlight controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={highlightMode ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setHighlightMode(!highlightMode)}
          >
            <Highlighter className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Highlight</span>
          </Button>
          {highlightMode && (
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${
                    highlightColor === color
                      ? "border-foreground scale-125"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setHighlightColor(color)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Canvas area */}
      <div
        className="relative overflow-auto max-w-full"
        style={{ maxHeight: "calc(100vh - 150px)" }}
        onMouseUp={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="block rounded-lg shadow-lg"
          style={{
            filter: darkMode ? "invert(0.88) hue-rotate(180deg)" : "none",
          }}
        />
        <canvas
          ref={highlightCanvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ mixBlendMode: "multiply" }}
        />
        <div
          ref={textLayerRef}
          className="absolute top-0 left-0"
          style={{
            cursor: highlightMode ? "text" : "default",
            userSelect: highlightMode ? "text" : "none",
            WebkitUserSelect: highlightMode ? "text" : "none",
          }}
        />
      </div>

      {pageRendering && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering...
        </div>
      )}
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    </div>
  );
};

export default SecurePdfViewer;
