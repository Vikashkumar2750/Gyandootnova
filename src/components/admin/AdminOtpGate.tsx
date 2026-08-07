import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Mail } from "lucide-react";

const STORAGE_KEY = "admin_otp_verified";
const SENT_KEY = "admin_otp_sent_at";
const OTP_VALID_MS = 5 * 60 * 1000; // 5 minutes

export function isAdminOtpValid(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { expires_at } = JSON.parse(raw);
    return new Date(expires_at) > new Date();
  } catch { return false; }
}

function getActiveOtpSentAt(): number | null {
  try {
    const v = sessionStorage.getItem(SENT_KEY);
    if (!v) return null;
    const t = parseInt(v, 10);
    if (!t || Date.now() - t > OTP_VALID_MS) return null;
    return t;
  } catch { return null; }
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface Props { onVerified: () => void; userEmail?: string }

const AdminOtpGate = ({ onVerified, userEmail }: Props) => {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState<boolean>(() => getActiveOtpSentAt() !== null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const t = getActiveOtpSentAt();
    return t ? Math.max(0, Math.floor((OTP_VALID_MS - (Date.now() - t)) / 1000)) : 0;
  });
  const { toast } = useToast();

  const sendOtp = async (force = false) => {
    // Don't resend if a still-valid OTP exists
    if (!force && getActiveOtpSentAt() !== null) {
      setSent(true);
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-otp-send");
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to send OTP", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    sessionStorage.setItem(SENT_KEY, String(Date.now()));
    setSent(true);
    setSecondsLeft(Math.floor(OTP_VALID_MS / 1000));
    toast({ title: "OTP sent", description: `Check ${userEmail || "your email"} for the code.` });
  };

  // Auto-send only if there's no still-valid OTP from this session
  useEffect(() => {
    if (getActiveOtpSentAt() === null) sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!sent) return;
    const id = setInterval(() => {
      const t = getActiveOtpSentAt();
      if (!t) { setSecondsLeft(0); return; }
      setSecondsLeft(Math.max(0, Math.floor((OTP_VALID_MS - (Date.now() - t)) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [sent]);

  const verify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("admin-otp-verify", { body: { code } });
    setVerifying(false);
    if (error || (data as any)?.error) {
      toast({ title: "Verification failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ expires_at: (data as any).expires_at }));
    sessionStorage.removeItem(SENT_KEY);
    toast({ title: "Verified", description: "Welcome, admin." });
    onVerified();
  };

  const canResend = secondsLeft <= 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="font-serif text-2xl">Admin Verification</CardTitle>
          <CardDescription>
            <Mail className="inline h-4 w-4 mr-1" />
            Enter the 6-digit code sent to {userEmail || "your email"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {sent && secondsLeft > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              OTP expires in <span className="font-mono font-medium text-foreground">{fmt(secondsLeft)}</span>
            </p>
          )}
          <Button className="w-full" onClick={verify} disabled={verifying || code.length !== 6}>
            {verifying ? "Verifying..." : "Verify & Continue"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => sendOtp(true)}
            disabled={sending || !canResend}
          >
            {sending
              ? "Sending..."
              : canResend
                ? (sent ? "Resend OTP" : "Send OTP")
                : `Resend in ${fmt(secondsLeft)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOtpGate;
