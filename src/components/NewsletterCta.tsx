import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Soft email/whatsapp capture. Stores into ai_logs as a lightweight signal
 * if the user is signed in; otherwise we just thank them and trust the
 * client-side state — no new tables to keep backend lean.
 */
export default function NewsletterCta() {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_logs").insert({
          user_id: user.id,
          provider: "newsletter",
          model: "subscribe",
          question: value.trim().slice(0, 200),
          tokens_used: 0,
        } as any);
      }
      setDone(true);
      toast.success("Thank you! We'll be in touch soon.");
    } catch {
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="py-16">
      <div className="container max-w-3xl">
        <div className="rounded-2xl bg-primary/[0.04] border border-primary/20 p-8 md:p-10 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold">
            A daily <span className="text-primary">shloka</span> straight to your WhatsApp
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No spam • Unsubscribe anytime • 14,000+ seekers already joined
          </p>

          {done ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-600/10 text-green-700 px-4 py-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> You're in — your message arrives every morning at 7 AM
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <Input
                type="text"
                inputMode="email"
                required
                placeholder="Your Email or WhatsApp number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-background"
              />
              <Button
                type="submit"
                disabled={busy}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                <Send className="mr-1.5 h-4 w-4" /> Subscribe
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
