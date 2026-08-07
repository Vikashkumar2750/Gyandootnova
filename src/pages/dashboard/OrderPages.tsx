import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "@/hooks/useLocale";


const useMyOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: purchases } = await supabase.rpc("get_user_purchases", { _user_id: user!.id });
      const ids = (purchases ?? []).map((p: any) => p.book_id);
      const { data: books } = ids.length
        ? await supabase.from("books").select("id, title, slug, cover_url, price").in("id", ids)
        : { data: [] as any[] };
      const bookMap = new Map((books ?? []).map((b) => [b.id, b]));
      return (purchases ?? []).map((p: any) => ({
        ...p,
        amount: p.amount ?? bookMap.get(p.book_id)?.price ?? 0,
        book: bookMap.get(p.book_id),
      }));
    },
  });
};

const downloadInvoice = (p: any) => {
  const w = window.open("", "_blank");
  if (!w) return;
  const html = `<!doctype html><html><head><title>Invoice ${p.id.slice(0,8)}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:24px;color:#1a1a1a}
    h1{font-size:22px;margin:0 0 4px}.muted{color:#666;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:10px;border-bottom:1px solid #eee}
    .total{font-weight:700;font-size:16px}.brand{color:#a05a2c}
    @media print{.noprint{display:none}}</style></head><body>
    <h1 class="brand">GyandootNova</h1><div class="muted">https://gyandootnova.in</div>
    <h2>Invoice</h2>
    <div class="muted">Invoice ID: ${p.id}</div>
    <div class="muted">Date: ${new Date(p.created_at).toLocaleDateString()}</div>
    <div class="muted">Status: ${p.status}</div>
    <table><thead><tr><th>Item</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody><tr><td>${p.book?.title || p.book_id}</td><td style="text-align:right">${p.currency || "INR"} ${p.amount}</td></tr>
    <tr><td class="total">Total</td><td class="total" style="text-align:right">${p.currency || "INR"} ${p.amount}</td></tr></tbody></table>
    <p class="muted" style="margin-top:24px">Thank you for supporting original spiritual publishing.</p>
    <button class="noprint" onclick="window.print()" style="margin-top:24px;padding:8px 16px;background:#a05a2c;color:#fff;border:0;border-radius:6px;cursor:pointer">Print / Save as PDF</button>
    </body></html>`;
  w.document.write(html); w.document.close();
};

export const MyOrders = () => {
  const { data, isLoading } = useMyOrders();
  const { formatPrice } = useLocale();
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">My Orders</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="space-y-3">
          {(data ?? []).length === 0 && (
            <Card className="surface-card"><CardContent className="p-10 text-center">
              <Receipt className="mx-auto h-8 w-8 text-primary"/>
              <p className="mt-3 text-muted-foreground">Abhi tak koi order nahi.</p>
              <Button asChild className="mt-4" size="sm"><Link to="/books">Browse books</Link></Button>
            </CardContent></Card>
          )}
          {(data ?? []).map((p: any) => (
            <Card key={p.id} className="surface-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-16 w-12 bg-muted rounded shrink-0 overflow-hidden">
                  {p.book?.cover_url && <img src={p.book.cover_url} alt="" className="h-full w-full object-cover"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.book?.title || "Unknown book"}</div>
                  <div className="text-[11px] text-muted-foreground">Order #{p.id.slice(0,8)} • {new Date(p.created_at).toLocaleDateString()}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                    <span className="text-xs text-muted-foreground">{p.currency && p.currency !== "INR" ? `${p.currency} ${p.amount}` : formatPrice(p.amount)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {p.status === "completed" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => downloadInvoice(p)}>
                      <Download className="mr-1 h-3.5 w-3.5"/> Invoice
                    </Button>
                  )}
                  {p.book && <Button asChild size="sm" className="h-8 text-xs"><Link to={`/books/${p.book.slug}`}>Open</Link></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const InvoicesPage = () => {
  const { data, isLoading } = useMyOrders();
  const completed = (data ?? []).filter((p: any) => p.status === "completed");
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Invoices</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="surface-card divide-y divide-border/60">
          {completed.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{p.book?.title || p.book_id}</div>
                <div className="text-[11px] text-muted-foreground">#{p.id.slice(0,8)} • {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadInvoice(p)}><Download className="mr-1 h-3.5 w-3.5"/>Download</Button>
            </div>
          ))}
          {completed.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Koi invoice nahi.</div>}
        </div>
      )}
    </div>
  );
};

export const RefundStatus = () => {
  const { data, isLoading } = useMyOrders();
  const refunds = (data ?? []).filter((p: any) => ["refunded","refund_pending","cancelled"].includes(p.status));
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Refunds & Cancellations</h1>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="surface-card divide-y divide-border/60">
          {refunds.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{p.book?.title || p.book_id}</div>
                <div className="text-[11px] text-muted-foreground">#{p.id.slice(0,8)} • {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
          ))}
          {refunds.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Koi refund ya cancellation nahi.</div>}
        </div>
      )}
    </div>
  );
};
