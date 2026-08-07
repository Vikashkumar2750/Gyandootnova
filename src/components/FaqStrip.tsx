import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Buy once — mine forever?",
    a: "Yes. Any scripture added to your account stays for life. No rentals, no renewals. Future author updates come free too.",
  },
  {
    q: "Works on phone, tablet and laptop?",
    a: "One login across every device. Your reading position syncs automatically — pick up right where you left off.",
  },
  {
    q: "Why no file download?",
    a: "Because it hurts readers more than it helps — lose the phone, lose everything; storage fills up fast. Here, your login is your library — nothing to misplace.",
  },
  {
    q: "Are payments secure?",
    a: "Completely. Razorpay and PayPal both use bank-grade security. Your card details never touch our servers.",
  },
  {
    q: "What if I don't like it?",
    a: "One message within 7 days is enough. Full refund within 24 hours, no questions asked.",
  },
];

export default function FaqStrip() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-3xl">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            <HelpCircle className="h-3 w-3" /> Common questions
          </span>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold">
            The ones you hesitate to ask — <span className="text-primary">answered here.</span>
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <span className="font-serif font-semibold text-card-foreground text-[15px]">
                  {f.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4 -mt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            to="/faq"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            See all questions →
          </Link>
        </div>
      </div>
    </section>
  );
}
