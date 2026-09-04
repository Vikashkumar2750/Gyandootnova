import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

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

const SecurePdfViewer = ({ url, title, darkMode, initialPage, onPageChange }: SecurePdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement>(null);
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
  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument({ url, disableAutoFetch: true, disableStream: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);

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
  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const highlightCanvas = highlightCanvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!pdf || !canvas || !highlightCanvas || !textLayerDiv) return;

    setPageRendering(true);
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

      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      await page.render({ canvasContext: ctx, viewport }).promise;

      textLayerDiv.textContent = "";

      drawHighlights(pageNum);
    } catch (err) {
      console.error("Page render error:", err);
    }
    setPageRendering(false);
  }, [scale]);

  // Draw highlights
  const drawHighlights = useCallback((pageNum: number) => {
    const highlightCanvas = highlightCanvasRef.current;
    if (!highlightCanvas) return;
    const ctx = highlightCanvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const outputScale = Math.max(dpr, 2);
    ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    ctx.clearRect(0, 0, highlightCanvas.width / outputScale, highlightCanvas.height / outputScale);

    highlights.filter((h) => h.page === pageNum).forEach((h) => {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = h.color;
      h.rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
    });
    ctx.globalAlpha = 1;
  }, [highlights]);

  useEffect(() => {
    if (numPages > 0) {
      renderPage(currentPage);
      onPageChange?.(currentPage);
      // Scroll to top when page changes
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [currentPage, scale, numPages, renderPage]);

  useEffect(() => {
    drawHighlights(currentPage);
  }, [highlights, currentPage, drawHighlights]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading PDF...</p>
      </div>
    );
  }

  return (
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
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || pageRendering}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

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
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || pageRendering}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

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
    </div>
  );
};

export default SecurePdfViewer;
