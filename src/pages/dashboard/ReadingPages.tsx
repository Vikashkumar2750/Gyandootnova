import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, BookOpen, Clock, Target, CalendarDays, Award, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const useProgressRows = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-progress-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reading_progress")
        .select("book_id, chapter_id, scroll_percent, updated_at, books(id, title, slug, cover_url)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
};

const computeStreak = (dates: Set<string>) => {
  const today = new Date();
  let streak = 0;
  let longest = 0;
  let run = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (dates.has(d.toDateString())) { run++; if (i === streak) streak = run; }
    else { longest = Math.max(longest, run); run = 0; if (streak > 0 && i === streak) break; }
  }
  return { streak, longest: Math.max(longest, run, streak) };
};

const BADGES = [
  { id: "first-book", label: "First Steps", desc: "Ek book kholi", icon: BookOpen, test: (s: any) => s.readingCount >= 1 },
  { id: "streak-3", label: "3-day Sadhak", desc: "3 din lagataar padha", icon: Flame, test: (s: any) => s.streak >= 3 },
  { id: "streak-7", label: "7-day Sadhak", desc: "7 din lagataar padha", icon: Flame, test: (s: any) => s.streak >= 7 },
  { id: "streak-30", label: "Mahayogi", desc: "30 din lagataar padha", icon: Flame, test: (s: any) => s.streak >= 30 },
  { id: "completed-1", label: "One Complete", desc: "Ek book poori ki", icon: Trophy, test: (s: any) => s.completed >= 1 },
  { id: "completed-5", label: "Vidyarthi", desc: "5 books poori", icon: Trophy, test: (s: any) => s.completed >= 5 },
  { id: "long-1", label: "Longest Streak 10", desc: "10 din ka best streak", icon: Award, test: (s: any) => s.longest >= 10 },
  { id: "completed-10", label: "Panditji", desc: "10 books poori", icon: Award, test: (s: any) => s.completed >= 10 },
];

export const ReadingDashboard = () => {
  const { data: rows = [], isLoading } = useProgressRows();
  const stats = useMemo(() => {
    const dates = new Set<string>(rows.map((r: any) => new Date(r.updated_at).toDateString()));
    const { streak, longest } = computeStreak(dates);
    const completed = rows.filter((r: any) => (r.scroll_percent ?? 0) >= 95).length;
    const chaptersRead = new Set(rows.map((r: any) => r.chapter_id).filter(Boolean)).size;
    // Rough total time: 8 min per chapter session cap
    const totalMinutes = Math.min(chaptersRead * 8, chaptersRead * 8);
    return { readingCount: rows.length, completed, chaptersRead, totalMinutes, streak, longest, dates };
  }, [rows]);

  const dailyGoal = 20;
  const todayMinutes = stats.dates.has(new Date().toDateString()) ? Math.min(dailyGoal, 15) : 0;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl">Reading Dashboard</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Flame, label: "Current streak", value: `${stats.streak} din` },
              { icon: Award, label: "Longest streak", value: `${stats.longest} din` },
              { icon: BookOpen, label: "Books completed", value: stats.completed },
              { icon: Trophy, label: "Chapters read", value: stats.chaptersRead },
              { icon: Clock, label: "Total time (est.)", value: `${stats.totalMinutes} min` },
              { icon: Target, label: "Books in progress", value: stats.readingCount },
            ].map((s) => (
              <Card key={s.label} className="surface-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-5 w-5"/></div>
                  <div><div className="text-xl font-serif font-semibold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="surface-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary"/> Aaj ka lakshya</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">{todayMinutes} / {dailyGoal} minutes</div>
              <Progress value={(todayMinutes / dailyGoal) * 100} />
              <p className="mt-2 text-xs text-muted-foreground">Rozana thoda-thoda padhein — dhairya se gyaan aata hai.</p>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary"/> Reading Heatmap (last 12 weeks)</CardTitle></CardHeader>
            <CardContent>
              <Heatmap dates={stats.dates} />
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary"/> Achievement Badges</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BADGES.map((b) => {
                  const earned = b.test(stats);
                  return (
                    <div key={b.id} className={`rounded-lg border p-3 text-center ${earned ? "border-primary/40 bg-primary/5" : "border-border/60 opacity-50"}`}>
                      <b.icon className={`mx-auto h-6 w-6 ${earned ? "text-primary" : "text-muted-foreground"}`}/>
                      <div className="mt-1 text-xs font-medium">{b.label}</div>
                      <div className="text-[10px] text-muted-foreground">{b.desc}</div>
                      {earned && <Badge className="mt-1 text-[9px]">Earned</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const Heatmap = ({ dates }: { dates: Set<string> }) => {
  const today = new Date();
  const cells: { date: Date; on: boolean }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    cells.push({ date: d, on: dates.has(d.toDateString()) });
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {cells.map((c, i) => (
        <div key={i} title={c.date.toDateString()} className={`h-3 w-3 rounded-sm ${c.on ? "bg-primary" : "bg-primary/10"}`}/>
      ))}
    </div>
  );
};

export const BadgesPage = () => <ReadingDashboard />;

export const ReadingCalendar = () => {
  const { data: rows = [] } = useProgressRows();
  const dates = new Set(rows.map((r: any) => new Date(r.updated_at).toDateString()));
  const today = new Date();
  const cells: { date: Date; on: boolean }[] = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    cells.push({ date: d, on: dates.has(d.toDateString()) });
  }
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Reading Calendar</h1>
      <p className="text-sm text-muted-foreground">Pichhle 6 mahine ki path-yatra.</p>
      <Card className="surface-card"><CardContent className="p-4 overflow-x-auto">
        <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
          {cells.map((c, i) => (
            <div key={i} title={c.date.toDateString()} className={`h-3.5 w-3.5 rounded-sm ${c.on ? "bg-primary" : "bg-primary/10"}`}/>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
};

export const CertificatesPage = () => {
  const { user } = useAuth();
  const { data: rows = [] } = useProgressRows();
  const completed = rows.filter((r: any) => (r.scroll_percent ?? 0) >= 95);
  const [openId, setOpenId] = useState<string | null>(null);

  const printCert = (bookTitle: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Sadhak";
    w.document.write(`<!doctype html><html><head><title>Certificate</title>
      <style>body{font-family:Georgia,serif;background:#fdf6e3;color:#3b2410;margin:0;padding:60px;text-align:center}
      .card{border:8px double #a05a2c;padding:60px 40px;max-width:800px;margin:0 auto;background:#fffdf7}
      h1{font-size:36px;margin:0 0 8px;color:#a05a2c}
      h2{font-size:24px;font-style:italic;margin:24px 0 8px}
      .name{font-size:32px;font-weight:700;margin:20px 0;border-bottom:2px solid #a05a2c;display:inline-block;padding:0 40px 8px}
      p{font-size:16px;line-height:1.6}
      .brand{margin-top:40px;color:#a05a2c;letter-spacing:.2em;font-size:12px}
      @media print{.noprint{display:none}}</style></head><body>
      <div class="card">
        <div class="brand">GYANDOOTNOVA · CERTIFICATE OF COMPLETION</div>
        <h1>Path-Samapan Praman-Patra</h1>
        <p>Yeh praman patra prastut hai</p>
        <div class="name">${name}</div>
        <p>ke liye, jinhone shraddha se sampoorna granth padha —</p>
        <h2>${bookTitle}</h2>
        <p style="margin-top:40px">Date: ${new Date().toLocaleDateString()}</p>
        <div class="brand" style="margin-top:60px">॥ ॐ शान्ति शान्ति शान्तिः ॥</div>
      </div>
      <button class="noprint" onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#a05a2c;color:#fff;border:0;border-radius:6px;cursor:pointer">Print / Save PDF</button>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Reading Certificates</h1>
      <p className="text-sm text-muted-foreground">Poori ki hui pratyek book ka praman patra.</p>
      {completed.length === 0 ? (
        <Card className="surface-card"><CardContent className="p-10 text-center">
          <Trophy className="mx-auto h-8 w-8 text-primary"/>
          <p className="mt-3 text-muted-foreground">Abhi tak koi book poori nahi hui.</p>
          <Button asChild className="mt-4" size="sm"><Link to="/dashboard/library/continue">Continue reading</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {completed.map((r: any) => (
            <Card key={r.book_id} className="surface-card">
              <CardContent className="p-4 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-primary"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.books?.title}</div>
                  <div className="text-[11px] text-muted-foreground">100% completed</div>
                </div>
                <Button size="sm" onClick={() => printCert(r.books?.title || "Granth")}>View</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
