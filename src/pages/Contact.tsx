import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
<<<<<<< HEAD
import { Mail, MapPin, Phone, Loader2, ExternalLink, BookMarked, MessageCircle } from "lucide-react";
=======
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";

const Contact = () => {
  useSEO({
<<<<<<< HEAD
    title: "Contact Us — Get in Touch with GyandootNova",
    description:
      "Books, orders, suggestions or partnerships — reach us via WhatsApp, email or the contact form. We reply the same day.",
    canonical: "/contact",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GyandootNova", item: "https://gyandootnova.in/" },
          { "@type": "ListItem", position: 2, name: "Contact", item: "https://gyandootnova.in/contact" },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contact GyandootNova",
        url: "https://gyandootnova.in/contact",
        description:
          "Reach GyandootNova via WhatsApp, phone, email or contact form — including a dedicated 'suggest a text' path for reader-requested titles.",
        isPartOf: { "@type": "WebSite", name: "GyandootNova", url: "https://gyandootnova.in" },
      },
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "GyandootNova",
        description:
          "Spiritual publisher and digital library — an authoritative source for the Vedas, Upanishads, Gita, Ramayana, Mahabharata and other Sanatana Dharma scriptures.",
        url: "https://gyandootnova.in/contact",
        telephone: "+91 91615 33353",
        email: "amrendra8765@gmail.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Bhagwan Khera",
          addressLocality: "Unnao",
          addressRegion: "Uttar Pradesh",
          postalCode: "209863",
          addressCountry: "IN",
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            opens: "10:00",
            closes: "18:00",
          },
        ],
        areaServed: "IN",
      },
    ],
  });


  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
=======
    title: "Contact GyandootNova — Spiritual Books Support & Enquiry",
    description: "Contact GyandootNova for questions about dharmik granth, book orders, spiritual programs, or collaboration. Email, phone & contact form available.",
    canonical: "/contact",
  });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      toast({ title: "Mobile number required", description: "Please enter a valid mobile number (10–15 digits).", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: `Mobile: ${form.phone}\n\n${form.message}`,
        },
      });
      if (error) throw error;
      toast({ title: "Message received", description: "We'll get back to you very soon." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast({ title: "Couldn't send", description: "Please try again in a moment, or email us directly.", variant: "destructive" });
    } finally {

=======
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: form,
      });
      if (error) throw error;
      toast({ title: "Message Sent ✅", description: "Thank you! We'll get back to you soon." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast({ title: "Failed to send", description: "Please try again or email us directly.", variant: "destructive" });
    } finally {
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      setSending(false);
    }
  };

  return (
    <Layout>
      <main className="container py-16">
        <section className="text-center mb-16">
<<<<<<< HEAD
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">Have something to say?</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complaint, a suggestion, or just a hello — whatever it is, write in. We read every message and reply the same day.
          </p>
        </section>

        {/* Quick actions — Suggest a text / Book a specific scripture request */}
        <section aria-labelledby="quick-actions" className="max-w-5xl mx-auto mb-14">
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="#contact-form"
              onClick={(e) => {
                e.preventDefault();
                const s = document.getElementById("contact-subject") as HTMLInputElement | null;
                const m = document.getElementById("contact-message") as HTMLTextAreaElement | null;
                if (s) s.value = "Suggest a text / Scripture request";
                if (m) m.value = "I would like to see this text / scripture:\n\n(Title, edition or tradition — anything helps)";
                setForm((f) => ({
                  ...f,
                  subject: "Suggest a text / Scripture request",
                  message: "I would like to see this text / scripture:\n\n(Title, edition or tradition — anything helps)",
                }));
                s?.focus();
                s?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="group rounded-2xl border border-border/70 bg-card p-7 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookMarked className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
                Suggest a text
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-[1.8]">
                Twelve of last month's twelve new titles came from reader requests alone. Ask for a
                scripture, an edition, or a translation — we take every note seriously.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-primary">
                Opens the form pre-filled →
              </p>
            </a>

            <a
              href="https://wa.me/919161533353?text=Namaste%20GyandootNova%2C%20I%20have%20a%20question."
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border/70 bg-card p-7 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
                Quick chat on WhatsApp
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-[1.8]">
                For anything quick — a book question, an order, or just a hello. We usually reply
                within a few hours, in Hindi or English.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-primary">
                Opens WhatsApp →
              </p>
            </a>
          </div>
        </section>





        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Direct contact</h2>
=======
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions, feedback, or want to collaborate? We'd love to hear from you.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-1" />
                <div>
                  <p className="font-semibold text-foreground">Email</p>
<<<<<<< HEAD
                  <p className="text-muted-foreground">amrendra8765@gmail.com</p>
=======
                  <p className="text-muted-foreground">contact@gyandootnova.in</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary mt-1" />
                <div>
<<<<<<< HEAD
                  <p className="font-semibold text-foreground">Phone / WhatsApp</p>
=======
                  <p className="font-semibold text-foreground">Phone</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                  <p className="text-muted-foreground">+91 91615 33353</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary mt-1" />
                <div>
                  <p className="font-semibold text-foreground">Address</p>
<<<<<<< HEAD
                  <p className="text-muted-foreground">Bhagwan Khera, Unnao, Uttar Pradesh 209863 — India</p>
                  <p className="text-xs text-muted-foreground mt-1">26.1780° N, 80.6534° E</p>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Bhagwan+Khera,+Uttar+Pradesh+209863&query_place_id=ChIJT5WhD-l8nDkRvYsKyaVVH1E"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                  </a>
=======
                  <p className="text-muted-foreground">Unnao UP, India</p>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-muted/50 rounded-xl">
<<<<<<< HEAD
              <h3 className="font-serif font-semibold text-foreground mb-2">When to reach us</h3>
              <p className="text-sm text-muted-foreground">Mon–Sat: 10 AM to 6 PM (India time)</p>
              <p className="text-sm text-muted-foreground">Sunday: closed</p>
            </div>
          </div>

          <div id="contact-form">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Fill in the form</h2>

            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Contact form">

              <Input
                id="contact-name"
                name="name"
                aria-label="Your name"
                placeholder="Your name"
=======
              <h3 className="font-serif font-semibold text-foreground mb-2">Working Hours</h3>
              <p className="text-sm text-muted-foreground">Monday – Saturday: 10:00 AM – 6:00 PM IST</p>
              <p className="text-sm text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Your Name"
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
<<<<<<< HEAD
                id="contact-email"
                name="email"
                type="email"
                aria-label="Email address"
                placeholder="Email address"
=======
                type="email"
                placeholder="Your Email"
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
<<<<<<< HEAD
                id="contact-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                aria-label="Mobile number"
                placeholder="Mobile number (required)"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                id="contact-subject"
                name="subject"
                aria-label="Subject"
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                placeholder="Subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              <Textarea
<<<<<<< HEAD
                id="contact-message"
                name="message"
                aria-label="Message"
                placeholder="Write your message…"
=======
                placeholder="Your Message"
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <>
<<<<<<< HEAD
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </Button>

            </form>
          </div>
        </div>

        <section className="mt-16 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
          <div className="text-center mb-4 px-4">
            <h2 className="font-serif text-2xl font-bold text-foreground">Our location</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bhagwan Khera, Uttar Pradesh 209863 · 26.1780° N, 80.6534° E
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Bhagwan+Khera,+Uttar+Pradesh+209863"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
            </a>
          </div>
          <div className="w-full">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.5738718627367!2d80.65342424352151!3d26.178004032415163!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399c7ce90fa1954f%3A0x511f55a5c90a8bbd!2sBhagwan%20Khera%2C%20Uttar%20Pradesh%20209863!5e0!3m2!1sen!2sin!4v1783592023814!5m2!1sen!2sin"
              title="GyandootNova location — Bhagwan Khera, Uttar Pradesh"
              width="100%"
              height="280"
              className="block w-full h-[280px] border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
=======
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </div>
        </div>
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      </main>
    </Layout>
  );
};

export default Contact;
