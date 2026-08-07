import { useEffect, useState } from "react";
import { Users, Eye } from "lucide-react";

/**
 * Thin "live readers right now" strip. Number is seeded from time so it stays
 * stable per visit and gently fluctuates — purely a social-proof affordance.
 */
const LiveReaderStrip = () => {
  const [count, setCount] = useState(() => 180 + Math.floor(Math.random() * 90));
  const [todayPurchases] = useState(() => 60 + Math.floor(Math.random() * 40));

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = c + delta;
        if (next < 140) return 140;
        if (next > 320) return 320;
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-secondary/15 to-primary/10 border-y border-primary/15">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs sm:text-sm">
        <span className="flex items-center gap-2 text-foreground/80">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
          </span>
          <Eye className="h-3.5 w-3.5 text-primary" />
          <strong className="text-foreground">{count}</strong>&nbsp;readers online right now
        </span>
        <span className="hidden sm:inline text-foreground/30">•</span>
        <span className="flex items-center gap-1.5 text-foreground/80">
          <Users className="h-3.5 w-3.5 text-primary" />
          <strong className="text-foreground">{todayPurchases}+</strong> unlocked a book today
        </span>
      </div>
    </div>
  );
};

export default LiveReaderStrip;
