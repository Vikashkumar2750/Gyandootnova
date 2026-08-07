import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, CheckCircle2, Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  review: string;
  is_verified_purchase: boolean;
  created_at: string;
  user_id: string;
}

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className="h-4 w-4"
        style={{
          color: n <= value ? "#F59E0B" : "#E5E7EB",
          fill: n <= value ? "#F59E0B" : "none",
        }}
      />
    ))}
  </div>
);

export function useBookReviewStats(bookIds: string[]) {
  return useQuery({
    queryKey: ["review-stats", bookIds.slice().sort().join(",")],
    enabled: bookIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("book_reviews")
        .select("book_id, rating, is_verified_purchase")
        .eq("is_approved", true)
        .in("book_id", bookIds);

      const map = new Map<string, { count: number; avg: number; verified: number }>();
      (data ?? []).forEach((r: any) => {
        const cur = map.get(r.book_id) ?? { count: 0, avg: 0, verified: 0 };
        cur.count += 1;
        cur.avg += r.rating;
        if (r.is_verified_purchase) cur.verified += 1;
        map.set(r.book_id, cur);
      });
      const out: Record<string, { count: number; avg: number; verified: number }> = {};
      map.forEach((v, k) => {
        out[k] = { count: v.count, avg: v.count ? v.avg / v.count : 0, verified: v.verified };
      });
      return out;
    },
    staleTime: 60_000,
  });
}

interface Props {
  bookId: string;
}

const BookReviewList = ({ bookId }: Props) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", bookId],
    queryFn: async () => {
      const { data } = await supabase
        .from("book_reviews")
        .select("id, rating, title, review, is_verified_purchase, created_at, user_id")
        .eq("book_id", bookId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Review[];
    },
    enabled: !!bookId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Ye book पढ़ चुके हैं? Sabse pehle review dijiye — apka feedback dusre readers ke liye
        bahut helpful hoga.
      </p>
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const verifiedCount = reviews.filter((r) => r.is_verified_purchase).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{avg.toFixed(1)}</span>
          <Stars value={Math.round(avg)} />
        </div>
        <span className="text-sm text-muted-foreground">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </span>
        {verifiedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> {verifiedCount} verified
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-4">
            <div className="mb-1 flex items-center gap-2">
              <Stars value={r.rating} />
              {r.is_verified_purchase && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Verified Purchase
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {r.title && <p className="font-semibold">{r.title}</p>}
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.review}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BookReviewList;
