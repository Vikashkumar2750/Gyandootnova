<<<<<<< HEAD
import { useEffect, useState, createContext, useContext, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AdminRole =
  | "admin"
  | "books_manager"
  | "seo_manager"
  | "payments_manager"
  | "users_manager"
  | "support";

export type AdminArea = "books" | "seo" | "payments" | "users";

export interface AdminPermissions {
  isSuperAdmin: boolean;
  hasAdminAccess: boolean;
  books: boolean;
  seo: boolean;
  payments: boolean;
  users: boolean;
}

=======
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
<<<<<<< HEAD
  roles: AdminRole[];
  perms: AdminPermissions;
  signOut: () => Promise<void>;
}

const emptyPerms: AdminPermissions = {
  isSuperAdmin: false,
  hasAdminAccess: false,
  books: false,
  seo: false,
  payments: false,
  users: false,
};

=======
  signOut: () => Promise<void>;
}

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
<<<<<<< HEAD
  roles: [],
  perms: emptyPerms,
  signOut: async () => {},
});


=======
  signOut: async () => {},
});

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [roles, setRoles] = useState<AdminRole[]>([]);
=======
  const [isAdmin, setIsAdmin] = useState(false);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

  useEffect(() => {
    let isMounted = true;

<<<<<<< HEAD
    const fetchRoles = async (userId: string): Promise<AdminRole[]> => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        return ((data ?? []) as { role: AdminRole }[]).map((r) => r.role);
      } catch {
        return [];
      }
    };

    const syncAuthState = async (nextSession: Session | null, isInitial = false) => {
      if (!isMounted) return;
      if (isInitial) setLoading(true);
=======
    const getAdminStatus = async (userId: string) => {
      try {
        const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        return !!data;
      } catch {
        return false;
      }
    };

    const syncAuthState = async (nextSession: Session | null) => {
      if (!isMounted) return;
      setLoading(true);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4

      const nextUser = nextSession?.user ?? null;

      if (!nextSession || !nextUser) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
<<<<<<< HEAD
        setRoles([]);
=======
        setIsAdmin(false);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        setLoading(false);
        return;
      }

      const bannedUntil = (nextUser as any).banned_until;
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        await supabase.auth.signOut();
        if (!isMounted) return;
        setSession(null);
        setUser(null);
<<<<<<< HEAD
        setRoles([]);
=======
        setIsAdmin(false);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
        setLoading(false);
        return;
      }

<<<<<<< HEAD
      const prevUserId = user?.id ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (isInitial || prevUserId !== nextUser.id) {
        const nextRoles = await fetchRoles(nextUser.id);
        if (!isMounted) return;
        setRoles(nextRoles);
      }

=======
      const admin = await getAdminStatus(nextUser.id);
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextUser);
      setIsAdmin(admin);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
<<<<<<< HEAD
      void syncAuthState(nextSession, false);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      void syncAuthState(error ? null : session, true);
=======
      void syncAuthState(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      void syncAuthState(error ? null : session);
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

<<<<<<< HEAD
  const { isAdmin, perms } = useMemo(() => {
    const isSuper = roles.includes("admin");
    const has = (r: AdminRole) => isSuper || roles.includes(r);
    const p: AdminPermissions = {
      isSuperAdmin: isSuper,
      hasAdminAccess: roles.some((r) =>
        ["admin", "books_manager", "seo_manager", "payments_manager", "users_manager", "support"].includes(r),
      ),
      books: has("books_manager"),
      seo: has("seo_manager"),
      payments: has("payments_manager"),
      users: has("users_manager"),
    };
    return { isAdmin: isSuper, perms: p };
  }, [roles]);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, roles, perms, signOut }}>
=======
  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
<<<<<<< HEAD

=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
