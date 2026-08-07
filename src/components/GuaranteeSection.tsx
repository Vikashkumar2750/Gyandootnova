import { ShieldCheck, RefreshCw, Lock, HeadphonesIcon } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "7-day money back",
    desc: "Didn't like it? Full refund, no questions asked. Your money, your right.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    desc: "Razorpay + PayPal • UPI, Card, Net Banking • 256-bit encrypted.",
  },
  {
    icon: RefreshCw,
    title: "Lifetime Updates",
    desc: "Buy once, get new editions and updates free forever.",
  },
  {
    icon: HeadphonesIcon,
    title: "Human Support",
    desc: "Reply within 24 hours on WhatsApp. No bots — real people.",
  },
];

export default function GuaranteeSection() {
  return (
    <section className="py-14 bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-5xl">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary uppercase tracking-wider">
            Our promise
          </span>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold">
            <span className="text-primary">100% risk-free</span> shopping
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We're not happy until you are.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-xl border border-border bg-card p-5 text-center hover:shadow-md transition-shadow"
            >
              <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <it.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 font-serif font-semibold text-card-foreground">{it.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
