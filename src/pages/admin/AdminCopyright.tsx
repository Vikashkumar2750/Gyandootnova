import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copyright, Loader2, ShieldCheck, ShieldAlert, RefreshCw, Wand2 } from "lucide-react";

const THRESHOLD = 95;

type Row = {
  id: string;
  title: string;
  slug: string | null;
  is_published: boolean | null;
  publish_status: string | null;
  originality_score: number | null;
  originality_checked_at: string | null;
  source_type: string | null;
};

const scoreTone = (s: number | null) =>
  s == null ? "text-muted-foreground"
    : s >= THRESHOLD ? "text-emerald-600"
    : s >= 85 ? "text-amber-600"
    : "text-rose-600";

const AdminCopyright = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["copyright-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, is_published, publish_status, originality_score, originality_checked_at, source_type")
        .order("originality_score", { ascending: true, nullsFirst: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const stats = useMemo(() => {
    const unchecked = rows.filter((r) => r.originality_score == null).length;
    const failing = rows.filter((r) => r.originality_score != null && r.originality_score < THRESHOLD).length;
    const clean = rows.filter((r) => (r.originality_score ?? 0) >= THRESHOLD).length;
    return { unchecked, failing, clean, total: rows.length };
  }, [rows]);

  const needsWork = useMemo(
    () => rows.filter((r) => r.originality_score == null || r.originality_score < THRESHOLD),
    [rows],
  );

  const runCheck = async (row: Row) => {
    setBusy(row.id);
    try {
      const { error } = await supabase.functions.invoke("content-originality-check", {
        body: { entity_type: "post", entity_id: row.id },
      });
      if (error) throw error;
      toast({ title: "Originality check complete", description: row.title });
      qc.invalidateQueries({ queryKey: ["copyright-posts"] });
    } catch (e: any) {
      toast({ title: "Check failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const runRewrite = async (row: Row) => {
    setBusy(row.id);
    try {
      const { error } = await supabase.functions.invoke("seo-auto-rewrite", {
        body: { post_id: row.id, threshold: THRESHOLD },
      });
      if (error) throw error;
      toast({ title: "Rewrite queued", description: row.title });
      qc.invalidateQueries({ queryKey: ["copyright-posts"] });
    } catch (e: any) {
      toast({ title: "Rewrite failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    try {
      const { error } = await supabase.functions.invoke("seo-auto-rewrite", {
        body: { sweep: true, threshold: THRESHOLD },
      });
      if (error) throw error;
      toast({ title: "Sweep started", description: "Unchecked posts are being scored and weak ones rewritten." });
      qc.invalidateQueries({ queryKey: ["copyright-posts"] });
    } catch (e: any) {
      toast({ title: "Sweep failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Copyright className="h-6 w-6 text-primary" /> Copyright & Originality
          </h1>
          <p className="text-sm text-muted-foreground">
            Every article must score {THRESHOLD}/100 or higher before it can go live.
          </p>
        </div>
        <Button onClick={runSweep} disabled={sweeping}>
          {sweeping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Run full sweep
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total articles</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Verified original</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.clean}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Below {THRESHOLD}</p>
          <p className="text-2xl font-semibold text-rose-600">{stats.failing}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Never checked</p>
          <p className="text-2xl font-semibold text-amber-600">{stats.unchecked}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" /> Needs attention ({needsWork.length})
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : needsWork.length === 0 ? (
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> All articles are verified 100% original.
          </p>
        ) : (
          <div className="space-y-2">
            {needsWork.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.is_published ? "Published" : r.publish_status ?? "draft"}
                    {r.originality_checked_at
                      ? ` · checked ${new Date(r.originality_checked_at).toLocaleDateString()}`
                      : " · never checked"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={scoreTone(r.originality_score)}>
                    {r.originality_score ?? "—"}/100
                  </Badge>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => runCheck(r)}>
                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </Button>
                  <Button size="sm" disabled={busy === r.id} onClick={() => runRewrite(r)}>
                    <Wand2 className="mr-1 h-4 w-4" /> Rewrite
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminCopyright;
