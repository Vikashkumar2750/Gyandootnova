import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, RefreshCcw, Mail, Send, MousePointerClick, Target, BookOpen,
  Calendar, Rocket, ListChecks, Bell, CheckCircle2, XCircle, Clock, Activity,
} from "lucide-react";
import SeoFlowChart from "@/components/admin/SeoFlowChart";

type Post = {
  id: string; title: string; slug: string; publish_status: string; scheduled_at: string | null;
  primary_keyword: string | null; gsc_clicks: number; gsc_impressions: number; gsc_ctr: number;
  gsc_position: number | null; is_published: boolean; updated_at: string; word_count: number | null;
  report_sent_at: string | null; indexing_submitted_at: string | null;
  social_captions: unknown; content_score: number | null; readability_score: number | null;
  originality_score: number | null; quality_passed: boolean | null;
};
type JobRun = {
  id: string; fn: string; status: "queued" | "running" | "success" | "failed";
  attempt: number; max_attempts: number; started_at: string; finished_at: string | null;
  duration_ms: number | null; error: string | null; http_status: number | null; payload: unknown;
};
type Notif = {
  id: string; title: string; message: string | null; level: "info" | "success" | "error";
  fn: string | null; job_run_id: string | null; read_at: string | null; created_at: string;
};

const StatCard = ({ icon: Icon, label, value, sub, tone }: any) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-3xl font-bold ${tone === "warn" ? "text-orange-600" : tone === "good" ? "text-green-600" : ""}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <Icon className="h-8 w-8 text-primary/60" />
      </div>
    </CardContent>
  </Card>
);

// Rolling averages per fn for ETA estimation.
const avgDurationByFn = (runs: JobRun[]) => {
  const acc: Record<string, { total: number; n: number }> = {};
  for (const r of runs) {
    if (r.status === "success" && r.duration_ms) {
      acc[r.fn] ||= { total: 0, n: 0 };
      acc[r.fn].total += r.duration_ms;
      acc[r.fn].n += 1;
    }
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(acc)) out[k] = Math.round(acc[k].total / acc[k].n);
  return out;
};

const fmtDur = (ms: number | null) => {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
};

const StatusBadge = ({ s }: { s: JobRun["status"] }) => {
  const map = {
    queued: { v: "secondary", label: "queued" },
    running: { v: "default", label: "running" },
    success: { v: "default", label: "success" },
    failed: { v: "destructive", label: "failed" },
  } as const;
  return <Badge variant={map[s].v as any}>{map[s].label}</Badge>;
};

const ALL_FNS = [
  "seo-daily-publisher", "seo-queue-topup", "seo-book-kb-refresh",
  "seo-gsc-sync", "seo-post-publish-hook", "seo-social-captions",
  "seo-blog-agent", "seo-auto-run", "seo-rank-optimizer",
];

const AdminSeoCommand = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [gsc, setGsc] = useState<any>(null);
  const [kb, setKb] = useState<any[]>([]);
  const [runLog, setRunLog] = useState<any[]>([]);
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Filters ---------------------------------------------------------------
  const [fnFilter, setFnFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [logKeyword, setLogKeyword] = useState<string>("");

  const load = async () => {
    const [{ data: p }, { data: l }, { data: q }, { data: k }, { data: r }, { data: j }, { data: n }] = await Promise.all([
      supabase.from("posts").select("*").eq("post_type", "article").order("updated_at", { ascending: false }).limit(80),
      supabase.from("seo_agent_logs").select("*").order("run_at", { ascending: false }).limit(80),
      supabase.from("seo_keyword_queue").select("*").order("opportunity_score", { ascending: false }).limit(50),
      supabase.from("book_knowledge").select("book_id,title,topics,keywords,updated_at").order("updated_at", { ascending: false }),
      supabase.from("daily_run_log").select("*").order("started_at", { ascending: false }).limit(60),
      supabase.from("seo_job_runs").select("*").order("started_at", { ascending: false }).limit(200),
      supabase.from("seo_notifications").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPosts((p as Post[]) || []);
    setLogs(l || []);
    setQueue(q || []);
    setKb(k || []);
    setRunLog(r || []);
    setJobRuns((j as JobRun[]) || []);
    setNotifs((n as Notif[]) || []);
  };

  useEffect(() => { load(); }, []);

  // Realtime: refresh whenever job_runs or notifications change.
  useEffect(() => {
    const ch = supabase
      .channel("seo-cmd-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_job_runs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Poll every 5s while any job is running for smooth progress.
  useEffect(() => {
    const anyRunning = jobRuns.some((r) => r.status === "running" || r.status === "queued");
    if (!anyRunning) return;
    const t = setInterval(() => load(), 5000);
    return () => clearInterval(t);
  }, [jobRuns]);

  const call = async (fn: string, body: any = {}, label = fn) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      toast.success(`${label} complete`);
      return data;
    } catch (e: any) {
      toast.error(`${label} failed: ${e?.message || e}`);
    } finally { setBusy(null); }
  };

  const dispatch = async (fn: string, body: any = {}, label = fn, force = false) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke("seo-dispatch", {
        body: { fn, body, force },
      });
      if (error) throw error;
      if ((data as any)?.blocked) {
        const reason = (data as any).reason === "in_flight"
          ? "already running"
          : "already succeeded today";
        toast.warning(`${label} skipped — ${reason}. Use "Force run" to override.`);
      } else {
        toast.success(`${label} started — tracking on Job Status tab`);
      }
      setTimeout(() => { load().catch(() => {}); }, 2000);
      return data;
    } catch (e: any) {
      toast.error(`${label} failed to start: ${e?.message || e}`);
    } finally { setBusy(null); }
  };

  const syncGsc = () => dispatch("seo-gsc-sync", {}, "GSC sync");
  const runDaily = (force = false) => dispatch("seo-daily-publisher", {}, "Daily publisher", force);
  const refreshKb = (force = false) => dispatch("seo-book-kb-refresh", { force: true }, "Book KB refresh", force);
  const topUp = () => dispatch("seo-queue-topup", {}, "Queue top-up");
  const rankOptimize = (force = false) => dispatch("seo-rank-optimizer", { limit: 5 }, "Rank optimizer", force);
  const publishHook = async (id: string) => { await call("seo-post-publish-hook", { post_id: id }, "Publish hook"); await load(); };
  const genSocial = async (id: string) => { await call("seo-social-captions", { post_id: id }, "Social captions"); await load(); };

  // Filtering -------------------------------------------------------------
  const filteredJobRuns = useMemo(() => {
    return jobRuns.filter((r) => {
      if (fnFilter !== "all" && r.fn !== fnFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const t = new Date(r.started_at).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate && t > new Date(toDate).getTime() + 86_400_000) return false;
      return true;
    });
  }, [jobRuns, fnFilter, statusFilter, fromDate, toDate]);

  const filteredAgentLogs = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter && !(statusFilter === "failed" && l.status === "error")) return false;
      const t = new Date(l.created_at).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate && t > new Date(toDate).getTime() + 86_400_000) return false;
      if (logKeyword && !(l.focus_keyword || "").toLowerCase().includes(logKeyword.toLowerCase())) return false;
      return true;
    });
  }, [logs, statusFilter, fromDate, toDate, logKeyword]);

  const avgDur = useMemo(() => avgDurationByFn(jobRuns), [jobRuns]);
  const activeJobs = jobRuns.filter((r) => r.status === "running" || r.status === "queued");
  const unread = notifs.filter((n) => !n.read_at);

  const markAllRead = async () => {
    if (unread.length === 0) return;
    await supabase.from("seo_notifications").update({ read_at: new Date().toISOString() })
      .in("id", unread.map((n) => n.id));
    load();
  };

  const scheduled = posts
    .filter((p) => p.publish_status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const published = posts.filter((p) => p.is_published);
  const drafts = posts.filter((p) => p.publish_status === "draft");
  const totalClicks = published.reduce((s, p) => s + (p.gsc_clicks || 0), 0);
  const totalImpr = published.reduce((s, p) => s + (p.gsc_impressions || 0), 0);
  const avgPos = published.filter((p) => p.gsc_position).reduce((s, p, _, arr) => s + (p.gsc_position || 0) / arr.length, 0);
  const kbAge = kb[0]?.updated_at ? Math.round((Date.now() - new Date(kb[0].updated_at).getTime()) / 3600000) : null;
  const queueBelowMin = scheduled.length < 30;

  return (
    <div className="space-y-6 notranslate" translate="no">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">SEO Command Center</h1>
          <p className="text-muted-foreground text-sm">
            Daily blog automation — runs at 09:00 IST · maintains 30+ scheduled queue · book-grounded
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <NotificationBell notifs={notifs} unread={unread.length} onRead={markAllRead} />
          <Button onClick={() => runDaily(false)} disabled={!!busy} size="sm">
            {busy === "Daily publisher" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Run Daily
          </Button>
          <Button onClick={topUp} disabled={!!busy} size="sm" variant="secondary">
            {busy === "Queue top-up" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />} Top-up Queue
          </Button>
          <Button onClick={() => refreshKb(false)} disabled={!!busy} size="sm" variant="outline">
            {busy === "Book KB refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Refresh Book KB
          </Button>
          <Button onClick={() => rankOptimize(false)} disabled={!!busy} size="sm" variant="secondary">
            {busy === "Rank optimizer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} Rank Optimizer
          </Button>
          <Button onClick={syncGsc} disabled={!!busy} variant="outline" size="sm">
            {busy === "GSC sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Sync GSC
          </Button>

        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Scheduled Blogs" value={scheduled.length}
          sub={queueBelowMin ? `Below 30 — top-up runs every 6h` : "Healthy queue (≥30)"}
          tone={queueBelowMin ? "warn" : "good"} />
        <StatCard icon={BookOpen} label="Book Knowledge" value={kb.length}
          sub={kbAge !== null ? `Updated ${kbAge}h ago` : "Not built yet"}
          tone={kb.length === 0 ? "warn" : "good"} />
        <StatCard icon={MousePointerClick} label="GSC Clicks (28d)" value={totalClicks} sub={`${totalImpr} impressions`} />
        <StatCard icon={Target} label="Avg Position" value={avgPos ? avgPos.toFixed(1) : "—"} sub={`${published.length} published · ${drafts.length} drafts`} />
      </div>

      <SeoFlowChart runLog={runLog} posts={posts} busy={busy} onRunDaily={() => runDaily(false)} />

      <Tabs defaultValue="jobs">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="jobs">
            Job Status {activeJobs.length > 0 && <Badge variant="default" className="ml-2">{activeJobs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="runs">Daily Runs ({runLog.length})</TabsTrigger>
          <TabsTrigger value="kb">Book KB ({kb.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
          <TabsTrigger value="queue">Keyword Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="logs">Agent Logs</TabsTrigger>
          <TabsTrigger value="gsc">GSC</TabsTrigger>
        </TabsList>

        {/* ---------------- Job Status ---------------- */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live Job Status
            </CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs currently running. Start one from the buttons above.</p>
              ) : (
                <div className="space-y-3">
                  {activeJobs.map((r) => {
                    const elapsed = Date.now() - new Date(r.started_at).getTime();
                    const est = avgDur[r.fn];
                    const pct = est ? Math.min(99, Math.round((elapsed / est) * 100)) : null;
                    const remaining = est ? Math.max(0, est - elapsed) : null;
                    return (
                      <div key={r.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="font-medium">{r.fn}</span>
                            <StatusBadge s={r.status} />
                            {r.attempt > 1 && <Badge variant="outline">attempt {r.attempt}/{r.max_attempts}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started {new Date(r.started_at).toLocaleTimeString()} · {fmtDur(elapsed)} elapsed
                            {remaining !== null && ` · ~${fmtDur(remaining)} remaining`}
                          </div>
                        </div>
                        {pct !== null ? (
                          <Progress value={pct} />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No baseline yet — first run in progress.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <FilterBar
                fnFilter={fnFilter} setFnFilter={setFnFilter}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                fromDate={fromDate} setFromDate={setFromDate}
                toDate={toDate} setToDate={setToDate}
                statuses={["queued", "running", "success", "failed"]}
              />

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Status</TableHead><TableHead>Function</TableHead>
                    <TableHead>Started</TableHead><TableHead>Duration</TableHead>
                    <TableHead>Attempt</TableHead><TableHead>Error</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredJobRuns.slice(0, 100).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><StatusBadge s={r.status} /></TableCell>
                        <TableCell className="font-mono text-xs">{r.fn}</TableCell>
                        <TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{fmtDur(r.duration_ms)}</TableCell>
                        <TableCell className="text-xs">{r.attempt}/{r.max_attempts}</TableCell>
                        <TableCell className="text-xs text-red-600 max-w-[280px] truncate" title={r.error || ""}>
                          {r.error || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredJobRuns.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        No job runs match filters.
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card><CardContent className="pt-6">
            {queueBelowMin && (
              <div className="mb-3 rounded-md border border-orange-200 bg-orange-50 text-orange-900 p-3 text-sm">
                Queue is below 30. Auto top-up runs every 6h — or click "Top-up Queue" to generate now.
              </div>
            )}
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Time (IST)</TableHead><TableHead>Keyword / Title</TableHead>
                <TableHead>SEO Score</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {scheduled.map((p) => {
                  const d = new Date(p.scheduled_at!);
                  const ist = new Date(d.getTime() + (5.5 * 3600 * 1000 - d.getTimezoneOffset() * 60000));
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{ist.toISOString().slice(0, 10)}</TableCell>
                      <TableCell>{ist.toISOString().slice(11, 16)}</TableCell>
                      <TableCell className="max-w-[380px]">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.primary_keyword || `/${p.slug}`}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={((p.content_score || 0) >= 70) ? "default" : "secondary"}>
                          {p.content_score ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">scheduled</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {scheduled.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No upcoming posts. Top-up runs every 6h.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ---------------- Daily Runs (filtered) ---------------- */}
        <TabsContent value="runs">
          <Card><CardContent className="pt-6 space-y-3">
            <FilterBar
              fnFilter={fnFilter} setFnFilter={setFnFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              fromDate={fromDate} setFromDate={setFromDate}
              toDate={toDate} setToDate={setToDate}
              statuses={["success", "failed", "running"]}
              hideFn
            />
            <Table>
              <TableHeader><TableRow>
                <TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead>Keyword</TableHead>
                <TableHead>SEO</TableHead><TableHead>Readability</TableHead><TableHead>Originality</TableHead>
                <TableHead>Post</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {runLog
                  .filter((r) => {
                    if (statusFilter !== "all" && r.status !== statusFilter) return false;
                    const t = new Date(r.started_at).getTime();
                    if (fromDate && t < new Date(fromDate).getTime()) return false;
                    if (toDate && t > new Date(toDate).getTime() + 86_400_000) return false;
                    return true;
                  })
                  .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.keyword || "—"}</TableCell>
                    <TableCell>{r.seo_score ?? "—"}</TableCell>
                    <TableCell>{r.readability_score ? r.readability_score.toFixed(0) : "—"}</TableCell>
                    <TableCell>{r.originality_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.post_id ? "✓" : (r.error || "—")}</TableCell>
                  </TableRow>
                ))}
                {runLog.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No runs yet. Click "Run Daily" or wait for 09:00 IST.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kb">
          <Card><CardContent className="pt-6">
            {kb.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Knowledge base not built yet. Click "Refresh Book KB" — the AI reads all books and extracts topics,
                entities, concepts, keywords and FAQs used to ground every generated article.
              </p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Book</TableHead><TableHead>Topics</TableHead>
                  <TableHead>Keywords</TableHead><TableHead>Updated</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {kb.map((k: any) => (
                    <TableRow key={k.book_id}>
                      <TableCell className="font-medium max-w-[300px] truncate">{k.title}</TableCell>
                      <TableCell className="text-xs">{(k.topics || []).slice(0, 5).join(", ")}</TableCell>
                      <TableCell className="text-xs">{(k.keywords || []).length}</TableCell>
                      <TableCell className="text-xs">{new Date(k.updated_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="published">
          <Card><CardContent className="pt-6">
            <PostTable posts={published} onPublishHook={publishHook} onGenSocial={genSocial} busy={busy} showMetrics />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card><CardContent className="pt-6">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No keywords in queue yet.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Keyword</TableHead><TableHead>Intent</TableHead><TableHead>Volume</TableHead>
                  <TableHead>Difficulty</TableHead><TableHead>Opportunity</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {queue.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.keyword}</TableCell>
                      <TableCell>{k.search_intent || "—"}</TableCell>
                      <TableCell>{k.estimated_volume || "—"}</TableCell>
                      <TableCell>{k.keyword_difficulty || "—"}</TableCell>
                      <TableCell>{k.opportunity_score?.toFixed?.(1) || "—"}</TableCell>
                      <TableCell><Badge variant={k.status === "used" ? "default" : "secondary"}>{k.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* ---------------- Agent Logs (filtered) ---------------- */}
        <TabsContent value="logs">
          <Card><CardContent className="pt-6 space-y-3">
            <FilterBar
              fnFilter={fnFilter} setFnFilter={setFnFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              fromDate={fromDate} setFromDate={setFromDate}
              toDate={toDate} setToDate={setToDate}
              statuses={["success", "error", "failed"]}
              keyword={logKeyword} setKeyword={setLogKeyword}
              hideFn
            />
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Keyword</TableHead><TableHead>Slug</TableHead>
                <TableHead>Status</TableHead><TableHead>Time</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredAgentLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                    <TableCell>{l.focus_keyword || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{l.slug || "—"}</TableCell>
                    <TableCell><Badge variant={l.status === "error" ? "destructive" : "default"}>{l.status}</Badge></TableCell>
                    <TableCell>{l.execution_ms ? `${(l.execution_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                  </TableRow>
                ))}
                {filteredAgentLogs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No logs match filters.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="gsc">
          <Card><CardHeader><CardTitle>Google Search Console (28d)</CardTitle></CardHeader><CardContent>
            {!gsc ? <p className="text-sm text-muted-foreground">Click "Sync GSC" to fetch fresh data.</p> : (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><b>{gsc.totals?.clicks || 0}</b> clicks</div>
                  <div><b>{gsc.totals?.impressions || 0}</b> impressions</div>
                  <div><b>{((gsc.totals?.ctr || 0) * 100).toFixed(2)}%</b> CTR</div>
                  <div><b>{(gsc.totals?.position || 0).toFixed(1)}</b> avg pos</div>
                </div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const FilterBar = ({
  fnFilter, setFnFilter, statusFilter, setStatusFilter,
  fromDate, setFromDate, toDate, setToDate,
  statuses, keyword, setKeyword, hideFn,
}: {
  fnFilter: string; setFnFilter: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  fromDate: string; setFromDate: (v: string) => void;
  toDate: string; setToDate: (v: string) => void;
  statuses: string[];
  keyword?: string; setKeyword?: (v: string) => void;
  hideFn?: boolean;
}) => (
  <div className="flex flex-wrap items-end gap-2">
    {!hideFn && (
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Command</label>
        <Select value={fnFilter} onValueChange={setFnFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All commands</SelectItem>
            {ALL_FNS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )}
    <div>
      <label className="text-xs text-muted-foreground block mb-1">Status</label>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div>
      <label className="text-xs text-muted-foreground block mb-1">From</label>
      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[150px]" />
    </div>
    <div>
      <label className="text-xs text-muted-foreground block mb-1">To</label>
      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[150px]" />
    </div>
    {setKeyword && (
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Keyword</label>
        <Input value={keyword || ""} onChange={(e) => setKeyword(e.target.value)} placeholder="filter…" className="w-[180px]" />
      </div>
    )}
    <Button variant="ghost" size="sm" onClick={() => {
      setFnFilter("all"); setStatusFilter("all"); setFromDate(""); setToDate("");
      setKeyword?.("");
    }}>Clear</Button>
  </div>
);

const NotificationBell = ({
  notifs, unread, onRead,
}: { notifs: Notif[]; unread: number; onRead: () => void }) => (
  <Popover onOpenChange={(o) => { if (o) onRead(); }}>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="relative">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-96 p-0" align="end">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-semibold text-sm">Job notifications</span>
        <span className="text-xs text-muted-foreground">{notifs.length} recent</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {notifs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No notifications yet.</p>
        ) : notifs.map((n) => (
          <div key={n.id} className={`p-3 border-b text-sm ${!n.read_at ? "bg-muted/30" : ""}`}>
            <div className="flex items-start gap-2">
              {n.level === "success" ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                : n.level === "error" ? <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                : <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{n.title}</div>
                {n.message && <div className="text-xs text-muted-foreground mt-0.5 break-words">{n.message}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

const PostTable = ({ posts, onPublishHook, onGenSocial, busy, showMetrics }: any) => (
  <Table>
    <TableHeader><TableRow>
      <TableHead>Title</TableHead><TableHead>Keyword</TableHead>
      {showMetrics && <><TableHead>Clicks</TableHead><TableHead>Impr</TableHead><TableHead>Pos</TableHead></>}
      <TableHead>When</TableHead><TableHead>Report</TableHead><TableHead>Actions</TableHead>
    </TableRow></TableHeader>
    <TableBody>
      {posts.map((p: Post) => (
        <TableRow key={p.id}>
          <TableCell className="max-w-[280px]"><div className="truncate font-medium">{p.title}</div><div className="text-xs text-muted-foreground">/{p.slug}</div></TableCell>
          <TableCell>{p.primary_keyword || "—"}</TableCell>
          {showMetrics && <>
            <TableCell>{p.gsc_clicks}</TableCell>
            <TableCell>{p.gsc_impressions}</TableCell>
            <TableCell>{p.gsc_position?.toFixed(1) || "—"}</TableCell>
          </>}
          <TableCell className="text-xs">{new Date(p.scheduled_at || p.updated_at).toLocaleString()}</TableCell>
          <TableCell>{p.report_sent_at ? <Badge>sent</Badge> : <Badge variant="outline">pending</Badge>}</TableCell>
          <TableCell><div className="flex gap-1">
            <Button size="sm" variant="ghost" title="Send report + submit to GSC" onClick={() => onPublishHook(p.id)} disabled={!!busy}><Mail className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" title="Generate social captions" onClick={() => onGenSocial(p.id)} disabled={!!busy}><Send className="h-3 w-3" /></Button>
          </div></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default AdminSeoCommand;
