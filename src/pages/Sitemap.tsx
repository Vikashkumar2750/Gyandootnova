import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import useSEO from "@/hooks/useSEO";

const sitemapSections = [
  {
    title: "Main Pages",
    links: [
      { to: "/", label: "Home" },
      { to: "/about", label: "About Us" },
      { to: "/services", label: "Services" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Content",
    links: [
      { to: "/books", label: "Books Library" },
      { to: "/articles", label: "Articles & Programs" },
      { to: "/portfolio", label: "Portfolio" },
      { to: "/testimonials", label: "Testimonials" },
    ],
  },
  {
    title: "Support",
    links: [
      { to: "/faq", label: "FAQ" },
      { to: "/support", label: "Help Center" },
      { to: "/support-us", label: "Support Us" },
      { to: "/careers", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy-policy", label: "Privacy Policy" },
      { to: "/terms-conditions", label: "Terms & Conditions" },
      { to: "/refund-policy", label: "Refund & Cancellation Policy" },
      { to: "/shipping-policy", label: "Shipping & Delivery Policy" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/auth", label: "Sign In / Sign Up" },
    ],
  },
];

const SitemapPage = () => {
  useSEO({
    title: "Sitemap — GyandootNova All Pages Overview",
    description: "Complete sitemap of GyandootNova — browse all pages including dharmik granth, spiritual books, articles, services, FAQ & more.",
    canonical: "/sitemap",
  });

  return (
    <Layout>
      <main className="container py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4 text-center">Sitemap</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          A complete overview of all pages on GyandootNova.
        </p>

        <div className="grid md:grid-cols-2 gap-10">
          {sitemapSections.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-lg font-bold text-foreground mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
};

export default SitemapPage;
