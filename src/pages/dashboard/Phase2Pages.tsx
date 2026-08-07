import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, Sparkles, Cake, Loader2, BookOpen, Trophy, Flame, Star, Calendar as CalIcon } from "lucide-react";

/* ────────── Profile prefs hook ────────── */
export const useProfilePrefs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id, display_name, birthday, reading_goal_minutes, spiritual_intention")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
};

/* ────────── Reading Goals ────────── */
export const ReadingGoals = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useProfilePrefs();
  const [goal, setGoal] = useState(20);
  const [intention, setIntention] = useState("");

  useEffect(() => {
    if (prefs) {
      setGoal(prefs.reading_goal_minutes ?? 20);
      setIntention(prefs.spiritual_intention ?? "");
    }
  }, [prefs]);

  const { data: todayRows = [] } = useQuery({
    queryKey: ["today-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const startIso = new Date(new Date().setHours(0,0,0,0)).toISOString();
      const { data } = await supabase.from("reading_progress")
        .select("chapter_id, updated_at")
        .eq("user_id", user!.id)
        .gte("updated_at", startIso);
      return data ?? [];
    },
  });

  const todayMinutes = Math.min(goal * 2, todayRows.length * 6); // ~6 min per chapter session

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({
        reading_goal_minutes: goal,
        spiritual_intention: intention || null,
      }).eq("user_id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-prefs", user?.id] });
      toast({ title: "Saved", description: "Aapka lakshya update ho gaya." });
    },
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-primary"/>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl">Reading Goals & Sankalp</h1>
      <p className="text-sm text-muted-foreground">Apna daily lakshya set karein aur apni spiritual sankalp likhein.</p>

      <Card className="surface-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary"/> Aaj ka lakshya</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">{todayMinutes} / {goal} minutes</div>
          <Progress value={Math.min(100, (todayMinutes / Math.max(1, goal)) * 100)} />
          <p className="mt-2 text-xs text-muted-foreground">Rozana thoda-thoda padhein — abhyaas se siddhi milti hai.</p>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="goal">Daily reading goal (minutes)</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input id="goal" type="number" min={5} max={240} value={goal} onChange={(e) => setGoal(parseInt(e.target.value || "20"))} className="max-w-[140px]"/>
              <div className="flex gap-1">
                {[10, 20, 30, 45, 60].map((m) => (
                  <Button key={m} size="sm" variant="ghost" onClick={() => setGoal(m)}>{m}</Button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="intention">Aapki spiritual sankalp / intention</Label>
            <Input id="intention" value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="e.g. Roz Gita ka ek adhyay padhoonga" className="mt-2"/>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/* ────────── Birthday & Blessing ────────── */
export const BirthdaySettings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useProfilePrefs();
  const [birthday, setBirthday] = useState("");

  useEffect(() => { if (prefs?.birthday) setBirthday(prefs.birthday); }, [prefs]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("profiles").update({ birthday: birthday || null }).eq("user_id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-prefs", user?.id] });
      toast({ title: "Saved", description: "Aapki janm-tithi save ho gayi." });
    },
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-primary"/>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><Cake className="h-6 w-6 text-primary"/> Janm-tithi & Ashirvad</h1>
      <p className="text-sm text-muted-foreground">Apni janm-tithi set karein — hum aapke shubh din par vishesh sandesh dikhayenge.</p>

      <Card className="surface-card max-w-md">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="bday">Janm-tithi (Date of Birth)</Label>
            <Input id="bday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="mt-2"/>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      {prefs?.birthday && <BirthdayPreview date={prefs.birthday} />}
    </div>
  );
};

const BirthdayPreview = ({ date }: { date: string }) => {
  const d = new Date(date);
  const today = new Date();
  const isBirthday = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return (
    <Card className="surface-card bg-gradient-cream">
      <CardContent className="p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary"/>
        {isBirthday ? (
          <>
            <h2 className="mt-3 font-serif text-2xl">Janmadin ki hardik shubhkamnayein!</h2>
            <p className="mt-2 text-sm text-muted-foreground">॥ आयुष्मान् भव, यशस्वी भव, विद्यावान् भव ॥</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Aapki agli janm-tithi: <strong className="text-foreground">{d.toLocaleDateString("hi-IN", { day: "numeric", month: "long" })}</strong></p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* ────────── Spiritual Journey Timeline ────────── */
export const SpiritualJourney = () => {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["journey", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profile, purchases, progress, bookmarks, reviews] = await Promise.all([
        supabase.from("profiles").select("created_at").eq("user_id", user!.id).maybeSingle(),
        supabase.rpc("get_user_purchases", { _user_id: user!.id }),
        supabase.from("reading_progress").select("book_id, updated_at, scroll_percent, books(title, slug)").eq("user_id", user!.id).order("updated_at", { ascending: false }),
        supabase.from("bookmarks").select("id, book_title, chapter_title, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("book_reviews").select("id, rating, created_at, books(title)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      ]);

      const items: { when: string; icon: any; title: string; desc: string; color: string }[] = [];
      if (profile.data?.created_at) items.push({ when: profile.data.created_at, icon: Sparkles, title: "Path-yatra shuru", desc: "Aap GyandootNova me judhe", color: "text-primary" });

      (purchases.data ?? []).forEach((p: any) => {
        if (p.status === "completed") items.push({ when: p.created_at, icon: BookOpen, title: "Naya granth prapt kiya", desc: `Order #${p.id.slice(0,8)}`, color: "text-green-600" });
      });
      (progress.data ?? []).forEach((r: any) => {
        if ((r.scroll_percent ?? 0) >= 95 && r.books) items.push({ when: r.updated_at, icon: Trophy, title: "Granth poora kiya", desc: r.books.title, color: "text-amber-600" });
      });
      (bookmarks.data ?? []).forEach((b: any) => {
        items.push({ when: b.created_at, icon: BookOpen, title: "Bookmark laga", desc: `${b.book_title} — ${b.chapter_title}`, color: "text-blue-600" });
      });
      (reviews.data ?? []).forEach((r: any) => {
        items.push({ when: r.created_at, icon: Star, title: `${r.rating}-star review`, desc: r.books?.title ?? "", color: "text-yellow-600" });
      });

      items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
      return items.slice(0, 100);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><CalIcon className="h-6 w-6 text-primary"/> Spiritual Journey</h1>
      <p className="text-sm text-muted-foreground">Aapki path-yatra ka har padav — ek jagah.</p>

      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border"/>
          <ul className="space-y-4">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <div className={`absolute -left-[19px] top-1.5 h-4 w-4 rounded-full bg-background border-2 border-primary flex items-center justify-center ${e.color}`}>
                  <e.icon className="h-2.5 w-2.5"/>
                </div>
                <Card className="surface-card">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{new Date(e.when).toLocaleDateString()}</div>
                    </div>
                    {e.desc && <div className="text-xs text-muted-foreground mt-0.5">{e.desc}</div>}
                  </CardContent>
                </Card>
              </li>
            ))}
            {events.length === 0 && <li className="text-sm text-muted-foreground">Abhi tak koi padav nahi. Book kholein!</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ────────── Reading Challenge ────────── */
export const ReadingChallenge = () => {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["challenge-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data } = await supabase.from("reading_progress")
        .select("book_id, scroll_percent, updated_at")
        .eq("user_id", user!.id)
        .gte("updated_at", yearStart);
      return data ?? [];
    },
  });
  const completed = rows.filter((r: any) => (r.scroll_percent ?? 0) >= 95).length;
  const target = 12;
  const pct = Math.min(100, Math.round((completed / target) * 100));
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><Trophy className="h-6 w-6 text-primary"/> {year} Reading Challenge</h1>
      <p className="text-sm text-muted-foreground">Is saal {target} granth poore karein — Baraah mahine, baraah granth.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (
        <Card className="surface-card">
          <CardContent className="p-6">
            <div className="flex items-baseline justify-between">
              <div className="font-serif text-4xl">{completed}<span className="text-xl text-muted-foreground"> / {target}</span></div>
              <div className="text-xs uppercase tracking-widest text-primary">{pct}%</div>
            </div>
            <div className="mt-4"><Progress value={pct}/></div>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {Array.from({ length: target }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-lg border flex items-center justify-center text-xs ${i < completed ? "bg-primary/10 border-primary/40 text-primary" : "border-border/60 text-muted-foreground"}`}>
                  {i < completed ? <BookOpen className="h-4 w-4"/> : i + 1}
                </div>
              ))}
            </div>
            {completed >= target && (
              <div className="mt-6 rounded-lg bg-gradient-cream p-4 text-center">
                <Flame className="mx-auto h-6 w-6 text-primary"/>
                <p className="mt-2 font-serif text-lg">Challenge poori! Vandaniya sadhak.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
