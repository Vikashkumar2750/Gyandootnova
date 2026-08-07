import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  User,
  BookOpen,
  ShoppingBag,
  BarChart3,
  Users,
  Sparkles,
  Bell,
  LifeBuoy,
  Trophy,
  Compass,
  Headphones,
  WifiOff,
  QrCode,
  Lock,
} from "lucide-react";

const groups: {
  label: string;
  items: { title: string; url: string; icon: any }[];
}[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "AI Personalized", url: "/dashboard/personalized", icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "My Profile", url: "/dashboard/profile", icon: User },
      { title: "Birthday & Blessing", url: "/dashboard/profile/birthday", icon: Sparkles },
    ],
  },
  {
    label: "My Library",
    items: [
      { title: "Purchased Books", url: "/dashboard/library", icon: BookOpen },
      { title: "Free Books", url: "/dashboard/library/free", icon: BookOpen },
      { title: "Continue Reading", url: "/dashboard/library/continue", icon: BookOpen },
      { title: "Favorites & Wishlist", url: "/dashboard/library/favorites", icon: BookOpen },
      { title: "Recently Viewed", url: "/dashboard/library/recent", icon: BookOpen },
      { title: "Reading History", url: "/dashboard/library/history", icon: BookOpen },
    ],
  },
  {
    label: "Orders",
    items: [
      { title: "My Orders", url: "/dashboard/orders", icon: ShoppingBag },
      { title: "Invoices", url: "/dashboard/orders/invoices", icon: ShoppingBag },
      { title: "Refund Status", url: "/dashboard/orders/refunds", icon: ShoppingBag },
    ],
  },
  {
    label: "Reading",
    items: [
      { title: "Reading Dashboard", url: "/dashboard/reading", icon: BarChart3 },
      { title: "Reading Goals", url: "/dashboard/reading/goals", icon: Compass },
      { title: "Reading Challenge", url: "/dashboard/reading/challenge", icon: Trophy },
      { title: "Achievement Badges", url: "/dashboard/reading/badges", icon: Trophy },
      { title: "Reading Calendar", url: "/dashboard/reading/calendar", icon: BarChart3 },
      { title: "Certificates", url: "/dashboard/reading/certificates", icon: Trophy },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "My Reviews", url: "/dashboard/community/reviews", icon: Users },
      { title: "My Bookmarks", url: "/dashboard/community/bookmarks", icon: Users },
    ],
  },
  {
    label: "Spiritual",
    items: [
      { title: "Today's Quote", url: "/dashboard/spiritual", icon: Compass },
      { title: "Meditation Timer", url: "/dashboard/spiritual/meditation", icon: Compass },
      { title: "Festival Calendar", url: "/dashboard/spiritual/festivals", icon: Compass },
      { title: "Spiritual Journey", url: "/dashboard/spiritual/journey", icon: Sparkles },
    ],
  },
  {
    label: "Premium",
    items: [
      { title: "Family Library", url: "/dashboard/family", icon: Users },
      { title: "Audio Book Player", url: "/dashboard/audio", icon: Headphones },
      { title: "Offline Reading", url: "/dashboard/offline", icon: WifiOff },
      { title: "Book QR Codes", url: "/dashboard/qr-codes", icon: QrCode },
      { title: "Reading Insights", url: "/dashboard/insights", icon: BarChart3 },
      { title: "Exclusive Content", url: "/dashboard/exclusive", icon: Lock },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
      { title: "Support", url: "/dashboard/support", icon: LifeBuoy },
    ],
  },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default DashboardSidebar;
