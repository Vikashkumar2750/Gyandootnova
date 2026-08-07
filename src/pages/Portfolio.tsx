import Layout from "@/components/layout/Layout";
import { BookOpen, FileText, Heart, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useSEO from "@/hooks/useSEO";

const portfolioItems = [
  {
    icon: BookOpen,
    title: "Spiritual Books Collection",
    description: "50+ published spiritual books covering meditation, self-realization, dharma, yoga philosophy, and ancient wisdom — all readable online.",
    link: "/books",
    cta: "Browse Books",
  },
  {
    icon: FileText,
    title: "Articles & Blogs",
    description: "Hundreds of insightful articles on practical spirituality, mindfulness, and conscious living published regularly for seekers worldwide.",
    link: "/articles",
    cta: "Read Articles",
  },
  {
    icon: Mic,
    title: "Discourses & Programs",
    description: "Structured spiritual programs and recorded discourses designed to guide seekers from beginner to advanced stages of inner growth.",
    link: "/articles",
    cta: "Explore Programs",
  },
  {
    icon: Heart,
    title: "Community Impact",
    description: "Through reader donations and community support, we've distributed free spiritual literature to thousands of seekers across 25+ countries.",
    link: "/support-us",
    cta: "Support Us",
  },
];

const Portfolio = () => {
  useSEO({
    title: "Portfolio — GyandootNova Spiritual Books & Content Collection",
    description: "Explore GyandootNova's portfolio: 50+ spiritual books, articles on Vishnu Sahasraname, Bhagwat Geeta, meditation programs & community initiatives.",
    canonical: "/portfolio",
  });

  return (
    <Layout>
      <main className="container py-16">
        <section className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
            Our Portfolio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore the breadth of spiritual content and services GyandootNova has created for seekers worldwide.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {portfolioItems.map((item) => (
            <div key={item.title} className="p-8 rounded-xl border border-border bg-card flex flex-col">
              <item.icon className="h-10 w-10 text-primary mb-4" />
              <h2 className="font-serif text-xl font-semibold text-foreground mb-3">{item.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">{item.description}</p>
              <Button asChild variant="outline" className="w-fit">
                <Link to={item.link}>{item.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
};

export default Portfolio;
