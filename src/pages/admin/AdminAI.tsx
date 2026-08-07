import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Sparkles, Search, CheckCircle, XCircle } from "lucide-react";

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI (Built-in)", needsKey: false, needsUrl: false },
  { value: "openrouter-builtin", label: "OpenRouter · DeepSeek (Built-in key)", needsKey: false, needsUrl: false },
  { value: "deepseek", label: "DeepSeek (direct)", needsKey: true, needsUrl: false },
  { value: "openai", label: "OpenAI / ChatGPT", needsKey: true, needsUrl: false },
  { value: "gemini", label: "Google Gemini", needsKey: true, needsUrl: false },
  { value: "openrouter", label: "OpenRouter (custom key)", needsKey: true, needsUrl: false },
  { value: "groq", label: "Groq (Ultra-fast)", needsKey: true, needsUrl: false },
  { value: "nvidia", label: "NVIDIA NIM", needsKey: true, needsUrl: false },
  { value: "together", label: "Together AI", needsKey: true, needsUrl: false },
  { value: "fireworks", label: "Fireworks AI", needsKey: true, needsUrl: false },
  { value: "xai", label: "xAI Grok", needsKey: true, needsUrl: false },
  { value: "perplexity", label: "Perplexity", needsKey: true, needsUrl: false },
  { value: "kimi", label: "Kimi (Moonshot)", needsKey: true, needsUrl: false },
  { value: "custom", label: "Custom / Any Provider (OpenAI-compatible)", needsKey: true, needsUrl: true },
];

const MODELS: Record<string, string[]> = {
  lovable: ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-3-flash-preview", "openai/gpt-5-mini", "openai/gpt-5"],
  "openrouter-builtin": ["deepseek/deepseek-chat", "deepseek/deepseek-r1", "deepseek/deepseek-chat-v3.1"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  openrouter: ["deepseek/deepseek-chat", "deepseek/deepseek-r1", "google/gemini-2.5-flash", "openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  nvidia: ["meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-r1", "nvidia/llama-3.1-nemotron-70b-instruct", "mistralai/mixtral-8x22b-instruct-v0.1"],
  together: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
  fireworks: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/deepseek-v3", "accounts/fireworks/models/mixtral-8x22b-instruct"],
  xai: ["grok-2-latest", "grok-2-1212", "grok-beta"],
  perplexity: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"],
  kimi: ["moonshot-v1-8k", "moonshot-v1-32k"],
  custom: [],
};


// Sanitize pasted API keys regardless of source — removes whitespace,
// zero-width chars, BOM, and wrapping quotes so any paste "just works".
const sanitizeKey = (raw: string): string => {
  if (!raw) return "";
  let s = raw.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").trim();
  if (/^["'`].*["'`]$/.test(s)) s = s.slice(1, -1);
  return s;
};

const AdminAI = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("lovable");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [verifying, setVerifying] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.value === provider);

  const { data: settings } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("ai-ask", {
        body: { action: "get-settings" },
      });
      return data?.settings || [];
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["ai-logs"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("ai-ask", {
        body: { action: "get-logs" },
      });
      return data?.logs || [];
    },
  });

  const handleSave = async () => {
    setVerifying(true);
    try {
      if (provider === "lovable") {
        const { data, error } = await supabase.functions.invoke("ai-ask", {
          body: { action: "set-lovable", model_name: model },
        });
        if (error) throw error;
        toast({ title: "✅ Lovable AI activated!" });
      } else if (provider === "openrouter-builtin") {
        const { data, error } = await supabase.functions.invoke("ai-ask", {
          body: { action: "set-openrouter-builtin", model_name: model },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed");
        toast({ title: "✅ OpenRouter DeepSeek activated (built-in key)!" });
      } else {
        if (!apiKey) {
          toast({ title: "API key required", variant: "destructive" });
          return;
        }
        if (provider === "custom" && (!baseUrl || !model)) {
          toast({ title: "Base URL and model name required", variant: "destructive" });
          return;
        }
        const { data, error } = await supabase.functions.invoke("ai-ask", {
          body: { action: "verify-key", provider_name: provider, api_key: apiKey, model_name: model, base_url: baseUrl || undefined },
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        toast({ title: "✅ API key verified and saved!" });
      }
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      setApiKey("");
      setBaseUrl("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Manage AI provider and view query logs</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Model Manager</TabsTrigger>
          <TabsTrigger value="logs">Query Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* Active Provider */}
          {settings && settings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {settings.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{s.provider_name}</span>
                        <span className="text-xs text-muted-foreground">({s.model_name})</span>
                      </div>
                      {s.is_active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add/Change Provider */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configure AI Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Provider</label>
                  <Select value={provider} onValueChange={v => { setProvider(v); setModel(MODELS[v]?.[0] || ""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Model</label>
                  {provider === "custom" ? (
                    <Input
                      value={model}
                      onChange={e => setModel(e.target.value.trim())}
                      placeholder="e.g. gpt-4o-mini, llama-3.1-70b, my-internal-model"
                    />
                  ) : (
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(MODELS[provider] || []).map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {selectedProvider?.needsUrl && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Base URL (OpenAI-compatible endpoint)</label>
                  <Input
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value.trim())}
                    placeholder="https://api.your-provider.com/v1/chat/completions"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Koi bhi OpenAI-compatible endpoint chalega — ChatGPT, internal platform, OpenRouter, Groq, Together, etc.</p>
                </div>
              )}

              {selectedProvider?.needsKey && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">API Key</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(sanitizeKey(e.target.value))}
                    onPaste={e => {
                      e.preventDefault();
                      setApiKey(sanitizeKey(e.clipboardData.getData("text")));
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Paste API key from anywhere — extra spaces/quotes auto-removed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Key will be encrypted before storage. Source nahi matter karta — bus key paste karo.</p>
                </div>
              )}

              {!selectedProvider?.needsKey && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  🎉 No API key needed — this provider uses a built-in key configured in the backend.
                </p>
              )}

              <Button onClick={handleSave} disabled={verifying} className="w-full sm:w-auto">
                {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify & Activate"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> Query Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !logsData?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">No queries yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="max-w-[200px] truncate text-xs">{log.user_question}</TableCell>
                          <TableCell className="max-w-[250px] truncate text-xs">{log.ai_response}</TableCell>
                          <TableCell className="text-xs">{log.book_title || "—"}</TableCell>
                          <TableCell>
                            {log.cached ? (
                              <Badge variant="secondary" className="text-xs">⚡ Cached</Badge>
                            ) : (
                              <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200">
                                {log.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString("hi-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAI;
