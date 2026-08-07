import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, Monitor, Smartphone, Tablet, ExternalLink, Download, User } from "lucide-react";

interface VisitorLog {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  ip_address: string | null;


  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  landing_path: string | null;
  language: string | null;
  screen: string | null;
  created_at: string;
}

const DeviceIcon = ({ type }: { type: string | null }) => {
  if (type === "Mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "Tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

const flag = (cc: string | null) => {
  if (!cc || cc.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65) +
         String.fromCodePoint(A + cc.toUpperCase().charCodeAt(1) - 65);
};

const AdminVisitors = () => {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [q, setQ] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fTimeFrom, setFTimeFrom] = useState("");
  const [fTimeTo, setFTimeTo] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fDevice, setFDevice] = useState("");
  const [fBrowser, setFBrowser] = useState("");
  const [fOs, setFOs] = useState("");
  const [fLanding, setFLanding] = useState("");
  const [fReferrer, setFReferrer] = useState("");

  const [loading, setLoading] = useState(true);


  const load = async () => {
    setLoading(true);
    // Fetch ALL rows (unlimited) using pagination — Supabase caps single request at 1000.
    const all: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("visitor_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
    }
    const rows: VisitorLog[] = all as any;
    // Backfill user_name from profiles for older logs missing user_name
    const missingIds = Array.from(new Set(rows.filter(r => r.user_id && !r.user_name).map(r => r.user_id))) as string[];
    if (missingIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", missingIds);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      rows.forEach(r => {
        if (r.user_id && !r.user_name) {
          const p: any = map.get(r.user_id);
          if (p) {
            r.user_name = p.display_name ?? null;
            (r as any).user_phone = (r as any).user_phone ?? p.phone ?? null;
          }
        }
      });
    }
    setLogs(rows);
    setLoading(false);
  };



  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) => {
    // Free-text search
    if (q) {
      const s = q.toLowerCase();
      const hit =
        (l.country ?? "").toLowerCase().includes(s) ||
        (l.city ?? "").toLowerCase().includes(s) ||
        (l.ip_address ?? "").toLowerCase().includes(s) ||
        (l.user_email ?? "").toLowerCase().includes(s) ||
        (l.user_name ?? "").toLowerCase().includes(s) ||
        (l.user_phone ?? "").toLowerCase().includes(s) ||
        (l.browser ?? "").toLowerCase().includes(s) ||
        (l.os ?? "").toLowerCase().includes(s) ||
        (l.landing_path ?? "").toLowerCase().includes(s) ||
        (l.referrer ?? "").toLowerCase().includes(s);
      if (!hit) return false;
    }
    const dt = new Date(l.created_at);
    if (fDateFrom && dt < new Date(fDateFrom)) return false;
    if (fDateTo) { const end = new Date(fDateTo); end.setDate(end.getDate() + 1); if (dt >= end) return false; }
    const hhmm = dt.toTimeString().slice(0, 5);
    if (fTimeFrom && hhmm < fTimeFrom) return false;
    if (fTimeTo && hhmm > fTimeTo) return false;
    if (fCountry && l.country !== fCountry) return false;
    if (fLocation) {
      const loc = `${l.city ?? ""} ${l.region ?? ""} ${l.country ?? ""}`.toLowerCase();
      if (!loc.includes(fLocation.toLowerCase())) return false;
    }
    if (fDevice && l.device_type !== fDevice) return false;
    if (fBrowser && l.browser !== fBrowser) return false;
    if (fOs && l.os !== fOs) return false;
    if (fLanding && !(l.landing_path ?? "").toLowerCase().includes(fLanding.toLowerCase())) return false;
    if (fReferrer) {
      if (fReferrer === "__direct__") { if (l.referrer) return false; }
      else if (!(l.referrer ?? "").toLowerCase().includes(fReferrer.toLowerCase())) return false;
    }
    return true;
  });

  const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean) as string[])).sort();
  const countries = uniq(logs.map((l) => l.country));
  const devices = uniq(logs.map((l) => l.device_type));
  const browsers = uniq(logs.map((l) => l.browser));
  const oses = uniq(logs.map((l) => l.os));

  const clearFilters = () => {
    setQ(""); setFDateFrom(""); setFDateTo(""); setFTimeFrom(""); setFTimeTo("");
    setFCountry(""); setFLocation(""); setFDevice(""); setFBrowser(""); setFOs("");
    setFLanding(""); setFReferrer("");
  };


  const stats = {
    total: logs.length,
    countries: new Set(logs.map((l) => l.country).filter(Boolean)).size,
    mobile: logs.filter((l) => l.device_type === "Mobile").length,
    direct: logs.filter((l) => !l.referrer).length,
  };

  const exportCsv = () => {
    const headers = ["Time","IP","Country","Region","City","Device","Browser","OS","Referrer","Landing","ISP","Language"];
    const rows = filtered.map((l) => [
      l.created_at, l.ip_address, l.country, l.region, l.city,
      l.device_type, l.browser, l.os, l.referrer, l.landing_path, l.isp, l.language,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `visitors-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Visitor Analytics</h1>
          <p className="text-sm text-muted-foreground">See where your visitors come from — IP, location, device.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 border-primary/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Filters</h3>
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Date from</label>
            <Input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date to</label>
            <Input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Time from</label>
            <Input type="time" value={fTimeFrom} onChange={(e) => setFTimeFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Time to</label>
            <Input type="time" value={fTimeTo} onChange={(e) => setFTimeTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Country</label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={fCountry} onChange={(e) => setFCountry(e.target.value)}>
              <option value="">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Location (city/region)</label>
            <Input placeholder="e.g. Mumbai" value={fLocation} onChange={(e) => setFLocation(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Device</label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={fDevice} onChange={(e) => setFDevice(e.target.value)}>
              <option value="">All devices</option>
              {devices.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Browser</label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={fBrowser} onChange={(e) => setFBrowser(e.target.value)}>
              <option value="">All browsers</option>
              {browsers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">OS</label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={fOs} onChange={(e) => setFOs(e.target.value)}>
              <option value="">All OS</option>
              {oses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Landing path</label>
            <Input placeholder="/books" value={fLanding} onChange={(e) => setFLanding(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Referrer (host) — use __direct__ for none</label>
            <Input placeholder="google.com" value={fReferrer} onChange={(e) => setFReferrer(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Search</label>
            <Input placeholder="country, city, IP, email..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {logs.length} visits</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Visits</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Countries</div><div className="text-2xl font-bold">{stats.countries}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Mobile Visits</div><div className="text-2xl font-bold">{stats.mobile}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Direct (no referrer)</div><div className="text-2xl font-bold">{stats.direct}</div></Card>
      </div>



      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Location</th>
                <th className="p-3">IP / ISP</th>
                <th className="p-3">Device</th>
                <th className="p-3">Browser / OS</th>
                <th className="p-3">Landing</th>
                <th className="p-3">Referrer</th>
                <th className="p-3">Map</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{flag(l.country_code)}</span>
                      <div>
                        <div className="font-medium">{l.country ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{[l.city, l.region].filter(Boolean).join(", ") || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-xs">{l.ip_address ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">{l.isp ?? ""}</div>
                    {(l.user_name || l.user_email || l.user_phone || l.user_id) ? (
                      <div className="mt-1 space-y-0.5">
                        <div className="text-xs text-primary truncate max-w-[200px] flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />{l.user_name ?? l.user_id?.slice(0,8) ?? "—"}
                        </div>
                        {l.user_email && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{l.user_email}</div>}
                        {l.user_phone && <div className="text-xs text-muted-foreground">{l.user_phone}</div>}
                      </div>
                    ) : null}



                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1"><DeviceIcon type={l.device_type} /> <span>{l.device_type ?? "—"}</span></div>
                    <div className="text-xs text-muted-foreground">{l.screen}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="mr-1">{l.browser ?? "—"}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">{l.os ?? ""}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs font-mono truncate max-w-[180px]">{l.landing_path ?? "/"}</div>
                    <div className="text-xs text-muted-foreground">{l.language}</div>
                  </td>
                  <td className="p-3">
                    {l.referrer ? (
                      <a href={l.referrer} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 max-w-[180px] truncate">
                        {new URL(l.referrer).hostname} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Direct</span>
                    )}
                  </td>
                  <td className="p-3">
                    {l.latitude && l.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" /> Open
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No visitor logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminVisitors;
