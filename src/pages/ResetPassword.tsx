import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
<<<<<<< HEAD
import useSEO from "@/hooks/useSEO";
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

<<<<<<< HEAD
  useSEO({
    title: "Reset Your Password | GyandootNova",
    description: "Apna GyandootNova account password securely reset karein — naya password set karke sign in karein.",
    canonical: "/reset-password",
    noindex: true,
  });

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  useEffect(() => {
    // Supabase sets the session via URL hash on redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setValidSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <Layout>
      <section className="flex min-h-[60vh] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-8 w-8 text-primary" />
            <CardTitle className="font-serif text-2xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            {!validSession ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Invalid or expired reset link. Please request a new password reset.
              </p>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
};

export default ResetPassword;
