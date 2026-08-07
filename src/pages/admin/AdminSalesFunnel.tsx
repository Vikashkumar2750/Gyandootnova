import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingDown, ArrowDownRight } from "lucide-react";

type SalesEvent = {
  id: string;
  event: string;
  utm_source: string | null;
  utm_campaign: string | null;
  path: string | null;
  created_at: string;
};

const FUNNEL_STEPS: { event: string; label: string }[] = [
  { event: "view_books_list", label: "Viewed books list" },
  { event: "view_book", label: "Viewed a book" },
  { event: "view_offer_landing", label: "Viewed offer landing" },
  { event: "click_buy_now", label: "Clicked Buy Now" },
  { event: "begin_checkout", label: "Started checkout" },
  { event: "begin_guest_checkout", label: "Started guest checkout" },
  { event: "payment_success", label: "Paid ✅" },
];

const AdminSalesFunnel = () => {
  const [days, setDays] = useState<7 | 30 | 90>(7);

  const since = useMemo(
    () => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    [days]
  );

  const { data: events, isLoading } = useQuery({
    queryKey: ["sales-events", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("id, event, utm_source, utm_campaign, path, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as SalesEvent[];
    },
  });

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    (events ?? []).forEach((e) => {
      map[e.event] = (map[e.event] ?? 0) + 1;
    });
    return map;
  }, [events]);

  const funnelRows = useMemo(() => {
    const rows = FUNNEL_STEPS.map((s) => ({ ...s, count: counts[s.event] ?? 0 }));
    const maxCount = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r, i) => ({
      ...r,
      widthPct: (r.count / maxCount) * 100,
      dropoffPct:
        i === 0 || rows[i - 1].count === 0
          ? null
          : Math.round(((rows[i - 1].count - r.count) / rows[i - 1].count) * 100),
      convPct:
        i === 0 || rows[i - 1].count === 0
          ? null
          : Math.round((r.count / rows[i - 1].count) * 100),
    }));
  }, [counts]);

  const utmBreakdown = useMemo(() => {
    const map = new Map<string, { source: string; views: number; sales: number }>();
    (events ?? []).forEach((e) => {
      const src = e.utm_source ?? "(direct)";
      const cur = map.get(src) ?? { source: src, views: 0, sales: 0 };
      if (
        e.event === "view_books_list" ||
        e.event === "view_book" ||
        e.event === "view_offer_landing"
      )
        cur.views += 1;
      if (e.event === "payment_success") cur.sales += 1;
      map.set(src, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.sales - a.sales || b.views - a.views)
      .slice(0, 10);
  }, [events]);

  const totalPaid = counts["payment_success"] ?? 0;
  const totalViews =
    (counts["view_books_list"] ?? 0) +
    (counts["view_book"] ?? 0) +
    (counts["view_offer_landing"] ?? 0);
  const overallConv = totalViews > 0 ? ((totalPaid / totalViews) * 100).toFixed(2) : "0";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Sales Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Har step par kitne users drop-off hue — poora conversion picture.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {([7, 30, 90] as const).map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "ghost"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total events</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{events?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{totalPaid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  View → Paid conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overallConv}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Funnel breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnelRows.map((row) => (
                <div key={row.event} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.label}</span>
                    <div className="flex items-center gap-3">
                      {row.dropoffPct != null && row.dropoffPct > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <TrendingDown className="h-3 w-3" /> -{row.dropoffPct}%
                        </span>
                      )}
                      {row.convPct != null && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <ArrowDownRight className="h-3 w-3" /> {row.convPct}%
                        </span>
                      )}
                      <span className="w-12 text-right font-mono text-sm font-semibold">
                        {row.count}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${row.widthPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* UTM sources */}
          <Card>
            <CardHeader>
              <CardTitle>Top traffic sources</CardTitle>
            </CardHeader>
            <CardContent>
              {utmBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No UTM data yet. Add <code>?utm_source=whatsapp</code> to your share links.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Source</th>
                      <th className="py-2 text-right">Views</th>
                      <th className="py-2 text-right">Sales</th>
                      <th className="py-2 text-right">Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utmBreakdown.map((r) => (
                      <tr key={r.source} className="border-b">
                        <td className="py-2 font-medium">{r.source}</td>
                        <td className="py-2 text-right">{r.views}</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">
                          {r.sales}
                        </td>
                        <td className="py-2 text-right">
                          {r.views > 0 ? ((r.sales / r.views) * 100).toFixed(1) : "0"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Recent events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent 20 events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Event</th>
                      <th className="py-2">Path</th>
                      <th className="py-2">Source</th>
                      <th className="py-2 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(events ?? []).slice(0, 20).map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="py-2 font-mono text-xs">{e.event}</td>
                        <td className="py-2 truncate text-xs text-muted-foreground max-w-[240px]">
                          {e.path ?? "-"}
                        </td>
                        <td className="py-2 text-xs">{e.utm_source ?? "-"}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminSalesFunnel;
