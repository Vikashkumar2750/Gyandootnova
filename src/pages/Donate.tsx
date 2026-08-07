<<<<<<< HEAD
import { useEffect, useState } from "react";
=======
import { useState } from "react";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, CheckCircle, Loader2, User, Mail, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { initiatePayment, type PaymentGateway } from "@/lib/payment";
<<<<<<< HEAD
import { useLocale } from "@/hooks/useLocale";
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import useSEO from "@/hooks/useSEO";

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const Donate = () => {
  useSEO({
    title: "Support Us — Donate to GyandootNova Spiritual Books Mission",
    description: "Support GyandootNova's mission to publish and share dharmik granth, Vishnu Sahasraname, Bhagwat Geeta & spiritual books with seekers worldwide.",
    canonical: "/support-us",
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(500);
  const [name, setName] = useState(user?.user_metadata?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [donated, setDonated] = useState(false);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const { country, currency, rates, formatPrice } = useLocale();
  const isIndia = (country ?? "").toUpperCase() === "IN";
  const [gateway, setGateway] = useState<PaymentGateway>("razorpay");
  const [gatewayTouched, setGatewayTouched] = useState(false);
  useEffect(() => {
    if (gatewayTouched || !country) return;
    setGateway(isIndia ? "razorpay" : "paypal");
  }, [country, isIndia, gatewayTouched]);
=======
  const [gateway, setGateway] = useState<PaymentGateway>("razorpay");
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  const handleDonate = async () => {
    if (!amount || amount < 1) {
      toast({ title: "Invalid Amount", description: "Please enter a valid donation amount.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Name Required", description: "Kripya apna naam darj karein.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email Required", description: "Kripya apna email darj karein.", variant: "destructive" });
      return;
    }
    setLoading(true);
    await initiatePayment(
<<<<<<< HEAD
      { amount, type: "donation", gateway, name: name.trim(), email: email.trim(), buyer_currency: currency, buyer_fx_rate: 1 } as any,
=======
      { amount, type: "donation", gateway, name: name.trim(), email: email.trim() },
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      () => {
        setDonated(true);
        setLoading(false);
      },
      (error) => {
        if (error !== "Payment cancelled") {
          toast({ title: "Payment Failed", description: error, variant: "destructive" });
        }
        setLoading(false);
      }
    );
  };

  if (donated) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-lg text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 font-serif text-3xl font-bold">Dhanyavaad! 🙏</h1>
            <p className="mt-3 text-muted-foreground">
              Aapka ₹{amount.toLocaleString("en-IN")} ka daan prapt ho gaya. Aapki udaarta ko pranam. May your kindness bring blessings.
            </p>
            {email && (
              <p className="mt-2 text-sm text-muted-foreground">Receipt sent to <strong>{email}</strong></p>
            )}
            <Button className="mt-6" onClick={() => { setDonated(false); }}>Phir Se Daan Karein</Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container max-w-lg">
          <div className="text-center mb-8">
            <Heart className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-serif text-3xl font-bold">Daan Karein</h1>
            <p className="mt-2 text-muted-foreground">
              Adhyatmik gyan ke prasar mein sahyog karein. Aapka har yogdan mahatvapurna hai.
            </p>
            {!user && (
              <p className="mt-3 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline inline-flex items-center gap-1">
                  <LogIn className="h-3.5 w-3.5" /> Sign in
                </Link>{" "}
                karein taaki daan history profile mein dikhaye — ya bina login ke bhi daan kar sakte hain.
              </p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Daan Rashi Chunein</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Preset amounts */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((a) => (
                  <Button
                    key={a}
                    variant={amount === a ? "default" : "outline"}
                    onClick={() => setAmount(a)}
                  >
                    ₹{a}
                  </Button>
                ))}
              </div>

              {/* Custom amount */}
              <div>
                <Label>Custom Amount (₹)</Label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1"
                  placeholder="Apni rashi darj karein"
                />
              </div>

              {/* Donor details */}
              <div className="space-y-4 pt-1">
                <p className="text-sm font-medium text-muted-foreground">Aapki Jaankari <span className="text-destructive">*</span></p>
                <div>
                  <Label className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Naam <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aapka naam"
                    className="mt-1"
                    required
                    disabled={!!user}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Receipt ke liye email"
                    className="mt-1"
                    required
                    disabled={!!user}
                  />
                </div>
              </div>

              {/* Payment gateway */}
              <div>
                <Label className="mb-2 block">Payment Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={gateway === "razorpay" ? "default" : "outline"}
<<<<<<< HEAD
                    onClick={() => { setGateway("razorpay"); setGatewayTouched(true); }}
                    className="flex-1"
                  >
                    Razorpay <span className="ml-1 opacity-70 text-xs">(India)</span>
=======
                    onClick={() => setGateway("razorpay")}
                    className="flex-1"
                  >
                    Razorpay
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                  </Button>
                  <Button
                    type="button"
                    variant={gateway === "paypal" ? "default" : "outline"}
<<<<<<< HEAD
                    onClick={() => { setGateway("paypal"); setGatewayTouched(true); }}
                    className="flex-1"
                  >
                    PayPal <span className="ml-1 opacity-70 text-xs">(Global)</span>
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {gateway === "paypal"
                    ? <>Charged in your local currency at the same number as the INR amount.</>
                    : <>Cards, UPI, netbanking — charged in INR.</>}
                </p>
              </div>

              {/* Localized price breakdown */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Donation breakdown</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Base amount</span><span className="font-medium">₹{amount.toLocaleString("en-IN")} INR</span></div>
                  {country && <div className="flex justify-between"><span className="text-muted-foreground">Your region</span><span className="font-medium">{country} · {currency}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Pricing model</span><span className="font-medium">1:1 parity (no FX)</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5"><span className="font-semibold">You'll be charged</span><span className="font-bold text-primary">{gateway === "paypal" ? `${formatPrice(amount)} ${currency}` : `₹${amount.toLocaleString("en-IN")} INR`}</span></div>
                </div>
              </div>


=======
                    onClick={() => setGateway("paypal")}
                    className="flex-1"
                  >
                    PayPal
                  </Button>
                </div>
              </div>

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleDonate}
                disabled={amount < 1 || loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
<<<<<<< HEAD
                  <><Heart className="h-4 w-4" /> {gateway === "paypal" ? formatPrice(amount) : `₹${amount.toLocaleString("en-IN")}`} Daan Karein</>
=======
                  <><Heart className="h-4 w-4" /> ₹{amount.toLocaleString("en-IN")} Daan Karein</>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                🔒 Secure payment via {gateway === "razorpay" ? "Razorpay" : "PayPal"} · Login required nahi
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Donate;
