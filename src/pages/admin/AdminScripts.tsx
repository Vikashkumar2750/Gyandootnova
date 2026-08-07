import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Code, Plus, Trash2, Pencil, X } from "lucide-react";

interface ScriptRow {
  id: string;
  name: string;
  placement: "head" | "body";
  content: string;
  enabled: boolean;
  position: number;
}

interface FormState {
  id: string | null;
  name: string;
  placement: "head" | "body";
  content: string;
  enabled: boolean;
  position: number;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  placement: "head",
  content: "",
  enabled: true,
  position: 0,
};

const AdminScripts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: scripts, isLoading } = useQuery({
    queryKey: ["admin-custom-scripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_scripts")
        .select("*")
        .order("placement", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw error;
      return data as ScriptRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (state: FormState) => {
      const payload = {
        name: state.name.trim(),
        placement: state.placement,
        content: state.content,
        enabled: state.enabled,
        position: state.position,
      };
      if (state.id) {
        const { error } = await supabase.from("custom_scripts").update(payload).eq("id", state.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_scripts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-custom-scripts"] });
      toast({ title: form.id ? "Script updated" : "Script added", description: "Changes saved successfully." });
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-custom-scripts"] });
      toast({ title: "Script deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("custom_scripts").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-custom-scripts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleEdit = (s: ScriptRow) => {
    setForm({
      id: s.id,
      name: s.name,
      placement: s.placement,
      content: s.content,
      enabled: s.enabled,
      position: s.position,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast({ title: "Validation", description: "Name aur Code dono required hain.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Code className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl font-bold">Custom Scripts</h1>
      </div>

      <Card className="max-w-3xl mb-6">
        <CardHeader>
          <CardTitle>{form.id ? "Edit Script" : "Add New Script"}</CardTitle>
          <CardDescription>
            Apne tracking pixels, analytics, chat widgets ya koi bhi custom script add karein.
            Yeh website ke <strong>head</strong> ya <strong>body</strong> me inject hoga.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Google Analytics"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Placement</Label>
              <Select
                value={form.placement}
                onValueChange={(v: "head" | "body") => setForm({ ...form, placement: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">&lt;head&gt;</SelectItem>
                  <SelectItem value="body">&lt;body&gt;</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Script Code (HTML / &lt;script&gt; tags)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={'<script>\n  // your code here\n</script>'}
              className="font-mono text-xs min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">
              Pura snippet paste karein including &lt;script&gt; tags. Multiple tags allowed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Position (lower = loads first)</Label>
              <Input
                type="number"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
              <Label>Enabled</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              <Plus className="mr-1 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : form.id ? "Update Script" : "Add Script"}
            </Button>
            {form.id && (
              <Button variant="outline" onClick={() => setForm(emptyForm)}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Scripts</CardTitle>
          <CardDescription>Saved scripts injected into your site.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !scripts || scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Abhi tak koi script add nahi ki gayi.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const counts = new Map<string, number>();
                scripts.forEach((s) => {
                  const key = s.content.trim().replace(/\s+/g, " ");
                  if (key) counts.set(key, (counts.get(key) || 0) + 1);
                });
                return scripts.map((s) => {
                  const key = s.content.trim().replace(/\s+/g, " ");
                  const dupCount = counts.get(key) || 0;
                  const isDup = dupCount > 1;
                  return (
                <div key={s.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{s.name}</span>
                      <Badge variant={s.placement === "head" ? "default" : "secondary"}>
                        {s.placement}
                      </Badge>
                      {!s.enabled && <Badge variant="outline">Disabled</Badge>}
                      {isDup && (
                        <Badge variant="destructive">Duplicate ({dupCount})</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">pos: {s.position}</span>
                    </div>
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap break-all">
                      {s.content.length > 200 ? s.content.slice(0, 200) + "..." : s.content}
                    </pre>
                  </div>
                  <div className="flex sm:flex-col items-center gap-2">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, enabled: v })}
                    />
                    <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminScripts;
