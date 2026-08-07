import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, RefreshCcw, Loader2, Database, Search } from "lucide-react";
import { toast } from "sonner";
import { downloadTableAsCsv } from "@/lib/exportCsv";

type Stats = {
  database_size_bytes: number;
  tables: { table: string; size_bytes: number; row_estimate: number }[];
};

const fmt = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const TableDownloadsPanel = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_db_storage_stats");
      if (error) throw error;
      setStats(data as Stats);
    } catch (e: any) {
      toast.error(`Failed to load tables: ${e?.message || e}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = stats?.tables ?? [];
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((t) => t.table.toLowerCase().includes(needle)) : list;
  }, [stats, q]);

  const handleDownload = async (name: string) => {
    setBusy(name);
    try {
      await downloadTableAsCsv({
        table: name,
        filenamePrefix: name,
        orderBy: { column: "created_at", ascending: false },
      });
    } catch {
      // fallback: retry without ordering (table may not have created_at)
      try {
        await downloadTableAsCsv({ table: name, filenamePrefix: name });
      } catch (e: any) {
        toast.error(e?.message ?? "Download failed");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Download className="h-5 w-5" /> Download Table Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Export the contents of any database table as CSV. Downloads respect your admin permissions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Tables ({filtered.length})
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tables…"
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !stats ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tables match your search.</p>
          ) : (
            <div className="max-h-[600px] overflow-auto rounded border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Rows (est.)</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const isBusy = busy === t.table;
                    const heavy = (t.row_estimate ?? 0) > 50000;
                    return (
                      <TableRow key={t.table}>
                        <TableCell className="font-mono text-xs">{t.table}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(t.row_estimate ?? 0).toLocaleString()}
                          {heavy && <Badge variant="secondary" className="ml-2">large</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(t.size_bytes)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={isBusy}
                            onClick={() => handleDownload(t.table)}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            CSV
                          </Button>
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
        Only rows visible to your admin role are exported (row-level security still applies).
        Large tables are paginated in batches of 1,000 rows and may take a moment.
      </p>
    </div>
  );
};

export default TableDownloadsPanel;
