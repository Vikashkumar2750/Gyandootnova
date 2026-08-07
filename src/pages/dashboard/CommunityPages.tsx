import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Bookmark, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export const MyReviews = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("book_reviews")
        .select("id, rating, review, is_approved, created_at, book_id, books(title, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">My Reviews</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (
        <div className="space-y-3">
          {(data ?? []).length === 0 && <Card className="surface-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">Aapne abhi tak koi review nahi likhi.</CardContent></Card>}
          {(data ?? []).map((r: any) => (
            <Card key={r.id} className="surface-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/books/${r.books?.slug}`} className="text-sm font-medium hover:text-primary">{r.books?.title}</Link>
                    <div className="mt-1 flex items-center gap-1">
                      {Array.from({length:5}).map((_,i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}/>)}
                    </div>
                  </div>
                  <Badge variant={r.is_approved ? "default" : "secondary"} className="text-[10px]">{r.is_approved ? "Approved" : "Pending"}</Badge>
                </div>
                {r.review && <p className="mt-2 text-sm text-foreground/80">{r.review}</p>}
                <div className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const MyBookmarks = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-bookmarks-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks")
        .select("id, book_title, book_slug, chapter_title, chapter_slug, chapter_number, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">My Bookmarks</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (
        <div className="surface-card divide-y divide-border/60">
          {(data ?? []).map((b: any) => (
            <Link key={b.id} to={`/books/${b.book_slug}/${b.chapter_slug}`} className="flex items-center gap-3 p-3 hover:bg-muted/30">
              <Bookmark className="h-4 w-4 text-primary shrink-0"/>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{b.book_title}</div>
                <div className="text-[11px] text-muted-foreground truncate">Ch {b.chapter_number}: {b.chapter_title}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
            </Link>
          ))}
          {(data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Koi bookmark nahi.</div>}
        </div>
      )}
    </div>
  );
};
