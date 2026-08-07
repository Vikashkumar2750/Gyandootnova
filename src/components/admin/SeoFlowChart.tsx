import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Clock, BookOpen, Search, Filter, ShieldCheck, PenTool, Sparkles, Image as ImageIcon,
  Share2, CheckCircle2, Calendar, Send, Globe, BarChart3, Mail, ArrowRight, ArrowDown, Repeat,
  Rocket, Loader2, FileText, ExternalLink,
} from "lucide-react";

type StepDef = {
  n: number;
  icon: any;
  title: string;
  desc: string;
  action: string;
  cron: string;
  duration: string;
  logMatch: (r: any) => boolean;
};

const STEPS: StepDef[] = [
  { n: 1, icon: Clock, title: "Daily Scheduler", desc: "Cron fires seo-daily-publisher at 09:00 AM IST every day.",
    action: "pg_cron trigger → invokes edge function seo-daily-publisher", cron: "seo-daily-publisher-9am (0 3 * * *)", duration: "~1s",
    logMatch: (r) => !!r.started_at },
  { n: 2, icon: BookOpen, title: "Crawl /book Library", desc: "Refreshes Book Knowledge Base (topics, entities, concepts, keywords, FAQs).",
    action: "Reads books table → Lovable AI extracts topics/entities → upserts book_knowledge", cron: "seo-book-kb-weekly (Sun 21:30 UTC) + on-demand", duration: "20–60s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "kb_refresh") },
  { n: 3, icon: Search, title: "Research Sources", desc: "Google Trends, Search, PAA, Related, GSC, Reddit, Quora, News, competitors.",
    action: "seo-daily-keyword-scout pulls from SerpAPI, GSC, Reddit, Quora", cron: "part of seo-queue-topup (every 6h)", duration: "10–30s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "scout") },
  { n: 4, icon: Filter, title: "Match to Books", desc: "Rejects keywords outside site niche. Only book-relevant topics survive.",
    action: "Cosine similarity vs book_knowledge topics/entities", cron: "inline in scout", duration: "~2s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "book_match") },
  { n: 5, icon: ShieldCheck, title: "Uniqueness Gate", desc: "Compare against every published, draft & scheduled post. Reject if similarity > 15%.",
    action: "Trigram + embedding cosine vs posts (title/slug/meta/H1/H2)", cron: "inline in seo-daily-publisher", duration: "3–8s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "uniqueness") },
  { n: 6, icon: Sparkles, title: "Opportunity Score", desc: "Volume × CTR ÷ difficulty. Highest scoring keyword is picked.",
    action: "Sort seo_keyword_queue by opportunity_score, pop top", cron: "inline in publisher", duration: "<1s",
    logMatch: (r) => !!r.keyword_score },
  { n: 7, icon: PenTool, title: "Content Planning", desc: "Topic cluster, H1/H2 outline, entities, LSI keywords, internal link plan.",
    action: "Lovable AI (gemini-2.5-flash) builds outline grounded in book KB", cron: "inline in seo-blog-agent", duration: "5–10s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "plan") },
  { n: 8, icon: PenTool, title: "Write 1500–2500 words", desc: "Human-style Hindi/English article grounded in book KB. TOC + FAQ + JSON-LD.",
    action: "Lovable AI writes long-form; TOC + FAQ + JSON-LD injected", cron: "inline in seo-blog-agent", duration: "30–90s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "write") },
  { n: 9, icon: Sparkles, title: "SEO + NLP Optimization", desc: "Meta title, description, slug, schema, canonical, OG tags. NLP-tuned copy.",
    action: "Meta title/desc/slug/schema + NLP smoothing", cron: "inline in seo-blog-agent", duration: "3–6s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "seo") },
  { n: 10, icon: ImageIcon, title: "Featured Image", desc: "AI prompt generation + image render. Alt text with primary keyword.",
    action: "Lovable AI image gen → uploaded to post-images bucket", cron: "inline in seo-blog-agent", duration: "10–20s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "image") },
  { n: 11, icon: Share2, title: "Social Captions", desc: "Facebook, Instagram, LinkedIn, X, Pinterest, Threads, Telegram, WhatsApp.",
    action: "seo-social-captions writes per-platform captions", cron: "seo-post-publish-hook", duration: "5–10s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "social") },
  { n: 12, icon: CheckCircle2, title: "Quality Verification", desc: "Plagiarism scan, EEAT check, helpful-content signals, readability ≥ 80, SEO ≥ 90.",
    action: "Self-check: originality, readability (Flesch), SEO, EEAT, dupes", cron: "inline in publisher", duration: "3–5s",
    logMatch: (r) => !!r.self_check },
  { n: 13, icon: Calendar, title: "Schedule / Publish", desc: "Passes gate → publish today. Fails → regenerate. Extras go to scheduled queue.",
    action: "Sets publish_status='published' + scheduled_at", cron: "inline in publisher", duration: "<1s",
    logMatch: (r) => !!r.post_id && r.status === "success" },
  { n: 14, icon: Send, title: "Auto-Publish", desc: "Post flipped live. Sitemap regenerates. RSS updated.",
    action: "sitemap-refresh + rss-refresh edge functions", cron: "seo-post-publish-hook", duration: "2–5s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "sitemap") },
  { n: 15, icon: Globe, title: "Submit to Google", desc: "Sitemap re-ping + URL Inspection via GSC API. Indexing hint sent.",
    action: "Google Indexing API + GSC URL submit", cron: "seo-post-publish-hook", duration: "2–4s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "indexing") },
  { n: 16, icon: BarChart3, title: "Track Rankings", desc: "GSC pulls clicks, CTR, impressions, position daily into posts table.",
    action: "seo-gsc-sync writes gsc_clicks/impressions/ctr/position", cron: "seo-gsc-sync-daily", duration: "10–20s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "gsc") },
  { n: 17, icon: Mail, title: "Email Report", desc: "HTML performance report emailed to amrendra8765@gmail.com after each publish.",
    action: "Resend send → HTML performance report", cron: "seo-post-publish-hook", duration: "2–3s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "email") },
  { n: 18, icon: Repeat, title: "Queue Next 30 Blogs", desc: "Every 6h: if scheduled < 30, seo-queue-topup generates new drafts. Never empty.",
    action: "seo-queue-topup keeps scheduled queue ≥ 30", cron: "seo-queue-topup-6h (0 */6 * * *)", duration: "30–120s",
    logMatch: (r) => (r.steps || []).some?.((s: any) => s?.name === "topup") },
];

type Props = {
  runLog?: any[];
  posts?: any[];
  busy?: string | null;
  onRunDaily?: () => void | Promise<void>;
};

const Arrow = ({ dir = "right" }: { dir?: "right" | "down" }) => (
  <div className="flex items-center justify-center text-muted-foreground shrink-0">
    {dir === "right" ? <ArrowRight className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
  </div>
);

const StepCard = ({ step, status, onClick }: { step: StepDef; status: "idle" | "ok" | "fail" | "running"; onClick: () => void }) => {
  const Icon = step.icon;
  const ring =
    status === "ok" ? "ring-2 ring-green-500/60" :
    status === "fail" ? "ring-2 ring-destructive/60" :
    status === "running" ? "ring-2 ring-primary animate-pulse" :
    "hover:ring-2 hover:ring-primary/40";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`flex-1 min-w-[170px] text-left rounded-lg border bg-card p-3 shadow-sm transition ${ring}`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center bg-primary/10 text-primary shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-muted-foreground leading-none">STEP {step.n}</p>
              <p className="font-semibold text-sm truncate">{step.title}</p>
            </div>
            {status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            {status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
          </div>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{step.desc}</p>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold">Step {step.n}: {step.title}</p>
          <p><b>Action:</b> {step.action}</p>
          <p><b>Cron:</b> <span className="font-mono">{step.cron}</span></p>
          <p><b>Expected duration:</b> {step.duration}</p>
          <p className="italic text-muted-foreground pt-1">Click to see run logs & scores.</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const SeoFlowChart = ({ runLog = [], posts = [], busy, onRunDaily }: Props) => {
  const [selected, setSelected] = useState<StepDef | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const latest = runLog[0];
  const running = busy === "Daily publisher";

  const stepStatus = (s: StepDef): "idle" | "ok" | "fail" | "running" => {
    if (running) return "running";
    if (!latest) return "idle";
    if (latest.status === "failed" && s.logMatch(latest)) return "fail";
    if (s.logMatch(latest)) return "ok";
    return "idle";
  };

  const progress = useMemo(() => {
    if (!running) return latest?.status === "success" ? 100 : 0;
    const done = STEPS.filter((s) => s.logMatch(latest || {})).length;
    return Math.min(95, Math.round((done / STEPS.length) * 100));
  }, [running, latest]);

  const stepRuns = (s: StepDef | null) =>
    !s ? [] : runLog.filter((r) => s.logMatch(r)).slice(0, 10);

  const openReport = () => setReportOpen(true);

  const shareReport = () => {
    const html = buildReportHtml(runLog, posts);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Daily Blog Automation Flow
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                runs 09:00 IST · 1 blog/day · queue ≥ 30
              </span>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={onRunDaily} disabled={!!busy}>
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                Run Daily Now
              </Button>
              <Button size="sm" variant="outline" onClick={openReport}>
                <FileText className="h-4 w-4 mr-1" /> View Report
              </Button>
              <Button size="sm" variant="outline" onClick={shareReport}>
                <ExternalLink className="h-4 w-4 mr-1" /> Share (view-only)
              </Button>
            </div>
          </div>
          {(running || latest) && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {running ? "Running…" : latest?.status === "success" ? "Last run: success" : `Last run: ${latest?.status || "—"}`}
                  {latest?.keyword && <> · <span className="font-mono">{latest.keyword}</span></>}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {renderRows(STEPS, stepStatus, setSelected)}
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Repeat className="h-3 w-3" />
              Fully autonomous · 1 blog/day · zero manual approval
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <selected.icon className="h-4 w-4 text-primary" />
                  Step {selected.n}: {selected.title}
                </DialogTitle>
                <DialogDescription>{selected.desc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="rounded border p-2"><b>Cron</b><div className="font-mono mt-1">{selected.cron}</div></div>
                  <div className="rounded border p-2"><b>Duration</b><div className="mt-1">{selected.duration}</div></div>
                  <div className="rounded border p-2"><b>Action</b><div className="mt-1">{selected.action}</div></div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recent runs touching this step</h4>
                  {stepRuns(selected).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No runs recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-auto">
                      {stepRuns(selected).map((r) => (
                        <div key={r.id} className="rounded border p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{new Date(r.started_at).toLocaleString()}</span>
                            <Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                              {r.status}
                            </Badge>
                          </div>
                          <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-1 text-muted-foreground">
                            <span>keyword: <b className="text-foreground">{r.keyword || "—"}</b></span>
                            <span>SEO: <b className="text-foreground">{r.seo_score ?? "—"}</b></span>
                            <span>Readability: <b className="text-foreground">{r.readability_score?.toFixed?.(0) ?? "—"}</b></span>
                            <span>Originality: <b className="text-foreground">{r.originality_score ?? "—"}</b></span>
                          </div>
                          {r.error && <p className="mt-1 text-destructive">{r.error}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View-only report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Daily Run Summary — view mode</DialogTitle>
            <DialogDescription>Read-only. Use “Share (view-only)” to open in a new tab for printing.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto rounded border bg-background">
            <iframe
              title="daily-run-report"
              className="w-full h-[65vh]"
              srcDoc={buildReportHtml(runLog, posts)}
              sandbox=""
            />
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

function renderRows(steps: StepDef[], statusOf: (s: StepDef) => any, onSelect: (s: StepDef) => void) {
  const chunks: StepDef[][] = [];
  for (let i = 0; i < steps.length; i += 4) chunks.push(steps.slice(i, i + 4));
  return chunks.map((row, idx) => (
    <div key={`row-${idx}`}>
      <div className="flex flex-col lg:flex-row items-stretch gap-2">
        {row.map((s, i) => (
          <div key={s.n} className="contents">
            <StepCard step={s} status={statusOf(s)} onClick={() => onSelect(s)} />
            {i < row.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
      {idx < chunks.length - 1 && <div className="flex justify-center py-1"><Arrow dir="down" /></div>}
    </div>
  ));
}

function buildReportHtml(runLog: any[], posts: any[]): string {
  const rows = runLog.slice(0, 30).map((r) => `
    <tr>
      <td>${new Date(r.started_at).toLocaleString()}</td>
      <td>${r.status || "—"}</td>
      <td>${escapeHtml(r.keyword || "—")}</td>
      <td>${r.seo_score ?? "—"}</td>
      <td>${r.readability_score?.toFixed?.(0) ?? "—"}</td>
      <td>${r.originality_score ?? "—"}</td>
      <td>${r.post_id ? "✓" : escapeHtml(r.error || "—")}</td>
    </tr>`).join("");
  const postRows = posts.slice(0, 20).map((p) => `
    <tr>
      <td>${escapeHtml(p.title || "")}</td>
      <td>${p.publish_status || ""}</td>
      <td>${p.content_score ?? "—"}</td>
      <td>${p.readability_score?.toFixed?.(0) ?? "—"}</td>
      <td>${p.gsc_clicks ?? 0}</td>
      <td>${p.gsc_impressions ?? 0}</td>
    </tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Daily SEO Run Summary</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;padding:28px;color:#111;background:#fff;max-width:960px;margin:auto}
    h1{margin:0 0 4px} .sub{color:#666;font-size:13px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin:12px 0 24px;font-size:13px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
    th{background:#f8fafc}
    h2{margin-top:28px;font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:11px}
    @media print{body{padding:12px}}
  </style></head><body>
  <h1>Daily Blog Automation — Run Summary</h1>
  <div class="sub">Generated ${new Date().toLocaleString()} · <span class="badge">view-only</span></div>
  <h2>Recent daily runs</h2>
  <table><thead><tr><th>Started</th><th>Status</th><th>Keyword</th><th>SEO</th><th>Readability</th><th>Originality</th><th>Post</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="7" style="text-align:center;color:#888">No runs yet</td></tr>`}</tbody></table>
  <h2>Latest posts</h2>
  <table><thead><tr><th>Title</th><th>Status</th><th>SEO</th><th>Readability</th><th>Clicks</th><th>Impr</th></tr></thead>
  <tbody>${postRows || `<tr><td colspan="6" style="text-align:center;color:#888">No posts</td></tr>`}</tbody></table>
  <p class="sub">Tip: use your browser’s Print → Save as PDF to archive this report.</p>
  </body></html>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);
}

export default SeoFlowChart;
