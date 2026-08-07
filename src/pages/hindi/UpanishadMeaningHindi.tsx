import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";

const path = "/hindi/upanishad-meaning-in-hindi";

const faqs = [
  {
    question: "उपनिषद का अर्थ क्या है?",
    answer:
      "उपनिषद संस्कृत शब्द है जो तीन भागों से बना है — उप (पास), नि (नीचे) और सद् (बैठना)। इसका शाब्दिक अर्थ है 'गुरु के पास नीचे बैठकर सुनना'। अर्थात् शिष्य द्वारा गुरु के समीप बैठकर आत्मज्ञान की गूढ़ शिक्षा प्राप्त करना।",
  },
  {
    question: "उपनिषद कितने हैं?",
    answer:
      "मुक्तिका उपनिषद के अनुसार कुल 108 उपनिषद हैं। इनमें से 10 प्रमुख (मुख्य) उपनिषद माने जाते हैं जिन पर आदि शंकराचार्य ने भाष्य लिखा — ईश, केन, कठ, प्रश्न, मुण्डक, माण्डूक्य, तैत्तिरीय, ऐतरेय, छान्दोग्य और बृहदारण्यक।",
  },
  {
    question: "उपनिषद किसने लिखे?",
    answer:
      "उपनिषदों का कोई एक लेखक नहीं है। ये अनेक ऋषि-मुनियों — याज्ञवल्क्य, उद्दालक आरुणि, श्वेतकेतु, सनत्कुमार आदि — के उपदेशों का संकलन हैं। ये श्रुति परम्परा से हज़ारों वर्षों तक कण्ठस्थ रूप में सुरक्षित रहे।",
  },
  {
    question: "सबसे पुराना उपनिषद कौन-सा है?",
    answer:
      "बृहदारण्यक और छान्दोग्य उपनिषद सबसे प्राचीन माने जाते हैं — इनकी रचना लगभग 800–700 ईसा पूर्व की मानी जाती है।",
  },
  {
    question: "क्या उपनिषद वेदों का भाग हैं?",
    answer:
      "हाँ। प्रत्येक उपनिषद किसी न किसी वेद का अन्तिम भाग है। इसीलिए उपनिषदों को सामूहिक रूप से 'वेदान्त' कहा जाता है — अर्थात् 'वेदों का अन्त' या 'वेदों का सार'।",
  },
  {
    question: "उपनिषदों का मुख्य उपदेश क्या है?",
    answer:
      "उपनिषदों का मूल उपदेश तीन सूत्रों में है — ब्रह्म (परम सत्य) एक है, आत्मा (अन्तर्यामी स्वरूप) उसी का अंश है, और 'तत् त्वम् असि' — अर्थात् वह ब्रह्म तू ही है। इसी एकत्व-बोध को मोक्ष कहा गया है।",
  },
];

const UpanishadMeaningHindi = () => {
  useSEO({
    title: "उपनिषद का अर्थ हिंदी में — Upanishad Meaning in Hindi",
    description:
      "उपनिषद का अर्थ, उत्पत्ति, संख्या और मुख्य उपदेश — जानिए 108 उपनिषदों की सूची, वेदान्त का मूल सिद्धांत और आत्मज्ञान की सम्पूर्ण व्याख्या हिंदी में।",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "उपनिषद का अर्थ हिंदी में",
        description:
          "उपनिषद शब्द का अर्थ, 108 उपनिषदों की सूची, प्रमुख उपनिषद और वेदान्त का मूल सिद्धांत।",
        path,
        inLanguage: "hi",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "हिंदी", path: "/hindi" },
        { name: "उपनिषद का अर्थ", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">होम</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">उपनिषद का अर्थ</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">वेदान्त · Vedanta</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            उपनिषद का अर्थ हिंदी में
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            शब्द-व्युत्पत्ति, संख्या, प्रमुख उपनिषद और मुख्य सिद्धांत — एक सम्पूर्ण मार्गदर्शिका।
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-6">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">उपनिषद शब्द का अर्थ</h2>
            <p>
              संस्कृत में <strong>उपनिषद</strong> तीन धातुओं से बना है — <em>उप</em> (समीप),{" "}
              <em>नि</em> (नीचे) और <em>सद्</em> (बैठना)। अर्थात् गुरु के समीप नीचे बैठकर आत्मज्ञान
              की गूढ़ शिक्षा ग्रहण करना। यही कारण है कि उपनिषदों को 'रहस्य विद्या' या 'ब्रह्म-विद्या'
              कहा गया है — यह ऐसा ज्ञान है जो सार्वजनिक व्याख्यान से नहीं, बल्कि योग्य शिष्य को
              एकान्त में दिया जाता था।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">उपनिषदों की संख्या</h2>
            <p>
              मुक्तिका उपनिषद में कुल <strong>108 उपनिषदों</strong> की सूची दी गई है। इनमें से 10
              उपनिषद <em>प्रमुख (मुख्य) उपनिषद</em> कहलाते हैं क्योंकि आदि शंकराचार्य ने इन पर
              भाष्य लिखा है — <strong>ईश, केन, कठ, प्रश्न, मुण्डक, माण्डूक्य, तैत्तिरीय, ऐतरेय,
              छान्दोग्य और बृहदारण्यक</strong>।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">वेदान्त — वेदों का अन्त</h2>
            <p>
              प्रत्येक उपनिषद किसी न किसी वेद का अन्तिम भाग है। ऋग्वेद के साथ ऐतरेय व कौषीतकि, यजुर्वेद
              के साथ बृहदारण्यक व ईश, सामवेद के साथ छान्दोग्य व केन, और अथर्ववेद के साथ मुण्डक, प्रश्न
              व माण्डूक्य जुड़े हैं। इसीलिए उपनिषदों को सामूहिक रूप से <strong>वेदान्त</strong> कहा
              जाता है — अर्थात् वेदों का सारभूत उपसंहार।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">मुख्य उपदेश — तत् त्वम् असि</h2>
            <p>
              समस्त उपनिषदों का सार तीन महावाक्यों में निहित है —{" "}
              <em>अहं ब्रह्मास्मि</em> (मैं ब्रह्म हूँ), <em>तत् त्वम् असि</em> (वह तू ही है), और{" "}
              <em>प्रज्ञानं ब्रह्म</em> (चेतना ही ब्रह्म है)। अर्थात् जो परम सत्य ब्रह्म बाहर है,
              वही आत्मा के रूप में भीतर विद्यमान है। इसी एकत्व का साक्षात् अनुभव मोक्ष है।
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">
            उपनिषद ऑनलाइन पढ़ें
          </p>
          <p className="mt-1 text-base md:text-lg leading-relaxed">
            प्रमुख उपनिषदों की हिंदी टीका — मंत्र, अर्थ और भावार्थ के साथ। पहला अध्याय निःशुल्क पढ़ें।
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
            <li>
              <Link to="/texts/upanishads" className="text-primary hover:underline">
                The Upanishads — full English guide →
              </Link>
            </li>
            <li>
              <Link to="/texts/vedas" className="text-primary hover:underline">
                चारों वेद — Rig, Sama, Yajur, Atharva →
              </Link>
            </li>
            <li>
              <Link to="/qa/how-many-upanishads" className="text-primary hover:underline">
                How many Upanishads are there? →
              </Link>
            </li>
            <li>
              <Link to="/hindi/dhyan-kaise-karein" className="text-primary hover:underline">
                ध्यान कैसे करें — शुरुआती लोगों के लिए गाइड →
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default UpanishadMeaningHindi;
