import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, Heart, Bookmark, BarChart2, ShieldOff, ShieldCheck, Eye, Shield } from "lucide-react";
import ManageUserRolesDialog from "@/components/admin/ManageUserRolesDialog";
import { useAuth } from "@/hooks/useAuth";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  display_name: string | null;
  role: string;
};

type UserHistory = {
  purchases: any[];
  donations: any[];
  reading: any[];
  bookmarks: any[];
};

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { perms, isAdmin } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [confirmDisableUser, setConfirmDisableUser] = useState<UserRow | null>(null);
  const [rolesUser, setRolesUser] = useState<UserRow | null>(null);

  const canManageRoles = isAdmin || perms.users;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      return json.users as UserRow[];
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-user-history", selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?user_id=${selectedUser!.id}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch user history");
      return res.json() as Promise<UserHistory>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ user_id, action }: { user_id: string; action: "enable" | "disable" }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id, action }),
        },
      );
      if (!res.ok) throw new Error("Failed to update user");
    },
    onSuccess: (_, { action }) => {
      toast({ title: `User ${action === "disable" ? "disabled" : "enabled"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const isDisabled = (user: UserRow) =>
    !!user.banned_until && new Date(user.banned_until) > new Date();

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl font-bold">Users</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading users…</TableCell>
                </TableRow>
              )}
              {data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString("en-IN")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {isDisabled(user) ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> History
                      </Button>
                      {canManageRoles && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRolesUser(user)}
                        >
                          <Shield className="h-4 w-4 mr-1" /> Roles
                        </Button>
                      )}
                      {isDisabled(user) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 border-emerald-600 hover:bg-accent"
                          onClick={() => toggleMutation.mutate({ user_id: user.id, action: "enable" })}
                          disabled={toggleMutation.isPending}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" /> Enable
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDisableUser(user)}
                          disabled={toggleMutation.isPending || user.role === "admin"}
                          title={user.role === "admin" ? "Admin accounts cannot be disabled" : "Disable user account"}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" /> Disable
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User History Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              User History — {selectedUser?.display_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {historyLoading && <p className="text-muted-foreground text-sm py-4">Loading history…</p>}

          {history && (
            <Tabs defaultValue="purchases">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="purchases">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Purchases ({history.purchases.length})
                </TabsTrigger>
                <TabsTrigger value="donations">
                  <Heart className="h-4 w-4 mr-1" />
                  Donations ({history.donations.length})
                </TabsTrigger>
                <TabsTrigger value="reading">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Reading ({history.reading.length})
                </TabsTrigger>
                <TabsTrigger value="bookmarks">
                  <Bookmark className="h-4 w-4 mr-1" />
                  Bookmarks ({history.bookmarks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="purchases">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Book</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment ID</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.purchases.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.books?.title ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.razorpay_payment_id || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                        {history.purchases.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No purchases</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="donations">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.donations.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">₹{d.amount}</TableCell>
                            <TableCell>
                              <Badge variant={d.status === "completed" ? "default" : "secondary"}>{d.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                        {history.donations.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No donations</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reading">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Book</TableHead>
                          <TableHead>Chapter</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Last Read</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.reading.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.books?.title ?? "—"}</TableCell>
                            <TableCell className="text-sm">Ch. {r.chapter_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-1.5">
                                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${r.scroll_percent}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{Math.round(r.scroll_percent)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                        {history.reading.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No reading progress</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookmarks">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Book</TableHead>
                          <TableHead>Chapter</TableHead>
                          <TableHead>Saved On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.bookmarks.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.book_title || "—"}</TableCell>
                            <TableCell className="text-sm">{b.chapter_title || `Ch. ${b.chapter_number}`}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(b.created_at).toLocaleDateString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                        {history.bookmarks.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No bookmarks</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {/* Confirm Disable Dialog */}
      <AlertDialog open={!!confirmDisableUser} onOpenChange={(o) => !o && setConfirmDisableUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDisableUser?.display_name || confirmDisableUser?.email}</strong> ka account disable ho jayega.
              Yeh user ab login nahi kar payega jab tak aap account dobara enable na karein.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDisableUser) {
                  toggleMutation.mutate({ user_id: confirmDisableUser.id, action: "disable" });
                  setConfirmDisableUser(null);
                }
              }}
            >
              Yes, Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageUserRolesDialog
        userId={rolesUser?.id ?? null}
        userLabel={rolesUser?.display_name || rolesUser?.email}
        open={!!rolesUser}
        onOpenChange={(o) => !o && setRolesUser(null)}
      />
    </div>
  );
};

export default AdminUsers;
