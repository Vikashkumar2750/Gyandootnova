import { Card, CardContent } from "@/components/ui/card";
import { Bell, LifeBuoy, MessageCircle, Mail, Phone, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const NotificationsPage = () => {
  const { user } = useAuth();
  const { data: orders } = useQuery({
    queryKey: ["notif-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_purchases", { _user_id: user!.id });
      return (data ?? []).slice(0, 10);
    },
  });
  const notifications = [
    ...(orders ?? []).map((o: any) => ({
      icon: Bell,
      title: `Order ${o.status}`,
      body: `Order #${o.id.slice(0,8)} — ${o.currency || "INR"} ${o.amount}`,
      when: o.created_at,
    })),
    { icon: Sparkles, title: "Welcome to your dashboard", body: "Aapka naya sadhak-dashboard tayyar hai. Explore karein!", when: new Date().toISOString() },
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Notifications</h1>
      <div className="surface-card divide-y divide-border/60">
        {notifications.map((n, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><n.icon className="h-4 w-4"/></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.body}</div>
            </div>
            <div className="text-[10px] text-muted-foreground shrink-0">{new Date(n.when).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SupportPage = () => (
  <div className="space-y-4">
    <h1 className="font-serif text-2xl md:text-3xl">Support</h1>
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { icon: HelpCircle, title: "FAQ", desc: "Aksar puchhe jaane wale prashn.", to: "/faq" },
        { icon: MessageCircle, title: "Contact Form", desc: "Hume likh bhejein.", to: "/contact" },
        { icon: Mail, title: "Email support", desc: "amrendra8765@gmail.com", to: "mailto:amrendra8765@gmail.com" },
        { icon: LifeBuoy, title: "Help Center", desc: "Guides aur troubleshooting.", to: "/support" },
      ].map((c) => (
        <Card key={c.title} className="surface-card">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><c.icon className="h-5 w-5"/></div>
            <div className="flex-1">
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
              <Button asChild size="sm" variant="outline" className="mt-3">
                {c.to.startsWith("mailto:") ? <a href={c.to}>Open</a> : <Link to={c.to}>Open</Link>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const PersonalizedPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["personalized-recs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Simple: recent progress → recommend other books
      const { data: rp } = await supabase.from("reading_progress").select("book_id").eq("user_id", user!.id);
      const readIds = new Set((rp ?? []).map((r: any) => r.book_id));
      const { data: books } = await supabase.from("books")
        .select("id, title, slug, cover_url, author, is_featured, purchase_count")
        .order("purchase_count", { ascending: false })
        .limit(24);
      return (books ?? []).filter((b: any) => !readIds.has(b.id)).slice(0, 12);
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> Aapke liye</h1>
      <p className="text-sm text-muted-foreground">Aapki path-yatra ke aadhaar par chuni gayi kitabein.</p>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary"/> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(data ?? []).map((b: any) => (
            <Card key={b.id} className="surface-card overflow-hidden">
              <Link to={`/books/${b.slug}`}>
                <div className="aspect-[2/3] bg-muted">
                  {b.cover_url && <img src={b.cover_url} alt={b.title} loading="lazy" className="h-full w-full object-cover"/>}
                </div>
              </Link>
              <CardContent className="p-3">
                <h3 className="text-sm font-medium line-clamp-2"><Link to={`/books/${b.slug}`} className="hover:text-primary">{b.title}</Link></h3>
                {b.author && <p className="text-[11px] text-muted-foreground truncate">{b.author}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
