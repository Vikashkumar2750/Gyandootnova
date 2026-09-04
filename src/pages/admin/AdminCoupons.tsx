import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Pencil, Trash2, Copy, RefreshCw, Layers, Download, CheckCircle2, BookOpen, X, Send, Mail } from "lucide-react";

type Book = { id: string; title: string; author: string };

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_order_amount: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  repurchase_only?: boolean;
  restricted_books?: Book[];
};

const defaultForm = {
  code: "",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: "",
  max_uses: "",
  min_order_amount: "",
  is_active: true,
  expires_at: "",
  repurchase_only: false,
};


const defaultBulkForm = {
  prefix: "",
  count: "5",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: "",
  max_uses: "1",
  min_order_amount: "",
  is_active: true,
  expires_at: "",
};

const generateCode = (prefix = "") => {
  const rand =
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase();
  return prefix ? `${prefix.toUpperCase()}-${rand}` : rand;
};

const AdminCoupons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(defaultBulkForm);
  const [bulkResult, setBulkResult] = useState<string[] | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Send coupon email state
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCoupon, setSendCoupon] = useState<Coupon | null>(null);
  const [sendEmails, setSendEmails] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // Fetch all books for the selector
  const { data: books } = useQuery({
    queryKey: ["admin-books-list"],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("id, title, author").order("title");
      return (data ?? []) as Book[];
    },
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // For each coupon, fetch its restricted books
      const couponList = (data ?? []) as unknown as Coupon[];
      const { data: couponBooks } = await supabase
        .from("coupon_books" as any)
        .select("coupon_id, book_id, books(id, title, author)");

      const cbMap: Record<string, Book[]> = {};
      for (const cb of (couponBooks ?? []) as any[]) {
        if (!cbMap[cb.coupon_id]) cbMap[cb.coupon_id] = [];
        if (cb.books) cbMap[cb.coupon_id].push(cb.books as Book);
      }
      return couponList.map((c) => ({ ...c, restricted_books: cbMap[c.id] ?? [] }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        code: values.code.toUpperCase().trim(),
        description: values.description || null,
        discount_type: values.discount_type,
        discount_value: Number(values.discount_value),
        max_uses: values.max_uses ? Number(values.max_uses) : null,
        min_order_amount: values.min_order_amount ? Number(values.min_order_amount) : 0,
        is_active: values.is_active,
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        repurchase_only: values.repurchase_only,
      };


      let couponId = editCoupon?.id;
      if (editCoupon) {
        const { error } = await supabase.from("coupons" as any).update(payload).eq("id", editCoupon.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("coupons" as any).insert(payload).select("id").single();
        if (error) throw error;
        couponId = (data as any).id;
      }

      // Sync book restrictions
      if (couponId) {
        // Delete existing restrictions then re-insert
        await supabase.from("coupon_books" as any).delete().eq("coupon_id", couponId);
        if (selectedBookIds.length > 0) {
          await supabase.from("coupon_books" as any).insert(
            selectedBookIds.map((book_id) => ({ coupon_id: couponId, book_id }))
          );
        }
      }
    },
    onSuccess: () => {
      toast({ title: editCoupon ? "Coupon updated!" : "Coupon created!" });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
      setEditCoupon(null);
      setForm(defaultForm);
      setSelectedBookIds([]);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Coupon deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleBulkGenerate = async () => {
    const count = Math.min(Math.max(Number(bulkForm.count) || 1, 1), 100);
    if (!bulkForm.discount_value) return;
    setBulkLoading(true);

    // Generate unique codes
    const codes = Array.from({ length: count }, () => generateCode(bulkForm.prefix));
    const payload = codes.map((code) => ({
      code,
      description: bulkForm.description || null,
      discount_type: bulkForm.discount_type,
      discount_value: Number(bulkForm.discount_value),
      max_uses: bulkForm.max_uses ? Number(bulkForm.max_uses) : null,
      min_order_amount: bulkForm.min_order_amount ? Number(bulkForm.min_order_amount) : 0,
      is_active: bulkForm.is_active,
      expires_at: bulkForm.expires_at ? new Date(bulkForm.expires_at).toISOString() : null,
    }));

    const { error } = await supabase.from("coupons" as any).insert(payload);
    setBulkLoading(false);
    if (error) {
      toast({ title: "Error generating coupons", description: error.message, variant: "destructive" });
      return;
    }
    setBulkResult(codes);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    toast({ title: `${count} coupons generated!` });
  };

  const downloadCodes = (codes: string[]) => {
    const content = codes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coupon-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendCouponEmail = async () => {
    if (!sendCoupon) return;
    setSendLoading(true);
    setSendResult(null);

    const emailList = sendEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const discountLabel =
      sendCoupon.discount_type === "percent"
        ? `${sendCoupon.discount_value}%`
        : `₹${sendCoupon.discount_value}`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-coupon-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            emails: emailList,
            coupon_code: sendCoupon.code,
            discount_label: discountLabel,
            description: sendCoupon.description,
            message: sendMessage,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send emails");
      setSendResult({ sent: result.sent, failed: result.failed });
      toast({ title: `Sent to ${result.sent} recipient${result.sent !== 1 ? "s" : ""}!` });
    } catch (err: any) {
      toast({ title: "Error sending emails", description: err.message, variant: "destructive" });
    } finally {
      setSendLoading(false);
    }
  };

  const openSendDialog = (coupon: Coupon) => {
    setSendCoupon(coupon);
    setSendEmails("");
    setSendMessage("");
    setSendResult(null);
    setSendOpen(true);
  };

  const openCreate = () => {
    setEditCoupon(null);
    setForm({ ...defaultForm, code: generateCode() });
    setSelectedBookIds([]);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_uses: coupon.max_uses != null ? String(coupon.max_uses) : "",
      min_order_amount: coupon.min_order_amount ? String(coupon.min_order_amount) : "",
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : "",
      repurchase_only: !!coupon.repurchase_only,
    });

    setSelectedBookIds((coupon.restricted_books ?? []).map((b) => b.id));
    setDialogOpen(true);
  };

  const toggleBook = (bookId: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const isExpired = (c: Coupon) => !!c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c: Coupon) => c.max_uses != null && c.used_count >= c.max_uses;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-3xl font-bold">Coupons</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setBulkResult(null); setBulkForm(defaultBulkForm); setBulkOpen(true); }}>
            <Layers className="h-4 w-4 mr-2" /> Bulk Generate
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Coupon
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Min. Order</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Books</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {coupons?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{c.code}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copied!" }); }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy code"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    {c.repurchase_only && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                        Repurchase only
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`} OFF
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.used_count} / {c.max_uses ?? "∞"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.min_order_amount ? `₹${c.min_order_amount}` : "None"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.expires_at
                      ? <span className={isExpired(c) ? "text-destructive" : ""}>{new Date(c.expires_at).toLocaleDateString("en-IN")}</span>
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {(c.restricted_books ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">All books</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {(c.restricted_books ?? []).slice(0, 2).map((b) => (
                          <Badge key={b.id} variant="secondary" className="text-xs truncate max-w-[100px]">{b.title}</Badge>
                        ))}
                        {(c.restricted_books ?? []).length > 2 && (
                          <Badge variant="outline" className="text-xs">+{(c.restricted_books ?? []).length - 2}</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isExpired(c) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isExhausted(c) ? (
                      <Badge variant="secondary">Exhausted</Badge>
                    ) : c.is_active ? (
                      <Badge className="bg-primary/10 text-primary border-primary/30">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(val) => toggleActiveMutation.mutate({ id: c.id, is_active: val })}
                      disabled={isExpired(c) || isExhausted(c)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" title="Send via Email" onClick={() => openSendDialog(c)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && coupons?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No coupons yet. Create your first coupon!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditCoupon(null); setForm(defaultForm); setSelectedBookIds([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Coupon Code *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE20"
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, code: generateCode() })} title="Generate random code">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. New Year Sale"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type *</Label>
                <Select value={form.discount_type} onValueChange={(v: "percent" | "fixed") => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  min="1"
                  max={form.discount_type === "percent" ? "100" : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percent" ? "e.g. 20" : "e.g. 50"}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Uses (blank = unlimited)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Min Order Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  placeholder="No minimum"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Expiry Date & Time (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> Book Restrictions
                <span className="text-xs text-muted-foreground font-normal ml-1">(leave empty = valid for all books)</span>
              </Label>
              <div className="mt-2 border rounded-md max-h-40 overflow-y-auto divide-y">
                {books?.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">No books found.</p>
                )}
                {books?.map((book) => {
                  const selected = selectedBookIds.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => toggleBook(book.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors ${selected ? "bg-primary/5" : ""}`}
                    >
                      <span className={selected ? "font-medium text-primary" : ""}>{book.title}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {selectedBookIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedBookIds.map((id) => {
                    const b = books?.find((b) => b.id === id);
                    return b ? (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {b.title}
                        <button type="button" onClick={() => toggleBook(id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="repurchase_only"
                  checked={form.repurchase_only}
                  onCheckedChange={(v) => setForm({ ...form, repurchase_only: v })}
                />
                <Label htmlFor="repurchase_only" className="font-medium">Repurchase only (returning customers)</Label>
              </div>
              <p className="text-xs text-muted-foreground pl-11">
                When enabled, this coupon works only for users who already have at least one completed purchase. First-time buyers will be blocked at checkout.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.code || !form.discount_value}
            >
              {saveMutation.isPending ? "Saving…" : editCoupon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>Yeh coupon permanently delete ho jayega. Yeh action undo nahi ho sakta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkResult(null); setBulkForm(defaultBulkForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Bulk Coupon Generator
            </DialogTitle>
            <DialogDescription>
              Generate multiple unique coupon codes at once for distribution campaigns.
            </DialogDescription>
          </DialogHeader>

          {bulkResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-5 w-5" />
                {bulkResult.length} coupons generated successfully!
              </div>
              <Textarea
                readOnly
                value={bulkResult.join("\n")}
                className="font-mono text-sm h-48 resize-none"
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => downloadCodes(bulkResult)}>
                  <Download className="h-4 w-4 mr-2" /> Download as .txt
                </Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(bulkResult.join("\n")); toast({ title: "All codes copied!" }); }}>
                  <Copy className="h-4 w-4 mr-2" /> Copy All
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => { setBulkResult(null); setBulkForm(defaultBulkForm); }}>
                Generate More
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Number of Codes (max 100)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Prefix (optional)</Label>
                  <Input
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                    placeholder="e.g. SALE"
                    className="mt-1 font-mono uppercase"
                    maxLength={8}
                  />
                </div>
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={bulkForm.description}
                  onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                  placeholder="e.g. Diwali Campaign 2025"
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type *</Label>
                  <Select value={bulkForm.discount_type} onValueChange={(v: "percent" | "fixed") => setBulkForm({ ...bulkForm, discount_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={bulkForm.discount_type === "percent" ? "100" : undefined}
                    value={bulkForm.discount_value}
                    onChange={(e) => setBulkForm({ ...bulkForm, discount_value: e.target.value })}
                    placeholder={bulkForm.discount_type === "percent" ? "e.g. 20" : "e.g. 50"}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Uses per Code</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bulkForm.max_uses}
                    onChange={(e) => setBulkForm({ ...bulkForm, max_uses: e.target.value })}
                    placeholder="1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Min Order (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bulkForm.min_order_amount}
                    onChange={(e) => setBulkForm({ ...bulkForm, min_order_amount: e.target.value })}
                    placeholder="No minimum"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Expiry Date & Time (optional)</Label>
                <Input
                  type="datetime-local"
                  value={bulkForm.expires_at}
                  onChange={(e) => setBulkForm({ ...bulkForm, expires_at: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="bulk_active"
                  checked={bulkForm.is_active}
                  onCheckedChange={(v) => setBulkForm({ ...bulkForm, is_active: v })}
                />
                <Label htmlFor="bulk_active">Activate immediately</Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleBulkGenerate}
                  disabled={bulkLoading || !bulkForm.discount_value || Number(bulkForm.count) < 1}
                >
                  {bulkLoading ? "Generating…" : `Generate ${bulkForm.count || 0} Codes`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Send Coupon Email Dialog */}
      <Dialog open={sendOpen} onOpenChange={(o) => { setSendOpen(o); if (!o) { setSendCoupon(null); setSendResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Send Coupon via Email
            </DialogTitle>
            <DialogDescription>
              {sendCoupon && (
                <span>Sending coupon <strong className="font-mono text-primary">{sendCoupon.code}</strong> ({sendCoupon.discount_type === "percent" ? `${sendCoupon.discount_value}%` : `₹${sendCoupon.discount_value}`} OFF)</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Emails sent!</p>
                  <p className="text-sm text-muted-foreground">
                    {sendResult.sent} delivered{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ""}
                  </p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setSendResult(null); setSendEmails(""); setSendMessage(""); }}>
                Send to More Recipients
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Recipient Emails *
                </Label>
                <Textarea
                  value={sendEmails}
                  onChange={(e) => setSendEmails(e.target.value)}
                  placeholder={"user1@example.com\nuser2@example.com, user3@example.com"}
                  className="mt-1 font-mono text-sm h-32 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate emails with new lines, commas, or semicolons.</p>
              </div>

              <div>
                <Label>Personal Message (optional)</Label>
                <Textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="e.g. As a valued customer, enjoy this exclusive discount on your next purchase!"
                  className="mt-1 text-sm h-20 resize-none"
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSendCouponEmail}
                  disabled={sendLoading || !sendEmails.trim()}
                >
                  {sendLoading ? (
                    "Sending…"
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Emails</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
