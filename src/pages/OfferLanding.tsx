import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, Loader2, ShieldCheck, Zap, RotateCcw, Star } from "lucide-react";
import { initiatePayment } from "@/lib/payment";
import { useLocale } from "@/hooks/useLocale";
import CurrencySelector from "@/components/CurrencySelector";
import { useTrackOnMount, trackSalesEvent } from "@/hooks/useAnalytics";
import GuestCheckoutDialog from "@/components/GuestCheckoutDialog";
import SalesTrustBar from "@/components/SalesTrustBar";

const AUTO_COUPON = "WELCOME10";

const OfferLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useSEO({
    title: "Limited offer — GyandootNova",
    description: "Instant access, 7-day money back, one-click checkout.",
  });
  // Ad landing — keep off search index.
  if (typeof document !== "undefined") {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", "noindex, nofollow");
    else {
      const m = document.createElement("meta");
      m.name = "robots";
      m.content = "noindex, nofollow";
      document.head.appendChild(m);
    }
  }


  const { data: book, isLoading } = useQuery({
    queryKey: ["offer-book", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, slug, author, cover_url, price, is_free, description")
        .eq("slug", slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  useTrackOnMount("view_offer_landing", { slug });

  const [coupon, setCoupon] = useState<{
    coupon_id: string;
    discount_amount: number;
    final_amount: number;
  } | null>(null);

  // Auto-apply WELCOME10 for logged-in users (RPC needs auth)
  useEffect(() => {
    if (!book || book.is_free || coupon || !user) return;
    supabase
      .rpc("apply_coupon" as any, {
        _code: AUTO_COUPON,
        _order_amount: book.price,
        _book_id: book.id,
      })
      .then(({ data }) => {
        if (data?.valid) setCoupon(data);
      });
  }, [book, coupon, user]);

  const [guestOpen, setGuestOpen] = useState(false);
  const { currency, formatPrice, gateway } = useLocale();
  const [buying, setBuying] = useState(false);

  const finalAmount = useMemo(() => {
    if (!book) return 0;
    if (book.is_free) return 0;
    return coupon ? coupon.final_amount : book.price;
  }, [book, coupon]);

  const startPayment = async (guest?: { email: string; name?: string }) => {
    if (!book) return;
    setBuying(true);
    trackSalesEvent("begin_checkout", { book_id: book.id, source: "offer_landing" });
    await initiatePayment(
      {
        amount: finalAmount,
        type: "purchase",
        buyer_currency: currency,
        book_id: book.id,
        coupon_id: coupon?.coupon_id,
        guest_email: guest?.email,
        guest_name: guest?.name,
        name: guest?.name,
        email: guest?.email,
      } as any,
      (info) => {
        trackSalesEvent("payment_success", { book_id: book.id, source: "offer_landing" });
        setBuying(false);
        setGuestOpen(false);
        if (info?.claim_token) navigate(`/claim/${info.claim_token}`);
        else navigate("/dashboard");
      },


      (err) => {
        trackSalesEvent("payment_failed", { book_id: book.id, error: err });
        toast({ title: "Payment failed", description: err, variant: "destructive" });
        setBuying(false);
      }
    );
  };

  const onBuyClick = () => {
    if (!book || book.is_free) return;
    trackSalesEvent("click_buy_now", { book_id: book.id, source: "offer_landing" });
    if (user) {
      startPayment();
    } else {
      setGuestOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Offer not found</p>
          <Link to="/books" className="mt-4 inline-block text-primary underline">
            Browse all books
          </Link>
        </div>
      </div>
    );
  }

  const original = book.is_free ? 0 : Math.round(book.price * 2.2);
  const priceLabel = book.is_free ? "Free" : `${formatPrice(finalAmount)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top bar — just the logo, NO navigation */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-bold">
              Gyandoot<span className="text-primary">Nova</span>
            </span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Secure checkout · 7-day money back
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-8 md:pt-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          {/* Cover */}
          <div className="relative">
            <div
              className="mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border bg-muted"
              style={{ boxShadow: "0 24px 48px -24px rgba(0,0,0,0.25)" }}
            >
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Pitch */}
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Limited launch offer
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-5xl">
              {book.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              by <span className="font-medium">{book.author}</span>
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">{priceLabel}</span>
              <span className="ml-3 inline-block align-middle"><CurrencySelector compact /></span>
              {!book.is_free && original > finalAmount && (
                <>
                  <span className="text-lg line-through text-muted-foreground">{formatPrice(original)}</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Save {formatPrice(original - finalAmount)}
                  </span>
                </>
              )}
            </div>
            {coupon && (
              <p className="mt-1 text-xs text-emerald-700">
                ✓ Coupon <b>{AUTO_COUPON}</b> automatically applied
              </p>
            )}

            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Instant download after payment (PDF + Reader)",
                "Read on all devices — mobile, tablet, desktop",
                "7-day money back — no questions asked",
                "Lifetime access — no subscription",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              className="mt-8 h-14 w-full text-base font-semibold"
              onClick={onBuyClick}
              disabled={buying}
            >
              {buying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening checkout…
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" /> Buy Now — {priceLabel}
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              No signup required · UPI · Cards · Wallets
            </p>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mt-16">
          <SalesTrustBar compact />
        </div>

        {/* Description */}
        {book.description && (
          <section className="prose prose-neutral mx-auto mt-16 max-w-2xl">
            <h2 className="font-serif text-2xl font-bold">About this book</h2>
            <div
              className="text-[15px] leading-relaxed text-foreground/80"
              dangerouslySetInnerHTML={{
                __html: book.description.replace(/<script[^>]*>.*?<\/script>/gi, ""),
              }}
            />
          </section>
        )}

        {/* Mini FAQ */}
        <section className="mx-auto mt-16 max-w-2xl">
          <h2 className="mb-4 font-serif text-2xl font-bold">Quick answers</h2>
          <div className="space-y-3">
            {[
              {
                q: "Payment ke baad book kaise milegi?",
                a: "Turant hi. Payment complete hote hi download link screen par + apke email par aa jayega.",
              },
              {
                q: "Kya refund milega agar pasand nahi aayi?",
                a: "Haan — 7 din ke andar full refund, bina koi sawal.",
              },
              {
                q: "Account banana zaroori hai?",
                a: "Nahi. Sirf email chahiye. Baad me chahen to account bana kar library me access kar sakte hain.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-xl border bg-card p-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none font-semibold">{q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur md:hidden">
        <Button
          size="lg"
          className="h-12 w-full text-base font-semibold"
          onClick={onBuyClick}
          disabled={buying}
        >
          {buying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Zap className="mr-2 h-5 w-5" /> Buy Now — {priceLabel}
            </>
          )}
        </Button>
      </div>

      {/* Guest checkout */}
      <GuestCheckoutDialog
        open={guestOpen}
        onOpenChange={setGuestOpen}
        onContinue={(data) => startPayment(data)}
        priceLabel={priceLabel}
      />

      <footer className="mt-8 border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            Secure payment powered by Razorpay · 7-day money back ·{" "}
            <Link to="/refund-policy" className="underline">
              Refund policy
            </Link>{" "}
            ·{" "}
            <Link to="/support" className="underline">
              Support
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OfferLanding;
