import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, RotateCcw, FileText } from "lucide-react";
import OriginalityPanel, { type OriginalityReport } from "@/components/admin/OriginalityPanel";

type EntityRow = {
  entity_type: "post" | "chapter";
  id: string;
  title: string;
  approval_status: string;
  originality_score: number | null;
  originality_report: OriginalityReport | null;
  originality_checked_at: string | null;
  source_type: string | null;
  source_citation: string | null;
  permission_notes: string | null;
  approval_notes: string | null;
  last_edited_at: string | null;
  updated_at: string;
  author?: string | null;
  book_id?: string | null;
};

const statusColor = (s: string) => {
  switch (s) {
    case "approved":       return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pending_review": return "bg-blue-100 text-blue-800 border-blue-200";
    case "flagged":        return "bg-amber-100 text-amber-800 border-amber-200";
    case "rejected":       return "bg-rose-100 text-rose-800 border-rose-200";
    case "needs_rewrite":  return "bg-orange-100 text-orange-800 border-orange-200";
    default:               return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const scoreColor = (score: number | null) => {
  if (score == null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-600 font-semibold";
  if (score >= 70) return "text-amber-600 font-semibold";
  return "text-rose-600 font-semibold";
};

const AdminContentAudit = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["audit-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, approval_status, originality_score, originality_report, originality_checked_at, source_type, source_citation, permission_notes, approval_notes, last_edited_at, updated_at, author")
        .order("updated_at", { ascending: false })
        .limit(300);
      return (data ?? []).map((r: any) => ({ ...r, entity_type: "post" as const })) as EntityRow[];
    },
  });

  const { data: chapters = [], isLoading: chLoading } = useQuery({
    queryKey: ["audit-chapters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("book_chapters")
        .select("id, title, approval_status, originality_score, originality_report, originality_checked_at, source_type, source_citation, permission_notes, approval_notes, last_edited_at, updated_at, book_id")
        .order("updated_at", { ascending: false })
        .limit(300);
      return (data ?? []).map((r: any) => ({ ...r, entity_type: "chapter" as const })) as EntityRow[];
    },
  });

  const all: EntityRow[] = useMemo(() => [...posts, ...chapters], [posts, chapters]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending":  return all.filter((r) => r.approval_status === "pending_review");
      case "flagged":  return all.filter((r) => r.approval_status === "flagged" || r.approval_status === "needs_rewrite");
      case "approved": return all.filter((r) => r.approval_status === "approved");
      default:         return all;
    }
  }, [all, tab]);

  const counts = useMemo(() => ({
    pending: all.filter((r) => r.approval_status === "pending_review").length,
    flagged: all.filter((r) => r.approval_status === "flagged" || r.approval_status === "needs_rewrite").length,
    approved: all.filter((r) => r.approval_status === "approved").length,
    all: all.length,
  }), [all]);

  const openRow = (row: EntityRow) => {
    setSelected(row);
    setDecisionNotes(row.approval_notes ?? "");
  };

  const submitDecision = async (decision: "approved" | "rejected" | "needs_rewrite") => {
    if (!selected) return;
    setSaving(true);
    try {
      const rpc = selected.entity_type === "post" ? "review_post" : "review_chapter";
      const idKey = selected.entity_type === "post" ? "_post_id" : "_chapter_id";
      const { error } = await supabase.rpc(rpc as any, {
        [idKey]: selected.id,
        _decision: decision,
        _notes: decisionNotes || null,
      } as any);
      if (error) throw error;

      toast({
        title: `Content ${decision.replace("_", " ")}`,
        description: selected.title,
      });
      qc.invalidateQueries({ queryKey: ["audit-posts"] });
      qc.invalidateQueries({ queryKey: ["audit-chapters"] });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Decision failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-8"><p>Admins only.</p></div>;
  }

  const isLoading = postsLoading || chLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">Content Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review originality reports, sources & permissions, and approve/reject content before it goes live.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending review ({counts.pending})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({counts.flagged})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-5">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
              Nothing here right now.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Originality</th>
                    <th className="px-3 py-3 font-medium">Sources</th>
                    <th className="px-3 py-3 font-medium">Last edited</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => {
                    const hasSources = r.source_type && r.source_type !== "original"
                      ? !!(r.source_citation && r.source_citation.trim())
                      : true;
                    return (
                      <tr key={`${r.entity_type}-${r.id}`} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium line-clamp-1">{r.title}</div>
                          {r.author && <div className="text-xs text-muted-foreground">by {r.author}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="capitalize">{r.entity_type}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={statusColor(r.approval_status)}>
                            {r.approval_status}
                          </Badge>
                        </td>
                        <td className={`px-3 py-3 ${scoreColor(r.originality_score)}`}>
                          {r.originality_score ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          {hasSources
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-rose-600" />}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {new Date(r.last_edited_at ?? r.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => openRow(r)}>Review</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.originality_score != null && selected.originality_score < 70
                    ? <ShieldAlert className="h-5 w-5 text-rose-600" />
                    : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
                  {selected.title}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <OriginalityPanel
                  entityType={selected.entity_type}
                  entityId={selected.id}
                  score={selected.originality_score}
                  report={selected.originality_report}
                  checkedAt={selected.originality_checked_at}
                  approvalStatus={selected.approval_status}
                  onChecked={() => {
                    qc.invalidateQueries({ queryKey: ["audit-posts"] });
                    qc.invalidateQueries({ queryKey: ["audit-chapters"] });
                  }}
                />

                <Card className="p-4 text-sm space-y-2">
                  <div className="font-medium">Sources & permissions</div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selected.source_type ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Citation:</span> {selected.source_citation || <span className="italic text-muted-foreground">not provided</span>}</div>
                  <div><span className="text-muted-foreground">Permissions:</span> {selected.permission_notes || <span className="italic text-muted-foreground">not provided</span>}</div>
                </Card>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Reviewer notes</label>
                  <Textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Why are you approving / rejecting? (optional)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => submitDecision("approved")}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => submitDecision("needs_rewrite")}
                    disabled={saving}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" /> Send to rewrite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => submitDecision("rejected")}
                    disabled={saving}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminContentAudit;
