import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
<<<<<<< HEAD
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PhoneOtpLogin from "@/components/auth/PhoneOtpLogin";
import logoImg from "@/assets/logo.jpeg";
import useSEO from "@/hooks/useSEO";
=======
import logoImg from "@/assets/logo.jpeg";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

const ForgotPasswordLink = ({ email }: { email: string }) => {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email || " ", {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
    }
    setLoading(false);
  };

  if (sent) return <span className="text-xs text-primary">Reset link sent!</span>;
  return (
    <button type="button" onClick={handleForgot} disabled={loading} className="text-xs text-primary hover:underline disabled:opacity-50">
      {loading ? "Sending..." : "Forgot password?"}
    </button>
  );
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

<<<<<<< HEAD
  useSEO({
    title: "Sign In or Create Account | GyandootNova",
    description: "Sign in to your GyandootNova account ya naya account banayein — Hindu dharmik granth, Bhagavad Gita aur Vedas online reader ke liye.",
    canonical: "/auth",
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
=======
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/profile", { replace: true });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const isBanned = error.message.toLowerCase().includes("ban") || error.message.toLowerCase().includes("user not allowed");
        toast({
          title: isBanned ? "Account Disabled" : "Login Failed",
          description: isBanned
            ? "Your account has been disabled by the administrator. Please contact support."
            : error.message,
          variant: "destructive",
        });
      }
    } else {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We've sent you a verification link." });
        if (signUpData?.user?.email) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: signUpData.user.email, display_name: displayName }),
          }).catch(console.error);
        }
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });

    if (result.error) {
      toast({ title: "Error", description: result.error.message, variant: "destructive" });
      setGoogleLoading(false);
      return;
    }

    if (result.redirected) return;

    setGoogleLoading(false);
<<<<<<< HEAD
    navigate("/dashboard", { replace: true });
=======
    navigate("/profile", { replace: true });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  };

  return (
    <Layout>
      <section className="flex flex-1 items-center justify-center py-8 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logoImg} alt="GyandootNova" className="mx-auto h-16 w-16 rounded-full object-cover" />
            <CardTitle className="font-serif text-2xl">GyandootNova</CardTitle>
            <CardDescription>{isLogin ? "Sign in to your account" : "Join GyandootNova today"}</CardDescription>
          </CardHeader>
          <CardContent>
<<<<<<< HEAD
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-4"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </Button>

                <div className="relative mb-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <Label>Display Name</Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label>Email</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
                    {isLogin && (
                      <div className="mt-1 text-right">
                        <ForgotPasswordLink email={email} />
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button className="text-primary font-medium hover:underline" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="phone" className="mt-4">
                <PhoneOtpLogin channel="sms" />
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-4">
                <PhoneOtpLogin channel="whatsapp" />
              </TabsContent>
            </Tabs>
=======
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1" />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
                {isLogin && (
                  <div className="mt-1 text-right">
                    <ForgotPasswordLink email={email} />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button className="text-primary font-medium hover:underline" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
};

export default Auth;
