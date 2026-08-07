import { useState } from "react";
import { Gift, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * First-time buyer offer banner.
 * Shows a copyable coupon code. No fake countdowns — honest, evergreen offer
 * managed via `coupons` table (code WELCOME10, 10% off).
 */
export default function LaunchOfferBanner({ code = "WELCOME10", percent = 10 }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({ title: `Coupon "${code}" copied`, description: "Paste at checkout for the discount." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: `Please copy manually: ${code}`, variant: "destructive" });
    }
  };

  return (
    <div
      className="flex flex-col items-start gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between md:p-5"
      style={{ borderColor: "#FDE68A", background: "linear-gradient(90deg, #FFFBEB 0%, #FEF3C7 100%)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "#F59E0B" }}
        >
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold md:text-base" style={{ color: "#92400E" }}>
            First-time buyer? Get {percent}% off any book
          </p>
          <p className="mt-0.5 text-xs md:text-sm" style={{ color: "#B45309" }}>
            Use code at checkout · applies to your first order
          </p>
        </div>
      </div>
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed bg-white px-4 py-2 text-sm font-bold tracking-wider transition hover:bg-amber-50"
        style={{ borderColor: "#D97706", color: "#92400E" }}
        aria-label={`Copy coupon code ${code}`}
      >
        {code}
        {copied ? <Check className="h-4 w-4" style={{ color: "#16A34A" }} /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
