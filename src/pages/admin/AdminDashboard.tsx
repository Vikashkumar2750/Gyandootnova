import { useEffect, useMemo, useState } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BookOpen, FileText, Heart, ShoppingCart, Users, MessageSquare, TrendingUp,
  AlertTriangle, Download, CalendarIcon, BookMarked, Percent, Bug, ChevronDown,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format, subDays, startOfDay, differenceInDays, eachDayOfInterval } from "date-fns";
import DbStorageCard from "@/components/admin/DbStorageCard";
import StorageDetailsPanel from "@/components/admin/StorageDetailsPanel";
import TableDownloadsPanel from "@/components/admin/TableDownloadsPanel";


interface DateRange { from: Date; to: Date; label: string; }

function bucketByDay<T extends { created_at: string }>(rows: T[], range: DateRange) {
  const days = eachDayOfInterval({ start: startOfDay(range.from), end: startOfDay(range.to) });
  const buckets: Record<string, number> = {};
  days.forEach((d) => { buckets[format(d, "MMM d")] = 0; });
  rows.forEach((r) => {
    const key = format(new Date(r.created_at), "MMM d");
    if (key in buckets) buckets[key] += 1;
  });
  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}
function sumByDay<T extends { created_at: string; amount: number }>(rows: T[], range: DateRange) {
  const days = eachDayOfInterval({ start: startOfDay(range.from), end: startOfDay(range.to) });
  const buckets: Record<string, number> = {};
  days.forEach((d) => { buckets[format(d, "MMM d")] = 0; });
  rows.forEach((r) => {
    const key = format(new Date(r.created_at), "MMM d");
    if (key in buckets) buckets[key] += Number(r.amount) || 0;
  });
  return Object.entries(buckets).map(([date, amount]) => ({ date, amount }));
}
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) { toast.error("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} rows`);
}

// Helper: throw on supabase error so useQuery.error is populated
async function sb<T>(promise: Promise<{ data: T; error: any; count?: number | null }>, name: string) {
  const res = await promise;
  if (res.error) {
    console.error(`[AdminDashboard] ${name} failed:`, res.error);
    throw new Error(`${res.error.code ?? "ERR"}: ${res.error.message}`);
  }
  console.log(`[AdminDashboard] ${name} → ${Array.isArray(res.data) ? res.data.length : (res.count ?? 0)} rows`);
  return res;
}

// Per-chart status overlay
const ChartStatus = ({ q, empty }: { q: UseQueryResult<any>; empty?: boolean }) => {
  if (q.isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm text-xs text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/5 text-xs text-destructive gap-1 p-3 text-center">
        <XCircle className="h-4 w-4" />
        <div className="font-semibold">Query failed</div>
        <div className="opacity-80">{(q.error as Error).message}</div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        No data in this range
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { user, isAdmin, session } = useAuth();

  const [preset, setPreset] = useState<string>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showDebug, setShowDebug] = useState(false);
  const [rpcRoleCheck, setRpcRoleCheck] = useState<{ ok: boolean; msg: string } | null>(null);

  const range: DateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo, label: `${format(customFrom, "MMM d")} – ${format(customTo, "MMM d")}` };
    }
    const days = parseInt(preset, 10) || 30;
    const to = new Date();
    const from = subDays(to, days - 1);
    return { from, to, label: `Last ${days} days` };
  }, [preset, customFrom, customTo]);

  const sinceIso = startOfDay(range.from).toISOString();
  const untilIso = range.to.toISOString();
  const dayCount = differenceInDays(range.to, range.from) + 1;

  // Decode JWT claims for the debug panel (no signature check — display only)
  const jwtClaims = useMemo(() => {
    const token = session?.access_token;
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      return { role: json.role, aud: json.aud, sub: json.sub, exp: json.exp };
    } catch { return null; }
  }, [session]);

  // Verify admin role via RPC on mount / user change
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) setRpcRoleCheck({ ok: false, msg: error.message });
      else setRpcRoleCheck({ ok: !!data, msg: data ? "has_role(admin) = true" : "has_role(admin) = false" });
    })();
  }, [user]);

  // Realtime SEO alert notifications
  useEffect(() => {
    const channel = supabase.channel("admin-seo-alerts").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "seo_agent_alerts" },
      (payload: any) => {
        const row = payload.new;
        const severity = row.severity ?? "info";
        const message = row.message ?? row.error_type ?? "New SEO alert";
        if (severity === "critical" || severity === "high") toast.error(`SEO Alert (${severity}): ${message}`, { duration: 10000 });
        else toast.warning(`SEO Alert (${severity}): ${message}`, { duration: 6000 });
      },
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ---- Queries (each throws on error → q.error is populated) ----
  const qStats = useQuery({
    queryKey: ["admin-stats", sinceIso, untilIso],
    queryFn: async () => {
      const [books, posts, donations, purchases, users, enquiries] = await Promise.all([
        sb(supabase.from("books").select("id", { count: "exact", head: true }) as any, "books.count"),
        sb(supabase.from("posts").select("id", { count: "exact", head: true }) as any, "posts.count"),
        sb(supabase.from("donations").select("amount").eq("status", "completed") as any, "donations.completed"),
        sb(supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "completed") as any, "purchases.completed"),
        sb(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceIso).lte("created_at", untilIso) as any, "profiles.new"),
        sb(supabase.from("contact_enquiries").select("id", { count: "exact", head: true }).gte("created_at", sinceIso).lte("created_at", untilIso) as any, "contact_enquiries.new"),
      ]);
      return {
        bookCount: (books as any).count ?? 0,
        postCount: (posts as any).count ?? 0,
        totalDonations: ((donations as any).data ?? []).reduce((s: number, d: any) => s + Number(d.amount), 0),
        purchaseCount: (purchases as any).count ?? 0,
        newUsers: (users as any).count ?? 0,
        newEnquiries: (enquiries as any).count ?? 0,
      };
    },
  });
  const stats = qStats.data;

  const qRevenue = useQuery({
    queryKey: ["admin-revenue", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(
        supabase.from("purchases").select("created_at, book_id, books(price, is_free, title)").eq("status", "completed").gte("created_at", sinceIso).lte("created_at", untilIso) as any,
        "purchases.range",
      );
      const rows = ((res as any).data ?? []).map((p: any) => ({
        created_at: p.created_at,
        amount: p.books?.is_free ? 0 : Number(p.books?.price ?? 0),
      }));
      return { daily: sumByDay(rows, range), purchasesDaily: bucketByDay(rows, range), total: rows.reduce((s: number, r: any) => s + r.amount, 0), rowCount: rows.length };
    },
  });
  const revenueData = qRevenue.data;

  const qTopBooks = useQuery({
    queryKey: ["admin-top-books", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(
        supabase.from("purchases").select("book_id, books(title)").eq("status", "completed").gte("created_at", sinceIso).lte("created_at", untilIso) as any,
        "purchases.top-books",
      );
      const counts: Record<string, { title: string; count: number }> = {};
      ((res as any).data ?? []).forEach((p: any) => {
        const title = p.books?.title ?? "Unknown";
        counts[title] = counts[title] || { title, count: 0 };
        counts[title].count += 1;
      });
      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    },
  });

  const qSignups = useQuery({
    queryKey: ["admin-signups", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(supabase.from("profiles").select("created_at").gte("created_at", sinceIso).lte("created_at", untilIso) as any, "profiles.signups");
      return bucketByDay((res as any).data ?? [], range);
    },
  });

  const qEnquiries = useQuery({
    queryKey: ["admin-enquiries", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(supabase.from("contact_enquiries").select("created_at").gte("created_at", sinceIso).lte("created_at", untilIso) as any, "contact_enquiries.range");
      return bucketByDay((res as any).data ?? [], range);
    },
  });

  const qDonations = useQuery({
    queryKey: ["admin-donations", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(supabase.from("donations").select("created_at, amount").eq("status", "completed").gte("created_at", sinceIso).lte("created_at", untilIso) as any, "donations.range");
      return sumByDay((res as any).data ?? [], range);
    },
  });

  const qEngagement = useQuery({
    queryKey: ["admin-engagement", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(
        supabase.from("reading_progress").select("user_id, book_id, chapter_id, scroll_percent, updated_at, books(title)").gte("updated_at", sinceIso).lte("updated_at", untilIso) as any,
        "reading_progress.range",
      );
      const rows = (res as any).data ?? [];
      const totalRecords = rows.length;
      const uniqueReaders = new Set(rows.map((r: any) => r.user_id)).size;
      const avgScroll = totalRecords ? Math.round(rows.reduce((s: number, r: any) => s + (r.scroll_percent ?? 0), 0) / totalRecords) : 0;
      const completed = rows.filter((r: any) => (r.scroll_percent ?? 0) >= 90).length;
      const completionRate = totalRecords ? Math.round((completed / totalRecords) * 100) : 0;
      const chaptersByUser: Record<string, Set<string>> = {};
      rows.forEach((r: any) => { chaptersByUser[r.user_id] = chaptersByUser[r.user_id] || new Set(); chaptersByUser[r.user_id].add(r.chapter_id); });
      const chapterCounts = Object.values(chaptersByUser).map((s) => s.size);
      const avgChapters = chapterCounts.length ? Math.round((chapterCounts.reduce((a, b) => a + b, 0) / chapterCounts.length) * 10) / 10 : 0;
      const bookReaders: Record<string, { title: string; readers: Set<string> }> = {};
      rows.forEach((r: any) => {
        const title = r.books?.title ?? "Unknown";
        bookReaders[title] = bookReaders[title] || { title, readers: new Set() };
        bookReaders[title].readers.add(r.user_id);
      });
      const topRead = Object.values(bookReaders).map((c) => ({ title: c.title, count: c.readers.size })).sort((a, b) => b.count - a.count).slice(0, 5);
      return { totalRecords, uniqueReaders, avgScroll, completionRate, avgChapters, topRead };
    },
  });
  const engagement = qEngagement.data;

  const qSeoAlerts = useQuery({
    queryKey: ["admin-seo-alerts", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(
        supabase.from("seo_agent_alerts").select("id, created_at, severity, error_type, message, provider, http_status").gte("created_at", sinceIso).lte("created_at", untilIso).order("created_at", { ascending: false }).limit(50) as any,
        "seo_agent_alerts",
      );
      return (res as any).data ?? [];
    },
  });
  const seoAlerts = qSeoAlerts.data;

  const seoSeverity = useMemo(() => {
    const counts: Record<string, number> = {};
    (seoAlerts ?? []).forEach((r: any) => { counts[r.severity] = (counts[r.severity] ?? 0) + 1; });
    return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
  }, [seoAlerts]);

  const qSeoRuns = useQuery({
    queryKey: ["admin-seo-runs", sinceIso, untilIso],
    queryFn: async () => {
      const res = await sb(
        supabase.from("seo_agent_logs").select("id, run_at, topic, focus_keyword, action, status, slug").gte("run_at", sinceIso).lte("run_at", untilIso).order("run_at", { ascending: false }).limit(50) as any,
        "seo_agent_logs",
      );
      return (res as any).data ?? [];
    },
  });
  const seoRuns = qSeoRuns.data;

  const qLsi = useQuery({
    queryKey: ["admin-lsi-stats"],
    queryFn: async () => {
      const [total, active] = await Promise.all([
        sb(supabase.from("lsi_keywords").select("id", { count: "exact", head: true }) as any, "lsi_keywords.total"),
        sb(supabase.from("lsi_keywords").select("id", { count: "exact", head: true }).eq("is_active", true) as any, "lsi_keywords.active"),
      ]);
      return { total: (total as any).count ?? 0, active: (active as any).count ?? 0 };
    },
  });
  const lsiStats = qLsi.data;

  // Debug summary list
  const debugQueries: { name: string; q: UseQueryResult<any>; rows: number | string }[] = [
    { name: "stats (KPIs)", q: qStats, rows: stats ? `books=${stats.bookCount}, posts=${stats.postCount}, purchases=${stats.purchaseCount}, newUsers=${stats.newUsers}` : "—" },
    { name: "revenue / purchases", q: qRevenue, rows: revenueData?.rowCount ?? "—" },
    { name: "top-books", q: qTopBooks, rows: qTopBooks.data?.length ?? "—" },
    { name: "signups (profiles)", q: qSignups, rows: (qSignups.data ?? []).reduce((s: number, r: any) => s + r.count, 0) },
    { name: "enquiries", q: qEnquiries, rows: (qEnquiries.data ?? []).reduce((s: number, r: any) => s + r.count, 0) },
    { name: "donations", q: qDonations, rows: (qDonations.data ?? []).length },
    { name: "engagement (reading_progress)", q: qEngagement, rows: engagement?.totalRecords ?? "—" },
    { name: "seo_agent_alerts", q: qSeoAlerts, rows: seoAlerts?.length ?? "—" },
    { name: "seo_agent_logs", q: qSeoRuns, rows: seoRuns?.length ?? "—" },
    { name: "lsi_keywords", q: qLsi, rows: lsiStats ? `${lsiStats.active}/${lsiStats.total} active` : "—" },
  ];

  const kpis = [
    { label: "Books", value: stats?.bookCount ?? 0, icon: BookOpen, color: "text-primary" },
    { label: "Posts", value: stats?.postCount ?? 0, icon: FileText, color: "text-blue-600" },
    { label: "Total Purchases", value: stats?.purchaseCount ?? 0, icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Donations (all-time)", value: `₹${(stats?.totalDonations ?? 0).toLocaleString("en-IN")}`, icon: Heart, color: "text-rose-600" },
    { label: `Revenue (${dayCount}d)`, value: `₹${Math.round(revenueData?.total ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-primary" },
    { label: `New Users`, value: stats?.newUsers ?? 0, icon: Users, color: "text-indigo-600" },
    { label: `New Enquiries`, value: stats?.newEnquiries ?? 0, icon: MessageSquare, color: "text-amber-600" },
    { label: "Active LSI Keywords", value: lsiStats?.active ?? 0, icon: FileText, color: "text-teal-600" },
  ];

  const severityColor = (s: string) => {
    if (s === "critical" || s === "high") return "destructive" as const;
    if (s === "medium") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time analytics · {range.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ key: "7", label: "7d" }, { key: "30", label: "30d" }, { key: "90", label: "90d" }, { key: "365", label: "1y" }].map((p) => (
            <Button key={p.key} size="sm" variant={preset === p.key ? "default" : "outline"} onClick={() => setPreset(p.key)}>{p.label}</Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant={preset === "custom" ? "default" : "outline"} className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {preset === "custom" && customFrom && customTo ? `${format(customFrom, "MMM d")}–${format(customTo, "MMM d")}` : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <div className="text-xs font-medium">From</div>
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className={cn("p-0 pointer-events-auto")} />
                <div className="text-xs font-medium">To</div>
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className={cn("p-0 pointer-events-auto")} />
                <Button size="sm" className="w-full" disabled={!customFrom || !customTo} onClick={() => setPreset("custom")}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant={showDebug ? "default" : "outline"} onClick={() => setShowDebug((v) => !v)} className="gap-1">
            <Bug className="h-4 w-4" /> Debug
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bug className="h-4 w-4" /> Query & Auth Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border p-3 space-y-1">
                <div className="font-semibold mb-1">Auth session</div>
                <div>user.id: <span className="font-mono">{user?.id ?? "—"}</span></div>
                <div>email: <span className="font-mono">{user?.email ?? "—"}</span></div>
                <div>useAuth.isAdmin: {isAdmin ? <Badge variant="default">true</Badge> : <Badge variant="destructive">false</Badge>}</div>
                <div>has_role(admin) RPC: {rpcRoleCheck ? (rpcRoleCheck.ok ? <Badge variant="default">true</Badge> : <Badge variant="destructive">false</Badge>) : "checking…"} <span className="text-muted-foreground">{rpcRoleCheck?.msg}</span></div>
              </div>
              <div className="rounded border p-3 space-y-1">
                <div className="font-semibold mb-1">JWT claims</div>
                <div>role: <span className="font-mono">{jwtClaims?.role ?? "—"}</span> {jwtClaims?.role === "authenticated" ? <Badge variant="secondary">expected</Badge> : jwtClaims && <Badge variant="destructive">unexpected</Badge>}</div>
                <div>aud: <span className="font-mono">{jwtClaims?.aud ?? "—"}</span></div>
                <div>sub: <span className="font-mono">{jwtClaims?.sub ?? "—"}</span></div>
                <div>exp: <span className="font-mono">{jwtClaims?.exp ? format(new Date(jwtClaims.exp * 1000), "MMM d, HH:mm") : "—"}</span></div>
                <div className="text-muted-foreground pt-1">Note: Supabase JWT role = "authenticated". App-level admin comes from user_roles table via has_role().</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1 pr-3">Query</th>
                    <th className="pb-1 pr-3">Status</th>
                    <th className="pb-1 pr-3">Rows / Result</th>
                    <th className="pb-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {debugQueries.map((r) => (
                    <tr key={r.name} className="border-b">
                      <td className="py-1 pr-3 font-mono">{r.name}</td>
                      <td className="py-1 pr-3">
                        {r.q.isLoading ? <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />loading</Badge>
                          : r.q.error ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />error</Badge>
                          : <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />ok</Badge>}
                      </td>
                      <td className="py-1 pr-3 font-mono">{String(r.rows)}</td>
                      <td className="py-1 text-destructive">{r.q.error ? (r.q.error as Error).message : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">Also check the browser console — every query logs its row count with the <code>[AdminDashboard]</code> prefix.</p>
          </CardContent>
        </Card>
      )}

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qStats.isLoading ? "…" : c.value}</div>
              {qStats.error && <div className="text-xs text-destructive mt-1">Failed to load</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <DbStorageCard />

      <Tabs defaultValue="business" className="w-full">

        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="content">Content & Readers</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="storage">Space & Storage</TabsTrigger>
          <TabsTrigger value="downloads">Table Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="storage" className="mt-6">
          <StorageDetailsPanel />
        </TabsContent>

        <TabsContent value="downloads" className="mt-6">
          <TableDownloadsPanel />
        </TabsContent>

        <TabsContent value="business" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Daily Revenue (₹)</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData?.daily ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <ChartStatus q={qRevenue} empty={!revenueData?.total} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Daily Purchases</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData?.purchasesDaily ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartStatus q={qRevenue} empty={!revenueData?.rowCount} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>New Signups per Day</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qSignups.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <ChartStatus q={qSignups} empty={!(qSignups.data ?? []).some((r: any) => r.count > 0)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Contact Enquiries per Day</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qEnquiries.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartStatus q={qEnquiries} empty={!(qEnquiries.data ?? []).some((r: any) => r.count > 0)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Donations Trend (₹)</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qDonations.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <ChartStatus q={qDonations} empty={!(qDonations.data ?? []).some((r: any) => r.amount > 0)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top 5 Best-Selling Books</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qTopBooks.data ?? []} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartStatus q={qTopBooks} empty={!(qTopBooks.data ?? []).length} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6 mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Readers</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qEngagement.isLoading ? "…" : (engagement?.uniqueReaders ?? 0)}</div>
                {qEngagement.error && <div className="text-xs text-destructive mt-1">{(qEngagement.error as Error).message}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Scroll Depth</CardTitle>
                <Percent className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{qEngagement.isLoading ? "…" : `${engagement?.avgScroll ?? 0}%`}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate (≥90%)</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{qEngagement.isLoading ? "…" : `${engagement?.completionRate ?? 0}%`}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Chapters / Reader</CardTitle>
                <BookMarked className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{qEngagement.isLoading ? "…" : (engagement?.avgChapters ?? 0)}</div></CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Most-Read Books (Unique Readers)</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagement?.topRead ?? []} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartStatus q={qEngagement} empty={!(engagement?.topRead ?? []).length} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Content Library</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Books</span><span className="font-semibold">{stats?.bookCount ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Posts</span><span className="font-semibold">{stats?.postCount ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">LSI Keywords (Total)</span><span className="font-semibold">{lsiStats?.total ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">LSI Keywords (Active)</span><span className="font-semibold">{lsiStats?.active ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reading Records ({range.label})</span><span className="font-semibold">{engagement?.totalRecords ?? 0}</span></div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                  Note: "Reading time" tracking requires session event logging. Current metrics use scroll depth & chapter access as engagement proxies.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>SEO Alerts by Severity</CardTitle></CardHeader>
              <CardContent className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seoSeverity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartStatus q={qSeoAlerts} empty={!seoSeverity.length} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">Recent SEO Alerts <AlertTriangle className="h-4 w-4 text-amber-600" /></CardTitle>
                <Button size="sm" variant="outline" onClick={() => downloadCSV(`seo-alerts-${format(new Date(), "yyyy-MM-dd")}.csv`, seoAlerts ?? [])}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {qSeoAlerts.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                  : qSeoAlerts.error ? <p className="text-sm text-destructive">Error: {(qSeoAlerts.error as Error).message}</p>
                  : seoAlerts && seoAlerts.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {seoAlerts.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="border rounded p-2 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={severityColor(a.severity)}>{a.severity}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                          {a.provider && <span className="text-xs text-muted-foreground">· {a.provider}</span>}
                        </div>
                        <div className="text-xs"><strong>{a.error_type}:</strong> {a.message}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No SEO alerts in this range.</p>}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent SEO Agent Runs</CardTitle>
                <Button size="sm" variant="outline" onClick={() => downloadCSV(`seo-runs-${format(new Date(), "yyyy-MM-dd")}.csv`, seoRuns ?? [])}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {qSeoRuns.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                  : qSeoRuns.error ? <p className="text-sm text-destructive">Error: {(qSeoRuns.error as Error).message}</p>
                  : seoRuns && seoRuns.length > 0 ? (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2">Time</th><th className="pb-2">Topic</th><th className="pb-2">Focus Keyword</th><th className="pb-2">Action</th><th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seoRuns.map((r: any) => (
                          <tr key={r.id} className="border-b">
                            <td className="py-2 text-xs text-muted-foreground">{format(new Date(r.run_at), "MMM d, HH:mm")}</td>
                            <td className="py-2">{r.topic ?? "—"}</td>
                            <td className="py-2">{r.focus_keyword ?? "—"}</td>
                            <td className="py-2">{r.action ?? "—"}</td>
                            <td className="py-2">
                              <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status ?? "—"}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-muted-foreground">No SEO agent runs in this range.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
