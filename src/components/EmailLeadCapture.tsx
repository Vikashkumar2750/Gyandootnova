import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Mail, Gift, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const STORAGE_KEY = "gn_lead_capture_v1";
const COUPON = "BHAKTI20";
const DISMISS_DAYS = 14;

const schema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(100),
});

function shownRecently() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function mark() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
  } catch {}
}

export default function EmailLeadCapture() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  // Allowed pages only: Home, About, Books (list), Articles (list), Services, Support Us, Contact
  const ALLOWED = new Set([
    "/",
    "/about",
    "/books",
    "/articles",
    "/services",
    "/support-us",
    "/donate",
    "/contact",
  ]);
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const isAllowedRoute = ALLOWED.has(path);

  useEffect(() => {
    // Hide for logged-in users and on disallowed pages
    if (user) return;
    if (!isAllowedRoute) return;
    if (shownRecently()) return;

    let fired = false;
    const fire = () => {
      if (fired || shownRecently()) return;
      fired = true;
      setOpen(true);
    };

    // Trigger 1: 25 s dwell
    const t = window.setTimeout(fire, 25000);

    // Trigger 2: 50 % scroll
    const onScroll = () => {
      const pct =
        (window.scrollY + window.innerHeight) /
        Math.max(document.documentElement.scrollHeight, 1);
      if (pct > 0.5) fire();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [user, isAllowedRoute]);

  // Auto-close if user logs in or navigates away from allowed page
  useEffect(() => {
    if (user || !isAllowedRoute) setOpen(false);
  }, [user, isAllowedRoute]);

  const submit = async () => {
    setErr(null);
    const parsed = schema.safeParse({ email, name });
    if (!parsed.success) {
      setErr("Please enter a valid name and email address.");
      return;
    }
    setBusy(true);
    try {
      await supabase.from("contact_enquiries").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: "Lead Magnet — Discount Coupon",
        message: `User requested ${COUPON} coupon via lead capture modal. Page: ${window.location.pathname}`,
        status: "new",
      });
      mark();
      setDone(true);
    } catch (e: any) {
      setErr("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    mark();
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COUPON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-primary/20 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {!done ? (
          <>
            <div className="text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold">
                Get 20% off your first book
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Drop your email — receive an instant coupon plus notifications when new scriptures
                are published. No spam, ever.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  maxLength={255}
                />
              </div>
              {err && (
                <p className="text-xs text-destructive font-medium">{err}</p>
              )}
              <Button
                onClick={submit}
                disabled={busy}
                size="lg"
                className="w-full font-bold"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>Send my coupon →</>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Unsubscribe anytime · No card details required
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
              <Check className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="mt-4 font-serif text-2xl font-bold">Thank you!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Here&apos;s your coupon — apply it at checkout:
            </p>
            <div className="mt-4 rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
              <button
                onClick={copy}
                className="font-serif text-3xl font-extrabold text-primary tracking-widest hover:underline"
              >
                {COUPON}
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                {copied ? (
                  <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                    <Check className="h-3 w-3" /> Copied
                  </span>
                ) : (
                  "Tap the code to copy"
                )}
              </p>
            </div>
            <Button onClick={close} className="mt-5 w-full" size="lg">
              Start shopping →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
