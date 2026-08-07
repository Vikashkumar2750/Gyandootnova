import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Loader2, CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import useSEO from "@/hooks/useSEO";

const ClaimPurchase = () => {
  useSEO({ title: "Claim Your Purchase | GyandootNova", canonical: "/", noindex: true });
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["claim", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_guest_purchase_by_token" as any,
        { _token: token! }
      );
      if (error) throw error;
      return (data as any[])?.[0] ?? null;
    },
    enabled: !!token,
  });

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_guest_book_file_url" as any,
        { _token: token }
      );
      if (error || !data) throw error ?? new Error("File not available");
      window.open(data as unknown as string, "_blank");
    } catch (e: any) {
      toast({
        title: "Could not download",
        description: e.message ?? "Please contact support",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Link invalid or expired</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Payment successful hai to please email inbox check karein.
          </p>
          <Link to="/support" className="mt-4 inline-block text-primary underline">
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-bold">
              Gyandoot<span className="text-primary">Nova</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 md:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Payment successful
          </div>
          <h1 className="font-serif text-3xl font-bold">Thanks{purchase.guest_name ? `, ${purchase.guest_name}` : ""}!</h1>
          <p className="mt-2 text-muted-foreground">
            Apki book <b>{purchase.book_title}</b> ready hai. Neeche button se abhi download karein.
          </p>

          <div className="mt-6 flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="grid h-20 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
              {purchase.book_cover ? (
                <img
                  src={purchase.book_cover}
                  alt={purchase.book_title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{purchase.book_title}</p>
              <p className="text-xs text-muted-foreground">
                Purchased on{" "}
                {new Date(purchase.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="mt-6 h-12 w-full text-base font-semibold"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing…
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" /> Download your book
              </>
            )}
          </Button>

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              Download link + receipt bhi apke email <b>{purchase.guest_email}</b> par bhej diya
              gaya hai — bookmark kar lein.
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <p className="text-sm font-semibold">Chahen to account bana lein</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Account banane se apki saari purchased books ek dashboard me save ho jayengi + reading
              progress sync hoga.
            </p>
            <Link to={`/auth?email=${encodeURIComponent(purchase.guest_email)}`}>
              <Button variant="outline" size="sm" className="mt-3">
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClaimPurchase;
