import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminDonations = () => {
  const { data: donations } = useQuery({
    queryKey: ["admin-donations"],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("id, donor_name, donor_email, amount, status, created_at").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-6">Donations</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.donor_name || "Anonymous"}</TableCell>
                  <TableCell>{d.donor_email || "—"}</TableCell>
                  <TableCell className="font-medium">₹{d.amount}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${d.status === "completed" ? "text-green-600" : d.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {d.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {(!donations || donations.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No donations yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDonations;
