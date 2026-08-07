import Layout from "@/components/layout/Layout";
import { BookOpen, FileText, Headphones, Heart, Monitor, Users } from "lucide-react";
import useSEO from "@/hooks/useSEO";

const services = [
  {
    icon: BookOpen,
<<<<<<< HEAD
    title: "Read directly in the browser",
    description:
      "No app, no download. Log in on whichever phone or laptop is closest and pick up the next line right where you left off yesterday. Font, colour, bookmarks — all tuned to your taste.",
  },
  {
    icon: FileText,
    title: "Life-Sutra articles",
    description:
      "Anger, anxiety, tangled relationships — what the scriptures actually say about them, in plain language. Something new every week, with no advertising.",
  },
  {
    icon: Headphones,
    title: "Discourses you can listen to",
    description:
      "No time to read? No problem — listen while driving, walking, or cooking. Short sessions, deep impact.",
  },
  {
    icon: Monitor,
    title: "A platform for publishers",
    description:
      "Have a precious manuscript you want to share with the world? Our editorial team helps end-to-end — from proofreading to publishing.",
  },
  {
    icon: Heart,
    title: "Partly run on donations",
    description:
      "A large part of our library is kept free so money is never a barrier. This is possible only because of your contributions — whatever you can spare.",
  },
  {
    icon: Users,
    title: "A readers' circle of your own",
    description:
      "WhatsApp, email — join wherever it suits you. Ask for a new text, ask about a word you got stuck on. We reply the same day.",
=======
    title: "Online Book Reading",
    description:
      "Access our complete library of spiritual books directly in your browser. Our custom reader supports font resizing, dark/light mode, bookmarking, and chapter-by-chapter navigation — no downloads needed.",
  },
  {
    icon: FileText,
    title: "Spiritual Articles & Blogs",
    description:
      "Stay inspired with regularly published articles covering meditation, self-realization, dharma, and practical spirituality. All content is freely accessible.",
  },
  {
    icon: Headphones,
    title: "Discourses & Programs",
    description:
      "Explore recorded discourses and structured spiritual programs designed to guide you on your inner journey, from beginner to advanced levels.",
  },
  {
    icon: Monitor,
    title: "Digital Publication",
    description:
      "We publish sacred texts in digital formats optimized for web reading. Authors and spiritual teachers can reach a global audience through our platform.",
  },
  {
    icon: Heart,
    title: "Donation & Seva",
    description:
      "Support the dissemination of spiritual knowledge through donations. Every contribution helps us publish more books and reach more seekers worldwide.",
  },
  {
    icon: Users,
    title: "Community Engagement",
    description:
      "Connect with like-minded seekers, participate in discussions, and be part of a growing spiritual community committed to conscious living.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  },
];

const Services = () => {
  useSEO({
<<<<<<< HEAD
    title: "Our Services — Online Scriptures, Articles & Discourses | GyandootNova",
    description:
      "Everything GyandootNova offers — online reader, articles, discourses, publishing support and a reader community. All in one place.",
=======
    title: "Our Services — Online Book Reading, Spiritual Articles & Programs | GyandootNova",
    description: "Explore GyandootNova services: read dharmik granth online, spiritual articles, meditation programs, digital publication & community engagement.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    canonical: "/services",
  });

  return (
    <Layout>
      <main className="container py-16">
        <section className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
<<<<<<< HEAD
            What you get here
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            More than just books — the full experience of reading, listening, understanding
            and asking, all in one place.
=======
            Our Services
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the range of spiritual services and resources GyandootNova offers to support your journey of self-discovery.
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </p>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="group p-8 rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
              <service.icon className="h-10 w-10 text-primary mb-4 transition-transform group-hover:scale-110" />
              <h2 className="font-serif text-xl font-semibold text-foreground mb-3">{service.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
          ))}
        </section>
      </main>
    </Layout>
  );
};

export default Services;
