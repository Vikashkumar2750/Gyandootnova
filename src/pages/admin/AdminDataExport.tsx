import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, Download, Loader2, Plug, UploadCloud } from "lucide-react";

const AdminDataExport = () => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "postgres" | "mysql">(null);
  const [host, setHost] = useState(() => localStorage.getItem("mysql_host") ?? "");
  const [port, setPort] = useState(() => localStorage.getItem("mysql_port") ?? "3306");
  const [mysqlBusy, setMysqlBusy] = useState<null | "test" | "sync">(null);
  const [result, setResult] = useState<string>("");

  const runMysql = async (action: "test" | "sync") => {
    if (!host.trim()) {
      toast({ title: "Host चाहिए", description: "MySQL server का host/IP डालिए।", variant: "destructive" });
      return;
    }
    localStorage.setItem("mysql_host", host.trim());
    localStorage.setItem("mysql_port", port.trim() || "3306");
    setMysqlBusy(action);
    setResult("");
    try {
      const { data, error } = await supabase.functions.invoke("mysql-sync", {
        body: { action, host: host.trim(), port: Number(port) || 3306 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(JSON.stringify(data, null, 2));
      toast({
        title: action === "test" ? "Connection successful" : "Sync complete",
        description: action === "test" ? "MySQL से connection बन गया।" : "पूरा data MySQL में भेज दिया गया।",
      });
    } catch (e: any) {
      const msg = e?.context ? await e.context.text().catch(() => e.message) : e.message;
      setResult(String(msg));
      toast({ title: "MySQL failed", description: String(msg).slice(0, 200), variant: "destructive" });
    } finally {
      setMysqlBusy(null);
    }
  };


  const handleExport = async (dialect: "postgres" | "mysql") => {
    setBusy(dialect);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired — दोबारा login कीजिए।");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data-export?dialect=${dialect}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `gyandoot-full-export-${dialect}-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      toast({ title: "Export ready", description: "SQL file download हो गई है।" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Data Export</h1>
          <p className="text-sm text-muted-foreground">
            पूरी database एक single portable SQL file में download कीजिए।
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full database export (.sql)</CardTitle>
          <CardDescription>
            इस file में सभी tables का structure (CREATE TABLE) और पूरा data (INSERT statements) होता है।
            इसे किसी भी PostgreSQL-compatible database पर चलाइए — पूरा data वहाँ आ जाएगा।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>सभी public tables एक ही file में</li>
            <li>Structure + data, transaction (BEGIN/COMMIT) के अंदर</li>
            <li>Restore: <code>psql -d your_db -f gyandoot-full-export.sql</code></li>
            <li>File में personal data है — इसे सुरक्षित रखें।</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleExport("postgres")} disabled={!!busy}>
              {busy === "postgres" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              PostgreSQL export
            </Button>
            <Button variant="secondary" onClick={() => handleExport("mysql")} disabled={!!busy}>
              {busy === "mysql" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              MySQL export
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            MySQL file me database <code>gyandootnova</code>, user <code>AMRENDRA&amp;</code> aur uske grants
            already likhe hote hain — import ke baad password zaroor badal lijiye.
            Restore: <code>mysql -u root -p &lt; gyandoot-full-export-mysql.sql</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MySQL live connection</CardTitle>
          <CardDescription>
            अपने MySQL server से सीधे connect कीजिए और एक click में पूरा data वहाँ भेजिए।
            Database <code>gyandootnova</code> और user <code>amrendra_gyandoot</code> पहले से securely saved हैं —
            सिर्फ host/port दीजिए।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="mysql-host">MySQL host</Label>
              <Input
                id="mysql-host"
                placeholder="db.example.com या 123.45.67.89"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mysql-port">Port</Label>
              <Input
                id="mysql-port"
                placeholder="3306"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => runMysql("test")} disabled={!!mysqlBusy}>
              {mysqlBusy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Connection test
            </Button>
            <Button onClick={() => runMysql("sync")} disabled={!!mysqlBusy}>
              {mysqlBusy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              पूरा data MySQL में भेजिए
            </Button>
          </div>
          {result && (
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{result}</pre>
          )}
          <p className="text-xs text-muted-foreground">
            Sync सभी tables बनाता है और rows को <code>REPLACE INTO</code> से update करता है — बार-बार चला सकते हैं।
            Remote access और user grants MySQL server पर enabled होने चाहिए।
          </p>
        </CardContent>
      </Card>
    </div>
  );
};


export default AdminDataExport;
