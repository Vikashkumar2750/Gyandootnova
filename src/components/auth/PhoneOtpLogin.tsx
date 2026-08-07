import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props { channel: "sms" | "whatsapp" }

const PhoneOtpLogin = ({ channel }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const send = async () => {
    if (!/^\+\d{10,15}$/.test(phone)) {
      toast({ title: "Invalid phone", description: "Use +CountryCode format (e.g. +919999999999)", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { recipient: phone, channel } });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    setStage("code");
    toast({ title: "OTP sent", description: `Check your ${channel === "whatsapp" ? "WhatsApp" : "messages"}` });
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-verify", { body: { recipient: phone, channel, code } });
    if (error || (data as any)?.error) {
      setVerifying(false);
      toast({ title: "Verification failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    const { token_hash } = data as { token_hash: string };
    const { error: vErr } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
    setVerifying(false);
    if (vErr) {
      toast({ title: "Session failed", description: vErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed in" });
    navigate("/profile", { replace: true });
  };

  if (stage === "phone") {
    return (
      <div className="space-y-4">
        <div>
          <Label>Mobile Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">Country code ke saath number daalein.</p>
        </div>
        <Button className="w-full" onClick={send} disabled={sending}>
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send OTP via {channel === "whatsapp" ? "WhatsApp" : "SMS"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{phone} par OTP bheja gaya.</p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button className="w-full" onClick={verify} disabled={verifying || code.length !== 6}>
        {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify & Sign In
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => { setStage("phone"); setCode(""); }}>
        Change number
      </Button>
    </div>
  );
};

export default PhoneOtpLogin;
