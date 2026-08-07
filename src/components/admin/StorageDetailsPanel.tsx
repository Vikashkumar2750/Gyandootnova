import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Database, RefreshCcw, Loader2, HardDrive, Server, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type Stats = {
  database_size_bytes: number;
  tables: { table: string; size_bytes: number; row_estimate: number }[];
  buckets: { bucket: string; objects: number; size_bytes: number }[];
  generated_at: string;
};

// Lovable Cloud free-tier soft caps (display only)
const DB_CAP_BYTES = 500 * 1024 * 1024;
const STORAGE_CAP_BYTES = 1024 * 1024 * 1024;

const fmt = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const toneClass = (pct: number) =>
  pct >= 85 ? "text-red-600" : pct >= 70 ? "text-orange-600" : "text-green-600";

const StorageDetailsPanel = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_db_storage_stats");
      if (error) throw error;
      setStats(data as Stats);
    } catch (e: any) {
      toast.error(`Failed to load storage stats: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const dbUsed = stats?.database_size_bytes || 0;
  const dbPct = Math.min(100, Math.round((dbUsed / DB_CAP_BYTES) * 100));
  const dbFree = Math.max(0, DB_CAP_BYTES - dbUsed);

  const storageUsed = useMemo(
    () => (stats?.buckets || []).reduce((s, b) => s + (b.size_bytes || 0), 0),
    [stats],
  );
  const storageObjects = useMemo(
    () => (stats?.buckets || []).reduce((s, b) => s + (b.objects || 0), 0),
    [stats],
  );
  const storagePct = Math.min(100, Math.round((storageUsed / STORAGE_CAP_BYTES) * 100));
  const storageFree = Math.max(0, STORAGE_CAP_BYTES - storageUsed);

  const totalRows = useMemo(
    () => (stats?.tables || []).reduce((s, t) => s + (t.row_estimate || 0), 0),
    [stats],
  );

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Server className="h-5 w-5" /> Space & Storage Details
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete database and file-storage breakdown.
            {stats && <> Updated {new Date(stats.generated_at).toLocaleString()}.</>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Database Used</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(dbUsed)}</div>
            <div className={`text-xs mt-1 ${toneClass(dbPct)}`}>{dbPct}% of {fmt(DB_CAP_BYTES)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Database Free</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${toneClass(dbPct)}`}>{fmt(dbFree)}</div>
            <div className="text-xs text-muted-foreground mt-1">{totalRows.toLocaleString()} rows across {stats?.tables.length ?? 0} tables</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Storage Used</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(storageUsed)}</div>
            <div className={`text-xs mt-1 ${toneClass(storagePct)}`}>{storagePct}% of {fmt(STORAGE_CAP_BYTES)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Storage Free</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${toneClass(storagePct)}`}>{fmt(storageFree)}</div>
            <div className="text-xs text-muted-foreground mt-1">{storageObjects.toLocaleString()} files in {stats?.buckets.length ?? 0} buckets</div>
          </CardContent>
        </Card>
      </div>

      {/* Usage bars */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Postgres Database</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Progress value={dbPct} />
            <div className="flex justify-between text-sm">
              <span>{fmt(dbUsed)} used</span>
              <span className={toneClass(dbPct)}>{fmt(dbFree)} free</span>
              <span className="text-muted-foreground">Cap {fmt(DB_CAP_BYTES)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" /> File Storage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Progress value={storagePct} />
            <div className="flex justify-between text-sm">
              <span>{fmt(storageUsed)} used</span>
              <span className={toneClass(storagePct)}>{fmt(storageFree)} free</span>
              <span className="text-muted-foreground">Cap {fmt(STORAGE_CAP_BYTES)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All tables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> All Tables ({stats?.tables.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !stats ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="max-h-[520px] overflow-auto rounded border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Rows (est.)</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">% of DB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.tables ?? []).map((t) => {
                    const pct = dbUsed ? Math.round((t.size_bytes / dbUsed) * 100) : 0;
                    return (
                      <TableRow key={t.table}>
                        <TableCell className="font-mono text-xs">{t.table}</TableCell>
                        <TableCell className="text-right tabular-nums">{(t.row_estimate ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(t.size_bytes)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant={pct >= 20 ? "destructive" : pct >= 10 ? "default" : "secondary"}>{pct}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Storage Buckets ({stats?.buckets.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !stats ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (stats?.buckets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No storage buckets in use.</p>
          ) : (
            <div className="rounded border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Files</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">% of Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.buckets ?? []).map((b) => {
                    const pct = storageUsed ? Math.round((b.size_bytes / storageUsed) * 100) : 0;
                    return (
                      <TableRow key={b.bucket}>
                        <TableCell className="font-mono text-xs">{b.bucket}</TableCell>
                        <TableCell className="text-right tabular-nums">{(b.objects ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(b.size_bytes)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant={pct >= 50 ? "destructive" : pct >= 25 ? "default" : "secondary"}>{pct}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Caps shown (500 MB DB · 1 GB Storage) are Lovable Cloud free-tier reference limits. Actual limits may differ based on your plan.
        Table sizes include indexes and TOAST storage. Row counts are Postgres statistics estimates.
      </p>
    </div>
  );
};

export default StorageDetailsPanel;
