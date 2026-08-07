import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, RefreshCw, Eye, Download } from "lucide-react";
import UploadCsvButton from "@/components/admin/UploadCsvButton";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "spam";
  source_ip: string | null;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
};

const STATUSES: Enquiry["status"][] = ["new", "in_progress", "resolved", "spam"];

const statusColor = (s: Enquiry["status"]) =>
  s === "new"
    ? "bg-primary text-primary-foreground"
    : s === "in_progress"
    ? "bg-secondary text-secondary-foreground"
    : s === "resolved"
    ? "bg-green-600 text-white"
    : "bg-muted text-muted-foreground";

export default function AdminEnquiries() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Enquiry["status"]>("all");
  const [active, setActive] = useState<Enquiry | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("contact_enquiries" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load enquiries");
    } else {
      setRows((data ?? []) as unknown as Enquiry[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: Enquiry["status"]) => {
    const { error } = await supabase
      .from("contact_enquiries" as any)
      .update({ status })
      .eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success("Status updated");
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    if (active?.id === id) setActive({ ...active, status });
  };

  const remove = async (id: string) => {
    if (!confirm("इस enquiry को delete करें?")) return;
    const { error } = await supabase.from("contact_enquiries" as any).delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setRows((r) => r.filter((x) => x.id !== id));
    setActive(null);
    toast.success("Deleted");
  };

  const downloadCsv = async () => {
    const t = toast.loading("Preparing download…");
    try {
      // Fetch ALL rows (current + future), paginated to avoid PostgREST 1000-row cap
      const pageSize = 1000;
      let from = 0;
      let all: Enquiry[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("contact_enquiries" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as unknown as Enquiry[];
        all = all.concat(batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }

      const headers = [
        "id","created_at","name","email","subject","message",
        "status","admin_notes","source_ip","user_agent",
      ];
      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      };
      const csv = [
        headers.join(","),
        ...all.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
      ].join("\n");

      // UTF-8 BOM so Excel renders Hindi correctly
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `contact-enquiries-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${all.length} enquiries`, { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed", { id: t });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Contact Enquiries
          </h1>
          <p className="text-sm text-muted-foreground">
            Contact form से आई हुई सभी messages यहाँ हैं।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">सभी</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="default" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-1" /> Download All
          </Button>
          <UploadCsvButton table="contact_enquiries" label="Upload CSV" onDone={load} />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>

        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto opacity-30" />
            <p className="mt-3 text-sm">कोई enquiry नहीं मिली।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>
                    </td>
                    <td className="px-4 py-3 max-w-[260px] truncate">{r.subject}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setActive(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{active.subject}</DialogTitle>
                <DialogDescription>
                  From <strong>{active.name}</strong> ·{" "}
                  <a href={`mailto:${active.email}`} className="text-primary hover:underline">{active.email}</a>
                  {" · "}
                  {new Date(active.created_at).toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed max-h-[40vh] overflow-auto">
                {active.message}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-muted-foreground mr-1">Status:</span>
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={active.status === s ? "default" : "outline"}
                    onClick={() => updateStatus(active.id, s)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
                <div className="ml-auto flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`}>
                      <Mail className="h-4 w-4 mr-1" /> Reply
                    </a>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(active.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
