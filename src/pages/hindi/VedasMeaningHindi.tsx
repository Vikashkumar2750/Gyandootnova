import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";

const path = "/hindi/vedas-meaning-in-hindi";

const faqs = [
  {
    question: "वेद का शाब्दिक अर्थ क्या है?",
    answer:
      "'वेद' शब्द संस्कृत की 'विद्' धातु से बना है, जिसका अर्थ है 'जानना'। अतः वेद का शाब्दिक अर्थ है — ज्ञान, विशेषतः वह पवित्र ज्ञान जो ऋषियों को ध्यान की अवस्था में प्राप्त हुआ।",
  },
  {
    question: "वेद कितने हैं?",
    answer:
      "वेद चार हैं — ऋग्वेद, सामवेद, यजुर्वेद और अथर्ववेद।",
  },
  {
    question: "सबसे पुराना वेद कौन-सा है?",
    answer:
      "ऋग्वेद सबसे प्राचीन वेद है। इसकी रचना लगभग 1500–1200 ईसा पूर्व मानी जाती है और यह विश्व की सबसे प्राचीन जीवित धार्मिक ग्रंथों में से एक है।",
  },
  {
    question: "वेदों की रचना किसने की?",
    answer:
      "वेदों को 'अपौरुषेय' कहा गया है — अर्थात् इनकी रचना किसी मनुष्य ने नहीं की। ये ऋषियों को समाधि की अवस्था में प्रकट हुए मंत्र हैं। महर्षि वेदव्यास ने इन मंत्रों को चार भागों में विभाजित किया, इसीलिए उन्हें 'वेदव्यास' कहा जाता है।",
  },
  {
    question: "प्रत्येक वेद में क्या है?",
    answer:
      "ऋग्वेद में देवताओं की स्तुति के 1028 सूक्त हैं। सामवेद में गान-रूप में मंत्र हैं। यजुर्वेद में यज्ञ के गद्य-मंत्र हैं। अथर्ववेद में जीवनोपयोगी विषय — रोग-निवारण, रक्षा, गृहस्थ जीवन और दर्शन — के मंत्र हैं।",
  },
];

const VedasMeaningHindi = () => {
  useSEO({
    title: "वेद का अर्थ हिंदी में — Vedas Meaning in Hindi",
    description:
      "वेद का शाब्दिक अर्थ, चारों वेदों का परिचय — ऋग्वेद, सामवेद, यजुर्वेद और अथर्ववेद। जानिए वेदों की रचना, उनकी विषयवस्तु और भारतीय संस्कृति में उनका महत्त्व।",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "वेद का अर्थ हिंदी में",
        description: "चारों वेदों का परिचय, उनकी रचना और मुख्य विषय।",
        path,
        inLanguage: "hi",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "हिंदी", path: "/hindi" },
        { name: "वेद का अर्थ", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">होम</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">वेद का अर्थ</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">श्रुति · Śruti</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            वेद का अर्थ हिंदी में
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            चारों वेद — ऋग्वेद, सामवेद, यजुर्वेद और अथर्ववेद का सम्पूर्ण परिचय।
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-6">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">'वेद' शब्द का अर्थ</h2>
            <p>
              संस्कृत में <strong>वेद</strong> शब्द <em>विद्</em> धातु से निकला है, जिसका अर्थ है
              'जानना'। अतः वेद का अर्थ है — <strong>ज्ञान</strong>। परन्तु यह साधारण ज्ञान नहीं है;
              यह वह पवित्र, शाश्वत ज्ञान है जो प्राचीन ऋषियों को गहन समाधि में प्रकट हुआ। इसीलिए वेदों
              को 'श्रुति' कहा जाता है — 'जो सुनी गई है'।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">चार वेद</h2>
            <p>वेद कुल चार हैं, और प्रत्येक का अपना विशिष्ट विषय है —</p>
            <ol>
              <li><strong>ऋग्वेद</strong> — 1028 सूक्तों में देवताओं की स्तुति; सबसे प्राचीन वेद।</li>
              <li><strong>सामवेद</strong> — गान-रूप में मंत्र; भारतीय संगीत का उद्गम।</li>
              <li><strong>यजुर्वेद</strong> — यज्ञ की विधि व गद्य-मंत्र।</li>
              <li><strong>अथर्ववेद</strong> — जीवनोपयोगी मंत्र — औषधि, रक्षा, गृहस्थ जीवन।</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">वेदों की रचना</h2>
            <p>
              वेदों को 'अपौरुषेय' कहा गया है — अर्थात् इनका कोई मानव रचयिता नहीं है। ये अनादि हैं
              और ऋषियों के अन्तःकरण में प्रकट हुए। महर्षि कृष्ण द्वैपायन ने असंख्य मंत्रों को चार
              विभागों में व्यवस्थित किया, इसीलिए वे 'वेदव्यास' कहलाए।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">वेद के चार भाग</h2>
            <p>
              प्रत्येक वेद के चार खंड हैं — <strong>संहिता</strong> (मंत्र), <strong>ब्राह्मण</strong>{" "}
              (यज्ञ-विधि), <strong>आरण्यक</strong> (वन में साधना) और <strong>उपनिषद</strong>{" "}
              (आत्मज्ञान)। यही उपनिषद-भाग आगे चलकर वेदान्त-दर्शन का आधार बना।
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">
            वेद ऑनलाइन पढ़ें
          </p>
          <p className="mt-1 text-base md:text-lg leading-relaxed">
            चारों वेदों और उपनिषदों की हिंदी टीका — निःशुल्क पहला अध्याय, कोई साइन-अप आवश्यक नहीं।
          </p>
          <Link
            to="/books"
            className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            पुस्तकें देखें →
          </Link>
        </div>

        <FaqAccordion items={faqs} title="अक्सर पूछे जाने वाले प्रश्न" />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">आगे पढ़ें</h2>
          <ul className="space-y-2">
            <li><Link to="/texts/vedas" className="text-primary hover:underline">The Four Vedas — full English guide →</Link></li>
            <li><Link to="/texts/rig-veda" className="text-primary hover:underline">Rig Veda — the oldest Veda →</Link></li>
            <li><Link to="/qa/who-wrote-vedas" className="text-primary hover:underline">Who wrote the Vedas? →</Link></li>
            <li><Link to="/hindi/upanishad-meaning-in-hindi" className="text-primary hover:underline">उपनिषद का अर्थ हिंदी में →</Link></li>
            <li><Link to="/texts/bhagavad-gita" className="text-primary hover:underline">Bhagavad Gita — meaning and chapters →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default VedasMeaningHindi;
