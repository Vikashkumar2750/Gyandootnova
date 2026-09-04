import Layout from "@/components/layout/Layout";
import { HelpCircle, Mail, MessageSquare, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useSEO from "@/hooks/useSEO";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";

const supportTopics = [
  {
    icon: BookOpen,
    title: "Reading Books Online",
    description: "Learn how to use our online reader, adjust font size, switch between dark/light mode, and track reading progress.",
  },
  {
    icon: HelpCircle,
    title: "Account & Login Issues",
    description: "Having trouble signing in or creating an account? Check your email for verification link or try resetting your password.",
  },
  {
    icon: MessageSquare,
    title: "Purchase & Payment Help",
    description: "Questions about book purchases, payment methods, or transaction issues? Payments are processed securely via Razorpay.",
  },
];

const Support = () => {
  useSEO({
    title: "Help Center — GyandootNova Book Reading & Account Support",
    description: "Get help with reading books online, account issues, purchases & payments at GyandootNova. Contact our support team for dharmik granth questions.",
    canonical: "/support",
  });

  const [selectedBook, setSelectedBook] = useState("");
  const { data: books } = useQuery({
    queryKey: ["support-book-list"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("books").select("title, slug").order("title");
      return data ?? [];
    },
  });
  const selectedBookSlug = books?.find((b) => b.title === selectedBook)?.slug ?? null;



  return (
    <Layout>
      <main className="container py-16 max-w-4xl mx-auto">
        <section className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            Help Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common issues or get in touch with our support team.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-12">
          {supportTopics.map((topic) => (
            <div key={topic.title} className="p-6 rounded-xl border border-border bg-card text-center">
              <topic.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h2 className="font-serif text-lg font-semibold text-foreground mb-2">{topic.title}</h2>
              <p className="text-sm text-muted-foreground">{topic.description}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-8">
          <h2 className="font-serif text-xl font-bold text-foreground mb-2">WhatsApp पर तुरंत सहायता</h2>
          <p className="text-sm text-muted-foreground mb-4">
            अपनी book चुनिए — WhatsApp message में book का नाम अपने आप जुड़ जाएगा, ताकि हम तुरंत सही मदद कर सकें।
          </p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <label htmlFor="wa-book" className="text-xs font-medium text-muted-foreground">
                Book (optional)
              </label>
              <select
                id="wa-book"
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">General support (कोई book नहीं)</option>
                {(books ?? []).map((b) => (
                  <option key={b.slug} value={b.title}>{b.title}</option>
                ))}
              </select>
            </div>
            <WhatsAppSupportButton
              book={selectedBook || null}
              url={selectedBookSlug ? `${window.location.origin}/books/${selectedBookSlug}` : null}
              variant="default"
              className="w-full sm:w-auto"
            />
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
          <div className="p-8 bg-muted/50 rounded-xl">
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">Browse FAQ</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Most common questions are answered in our FAQ section.
            </p>
            <Button asChild variant="outline">
              <Link to="/faq">Go to FAQ</Link>
            </Button>
          </div>
          <div className="p-8 bg-muted/50 rounded-xl">
            <h2 className="font-serif text-xl font-bold text-foreground mb-3">Contact Support</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Can't find what you're looking for? Reach out directly.
            </p>
            <a
              href="mailto:gyandootnova57@gmail.com"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <Mail className="h-4 w-4" /> gyandootnova57@gmail.com
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Support;
