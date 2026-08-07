import { ShieldCheck, Zap, BookOpen, Lock, RotateCcw } from "lucide-react";

/**
 * High-conversion trust bar for /books & book detail.
 * Communicates the four buyer objections in one glance:
 *  - Will I actually get the book? (Instant access)
 *  - Is my money safe?            (Secure payment)
 *  - What if I don't like it?     (7-day money back)
 *  - Are others buying?           (Reader count)
 */
export default function SalesTrustBar({
  readers = 10000,
  compact = false,
}: {
  readers?: number;
  compact?: boolean;
}) {
  const items = [
    {
      icon: Zap,
      title: "Instant Access",
      sub: "PDF + Reader immediately after payment",
    },
    {
      icon: ShieldCheck,
      title: "100% Secure Payment",
      sub: "UPI · Cards · Wallets · Razorpay",
    },
    {
      icon: RotateCcw,
      title: "7-Day Money Back",
      sub: "Not satisfied? Full refund, no questions",
    },
    {
      icon: BookOpen,
      title: `${readers.toLocaleString("en-IN")}+ Readers`,
      sub: "Trusted by seekers across India",
    },
  ];

  return (
    <div
      className={`grid gap-3 ${
        compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      }`}
    >
      {items.map(({ icon: Icon, title, sub }) => (
        <div
          key={title}
          className="flex items-start gap-3 rounded-lg border bg-white p-4"
          style={{ borderColor: "#E5E7EB" }}
        >
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "#FEF3C7" }}
          >
            <Icon className="h-4 w-4" style={{ color: "#D97706" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#111827" }}>
              {title}
            </p>
            {!compact && (
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                {sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
