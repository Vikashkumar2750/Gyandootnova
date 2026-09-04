import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BookOpen, Heart, User, Calendar, IndianRupee, PlayCircle,
  Bookmark, StickyNote, Highlighter, Download, FileText, Share2, Copy, Eye, Loader2
} from "lucide-react";
import useSEO from "@/hooks/useSEO";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoicePreview, setInvoicePreview] = useState<{
    purchaseId: string;
    bookTitle?: string;
    url: string | null;      // object URL for the PDF; null while loading
    error: string | null;    // populated on failure
    loading: boolean;
  } | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);

  const fetchInvoiceBlob = async (purchaseId: string): Promise<Blob> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again to generate this invoice.");
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/generate-invoice?purchase_id=${purchaseId}&preview=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // Server always returns JSON error bodies; fall back to raw text for safety.
      const raw = await res.text();
      let msg = raw;
      try { msg = JSON.parse(raw)?.error ?? raw; } catch { /* not JSON */ }
      throw new Error(msg || `Failed to generate invoice (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    if (blob.type && !blob.type.includes("pdf")) {
      throw new Error("Server returned an unexpected file type.");
    }
    return blob;
  };

  const openInvoicePreview = async (purchaseId: string, bookTitle?: string) => {
    // Open the modal in a loading state first so the user always sees feedback.
    setInvoiceLoadingId(purchaseId);
    setInvoicePreview({ purchaseId, bookTitle, url: null, error: null, loading: true });
    try {
      const blob = await fetchInvoiceBlob(purchaseId);
      const objectUrl = URL.createObjectURL(blob);
      setInvoicePreview({ purchaseId, bookTitle, url: objectUrl, error: null, loading: false });
    } catch (e: any) {
      const msg = e?.message ?? "Try again in a moment.";
      setInvoicePreview({ purchaseId, bookTitle, url: null, error: msg, loading: false });
      toast({ title: "Invoice preview failed", description: msg, variant: "destructive" });
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const retryInvoicePreview = () => {
    if (invoicePreview) openInvoicePreview(invoicePreview.purchaseId, invoicePreview.bookTitle);
  };

  const closeInvoicePreview = () => {
    if (invoicePreview?.url) URL.revokeObjectURL(invoicePreview.url);
    setInvoicePreview(null);
  };

  const triggerDownload = (url: string, bookTitle?: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${(bookTitle ?? "gyandootnova").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /**
   * Always-works download: if the preview already fetched a blob, reuse it.
   * Otherwise (error state, or user opened the modal but the fetch hadn't
   * completed) re-fetch a fresh PDF and download that directly.
   */
  const downloadInvoiceFromPreview = async () => {
    if (!invoicePreview) return;
    if (invoicePreview.url) {
      triggerDownload(invoicePreview.url, invoicePreview.bookTitle);
      return;
    }
    try {
      setInvoiceDownloading(true);
      const blob = await fetchInvoiceBlob(invoicePreview.purchaseId);
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, invoicePreview.bookTitle);
      // Keep the URL alive briefly so the browser can start the download.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setInvoiceDownloading(false);
    }
  };


  useSEO({
    title: "My Profile — Purchased Books & Reading | GyandootNova",
    description: "Aapka GyandootNova profile — purchased books, reading progress, highlights, notes aur downloads ek jagah.",
    canonical: "/profile",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: purchases } = useQuery({
    queryKey: ["user-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_purchases", { _user_id: user!.id });
      if (error) throw error;
      const bookIds = (data ?? []).map((p: any) => p.book_id);
      if (!bookIds.length) return [];
      const { data: books } = await supabase
        .from("books")
        .select("id, title, slug, cover_url, price, is_free")
        .in("id", bookIds);
      return (data ?? []).map((p: any) => ({
        ...p,
        book: books?.find((b) => b.id === p.book_id),
      }));
    },
  });

  const { data: donations } = useQuery({
    queryKey: ["user-donations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_donations", { _user_id: user!.id });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const { data: allProgress } = useQuery({
    queryKey: ["all-reading-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("book_id, chapter_id, chapter_number, scroll_percent, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      const rows = data ?? [];
      if (!rows.length) return [] as any[];

      const chapterIds = [...new Set(rows.map((r: any) => r.chapter_id).filter(Boolean))];
      const bookIds = [...new Set(rows.map((r: any) => r.book_id))];

      const [{ data: chapters }, { data: counts }] = await Promise.all([
        chapterIds.length
          ? supabase.from("book_chapters").select("id, slug, title, book_id").in("id", chapterIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("book_chapters").select("book_id").in("book_id", bookIds),
      ]);

      const totalByBook = new Map<string, number>();
      (counts ?? []).forEach((c: any) => {
        totalByBook.set(c.book_id, (totalByBook.get(c.book_id) ?? 0) + 1);
      });

      return rows.map((r: any) => {
        const ch = (chapters ?? []).find((c: any) => c.id === r.chapter_id);
        const total = totalByBook.get(r.book_id) ?? 0;
        const chapterPct = total > 0 ? ((r.chapter_number - 1) / total) * 100 + (r.scroll_percent ?? 0) / total : 0;
        return {
          ...r,
          chapter_slug: ch?.slug ?? null,
          chapter_title: ch?.title ?? null,
          total_chapters: total,
          overall_percent: Math.min(100, Math.round(chapterPct)),
        };
      });
    },
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["user-bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id, chapter_title, book_title, book_slug, chapter_slug, chapter_number, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["user-notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chapter_notes")
        .select("id, content, updated_at, book_id, chapter_id")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: highlights } = useQuery({
    queryKey: ["user-highlights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("text_highlights")
        .select("id, selected_text, created_at, book_id, chapter_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: referrals } = useQuery({
    queryKey: ["user-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id, commission_amount, commission_percent, status, created_at, book_id")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const bookIds = [...new Set(data.map((r: any) => r.book_id))];
      const { data: books } = await supabase.from("books").select("id, title").in("id", bookIds);
      return data.map((r: any) => ({
        ...r,
        book_title: books?.find((b) => b.id === r.book_id)?.title ?? "—",
      }));
    },
  });

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;
  if (!user) return null;

  const totalDonated = donations?.reduce((sum: number, d: any) => sum + Number(d.amount), 0) ?? 0;
  const completedPurchases = purchases?.filter((p: any) => p.status === "completed") ?? [];

  const getBookProgress = (bookId: string) =>
    allProgress?.find((pr) => pr.book_id === bookId);

  return (
    <>
      <main className="container py-12 max-w-4xl">
        {/* Profile Header */}
        <section className="flex items-center gap-5 mb-10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {profile?.display_name ?? user.email?.split("@")[0]}
            </h1>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </section>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card className="text-center p-4">
            <BookOpen className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{completedPurchases.length}</p>
            <p className="text-xs text-muted-foreground">Books</p>
          </Card>
          <Card className="text-center p-4">
            <Bookmark className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{bookmarks?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Bookmarks</p>
          </Card>
          <Card className="text-center p-4">
            <StickyNote className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{notes?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Notes</p>
          </Card>
          <Card className="text-center p-4">
            <Highlighter className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{highlights?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Highlights</p>
          </Card>
        </div>

        {/* Purchased Books */}
        <section className="mb-10">
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> My Books
          </h2>
          {completedPurchases.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No books purchased yet.</p>
                <Link to="/books" className="text-primary text-sm underline mt-1 inline-block">Browse Books</Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {completedPurchases.map((p: any) => {
                const progress: any = getBookProgress(p.book_id);
                const progressPct = progress?.overall_percent ?? 0;
                const resumeHref = p.book?.slug
                  ? progress?.chapter_slug
                    ? `/books/${p.book.slug}/${progress.chapter_slug}`
                    : `/books/${p.book.slug}`
                  : null;
                const lastRead = progress?.updated_at
                  ? new Date(progress.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : null;
                return (
                  <Card key={p.id} className="flex flex-col p-4 gap-3">
                    <div className="flex items-start gap-4">
                      {p.book?.cover_url ? (
                        <img src={p.book.cover_url} alt={p.book?.title} className="h-20 w-14 object-cover rounded-md shrink-0" />
                      ) : (
                        <div className="h-20 w-14 bg-muted rounded-md flex items-center justify-center shrink-0">
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.book?.title ?? "Unknown Book"}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">{p.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.created_at).toLocaleDateString("en-IN")}
                        </p>
                        {(() => {
                          const paid = p.amount != null ? Number(p.amount) : (p.book?.price != null ? Number(p.book.price) : null);
                          if (paid == null || paid === 0) return null;
                          const currency = p.currency || "INR";
                          const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : `${currency} `;
                          return (
                            <p className="text-xs font-medium mt-1">Paid: {symbol}{paid.toLocaleString()}</p>
                          );
                        })()}
                      </div>
                    </div>

                    {progress ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate pr-2">
                            Ch {progress.chapter_number}
                            {progress.total_chapters ? `/${progress.total_chapters}` : ""}
                            {progress.chapter_title ? ` · ${progress.chapter_title}` : ""}
                          </span>
                          <span className="shrink-0">{progressPct}%</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5" />
                        {lastRead && (
                          <p className="text-[11px] text-muted-foreground">Last read {lastRead} · {progress.scroll_percent ?? 0}% into chapter</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not started yet</p>
                    )}

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {resumeHref && (
                        <Link
                          to={resumeHref}
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {progress ? "Resume Reading" : "Start Reading"}
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => openInvoicePreview(p.id, p.book?.title)}
                        disabled={invoiceLoadingId === p.id}
                      >
                        {invoiceLoadingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        Invoice
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <Separator className="my-8" />

        {/* Bookmarks */}
        <section className="mb-10">
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" /> Bookmarks
          </h2>
          {(!bookmarks || bookmarks.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No bookmarks yet. Tap the bookmark icon while reading any chapter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bm: any) => (
                <Card key={bm.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <Link
                        to={`/books/${bm.book_slug}/${bm.chapter_slug}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {bm.chapter_title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{bm.book_title} · Ch. {bm.chapter_number}</p>
                    </div>
                    <Link
                      to={`/books/${bm.book_slug}/${bm.chapter_slug}`}
                      className="text-xs text-primary hover:underline shrink-0 ml-3"
                    >
                      Read →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Separator className="my-8" />

        {/* Notes */}
        {notes && notes.length > 0 && (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" /> My Notes
                </h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const content = notes.map((n: any, i: number) =>
                        `Note ${i + 1} (${new Date(n.updated_at).toLocaleDateString("en-IN")}):\n${n.content}`
                      ).join("\n\n---\n\n");
                      const blob = new Blob([content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "my-notes.txt"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" /> Export .txt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const htmlRows = notes.map((n: any, i: number) =>
                        `<tr><td style="padding:8px;border:1px solid #ddd;vertical-align:top;font-weight:600;white-space:nowrap">Note ${i + 1}<br/><small style="font-weight:normal;color:#888">${new Date(n.updated_at).toLocaleDateString("en-IN")}</small></td><td style="padding:8px;border:1px solid #ddd">${n.content.replace(/\n/g, "<br/>")}</td></tr>`
                      ).join("");
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>My Notes – GyandootNova</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#1a1a1a}h1{color:#7c3aed}table{width:100%;border-collapse:collapse;margin-top:20px}</style></head><body><h1>My Notes</h1><p>Exported on ${new Date().toLocaleDateString("en-IN")} from GyandootNova</p><table>${htmlRows}</table></body></html>`;
                      const blob = new Blob([html], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "my-notes.html"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Export PDF
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {notes.map((note: any, i: number) => (
                  <Card key={note.id}>
                    <CardContent className="py-3 px-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {new Date(note.updated_at).toLocaleDateString("en-IN")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
            <Separator className="my-8" />
          </>
        )}

        {/* Universal Referral Link */}
        <section className="mb-6">
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" /> Your Referral Link
          </h2>
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-sm text-muted-foreground mb-3">
                यह आपका universal referral link है। इसे share करें — कोई भी इस link से कोई भी book खरीदेगा तो आपको commission मिलेगा! (7 दिन तक valid)
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/?ref=${user.id}`}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.id}`);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Referral Earnings */}
        <section className="mb-10">
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" /> Referral Earnings
          </h2>
          {(!referrals || referrals.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Share2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No referral earnings yet. Share your universal link to earn commission!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="text-center p-3">
                  <p className="text-lg font-bold text-primary">
                    ₹{referrals.filter((r: any) => r.status === "approved").reduce((s: number, r: any) => s + Number(r.commission_amount), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-lg font-bold text-yellow-600">
                    ₹{referrals.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.commission_amount), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-lg font-bold">{referrals.length}</p>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </Card>
              </div>
              <div className="space-y-2">
                {referrals.map((r: any) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{r.book_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.commission_percent}% commission · {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">₹{r.commission_amount}</p>
                        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                          {r.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>

        <Separator className="my-8" />

        {/* Donation History */}
        <section>
          <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-secondary" /> Donation History
          </h2>
          {(!donations || donations.length === 0) ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No donations yet.</p>
                <Link to="/support-us" className="text-primary text-sm underline mt-1 inline-block">Make a Donation</Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {donations.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <IndianRupee className="h-3.5 w-3.5" />{Number(d.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(d.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Badge variant={d.status === "completed" ? "default" : "secondary"}>
                      {d.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!invoicePreview} onOpenChange={(open) => { if (!open) closeInvoicePreview(); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice Preview
              {invoicePreview?.bookTitle && (
                <span className="text-sm font-normal text-muted-foreground">— {invoicePreview.bookTitle}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30 relative">
            {invoicePreview?.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Generating your invoice…</p>
              </div>
            )}
            {invoicePreview?.error && !invoicePreview.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-10 w-10 text-destructive/70" />
                <p className="text-sm font-medium text-destructive">Couldn't load the invoice preview</p>
                <p className="text-xs text-muted-foreground max-w-sm">{invoicePreview.error}</p>
                <Button size="sm" variant="outline" onClick={retryInvoicePreview}>Retry</Button>
              </div>
            )}
            {invoicePreview?.url && !invoicePreview.loading && !invoicePreview.error && (
              <iframe
                title="Invoice preview"
                src={invoicePreview.url}
                className="w-full h-full border-0"
              />
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t bg-background">
            <Button variant="outline" onClick={closeInvoicePreview}>Close</Button>
            <Button
              onClick={downloadInvoiceFromPreview}
              disabled={invoiceDownloading || invoicePreview?.loading}
              className="gap-2"
            >
              {invoiceDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
