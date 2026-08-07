import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackSalesEvent } from "@/hooks/useAnalytics";
import { Link } from "react-router-dom";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  review: z.string().trim().min(10, "Kam se kam 10 characters likhen").max(2000),
});

interface Props {
  bookId: string;
}

const BookReviewForm = ({ bookId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const parsed = schema.safeParse({ rating, title: title.trim() || undefined, review });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const { error } = await supabase.from("book_reviews").upsert(
        {
          book_id: bookId,
          user_id: user.id,
          rating,
          title: title.trim() || null,
          review: review.trim(),
        },
        { onConflict: "book_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      trackSalesEvent("submit_review", { book_id: bookId, rating });
      toast({
        title: "Thanks for the review!",
        description: "Approved reviews public par appear ho jate hain within 24 hours.",
      });
      setReview("");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["reviews", bookId] });
      qc.invalidateQueries({ queryKey: ["review-stats"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not submit", description: e.message, variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm">
        <Link to="/auth" className="font-semibold text-primary hover:underline">
          Login
        </Link>{" "}
        karke apka review share karein.
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <p className="text-sm font-semibold">Apka rating</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <Star
              className="h-6 w-6 transition-colors"
              style={{
                color: n <= (hover || rating) ? "#F59E0B" : "#E5E7EB",
                fill: n <= (hover || rating) ? "#F59E0B" : "none",
              }}
            />
          </button>
        ))}
      </div>
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <Textarea
        placeholder="Book kaisi lagi? Kya seekha? Details share karein…"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={4}
        maxLength={2000}
        required
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{review.length}/2000</span>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "Submit review"
          )}
        </Button>
      </div>
    </form>
  );
};

export default BookReviewForm;
