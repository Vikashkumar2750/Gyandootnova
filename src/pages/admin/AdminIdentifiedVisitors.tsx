import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, User, Mail, Phone, MapPin, Globe2, Monitor } from "lucide-react";

interface Row {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  ip_address: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  landing_path: string | null;
  referrer: string | null;
  created_at: string;
}

interface Grouped {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visits: number;
  lastVisit: string;
  firstVisit: string;
  countries: string[];
  devices: string[];
  latest: Row;
}

const flag = (cc: string | null) => {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65) +
         String.fromCodePoint(A + cc.toUpperCase().charCodeAt(1) - 65);
};

const AdminIdentifiedVisitors = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // Only rows with user identity (from cookies/session)
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("visitor_logs" as any)
        .select("*")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    // Backfill name/phone from profiles for older rows
    const missing = Array.from(new Set(
      (all as Row[]).filter(r => !r.user_name || !r.user_email).map(r => r.user_id!)
    ));
    if (missing.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", missing);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      (all as Row[]).forEach(r => {
        const p: any = map.get(r.user_id!);
        if (p) {
          r.user_name = r.user_name ?? p.display_name ?? null;
          r.user_phone = r.user_phone ?? p.phone ?? null;
        }
      });
    }
    setRows(all as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped: Grouped[] = useMemo(() => {
    const map = new Map<string, Grouped>();
    rows.forEach(r => {
      if (!r.user_id) return;
      const g = map.get(r.user_id);
      if (!g) {
        map.set(r.user_id, {
          user_id: r.user_id,
          name: r.user_name,
          email: r.user_email,
          phone: r.user_phone,
          visits: 1,
          lastVisit: r.created_at,
          firstVisit: r.created_at,
          countries: [r.country].filter(Boolean) as string[],
          devices: [r.device_type].filter(Boolean) as string[],
          latest: r,
        });
      } else {
        g.visits += 1;
        if (r.created_at > g.lastVisit) { g.lastVisit = r.created_at; g.latest = r; }
        if (r.created_at < g.firstVisit) g.firstVisit = r.created_at;
        if (r.country && !g.countries.includes(r.country)) g.countries.push(r.country);
        if (r.device_type && !g.devices.includes(r.device_type)) g.devices.push(r.device_type);
        g.name = g.name ?? r.user_name;
        g.email = g.email ?? r.user_email;
        g.phone = g.phone ?? r.user_phone;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [rows]);

  const filtered = grouped.filter(g => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (g.name ?? "").toLowerCase().includes(s) ||
      (g.email ?? "").toLowerCase().includes(s) ||
      (g.phone ?? "").toLowerCase().includes(s) ||
      g.countries.some(c => c.toLowerCase().includes(s))
    );
  });

  const exportCsv = () => {
    const headers = ["User ID","Name","Email","Phone","Visits","First Visit","Last Visit","Countries","Devices","Last IP","Last City","Last Country","Last Landing","Last Referrer"];
    const csv = [headers, ...filtered.map(g => [
      g.user_id, g.name, g.email, g.phone, g.visits, g.firstVisit, g.lastVisit,
      g.countries.join("|"), g.devices.join("|"),
      g.latest.ip_address, g.latest.city, g.latest.country, g.latest.landing_path, g.latest.referrer,
    ])].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `identified-visitors-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalVisits = grouped.reduce((s, g) => s + g.visits, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Identified Visitors</h1>
          <p className="text-sm text-muted-foreground">
            Visitors captured with logged-in identity (name, email, phone) from the session cookie.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Identified Users</div><div className="text-2xl font-bold">{grouped.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Visits (logged-in)</div><div className="text-2xl font-bold">{totalVisits}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Countries</div><div className="text-2xl font-bold">{new Set(grouped.flatMap(g => g.countries)).size}</div></Card>
      </div>

      <Input placeholder="Search by name, email, phone, country..." value={q} onChange={(e) => setQ(e.target.value)} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Visits</th>
                <th className="p-3">Last Visit</th>
                <th className="p-3">Last Location</th>
                <th className="p-3">Last Device</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <Fragment key={g.user_id}>
                  <tr className="border-t hover:bg-muted/30">

                    <td className="p-3">
                      <div className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{g.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{g.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="p-3">
                      {g.email && <div className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />{g.email}</div>}
                      {g.phone && <div className="text-xs flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{g.phone}</div>}
                      {!g.email && !g.phone && <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3"><Badge>{g.visits}</Badge></td>
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(g.lastVisit).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="text-xs flex items-center gap-1">
                        <span>{flag(g.latest.country_code)}</span>
                        {g.latest.city ?? "—"}, {g.latest.country ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{g.latest.ip_address}</div>
                    </td>
                    <td className="p-3 text-xs">
                      <div className="flex items-center gap-1"><Monitor className="h-3 w-3" />{g.latest.device_type}</div>
                      <div className="text-muted-foreground">{g.latest.browser} · {g.latest.os}</div>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === g.user_id ? null : g.user_id)}>
                        {expanded === g.user_id ? "Hide" : "View all"}
                      </Button>
                    </td>
                  </tr>
                  {expanded === g.user_id && (
                    <tr key={g.user_id + "-exp"} className="bg-muted/20">
                      <td colSpan={7} className="p-3">
                        <div className="text-xs font-semibold mb-2">All visits ({g.visits})</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {rows.filter(r => r.user_id === g.user_id).map(r => (
                            <div key={r.id} className="grid grid-cols-6 gap-2 text-xs py-1 border-b border-border/40">
                              <span>{new Date(r.created_at).toLocaleString()}</span>
                              <span className="font-mono">{r.ip_address ?? "—"}</span>
                              <span>{flag(r.country_code)} {r.city ?? "—"}, {r.country ?? "—"}</span>
                              <span>{r.device_type} · {r.browser}</span>
                              <span className="font-mono truncate">{r.landing_path ?? "/"}</span>
                              <span className="truncate text-muted-foreground">{r.referrer ?? "Direct"}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No identified visitors yet. Users must be logged in for name/email/phone to be captured.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminIdentifiedVisitors;
