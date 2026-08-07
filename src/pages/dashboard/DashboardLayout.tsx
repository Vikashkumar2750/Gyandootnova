import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import useSEO from "@/hooks/useSEO";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useSEO({
    title: "My Dashboard | GyandootNova",
    description: "Your personal spiritual reading dashboard — library, orders, progress, and daily wisdom, all in one place.",
    canonical: "/dashboard",
    noindex: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <SidebarProvider>
        <div className="flex flex-1 w-full">
          <DashboardSidebar />
          <main className="flex-1 min-w-0">
            <div className="sticky top-[68px] md:top-[76px] z-30 flex items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur px-3 py-2">
              <SidebarTrigger />
              <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
                <Link to="/dashboard" className="hover:text-primary">Dashboard</Link>
              </nav>
            </div>
            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
      <Footer />
    </div>
  );
};

export default DashboardLayout;
