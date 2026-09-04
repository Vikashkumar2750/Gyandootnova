import { BookOpen, FileText, ShieldCheck } from "lucide-react";
import { useSiteStats } from "@/hooks/useSiteStats";

/**
 * Thin catalogue strip. Every number here comes from the database — no
 * simulated "readers online" counters (they are a trust/E-E-A-T risk).
 */
const LiveReaderStrip = () => {
  const { data } = useSiteStats();
  if (!data) return null;

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-secondary/15 to-primary/10 border-y border-primary/15">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs sm:text-sm">
        <span className="flex items-center gap-1.5 text-foreground/80">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <strong className="text-foreground">{data.books}</strong>&nbsp;titles in the library
        </span>
        <span className="hidden sm:inline text-foreground/30">•</span>
        <span className="flex items-center gap-1.5 text-foreground/80">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <strong className="text-foreground">{data.articles}</strong>&nbsp;free articles
        </span>
        <span className="hidden sm:inline text-foreground/30">•</span>
        <span className="flex items-center gap-1.5 text-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Original, source-cited writing
        </span>
      </div>
    </div>
  );
};

export default LiveReaderStrip;
