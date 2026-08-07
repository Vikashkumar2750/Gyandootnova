import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, RefreshCcw, Loader2, HardDrive } from "lucide-react";
import { toast } from "sonner";

type Stats = {
  database_size_bytes: number;
  tables: { table: string; size_bytes: number; row_estimate: number }[];
  buckets: { bucket: string; objects: number; size_bytes: number }[];
  generated_at: string;
};

// Free-tier soft cap on Lovable Cloud Postgres: 500 MB DB + 1 GB Storage.
// These are display-only reference caps used to compute a "free space" bar.
const DB_CAP_BYTES = 500 * 1024 * 1024;
const STORAGE_CAP_BYTES = 1024 * 1024 * 1024;

const fmt = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const DbStorageCard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_db_storage_stats");
      if (error) throw error;
      setStats(data as Stats);
    } catch (e: any) {
      toast.error(`Failed to load DB stats: ${e?.message || e}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const dbUsed = stats?.database_size_bytes || 0;
  const dbPct = Math.min(100, Math.round((dbUsed / DB_CAP_BYTES) * 100));
  const dbFree = Math.max(0, DB_CAP_BYTES - dbUsed);

  const storageUsed = (stats?.buckets || []).reduce((s, b) => s + (b.size_bytes || 0), 0);
  const storagePct = Math.min(100, Math.round((storageUsed / STORAGE_CAP_BYTES) * 100));
  const storageFree = Math.max(0, STORAGE_CAP_BYTES - storageUsed);

  const tone = (pct: number) => pct >= 85 ? "text-red-600" : pct >= 70 ? "text-orange-600" : "text-green-600";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" /> Database & Storage Usage
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* DB */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium"><Database className="h-3.5 w-3.5" /> Postgres</span>
            <span className={tone(dbPct)}>
              {fmt(dbUsed)} used · <span className="font-semibold">{fmt(dbFree)} free</span> of {fmt(DB_CAP_BYTES)}
            </span>
          </div>
          <Progress value={dbPct} />
          {stats && (
            <div className="text-xs text-muted-foreground">
              Top tables:{" "}
              {stats.tables.slice(0, 5).map((t, i) => (
                <span key={t.table}>
                  {i > 0 && " · "}<span className="font-mono">{t.table}</span> ({fmt(t.size_bytes)})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium"><HardDrive className="h-3.5 w-3.5" /> File Storage</span>
            <span className={tone(storagePct)}>
              {fmt(storageUsed)} used · <span className="font-semibold">{fmt(storageFree)} free</span> of {fmt(STORAGE_CAP_BYTES)}
            </span>
          </div>
          <Progress value={storagePct} />
          {stats && stats.buckets.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Buckets:{" "}
              {stats.buckets.map((b, i) => (
                <span key={b.bucket}>
                  {i > 0 && " · "}<span className="font-mono">{b.bucket}</span> ({b.objects} files, {fmt(b.size_bytes)})
                </span>
              ))}
            </div>
          )}
        </div>

        {stats && (
          <p className="text-[10px] text-muted-foreground">
            Caps shown are Lovable Cloud free-tier reference limits (500 MB DB, 1 GB Storage). Updated {new Date(stats.generated_at).toLocaleTimeString()}.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DbStorageCard;
