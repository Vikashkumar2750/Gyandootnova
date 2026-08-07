import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface ProgressRow {
  book_id: string;
  chapter_id: string;
  chapter_number: number;
  scroll_percent: number;
  updated_at: string;
  books: {
    id: string;
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  } | null;
  book_chapters: {
    id: string;
    slug: string;
    title: string | null;
    chapter_number: number;
  } | null;
}

async function fetchRecent(userId: string, limit: number) {
  const { data, error } = await supabase
    .from("reading_progress")
    .select(
      "book_id, chapter_id, chapter_number, scroll_percent, updated_at, books:books(id, slug, title, author, cover_url), book_chapters:book_chapters(id, slug, title, chapter_number)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return [] as ProgressRow[];
  return (data ?? []) as unknown as ProgressRow[];
}

export function useContinueReading(limit = 6) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["continue-reading", user?.id, limit],
    queryFn: () => (user ? fetchRecent(user.id, limit) : Promise.resolve([] as ProgressRow[])),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export default function ContinueReadingSection() {
  const { user } = useAuth();
  const { data, isLoading } = useContinueReading(4);

  if (!user) return null;
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <section
      aria-labelledby="continue-reading"
      className="bg-gradient-cream border-y border-border/60 py-14 md:py-16"
    >
      <div className="container">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
              Your Journey · Continue
            </span>
            <h2
              id="continue-reading"
              className="mt-3 font-serif text-3xl font-bold md:text-4xl text-foreground"
            >
              Pick up where you <span className="text-primary">left off</span>
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm md:text-base">
              Resume any book from your last saved chapter — your progress is safely stored.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex text-primary">
            <Link to="/library">
              View library <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((row) => {
            if (!row.books) return null;
            const chapterSlug = row.book_chapters?.slug;
            const href = chapterSlug
              ? `/books/${row.books.slug}/${chapterSlug}`
              : `/books/${row.books.slug}`;
            const percent = Math.max(0, Math.min(100, Math.round(Number(row.scroll_percent) || 0)));
            return (
              <li
                key={row.book_id}
                className="surface-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
              >
                <Link to={href} className="flex gap-3 p-3">
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {row.books.cover_url ? (
                      <img
                        src={row.books.cover_url}
                        alt={row.books.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-primary/40">
                        <BookOpen className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">
                      {row.books.title}
                    </p>
                    {row.books.author && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {row.books.author}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-primary">
                      Chapter {row.book_chapters?.chapter_number ?? row.chapter_number}
                      {row.book_chapters?.title ? ` · ${row.book_chapters.title}` : ""}
                    </p>
                  </div>
                </Link>
                <div className="mt-auto px-3 pb-3">
                  <div className="mb-2 h-1.5 w-full rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                      aria-label={`${percent}% read`}
                    />
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <Link to={href}>Resume · {percent}%</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 md:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link to="/library">View library</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
