import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminPurchases = () => {
  const { data: purchases } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
<<<<<<< HEAD
      const { data } = await supabase.from("purchases").select("id, book_id, user_id, status, razorpay_payment_id, created_at, amount, currency, books(title, price)").order("created_at", { ascending: false });
=======
      const { data } = await supabase.from("purchases").select("id, book_id, user_id, status, razorpay_payment_id, created_at, books(title)").order("created_at", { ascending: false });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      return data ?? [];
    },
  });

<<<<<<< HEAD
  const formatAmount = (p: any) => {
    // Prefer the frozen amount stored at time of purchase; fall back to current book price for legacy rows.
    const value = p.amount != null ? Number(p.amount) : (p.books?.price != null ? Number(p.books.price) : null);
    if (value == null) return "—";
    const currency = p.currency || "INR";
    const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : `${currency} `;
    return `${symbol}${value.toLocaleString()}`;
  };

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6">Purchases</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
<<<<<<< HEAD
                <TableHead>Amount</TableHead>
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                <TableHead>Status</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.books?.title ?? "—"}</TableCell>
<<<<<<< HEAD
                  <TableCell className="text-sm">{formatAmount(p)}</TableCell>
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
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
<<<<<<< HEAD
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No purchases yet.</TableCell></TableRow>
=======
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No purchases yet.</TableCell></TableRow>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPurchases;
