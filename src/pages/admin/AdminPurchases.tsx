import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatAmount as fmtCurrency, type CurrencyCode } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminPurchases = () => {
  const { data: purchases } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const { data } = await supabase.from("purchases").select("id, book_id, user_id, status, razorpay_payment_id, created_at, amount, currency, payment_gateway, books(title, price)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const formatAmount = (p: any) => {
    // Prefer the frozen amount stored at time of purchase; fall back to current book price for legacy rows.
    const value = p.amount != null ? Number(p.amount) : (p.books?.price != null ? Number(p.books.price) : null);
    if (value == null) return "—";
    const currency = (p.currency || "INR") as CurrencyCode;
    return `${fmtCurrency(value, currency)} ${currency}`;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6">Purchases</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.books?.title ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatAmount(p)}</TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">{p.payment_gateway ?? "razorpay"}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${p.status === "completed" ? "text-green-600" : "text-muted-foreground"}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.razorpay_payment_id || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {(!purchases || purchases.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchases yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPurchases;
