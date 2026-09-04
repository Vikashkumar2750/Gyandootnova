import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BookOpen, FileText, Heart, ShoppingCart, LayoutDashboard, LogOut, ArrowLeft, Settings, Users, Tag, Share2, Sparkles, Code, KeyRound, Mail, Hash, FlaskConical, Globe2, UserCheck, Rocket, UsersRound, ShieldCheck, TrendingUp, Menu, Database, Copyright, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import AdminOtpGate, { isAdminOtpValid } from "@/components/admin/AdminOtpGate";

import type { AdminPermissions } from "@/hooks/useAuth";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  /** Which permission area gates this link. undefined = super admin only. */
  area?: keyof AdminPermissions;
};

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, area: "hasAdminAccess" },
  { to: "/admin/users", label: "Users", icon: Users, area: "users" },
  { to: "/admin/books", label: "Books", icon: BookOpen, area: "books" },
  { to: "/admin/posts", label: "Posts", icon: FileText, area: "seo" },
  { to: "/admin/content-audit", label: "Content Audit", icon: ShieldCheck, area: "hasAdminAccess" },
  { to: "/admin/copyright", label: "Copyright", icon: Copyright, area: "hasAdminAccess" },
  { to: "/admin/verse-studio", label: "Verse Studio", icon: ScrollText, area: "seo" },
  { to: "/admin/coupons", label: "Coupons", icon: Tag, area: "payments" },
  { to: "/admin/donations", label: "Donations", icon: Heart, area: "payments" },
  { to: "/admin/purchases", label: "Purchases", icon: ShoppingCart, area: "payments" },
  { to: "/admin/sales-funnel", label: "Sales Funnel", icon: TrendingUp, area: "payments" },

  { to: "/admin/enquiries", label: "Enquiries", icon: Mail, area: "users" },
  { to: "/admin/referrals", label: "Referrals", icon: Share2, area: "payments" },
  { to: "/admin/ai", label: "AI Assistant", icon: Sparkles, area: "isSuperAdmin" },
  { to: "/admin/seo-command", label: "SEO Command", icon: Rocket, area: "seo" },
  { to: "/admin/team", label: "Team & Agents", icon: UsersRound, area: "users" },
  { to: "/admin/lsi", label: "LSI Keywords", icon: Hash, area: "seo" },
  { to: "/admin/scripts", label: "Custom Scripts", icon: Code, area: "isSuperAdmin" },
  { to: "/admin/auth-providers", label: "Auth Providers", icon: KeyRound, area: "isSuperAdmin" },
  { to: "/admin/ai-providers", label: "AI Providers", icon: KeyRound, area: "isSuperAdmin" },
  { to: "/admin/api-tester", label: "API Tester", icon: FlaskConical, area: "isSuperAdmin" },
  { to: "/admin/visitors", label: "Visitors", icon: Globe2, area: "isSuperAdmin" },
  { to: "/admin/identified-visitors", label: "Identified Visitors", icon: UserCheck, area: "isSuperAdmin" },
  { to: "/admin/data-export", label: "Data Export", icon: Database, area: "isSuperAdmin" },
  { to: "/admin/settings", label: "Settings", icon: Settings, area: "isSuperAdmin" },
];

const AdminLayout = () => {
  const { user, isAdmin, perms, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [otpVerified, setOtpVerified] = useState<boolean>(() => isAdminOtpValid());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const canEnter = perms.hasAdminAccess || isAdmin;

  // Auto-close the mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && (!user || !canEnter)) {
      navigate("/auth");
    }
  }, [user, canEnter, loading, navigate]);

  // Force Google Translate OFF everywhere admin renders — including portals
  // (Radix Dialog / Select / Toast) that mount on <body> outside our wrapper.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlT = html.getAttribute("translate");
    const prevBodyT = body.getAttribute("translate");
    html.classList.add("notranslate");
    body.classList.add("notranslate");
    html.setAttribute("translate", "no");
    body.setAttribute("translate", "no");
    return () => {
      html.classList.remove("notranslate");
      body.classList.remove("notranslate");
      if (prevHtmlT == null) html.removeAttribute("translate"); else html.setAttribute("translate", prevHtmlT);
      if (prevBodyT == null) body.removeAttribute("translate"); else body.setAttribute("translate", prevBodyT);
    };
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || !canEnter) return null;

  if (!otpVerified) {
    return <AdminOtpGate userEmail={user.email ?? undefined} onVerified={() => setOtpVerified(true)} />;
  }

  const visibleItems = navItems.filter((item) => {
    if (!item.area) return isAdmin;
    return perms[item.area];
  });




  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {visibleItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            location.pathname === item.to ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          <item.icon className="h-4 w-4" /> {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen notranslate" translate="no">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-4 hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 md:overflow-y-auto">
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-lg font-bold text-primary">GyandootNova</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
        </div>
        <NavList />
        <div className="mt-8 space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Site</Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-3 py-2">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open admin menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 overflow-y-auto">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="mb-4">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="font-serif text-lg font-bold text-primary">GyandootNova</span>
                </Link>
                <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
              </div>
              <NavList onNavigate={() => setMobileNavOpen(false)} />
              <div className="mt-6 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <Link to="/" onClick={() => setMobileNavOpen(false)}><ArrowLeft className="mr-1 h-4 w-4" /> Back to Site</Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="mr-1 h-4 w-4" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <span className="font-serif text-sm font-bold text-primary truncate">GyandootNova Admin</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
