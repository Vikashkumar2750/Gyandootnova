import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Zap, RotateCcw } from "lucide-react";
import { trackSalesEvent } from "@/hooks/useAnalytics";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  name: z.string().trim().max(120).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onContinue: (data: { email: string; name?: string }) => void;
  priceLabel: string;
}

const GuestCheckoutDialog = ({ open, onOpenChange, onContinue, priceLabel }: Props) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, name: name.trim() || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    trackSalesEvent("begin_guest_checkout", { email: parsed.data.email });
    onContinue(parsed.data as { email: string; name?: string });
    // Parent will close dialog after opening payment.
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Guest checkout</DialogTitle>
          <DialogDescription>
            Sirf apka email chahiye — account banane ki zaroorat nahi. Purchase ke turant baad
            download link email par bhej denge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email address *</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-name">Name (optional)</Label>
            <Input
              id="guest-name"
              type="text"
              placeholder="Aapka naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: Zap, label: "Instant download" },
              { icon: ShieldCheck, label: "Secure payment" },
              { icon: RotateCcw, label: "7-day refund" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-md border bg-muted/30 p-2 text-center text-[11px]"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening checkout…
              </>
            ) : (
              <>Continue to pay {priceLabel}</>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Purchase ke baad aap email link se book access kar sakte hain — ya later account bhi
            bana sakte hain.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GuestCheckoutDialog;
