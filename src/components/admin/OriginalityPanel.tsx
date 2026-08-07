import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export interface OriginalityReport {
  score: number;
  verdict: "original" | "borrowed" | "uncertain";
  summary: string;
  flagged_passages: { text: string; reason: string; likely_source?: string }[];
  model: string;
  checked_at: string;
}

interface Props {
  entityType: "post" | "chapter";
  entityId: string | null;
  score: number | null;
  report: OriginalityReport | null;
  checkedAt: string | null;
  approvalStatus: string | null;
  onChecked?: (report: OriginalityReport, nextStatus: string) => void;
  /** When true, the "Run check" button is hidden (unsaved draft). */
  disableRun?: boolean;
}

const statusStyle = (s: string | null) => {
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
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-rose-600";
};

const OriginalityPanel = ({
  entityType, entityId, score, report, checkedAt, approvalStatus, onChecked, disableRun,
}: Props) => {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const runCheck = async () => {
    if (!entityId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("content-originality-check", {
        body: { entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Originality check complete",
        description: `Score ${data.report.score}/100 — ${data.report.verdict}`,
      });
      onChecked?.(data.report, data.approval_status);
    } catch (e: any) {
      toast({
        title: "Check failed",
        description: e?.message ?? "Could not run originality check",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const badge = report?.verdict ?? (score == null ? "not checked" : approvalStatus);
  const Icon = report?.verdict === "borrowed" ? ShieldAlert : ShieldCheck;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-4 w-4 ${scoreColor(score)}`} />
            Originality & Approval
          </CardTitle>
          <Badge variant="outline" className={statusStyle(approvalStatus)}>
            {approvalStatus ?? "draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-bold ${scoreColor(score)}`}>
            {score ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          {report?.verdict && (
            <Badge variant="outline" className="ml-2 capitalize">{report.verdict}</Badge>
          )}
        </div>

        {report?.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
        )}

        {checkedAt && (
          <p className="text-xs text-muted-foreground">
            Last checked: {new Date(checkedAt).toLocaleString()}
          </p>
        )}

        {report?.flagged_passages && report.flagged_passages.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium text-amber-900"
            >
              <span>{report.flagged_passages.length} flagged passage(s)</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded && (
              <ul className="mt-3 space-y-3 text-xs">
                {report.flagged_passages.map((p, i) => (
                  <li key={i} className="rounded bg-white/70 p-2">
                    <p className="italic text-gray-700">"{p.text}"</p>
                    <p className="mt-1 text-amber-800"><b>Reason:</b> {p.reason}</p>
                    {p.likely_source && (
                      <p className="text-amber-800"><b>Likely source:</b> {p.likely_source}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runCheck}
          disabled={running || disableRun || !entityId}
          className="w-full"
        >
          {running ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running check…</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" /> {score == null ? "Run originality check" : "Re-run check"}</>
          )}
        </Button>
        {disableRun && (
          <p className="text-xs text-muted-foreground text-center">
            Save the draft first to enable the originality check.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OriginalityPanel;
