import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AdminRole } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

type Props = {
  userId: string | null;
  userLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ASSIGNABLE_ROLES: { role: AdminRole; label: string; description: string; adminOnly?: boolean }[] = [
  { role: "admin", label: "Super Admin", description: "Full access. Only Super Admin can grant this.", adminOnly: true },
  { role: "books_manager", label: "Books Manager", description: "Books, chapters, files." },
  { role: "seo_manager", label: "SEO / Blog Manager", description: "Posts, keywords, SEO command." },
  { role: "payments_manager", label: "Payments Manager", description: "Purchases, coupons, donations." },
  { role: "users_manager", label: "Users Manager", description: "Enquiries, team, role assignment." },
  { role: "support", label: "Support", description: "Read-only admin panel entry." },
];

const ManageUserRolesDialog = ({ userId, userLabel, open, onOpenChange }: Props) => {
  const { isAdmin, user } = useAuth();
  const [current, setCurrent] = useState<Set<AdminRole>>(new Set());
  const [selected, setSelected] = useState<Set<AdminRole>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSelf = !!user && !!userId && user.id === userId;

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        toast.error(`Failed to load roles: ${error.message}`);
        setCurrent(new Set());
        setSelected(new Set());
      } else {
        const roles = new Set(((data ?? []) as any[]).map((r) => r.role as AdminRole));
        setCurrent(roles);
        setSelected(new Set(roles));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  const toggle = (role: AdminRole) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };

  const save = async () => {
    if (!userId) return;
    if (isSelf) {
      toast.error("Aap apni roles khud edit nahi kar sakte. Kisi doosre Super Admin se karvayein.");
      return;
    }
    setSaving(true);
    try {
      const toAdd = [...selected].filter((r) => !current.has(r));
      const toRemove = [...current].filter((r) => !selected.has(r));

      for (const role of toAdd) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw new Error(`Add ${role}: ${error.message}`);
      }
      for (const role of toRemove) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw new Error(`Remove ${role}: ${error.message}`);
      }
      toast.success("Roles updated");
      setCurrent(new Set(selected));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save roles");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Manage Roles
          </DialogTitle>
          <DialogDescription>{userLabel || "User"}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {isSelf && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                Ye aapka apna account hai. Apni roles aap khud edit nahi kar sakte — kisi doosre Super Admin se karvayein.
              </div>
            )}
            {ASSIGNABLE_ROLES.map((r) => {
              const disabled = isSelf || (r.adminOnly && !isAdmin);
              return (
                <label
                  key={r.role}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(r.role)}
                    disabled={disabled}
                    onCheckedChange={() => !disabled && toggle(r.role)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.description}</div>
                  </div>
                </label>
              );
            })}
            {!isAdmin && !isSelf && (
              <p className="text-xs text-muted-foreground">
                Only Super Admins can grant or revoke the Super Admin role.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading || isSelf}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Roles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageUserRolesDialog;
