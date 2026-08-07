import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";

type BookCard = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  author?: string | null;
  is_free?: boolean;
};

const BookGrid = ({ books, resumeLink }: { books: BookCard[]; resumeLink?: (b: BookCard) => string }) => {
  if (books.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 text-muted-foreground">Kuch bhi nahi mila yahan.</p>
        <Button asChild className="mt-4" size="sm"><Link to="/books">Browse books</Link></Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {books.map((b) => (
        <Card key={b.id} className="surface-card overflow-hidden group">
          <Link to={`/books/${b.slug}`}>
            <div className="aspect-[2/3] bg-muted overflow-hidden">
              {b.cover_url ? (
                <img src={b.cover_url} alt={b.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-primary/40"><BookOpen className="h-8 w-8" /></div>
              )}
            </div>
          </Link>
          <CardContent className="p-3">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug">
              <Link to={`/books/${b.slug}`} className="hover:text-primary">{b.title}</Link>
            </h3>
            {b.author && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{b.author}</p>}
            <div className="mt-2 flex gap-1.5">
              <Button asChild size="sm" className="h-7 text-xs flex-1">
                <Link to={resumeLink ? resumeLink(b) : `/books/${b.slug}`}>Read</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to={`/books/${b.slug}`}>Info</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const usePurchasedBooks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-purchased", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: purchases } = await supabase.rpc("get_user_purchases", { _user_id: user!.id });
      const ids = (purchases ?? []).filter((p: any) => p.status === "completed").map((p: any) => p.book_id);
      if (ids.length === 0) return [] as BookCard[];
      const { data: books } = await supabase.from("books").select("id, title, slug, cover_url, author, is_free").in("id", ids);
      return (books ?? []) as BookCard[];
    },
  });
};

export const PurchasedBooks = () => {
  const { data, isLoading } = usePurchasedBooks();
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Purchased Books</h1>
      <p className="text-sm text-muted-foreground">Aapke khareede huye granth, hamesha available.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <BookGrid books={data ?? []} />}
    </div>
  );
};

export const FreeBooks = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-free-books"],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("id, title, slug, cover_url, author, is_free").eq("is_free", true).limit(48);
      return (data ?? []) as BookCard[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Free Books</h1>
      <p className="text-sm text-muted-foreground">Sabhi ke liye muft — abhi padhna shuru karein.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <BookGrid books={data ?? []} />}
    </div>
  );
};

export const ContinueReading = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-continue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("book_id, chapter_number, scroll_percent, updated_at, books(id, title, slug, cover_url, author), book_chapters(slug, title, chapter_number)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Continue Reading</h1>
      <p className="text-sm text-muted-foreground">Jahan chhoda tha, wahin se aage badhein.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {(data ?? []).map((row: any) => {
            if (!row.books) return null;
            const pct = Math.round(row.scroll_percent ?? 0);
            const href = row.book_chapters?.slug ? `/books/${row.books.slug}/${row.book_chapters.slug}` : `/books/${row.books.slug}`;
            return (
              <Card key={row.book_id} className="surface-card">
                <CardContent className="p-4 flex gap-4">
                  <Link to={href} className="h-28 w-20 shrink-0 bg-muted rounded overflow-hidden">
                    {row.books.cover_url ? <img src={row.books.cover_url} alt={row.books.title} loading="lazy" className="h-full w-full object-cover"/> : <div className="h-full flex items-center justify-center text-primary/40"><BookOpen className="h-6 w-6"/></div>}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium line-clamp-2"><Link to={href} className="hover:text-primary">{row.books.title}</Link></h3>
                    <p className="mt-1 text-xs text-primary">Chapter {row.book_chapters?.chapter_number ?? row.chapter_number}{row.book_chapters?.title ? ` · ${row.book_chapters.title}` : ""}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary" style={{width:`${pct}%`}}/></div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{pct}% • {new Date(row.updated_at).toLocaleDateString()}</div>
                    <div className="mt-2 flex gap-1.5">
                      <Button asChild size="sm" className="h-7 text-xs"><Link to={href}>Resume</Link></Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs"><Link to={`/read/${row.books.slug}/flip${row.book_chapters?.slug ? `?chapter=${row.book_chapters.slug}` : ""}`}>Flip mode</Link></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(data ?? []).length === 0 && !isLoading && (
            <div className="md:col-span-2 surface-card p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-muted-foreground">Abhi tak koi book nahi kholi.</p>
              <Button asChild className="mt-4" size="sm"><Link to="/books">Browse books <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Favorites = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks")
        .select("book_id, books(id, title, slug, cover_url, author)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      const map = new Map<string, BookCard>();
      (data ?? []).forEach((r: any) => { if (r.books && !map.has(r.book_id)) map.set(r.book_id, r.books); });
      return Array.from(map.values());
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Favorites & Bookmarks</h1>
      <p className="text-sm text-muted-foreground">Aapke bookmark kiye huye adhyay aur granth.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <BookGrid books={data ?? []} />}
    </div>
  );
};

export const RecentlyViewed = () => {
  // localStorage-based
  const ids: string[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("recentlyViewed") || "[]") : [];
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-recent", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [] as BookCard[];
      const { data } = await supabase.from("books").select("id, title, slug, cover_url, author").in("id", ids);
      return (data ?? []) as BookCard[];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Recently Viewed</h1>
      <p className="text-sm text-muted-foreground">Haal hi mein dekhi gayi kitabein.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <BookGrid books={data ?? []} />}
    </div>
  );
};

export const ReadingHistory = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reading_progress")
        .select("book_id, updated_at, scroll_percent, books(id, title, slug, cover_url, author)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Reading History</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="surface-card divide-y divide-border/60">
          {(data ?? []).map((row: any, i) => (
            <div key={`${row.book_id}-${i}`} className="flex items-center gap-3 p-3">
              <div className="h-12 w-9 shrink-0 rounded bg-muted overflow-hidden">
                {row.books?.cover_url ? <img src={row.books.cover_url} alt="" className="h-full w-full object-cover"/> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate"><Link to={`/books/${row.books?.slug}`} className="hover:text-primary">{row.books?.title}</Link></div>
                <div className="text-[11px] text-muted-foreground">{Math.round(row.scroll_percent ?? 0)}% • {new Date(row.updated_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Koi history nahi.</div>}
        </div>
      )}
    </div>
  );
};
