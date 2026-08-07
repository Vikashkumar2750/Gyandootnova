import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const AdminReferrals = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: referrals } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (!data?.length) return [];

      // Get book titles and referrer emails
      const bookIds = [...new Set(data.map((r: any) => r.book_id))];
      const userIds = [...new Set(data.map((r: any) => r.referrer_user_id))];

      const [{ data: books }, { data: profiles }] = await Promise.all([
        supabase.from("books").select("id, title").in("id", bookIds),
        supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
      ]);

      return data.map((r: any) => ({
        ...r,
        book_title: books?.find((b) => b.id === r.book_id)?.title ?? "—",
        referrer_name: profiles?.find((p) => p.user_id === r.referrer_user_id)?.display_name ?? r.referrer_user_id.slice(0, 8),
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("referrals")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast({ title: "Referral status updated" });
    },
  });

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6">Referrals</h1>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.referrer_name}</TableCell>
                  <TableCell>{r.book_title}</TableCell>
                  <TableCell>{r.commission_percent}%</TableCell>
                  <TableCell className="font-medium">₹{r.commission_amount}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!referrals || referrals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No referrals yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferrals;
