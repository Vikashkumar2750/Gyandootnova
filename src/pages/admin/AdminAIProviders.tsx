import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck, ShieldAlert, ShieldX, Zap, Trash2, Pencil } from "lucide-react";

type Provider = {
  provider: string;
  enabled: boolean;
  priority: number;
  key_last4: string | null;
  connection_status: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  remaining_credits: string | null;
  health_status: string | null;
  updated_at: string;
};

const PROVIDER_META: Record<string, { label: string; docsUrl: string; description: string }> = {
  openrouter: { label: "OpenRouter (DeepSeek)", docsUrl: "https://openrouter.ai/keys", description: "Primary content generation via DeepSeek" },
  deepseek:  { label: "DeepSeek (direct)",  docsUrl: "https://platform.deepseek.com/api_keys", description: "Direct DeepSeek API" },
  openai:    { label: "OpenAI (GPT)",       docsUrl: "https://platform.openai.com/api-keys", description: "Fallback content generation" },
  gemini:    { label: "Google Gemini",      docsUrl: "https://aistudio.google.com/app/apikey", description: "Fallback content generation" },
  tavily:    { label: "Tavily",             docsUrl: "https://app.tavily.com/home", description: "Trending & general search" },
  exa:       { label: "Exa",                docsUrl: "https://dashboard.exa.ai/api-keys", description: "Semantic search" },
  firecrawl: { label: "Firecrawl",          docsUrl: "https://www.firecrawl.dev/app/api-keys", description: "Web crawling" },
  serpapi:   { label: "SerpAPI",            docsUrl: "https://serpapi.com/manage-api-key", description: "Google SERP" },
};

const invoke = async (payload: any) => {
  const { data, error } = await supabase.functions.invoke("ai-providers-manage", { body: payload });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const statusBadge = (s?: string | null, hasKey?: boolean) => {
  if (!s) return hasKey
    ? <Badge variant="secondary">Not tested yet</Badge>
    : <Badge variant="outline" className="text-muted-foreground">No key</Badge>;
  const map: Record<string, { cls: string; label: string; Icon: any }> = {
    connected: { cls: "bg-green-500/10 text-green-700 border-green-200", label: "Live", Icon: ShieldCheck },
    invalid_key: { cls: "bg-red-500/10 text-red-700 border-red-200", label: "Invalid Key", Icon: ShieldX },
    quota_exceeded: { cls: "bg-red-500/10 text-red-700 border-red-200", label: "Quota Exceeded", Icon: ShieldX },
    rate_limited: { cls: "bg-amber-500/10 text-amber-700 border-amber-200", label: "Rate Limited", Icon: ShieldAlert },
    timeout: { cls: "bg-amber-500/10 text-amber-700 border-amber-200", label: "Timeout", Icon: ShieldAlert },
    failed: { cls: "bg-red-500/10 text-red-700 border-red-200", label: "Failed", Icon: ShieldX },
  };
  const m = map[s] || { cls: "", label: s, Icon: ShieldAlert };
  return <Badge className={m.cls} variant="outline"><m.Icon className="h-3 w-3 mr-1" />{m.label}</Badge>;
};

const AdminAIProviders = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: async () => (await invoke({ action: "list" })).providers as Provider[],
  });

  const { data: logs } = useQuery({
    queryKey: ["ai-provider-logs"],
    queryFn: async () => (await invoke({ action: "logs", limit: 100 })).logs as any[],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ai-providers"] });
    qc.invalidateQueries({ queryKey: ["ai-provider-logs"] });
  };

  const runAction = async (provider: string, action: string, extra: any = {}) => {
    setBusyRow(`${provider}:${action}`);
    try {
      const res = await invoke({ action, provider, ...extra });
      if (action === "test") {
        const s = res.result?.status || "failed";
        toast({ title: s === "connected" ? "✅ Connected" : `⚠ ${s.replace("_", " ")}`, description: res.result?.error?.slice(0, 200) });
      } else if (action === "save") {
        toast({ title: "✅ Key saved securely" });
        setEditing(null); setNewKey(""); setShowKey(false);
      } else if (action === "delete") {
        toast({ title: "Key removed" });
      }
      refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusyRow(null);
    }
  };

  const toggleEnabled = async (p: Provider) => {
    setBusyRow(`${p.provider}:toggle`);
    try {
      await invoke({ action: "toggle", provider: p.provider, enabled: !p.enabled });
      refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Providers</h1>
          <p className="text-sm text-muted-foreground">Manage API keys securely — never edit environment variables.</p>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Configured Providers</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={busyRow === "all:test" || !(providers || []).some(p => p.key_last4)}
                onClick={async () => {
                  setBusyRow("all:test");
                  try {
                    const targets = (providers || []).filter(p => p.key_last4);
                    await Promise.all(targets.map(p => invoke({ action: "test", provider: p.provider })));
                    toast({ title: `Tested ${targets.length} provider(s)` });
                    refresh();
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  } finally {
                    setBusyRow(null);
                  }
                }}
              >
                {busyRow === "all:test" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                Test All (Go Live)
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Last Checked</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Enabled</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(providers || []).map((p) => {
                        const meta = PROVIDER_META[p.provider] || { label: p.provider, docsUrl: "#", description: "" };
                        const busy = (a: string) => busyRow === `${p.provider}:${a}`;
                        return (
                          <TableRow key={p.provider}>
                            <TableCell>
                              <div className="font-medium">{meta.label}</div>
                              <div className="text-xs text-muted-foreground">{meta.description}</div>
                            </TableCell>
                            <TableCell>{statusBadge(p.connection_status, !!p.key_last4)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.key_last4 ? `••••${p.key_last4}` : <span className="text-muted-foreground">Not set</span>}
                            </TableCell>
                            <TableCell className="text-xs">{p.remaining_credits || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.last_tested_at ? new Date(p.last_tested_at).toLocaleString("en-IN") : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{p.priority}</TableCell>
                            <TableCell>
                              <Switch
                                checked={p.enabled}
                                disabled={busy("toggle")}
                                onCheckedChange={() => toggleEnabled(p)}
                              />
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="outline" onClick={() => { setEditing(p.provider); setNewKey(""); setShowKey(false); }}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit Key
                              </Button>
                              <Button size="sm" variant="outline" disabled={!p.key_last4 || busy("test")} onClick={() => runAction(p.provider, "test")}>
                                {busy("test") ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Zap className="h-3 w-3 mr-1" /> Test</>}
                              </Button>
                              <Button size="sm" variant="ghost" disabled={!p.key_last4 || busy("delete")} onClick={() => runAction(p.provider, "delete")}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Keys are encrypted (AES-GCM) before storage. Only the last 4 characters are ever displayed. The SEO Agent loads keys automatically — no code or environment changes needed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs || []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-medium">{l.action}</TableCell>
                        <TableCell className="text-xs">{l.provider || "—"}</TableCell>
                        <TableCell className="text-xs">{l.status || "—"}</TableCell>
                        <TableCell className="text-xs">{l.admin_email || "—"}</TableCell>
                        <TableCell className="text-xs">{l.ip_address || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No audit events yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {editing && (PROVIDER_META[editing]?.label || editing)} API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">API Key</label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.trim())}
                  placeholder="Paste API key"
                  autoComplete="off"
                  spellCheck={false}
                  className="pr-10"
                />
                <Button type="button" size="sm" variant="ghost" className="absolute right-1 top-1 h-8 w-8 p-0" onClick={() => setShowKey(s => !s)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The key is encrypted server-side before storage. Only the last 4 chars will be shown afterwards.
                {editing && PROVIDER_META[editing]?.docsUrl && (
                  <> Get it from <a href={PROVIDER_META[editing].docsUrl} target="_blank" rel="noopener noreferrer" className="underline">the provider dashboard</a>.</>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant="secondary"
              disabled={!newKey || busyRow === `${editing}:test`}
              onClick={() => editing && runAction(editing, "test", { api_key: newKey })}
            >
              {busyRow === `${editing}:test` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
            <Button
              disabled={!newKey || busyRow === `${editing}:save`}
              onClick={() => editing && runAction(editing, "save", { api_key: newKey })}
            >
              {busyRow === `${editing}:save` ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAIProviders;
