import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, ShoppingBag, Trophy, Flame, Clock, Bell, Sparkles, ArrowRight, Compass, Bookmark, Star, Cake, Target,
} from "lucide-react";
import { useProfilePrefs } from "@/pages/dashboard/Phase2Pages";
import useFestivalTheme, { FestivalBanner } from "@/hooks/useFestivalTheme";

const useDashboardStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [purchases, progress, bookmarks, reviews] = await Promise.all([
        supabase.rpc("get_user_purchases", { _user_id: user!.id }),
        supabase.from("reading_progress").select("book_id, chapter_number, scroll_percent, updated_at").eq("user_id", user!.id),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("book_reviews").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      const purchasedCount = (purchases.data ?? []).filter((p: any) => p.status === "completed").length;
      const progressRows = progress.data ?? [];
      const completed = progressRows.filter((r: any) => (r.scroll_percent ?? 0) >= 95).length;
      // Streak: count unique days in last 30 days with any updated_at
      const days = new Set(progressRows.map((r: any) => new Date(r.updated_at).toDateString()));
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (days.has(d.toDateString())) streak++;
        else if (i > 0) break;
      }
      return {
        purchasedCount,
        readingCount: progressRows.length,
        completed,
        streak,
        bookmarks: bookmarks.count ?? 0,
        reviews: reviews.count ?? 0,
      };
    },
  });
};

const StatCard = ({ icon: Icon, label, value, hint }: any) => (
  <Card className="surface-card">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-serif font-semibold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</div>}
      </div>
    </CardContent>
  </Card>
);

const DashboardHome = () => {
  useFestivalTheme();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: prefs } = useProfilePrefs();
  const name = prefs?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Reader";
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Shubh raatri" : hour < 12 ? "Suprabhat" : hour < 17 ? "Namaste" : hour < 20 ? "Shubh sandhya" : "Shubh raatri";

  const today = new Date();
  const bday = prefs?.birthday ? new Date(prefs.birthday) : null;
  const isBirthday = !!bday && bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();

  return (
    <div className="space-y-6">
      {isBirthday && (
        <Card className="surface-card border-primary/40 bg-gradient-cream">
          <CardContent className="p-5 flex items-center gap-4">
            <Cake className="h-8 w-8 text-primary shrink-0"/>
            <div>
              <div className="font-serif text-xl">Janmadin ki hardik shubhkamnayein, {name}!</div>
              <div className="text-xs text-muted-foreground mt-0.5">॥ आयुष्मान् भव, यशस्वी भव, विद्यावान् भव ॥</div>
            </div>
          </CardContent>
        </Card>
      )}
      <FestivalBanner />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-cream p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-primary/80">{greeting}</p>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl text-foreground">
          {greeting}, <span className="gradient-text-gold">{name}</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Aaj ki path-yatra shuru karein. Aapki library, progress aur daily wisdom, ek hi jagah.
        </p>
        {prefs?.spiritual_intention && (
          <p className="mt-3 text-sm italic text-primary/90">"{prefs.spiritual_intention}"</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/dashboard/library/continue">Continue Reading <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/spiritual">Today's Quote</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/reading/challenge">Reading Challenge</Link>
          </Button>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={BookOpen} label="Owned books" value={stats?.purchasedCount ?? 0} />
        <StatCard icon={Clock} label="In progress" value={stats?.readingCount ?? 0} />
        <StatCard icon={Trophy} label="Completed" value={stats?.completed ?? 0} />
        <StatCard icon={Flame} label="Day streak" value={stats?.streak ?? 0} />
        <StatCard icon={Bookmark} label="Bookmarks" value={stats?.bookmarks ?? 0} />
        <StatCard icon={Star} label="Reviews" value={stats?.reviews ?? 0} />
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { to: "/dashboard/library", title: "My Library", desc: "Purchased & free books.", icon: BookOpen },
          { to: "/dashboard/reading/challenge", title: "Reading Challenge", desc: "12 books in a year sankalp.", icon: Trophy },
          { to: "/dashboard/reading/goals", title: "Goals & Sankalp", desc: "Daily lakshya set karein.", icon: Target },
          { to: "/dashboard/spiritual/meditation", title: "Meditation Timer", desc: "Silent bell after your session.", icon: Compass },
          { to: "/dashboard/spiritual/journey", title: "Spiritual Journey", desc: "Aapki path-yatra ka timeline.", icon: Sparkles },
          { to: "/dashboard/personalized", title: "AI Recommendations", desc: "Books picked for you.", icon: Sparkles },
          { to: "/dashboard/orders", title: "My Orders", desc: "Invoices, refunds & history.", icon: ShoppingBag },
          { to: "/dashboard/profile/birthday", title: "Birthday & Blessing", desc: "Janm-tithi set karein.", icon: Cake },
          { to: "/dashboard/notifications", title: "Notifications", desc: "Order & reader updates.", icon: Bell },
        ].map((c) => (
          <Card key={c.to} className="surface-card group hover:shadow-elegant transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <c.icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">{c.title}</CardTitle>
              </div>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" size="sm" className="px-0 text-primary hover:bg-transparent">
                <Link to={c.to}>Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
