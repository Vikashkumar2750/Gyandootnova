import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Tag, ExternalLink } from "lucide-react";
import UploadCsvButton from "@/components/admin/UploadCsvButton";
import { downloadTableAsCsv } from "@/lib/exportCsv";

type Kw = {
  id: string;
  term: string;
  category: string | null;
  related_terms: string[] | null;
  description: string | null;
  priority: number;
  is_active: boolean;
};

const empty = {
  id: "",
  term: "",
  category: "",
  related_terms_str: "",
  description: "",
  priority: 0,
  is_active: true,
};

const AdminLSI = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-lsi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lsi_keywords")
        .select("*")
        .order("priority", { ascending: false })
        .order("term", { ascending: true });
      if (error) throw error;
      return data as Kw[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        term: form.term.trim(),
        category: form.category.trim() || null,
        related_terms: form.related_terms_str
          .split(",").map((s) => s.trim()).filter(Boolean),
        description: form.description.trim() || null,
        priority: Number(form.priority) || 0,
        is_active: form.is_active,
      };
      if (!payload.term) throw new Error("Term is required");
      if (form.id) {
        const { error } = await supabase.from("lsi_keywords").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lsi_keywords").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lsi"] });
      qc.invalidateQueries({ queryKey: ["lsi-keywords-public"] });
      qc.invalidateQueries({ queryKey: ["lsi-meta-keywords"] });
      toast({ title: form.id ? "Updated" : "Added", description: "Keyword saved." });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lsi_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lsi"] });
      qc.invalidateQueries({ queryKey: ["lsi-keywords-public"] });
      toast({ title: "Deleted" });
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("lsi_keywords").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lsi"] });
      qc.invalidateQueries({ queryKey: ["lsi-keywords-public"] });
    },
  });

  const filtered = data.filter((k) => {
    const s = q.toLowerCase();
    return !s ||
      k.term.toLowerCase().includes(s) ||
      (k.category || "").toLowerCase().includes(s) ||
      (k.related_terms || []).some((r) => r.toLowerCase().includes(s));
  });

  const openEdit = (k: Kw) => {
    setForm({
      id: k.id,
      term: k.term,
      category: k.category || "",
      related_terms_str: (k.related_terms || []).join(", "),
      description: k.description || "",
      priority: k.priority,
      is_active: k.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Tag className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">LSI Keywords</h1>
            <p className="text-sm text-muted-foreground">
              Manage SEO keywords — public page:{" "}
              <a href="/keywords" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">
                /keywords <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => downloadTableAsCsv({ table: "lsi_keywords", filenamePrefix: "lsi_keywords" })}>
            Download CSV
          </Button>
          <UploadCsvButton
            table="lsi_keywords"
            dropColumns={["id", "created_at", "updated_at"]}
            onDone={() => qc.invalidateQueries({ queryKey: ["admin-lsi"] })}
          />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Keyword</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit" : "Add"} LSI Keyword</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Term *</Label>
                  <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="e.g. भगवद्गीता" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Scripture / Philosophy / Practice" />
                </div>
                <div>
                  <Label>Related Terms (comma separated)</Label>
                  <Textarea
                    value={form.related_terms_str}
                    onChange={(e) => setForm({ ...form, related_terms_str: e.target.value })}
                    placeholder="Bhagavad Gita, गीता सार, Krishna teachings"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority (higher first)</Label>
                    <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> All Keywords ({filtered.length})
          </CardTitle>
          <Input
            className="max-w-sm mt-2"
            placeholder="Search term, category, related..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Related</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.term}</TableCell>
                      <TableCell><Badge variant="outline">{k.category || "-"}</Badge></TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="flex flex-wrap gap-1">
                          {(k.related_terms || []).slice(0, 3).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                          ))}
                          {(k.related_terms || []).length > 3 && (
                            <span className="text-xs text-muted-foreground">+{(k.related_terms || []).length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{k.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={k.is_active}
                          onCheckedChange={(v) => toggle.mutate({ id: k.id, active: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(k)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => {
                            if (confirm(`Delete "${k.term}"?`)) del.mutate(k.id);
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLSI;
