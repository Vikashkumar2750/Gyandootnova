import Layout from "@/components/layout/Layout";
import { Briefcase, Mail } from "lucide-react";
import useSEO from "@/hooks/useSEO";

const openings = [
  {
    title: "Content Writer — Spiritual Publications",
    type: "Full-time / Remote",
    description:
      "Create and edit spiritual content, articles, and book summaries. Strong understanding of Indian spiritual traditions required.",
  },
  {
    title: "Web Developer — React/TypeScript",
    type: "Full-time / Remote",
    description: "Build and maintain our publishing platform using React, TypeScript, and modern web technologies.",
  },
  {
    title: "Digital Marketing Specialist",
    type: "Part-time / Remote",
    description:
      "Drive organic growth through SEO, social media, and email campaigns focused on spiritual and educational content.",
  },
];

const Careers = () => {
  useSEO({
    title: "Careers at GyandootNova — Join Our Spiritual Publishing Team",
    description: "Join GyandootNova — work on spiritual book publishing, content writing, web development & digital marketing. Remote positions available.",
    canonical: "/careers",
  });

  return (
    <Layout>
      <main className="container py-16 max-w-3xl mx-auto">
        <section className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">Careers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our mission to spread spiritual wisdom globally. We're looking for passionate individuals who share our
            vision.
          </p>
        </section>

        <section className="space-y-6 mb-12">
          {openings.map((job) => (
            <div key={job.title} className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h2 className="font-serif text-lg font-semibold text-foreground">{job.title}</h2>
                  <p className="text-xs text-secondary font-medium mb-2">{job.type}</p>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="text-center p-8 bg-muted/50 rounded-xl">
          <h2 className="font-serif text-xl font-bold text-foreground mb-3">How to Apply</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Send your resume and a brief cover letter explaining why you're passionate about spiritual knowledge to:
          </p>
          <a
            href="mailto:gyandootnova57@gmail.com"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Mail className="h-4 w-4" /> careers@gyandootnova.in
          </a>
        </section>
      </main>
    </Layout>
  );
};

export default Careers;
