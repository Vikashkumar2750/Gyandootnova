import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, CheckCircle2, Clock, Loader2, Bot, User as UserIcon, Rocket } from "lucide-react";

type Member = { id: string; name: string; email: string | null; phone: string | null; role: string | null; is_active: boolean; notes: string | null };
type Task = { id: string; member_id: string | null; title: string; description: string | null; status: string; priority: string; due_date: string | null; progress: number; tags: string[] | null; updated_at: string; completed_at: string | null };
type RunLog = { id: string; started_at: string; status: string; keyword: string | null; post_id: string | null; error: string | null };

const STATUSES = ["todo", "in-progress", "done", "blocked"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const statusColor = (s: string) =>
  s === "done" ? "default" : s === "in-progress" ? "secondary" : s === "blocked" ? "destructive" : "outline";

const AdminTeam = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [mOpen, setMOpen] = useState(false);
  const [mForm, setMForm] = useState({ name: "", email: "", phone: "", role: "", notes: "" });

  const [tOpen, setTOpen] = useState(false);
  const [tForm, setTForm] = useState({ member_id: "", title: "", description: "", status: "todo", priority: "normal", due_date: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: t }, { data: r }] = await Promise.all([
      supabase.from("team_members").select("*").order("created_at", { ascending: true }),
      supabase.from("team_tasks").select("*").order("updated_at", { ascending: false }),
      supabase.from("daily_run_log").select("id,started_at,status,keyword,post_id,error").order("started_at", { ascending: false }).limit(20),
    ]);
    setMembers((m as Member[]) || []);
    setTasks((t as Task[]) || []);
    setRuns((r as RunLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!mForm.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("team_members").insert({
      name: mForm.name.trim(),
      email: mForm.email.trim() || null,
      phone: mForm.phone.trim() || null,
      role: mForm.role.trim() || null,
      notes: mForm.notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Member added");
    setMForm({ name: "", email: "", phone: "", role: "", notes: "" });
    setMOpen(false);
    load();
  };

  const removeMember = async (id: string) => {
    if (!confirm("Delete this member and all their tasks?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const toggleActive = async (m: Member) => {
    const { error } = await supabase.from("team_members").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  const addTask = async () => {
    if (!tForm.title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("team_tasks").insert({
      member_id: tForm.member_id || null,
      title: tForm.title.trim(),
      description: tForm.description.trim() || null,
      status: tForm.status,
      priority: tForm.priority,
      due_date: tForm.due_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Task assigned");
    setTForm({ member_id: "", title: "", description: "", status: "todo", priority: "normal", due_date: "" });
    setTOpen(false);
    load();
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const p: any = { ...patch };
    if (patch.status === "done") { p.progress = 100; p.completed_at = new Date().toISOString(); }
    const { error } = await supabase.from("team_tasks").update(p).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeTask = async (id: string) => {
    if (!confirm("Delete task?")) return;
    await supabase.from("team_tasks").delete().eq("id", id);
    load();
  };

  const taskStats = (memberId: string) => {
    const mine = tasks.filter((t) => t.member_id === memberId);
    return {
      total: mine.length,
      done: mine.filter((t) => t.status === "done").length,
      inProgress: mine.filter((t) => t.status === "in-progress").length,
      todo: mine.filter((t) => t.status === "todo").length,
    };
  };

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  return (
    <div className="space-y-6 notranslate" translate="no">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserIcon className="h-7 w-7" /> Team & Agents</h1>
          <p className="text-muted-foreground text-sm">Track kaun sa insaan kya kaam kar raha hai + AI agents ki live activity.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={mOpen} onOpenChange={setMOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Add Member</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={mForm.phone} onChange={(e) => setMForm({ ...mForm, phone: e.target.value })} /></div>
                </div>
                <div><Label>Role</Label><Input placeholder="Writer, Designer, SEO…" value={mForm.role} onChange={(e) => setMForm({ ...mForm, role: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={mForm.notes} onChange={(e) => setMForm({ ...mForm, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={addMember}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={tOpen} onOpenChange={setTOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Assign Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign a task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Assign to</Label>
                  <Select value={tForm.member_id} onValueChange={(v) => setTForm({ ...tForm, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose member" /></SelectTrigger>
                    <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Title *</Label><Input value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={tForm.status} onValueChange={(v) => setTForm({ ...tForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={tForm.priority} onValueChange={(v) => setTForm({ ...tForm, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due date</Label><Input type="date" value={tForm.due_date} onChange={(e) => setTForm({ ...tForm, due_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={addTask}>Assign</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Members</p><p className="text-3xl font-bold">{members.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active Tasks</p><p className="text-3xl font-bold">{tasks.filter(t => t.status !== "done").length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-bold text-green-600">{tasks.filter(t => t.status === "done").length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">AI Runs (24h)</p><p className="text-3xl font-bold">{runs.filter(r => Date.now() - new Date(r.started_at).getTime() < 86400000).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People ({members.length})</TabsTrigger>
          <TabsTrigger value="tasks">All Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          {loading ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div> :
           members.length === 0 ? (
            <Card><CardContent className="pt-10 pb-10 text-center text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Koi member add nahi hai. "Add Member" par click karke apne 5 log add karein.</p>
            </CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => {
                const s = taskStats(m.id);
                const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{m.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{m.role || "—"}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(m)}>
                            {m.is_active ? <Badge>active</Badge> : <Badge variant="outline">paused</Badge>}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {m.email && <div>{m.email}</div>}
                        {m.phone && <div>{m.phone}</div>}
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{pct}%</span></div>
                        <Progress value={pct} />
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">{s.todo} todo</Badge>
                        <Badge variant="secondary">{s.inProgress} doing</Badge>
                        <Badge>{s.done} done</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <Card><CardContent className="pt-6">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Koi task nahi. "Assign Task" par click karein.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Task</TableHead><TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead><TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[300px]">
                        <div className="font-medium truncate">{t.title}</div>
                        {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                      </TableCell>
                      <TableCell>{memberName(t.member_id)}</TableCell>
                      <TableCell>
                        <Select value={t.status} onValueChange={(v) => updateTask(t.id, { status: v })}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "default" : "outline"}>{t.priority}</Badge></TableCell>
                      <TableCell className="text-xs">{t.due_date || "—"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Agents Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3 mb-6">
                <AgentCard name="Daily Publisher" cron="09:00 IST" icon={Rocket} desc="1 blog/day auto-publish" />
                <AgentCard name="Queue Top-up" cron="every 6h" icon={Clock} desc="Maintains 30+ scheduled blogs" />
                <AgentCard name="Book KB Refresh" cron="Sun 03:00 IST" icon={CheckCircle2} desc="Grounds AI on your books" />
              </div>
              <h4 className="font-semibold mb-2 text-sm">Latest runs</h4>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Started</TableHead><TableHead>Status</TableHead>
                  <TableHead>Keyword</TableHead><TableHead>Result</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No runs yet. Trigger from SEO Command.</TableCell></TableRow>
                  ) : runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{r.keyword || "—"}</TableCell>
                      <TableCell className="text-xs">{r.post_id ? "✓ published" : (r.error || "—")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AgentCard = ({ name, cron, icon: Icon, desc }: any) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2 mb-1"><Icon className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{name}</span></div>
    <p className="text-xs text-muted-foreground">{desc}</p>
    <Badge variant="outline" className="mt-2 text-xs">{cron}</Badge>
  </div>
);

export default AdminTeam;
