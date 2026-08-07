import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Terminal, Play, Eraser, Loader2, FlaskConical, Copy, History, ChevronRight, ChevronDown,
  AlertTriangle, KeyRound,
} from "lucide-react";

/* ---------------- Types ---------------- */

type LogLevel = "log" | "info" | "warn" | "error" | "net";
type LogEntry = { level: LogLevel; time: string; text: string; data?: unknown };

type CapturedRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

type CapturedResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  parsed?: unknown;
  timeMs: number;
  ok: boolean;
  networkError?: string;
};

type RunRecord = {
  id: string;
  time: string;
  ts: number;
  code: string;
  status: number | "network" | "error" | "ok";
  request?: CapturedRequest;
  response?: CapturedResponse;
  logs: LogEntry[];
  result?: unknown;
  error?: string;
};

/* ---------------- Snippets ---------------- */

const SNIPPETS: Record<string, string> = {
  "auth.getUser": `const { data, error } = await supabase.auth.getUser();
console.log("user:", data.user);
if (error) console.error(error);`,

  "auth.getSession": `const { data, error } = await supabase.auth.getSession();
console.log("session:", data.session);
if (error) console.error(error);`,

  "auth.signUp (uses vars)": `const { data, error } = await supabase.auth.signUp({
  email: vars.email,
  password: vars.password,
  options: { emailRedirectTo: window.location.origin },
});
console.log("signUp:", data);
if (error) console.error(error);`,

  "auth.signInWithPassword (uses vars)": `const { data, error } = await supabase.auth.signInWithPassword({
  email: vars.email,
  password: vars.password,
});
console.log("signIn:", data);
if (error) console.error(error);`,

  "auth.signInWithOAuth (google)": `const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin + "/auth/callback" },
});
console.log("oauth:", data);
if (error) console.error(error);`,

  "auth.resetPasswordForEmail (uses vars)": `const { data, error } = await supabase.auth.resetPasswordForEmail(vars.email, {
  redirectTo: window.location.origin + "/reset-password",
});
console.log("reset:", data);
if (error) console.error(error);`,

  "auth.updateUser (password from vars)": `const { data, error } = await supabase.auth.updateUser({ password: vars.password });
console.log("update:", data);
if (error) console.error(error);`,

  "auth.signOut": `const { error } = await supabase.auth.signOut();
console.log("signed out");
if (error) console.error(error);`,

  "fetch (raw REST)": `const url = import.meta.env.VITE_SUPABASE_URL + "/rest/v1/settings?select=key,value";
const res = await fetch(url, {
  headers: {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: "Bearer " + import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
});
console.log("status:", res.status);
console.log(await res.json());`,
};

const DEFAULT_CODE = SNIPPETS["auth.getUser"];
const VARS_STORAGE_KEY = "admin-api-tester-vars";
const HISTORY_STORAGE_KEY = "admin-api-tester-history";
const CODE_STORAGE_KEY = "admin-api-tester-code";

/* ---------------- JSON Tree ---------------- */

const HIGHLIGHT_KEYS = new Set([
  "access_token", "refresh_token", "provider_token", "provider_refresh_token",
  "id_token", "token", "jwt", "apikey", "api_key",
  "id", "user", "user_id", "email", "phone", "role", "aud",
  "expires_at", "expires_in", "session",
]);

const isPrimitive = (v: unknown): boolean =>
  v === null || ["string", "number", "boolean", "undefined"].includes(typeof v);

const previewOf = (v: unknown): string => {
  if (v === null) return "null";
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === "object") return `{ ${Object.keys(v as object).slice(0, 3).join(", ")}${Object.keys(v as object).length > 3 ? ", …" : ""} }`;
  return String(v);
};

const PrimitiveValue = ({ value, keyName }: { value: unknown; keyName?: string }) => {
  const hl = keyName && HIGHLIGHT_KEYS.has(keyName);
  if (value === null) return <span className="text-zinc-500">null</span>;
  if (value === undefined) return <span className="text-zinc-500">undefined</span>;
  if (typeof value === "boolean") return <span className="text-purple-400">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-amber-300">{value}</span>;
  if (typeof value === "string") {
    const long = value.length > 80;
    return (
      <span className={hl ? "text-emerald-300 bg-emerald-950/40 px-1 rounded" : "text-green-300"}>
        {long ? `"${value.slice(0, 80)}…"` : `"${value}"`}
        {hl && long && <span className="ml-1 text-[10px] text-emerald-500">({value.length} chars)</span>}
      </span>
    );
  }
  return <span>{String(value)}</span>;
};

const JsonNode = ({
  data, name, depth = 0, defaultOpen,
}: { data: unknown; name?: string; depth?: number; defaultOpen?: boolean }) => {
  const isObj = data !== null && typeof data === "object";
  const [open, setOpen] = useState(defaultOpen ?? depth < 1);

  if (!isObj) {
    return (
      <div className="pl-4">
        {name !== undefined && (
          <span className={HIGHLIGHT_KEYS.has(name) ? "text-sky-300 font-semibold" : "text-sky-400"}>
            "{name}"
          </span>
        )}
        {name !== undefined && <span className="text-zinc-500">: </span>}
        <PrimitiveValue value={data} keyName={name} />
      </div>
    );
  }

  const arr = Array.isArray(data);
  const entries = arr
    ? (data as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);

  return (
    <div className={depth === 0 ? "" : "pl-4"}>
      <div
        className="cursor-pointer inline-flex items-center gap-1 select-none"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {name !== undefined && (
          <>
            <span className={HIGHLIGHT_KEYS.has(name) ? "text-sky-300 font-semibold" : "text-sky-400"}>
              "{name}"
            </span>
            <span className="text-zinc-500">: </span>
          </>
        )}
        <span className="text-zinc-400">{arr ? `[${entries.length}]` : previewOf(data)}</span>
      </div>
      {open && (
        <div className="border-l border-zinc-800 ml-1">
          {entries.map(([k, v]) => (
            <JsonNode key={k} name={arr ? undefined : k} data={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------------- Curl builder ---------------- */

const buildCurl = (req: CapturedRequest): string => {
  const parts = [`curl -X ${req.method} '${req.url}'`];
  for (const [k, v] of Object.entries(req.headers)) {
    parts.push(`  -H '${k}: ${String(v).replace(/'/g, "'\\''")}'`);
  }
  if (req.body) {
    parts.push(`  --data '${req.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n");
};

/* ---------------- Fetch capture ---------------- */

const headersToObj = (h: HeadersInit | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v, k) => (out[k] = v));
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = String(v);
  } else {
    for (const [k, v] of Object.entries(h)) out[k] = String(v);
  }
  return out;
};

const respHeadersToObj = (h: Headers): Record<string, string> => {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k] = v));
  return out;
};

const tryParseJson = (s: string): unknown => {
  try { return JSON.parse(s); } catch { return undefined; }
};

/* ---------------- Page ---------------- */

const AdminApiTester = () => {
  const { toast } = useToast();

  const [code, setCode] = useState<string>(() => localStorage.getItem(CODE_STORAGE_KEY) || DEFAULT_CODE);
  const [snippet, setSnippet] = useState<string>("auth.getUser");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  const [history, setHistory] = useState<RunRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"); } catch { return []; }
  });

  const [vars, setVars] = useState<{ email: string; password: string }>(() => {
    try { return JSON.parse(localStorage.getItem(VARS_STORAGE_KEY) || "{}"); }
    catch { return { email: "", password: "" }; }
  });

  const [outputTab, setOutputTab] = useState("response");
  const editorRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem(CODE_STORAGE_KEY, code); }, [code]);
  useEffect(() => { localStorage.setItem(VARS_STORAGE_KEY, JSON.stringify(vars)); }, [vars]);
  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  const push = (level: LogLevel, ...args: unknown[]): LogEntry => {
    const text = args.map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "string") return a;
      try { return JSON.stringify(a, null, 2); } catch { return String(a); }
    }).join(" ");
    const entry: LogEntry = {
      level, time: new Date().toLocaleTimeString(), text,
      data: args.length === 1 ? args[0] : args,
    };
    setLogs((l) => [...l, entry]);
    return entry;
  };

  const run = async () => {
    setRunning(true);
    setLogs([]);
    setLastRun(null);
    setOutputTab("response");

    const capturedLogs: LogEntry[] = [];
    let lastRequest: CapturedRequest | undefined;
    let lastResponse: CapturedResponse | undefined;

    const capture = (level: LogLevel, ...args: unknown[]) => {
      const e = push(level, ...args);
      capturedLogs.push(e);
    };
    const localConsole = {
      log:  (...a: unknown[]) => capture("log", ...a),
      info: (...a: unknown[]) => capture("info", ...a),
      warn: (...a: unknown[]) => capture("warn", ...a),
      error:(...a: unknown[]) => capture("error", ...a),
    };

    // Wrap window.fetch to capture request/response.
    const origFetch = window.fetch.bind(window);
    const wrappedFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? (input as Request).method : "GET")).toUpperCase();
      const headers = headersToObj(init?.headers ?? (typeof input !== "string" && !(input instanceof URL) ? (input as Request).headers : undefined));
      const body = typeof init?.body === "string" ? init.body : undefined;

      const req: CapturedRequest = { method, url, headers, body };
      lastRequest = req;

      const t0 = performance.now();
      try {
        const res = await origFetch(input as any, init);
        const clone = res.clone();
        const text = await clone.text().catch(() => "");
        const parsed = tryParseJson(text);
        lastResponse = {
          status: res.status,
          statusText: res.statusText,
          headers: respHeadersToObj(res.headers),
          body: text,
          parsed,
          timeMs: Math.round(performance.now() - t0),
          ok: res.ok,
        };
        if (!res.ok) {
          capture("net", `⚠ ${method} ${url} → ${res.status} ${res.statusText} (${lastResponse.timeMs}ms)`);
          if (parsed !== undefined) capture("error", "Response body:", parsed);
          else if (text) capture("error", "Response body:", text.slice(0, 500));
        } else {
          capture("net", `${method} ${url} → ${res.status} (${lastResponse.timeMs}ms)`);
        }
        return res;
      } catch (err: any) {
        const timeMs = Math.round(performance.now() - t0);
        lastResponse = {
          status: 0, statusText: "Network Error", headers: {}, body: "",
          timeMs, ok: false, networkError: err?.message || String(err),
        };
        capture("error", `✖ Network error on ${method} ${url}: ${err?.message || err} (${timeMs}ms)`);
        throw err;
      }
    };

    let result: unknown;
    let errText: string | undefined;
    try {
      window.fetch = wrappedFetch;
      const fn = new Function(
        "supabase", "console", "fetch", "vars",
        `"use strict"; return (async () => { ${code}\n })();`
      );
      result = await fn(supabase, localConsole, wrappedFetch, vars);
      if (result !== undefined) capture("info", "→ returned:", result);
    } catch (err: any) {
      errText = err?.message || String(err);
      capture("error", errText);
      if (err?.stack) capture("error", err.stack);
    } finally {
      window.fetch = origFetch;
      setRunning(false);
    }

    const status: RunRecord["status"] = lastResponse
      ? (lastResponse.networkError ? "network" : (lastResponse.ok ? "ok" : lastResponse.status))
      : (errText ? "error" : "ok");

    const record: RunRecord = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString(),
      ts: Date.now(),
      code,
      status,
      request: lastRequest,
      response: lastResponse,
      logs: capturedLogs,
      result,
      error: errText,
    };
    setLastRun(record);
    setHistory((h) => [record, ...h].slice(0, 30));
  };

  const loadSnippet = (key: string) => {
    setSnippet(key);
    setCode(SNIPPETS[key]);
  };

  const copyCurl = () => {
    if (!lastRun?.request) {
      toast({ title: "No request captured", description: "Run a snippet that makes an HTTP call first.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(buildCurl(lastRun.request));
    toast({ title: "Copied cURL to clipboard" });
  };

  const replay = (rec: RunRecord) => {
    setCode(rec.code);
    setTimeout(() => run(), 50);
  };

  const clearHistory = () => setHistory([]);

  const statusBadge = (s: RunRecord["status"]) => {
    if (s === "ok") return <Badge className="bg-green-500/10 text-green-700 border-green-200" variant="outline">OK</Badge>;
    if (s === "network") return <Badge className="bg-red-500/10 text-red-700 border-red-200" variant="outline">Network</Badge>;
    if (s === "error") return <Badge className="bg-red-500/10 text-red-700 border-red-200" variant="outline">Error</Badge>;
    const n = s as number;
    const cls = n < 300 ? "bg-green-500/10 text-green-700 border-green-200"
      : n < 400 ? "bg-sky-500/10 text-sky-700 border-sky-200"
      : "bg-red-500/10 text-red-700 border-red-200";
    return <Badge className={cls} variant="outline">{n}</Badge>;
  };

  const responseParsed = lastRun?.response?.parsed ?? lastRun?.result;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">API Tester (JS Playground)</h1>
          <p className="text-sm text-muted-foreground">
            Run JavaScript against the live backend. Auth debugging with structured responses, request history & cURL export.
          </p>
        </div>
      </div>

      {/* Variables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Variables
            <span className="text-xs font-normal text-muted-foreground">— available in snippets as <code>vars.email</code>, <code>vars.password</code></span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium mb-1 block">Email</label>
            <Input
              value={vars.email}
              onChange={(e) => setVars((v) => ({ ...v, email: e.target.value }))}
              placeholder="test@example.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Password</label>
            <Input
              type="password"
              value={vars.password}
              onChange={(e) => setVars((v) => ({ ...v, password: e.target.value }))}
              placeholder="Test@12345"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      {/* Code */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2 flex-wrap">
          <CardTitle className="text-base">Code</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={snippet} onValueChange={loadSnippet}>
              <SelectTrigger className="w-[280px] h-9"><SelectValue placeholder="Load snippet" /></SelectTrigger>
              <SelectContent>
                {Object.keys(SNIPPETS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={copyCurl} disabled={!lastRun?.request}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy as cURL
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLogs([])}>
              <Eraser className="h-3.5 w-3.5 mr-1" /> Clear logs
            </Button>
            <Button size="sm" onClick={run} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              Run
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Editor
              height="320px"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              onMount={(ed) => (editorRef.current = ed)}
              options={{
                minimap: { enabled: false }, fontSize: 13, lineNumbers: "on",
                tabSize: 2, scrollBeyondLastLine: false, automaticLayout: true,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            In scope: <code>supabase</code>, <code>console</code>, <code>fetch</code>, <code>vars</code>. Top-level <code>await</code> supported.
          </p>
        </CardContent>
      </Card>

      {/* Output */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Output
            {lastRun && <span className="ml-2">{statusBadge(lastRun.status)}</span>}
            {lastRun?.response && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {lastRun.response.timeMs}ms
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={outputTab} onValueChange={setOutputTab}>
            <TabsList>
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="console">Console ({logs.length})</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="history"><History className="h-3 w-3 mr-1" />History ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="response" className="mt-3">
              {lastRun?.response?.networkError && (
                <div className="mb-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-300">Network error</div>
                    <div className="text-xs text-red-600 dark:text-red-400 font-mono">{lastRun.response.networkError}</div>
                  </div>
                </div>
              )}
              <div className="bg-zinc-950 text-zinc-100 rounded-md p-3 font-mono text-xs min-h-[220px] max-h-[420px] overflow-auto">
                {responseParsed === undefined ? (
                  lastRun?.response?.body ? (
                    <pre className="whitespace-pre-wrap">{lastRun.response.body}</pre>
                  ) : (
                    <div className="text-zinc-500">No response yet. Click Run.</div>
                  )
                ) : (
                  <JsonNode data={responseParsed} defaultOpen />
                )}
              </div>
            </TabsContent>

            <TabsContent value="console" className="mt-3">
              <div className="bg-zinc-950 text-zinc-100 rounded-md p-3 font-mono text-xs h-[280px] overflow-auto">
                {logs.length === 0 ? (
                  <div className="text-zinc-500">No output yet.</div>
                ) : logs.map((l, i) => (
                  <div key={i} className={
                    l.level === "error" ? "text-red-400 whitespace-pre-wrap"
                    : l.level === "warn" ? "text-amber-300 whitespace-pre-wrap"
                    : l.level === "info" ? "text-sky-300 whitespace-pre-wrap"
                    : l.level === "net"  ? "text-fuchsia-300 whitespace-pre-wrap"
                    : "text-zinc-100 whitespace-pre-wrap"
                  }>
                    <span className="text-zinc-500">[{l.time}]</span> {l.text}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="request" className="mt-3">
              {!lastRun?.request ? (
                <div className="text-sm text-muted-foreground">No HTTP request captured for the last run.</div>
              ) : (
                <div className="bg-zinc-950 text-zinc-100 rounded-md p-3 font-mono text-xs overflow-auto max-h-[420px]">
                  <div className="mb-2">
                    <span className="text-amber-300">{lastRun.request.method}</span>{" "}
                    <span className="text-sky-300 break-all">{lastRun.request.url}</span>
                  </div>
                  <div className="text-zinc-400 mb-1">Headers:</div>
                  <JsonNode data={lastRun.request.headers} defaultOpen />
                  {lastRun.request.body && (
                    <>
                      <div className="text-zinc-400 mt-3 mb-1">Body:</div>
                      <pre className="whitespace-pre-wrap">{lastRun.request.body}</pre>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" onClick={clearHistory} disabled={!history.length}>
                  <Eraser className="h-3.5 w-3.5 mr-1" /> Clear history
                </Button>
              </div>
              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground">No runs yet.</div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto">
                  {history.map((r) => (
                    <div key={r.id} className="border rounded-md p-2 hover:bg-muted/40">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {statusBadge(r.status)}
                          <span className="text-xs text-muted-foreground">{r.time}</span>
                          {r.request && (
                            <span className="text-xs font-mono truncate">
                              {r.request.method} {r.request.url}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => { setLastRun(r); setLogs(r.logs); setOutputTab("response"); }}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => replay(r)}>
                            <Play className="h-3 w-3 mr-1" /> Replay
                          </Button>
                        </div>
                      </div>
                      <pre className="text-[11px] mt-1 text-muted-foreground line-clamp-2 whitespace-pre-wrap">{r.code}</pre>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApiTester;
