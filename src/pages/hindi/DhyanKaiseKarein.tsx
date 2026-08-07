import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import useSEO from "@/hooks/useSEO";
import FaqAccordion from "@/components/FaqAccordion";
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQSchema } from "@/lib/jsonLd";

const path = "/hindi/dhyan-kaise-karein";

const faqs = [
  {
    question: "ध्यान करने का सही तरीका क्या है?",
    answer:
      "ध्यान का सही तरीका है — शान्त स्थान चुनें, आराम से बैठें (पद्मासन, सुखासन या कुर्सी पर), रीढ़ सीधी रखें, आँखें बन्द करें, और अपनी स्वाभाविक श्वास पर ध्यान दें। जब मन भटके तो बिना निर्णय के धीरे से पुनः श्वास पर लौट आएँ। आरम्भ में 5–10 मिनट प्रतिदिन पर्याप्त है।",
  },
  {
    question: "शुरुआत में कितने मिनट ध्यान करना चाहिए?",
    answer:
      "शुरुआती लोगों के लिए 5–10 मिनट प्रतिदिन आदर्श है। 2–3 सप्ताह की नियमितता के बाद इसे 15–20 मिनट तक बढ़ाएँ। 20–30 मिनट प्रतिदिन एक स्थायी अभ्यास बनने के लिए पर्याप्त है।",
  },
  {
    question: "ध्यान का सबसे अच्छा समय कौन-सा है?",
    answer:
      "पारम्परिक रूप से ब्रह्ममुहूर्त (सुबह 4–6 बजे) और सूर्यास्त के आसपास ध्यान के लिए सर्वोत्तम माना गया है। परन्तु जो समय आपको प्रतिदिन एक ही समय पर मिल सके — वही आपके लिए सर्वोत्तम है। नियमितता समय से अधिक महत्त्वपूर्ण है।",
  },
  {
    question: "क्या ध्यान करते समय आँखें खुली रखनी चाहिए या बन्द?",
    answer:
      "अधिकांश परम्पराओं में शुरुआती लोगों को आँखें बन्द रखने की सलाह दी जाती है क्योंकि इससे बाह्य विक्षेप कम होते हैं। ज़ेन परम्परा में आधी खुली आँखों से ज़मीन पर दृष्टि रखी जाती है। जो आपके लिए सहज हो वही चुनें।",
  },
  {
    question: "ध्यान में मन एकाग्र क्यों नहीं होता?",
    answer:
      "यह पूरी तरह सामान्य है — मन का स्वभाव ही चंचल है। ध्यान का उद्देश्य मन को 'रोकना' नहीं, बल्कि जब वह भटके तो बिना खीज के धीरे से लौटा लाना है। यही बार-बार लौटाने का अभ्यास ही 'ध्यान' है।",
  },
  {
    question: "क्या ध्यान से मानसिक तनाव कम होता है?",
    answer:
      "हाँ। हार्वर्ड और NIMHANS सहित अनेक शोधों में सिद्ध हुआ है कि नियमित ध्यान से कोर्टिसोल (तनाव-हार्मोन) कम होता है, रक्तचाप घटता है, नींद बेहतर होती है और चिन्ता व अवसाद के लक्षणों में उल्लेखनीय कमी आती है।",
  },
  {
    question: "ध्यान और प्रार्थना में क्या अन्तर है?",
    answer:
      "प्रार्थना ईश्वर से 'बात करना' है — अभिव्यक्ति। ध्यान ईश्वर की 'सुनना' है — मौन में स्थित होना। दोनों पूरक हैं; अनेक साधक प्रार्थना से आरम्भ करके ध्यान में प्रवेश करते हैं।",
  },
];

const DhyanKaiseKarein = () => {
  useSEO({
    title: "ध्यान कैसे करें — शुरुआती लोगों के लिए संपूर्ण मार्गदर्शिका",
    description:
      "ध्यान (Meditation) कैसे करें — सही आसन, श्वास तकनीक, समय, चरण-दर-चरण विधि और सामान्य गलतियाँ। शुरुआती लोगों के लिए वैदिक-आधारित सम्पूर्ण गाइड।",
    canonical: path,
    ogType: "article",
    hreflang: true,
    jsonLd: [
      buildArticleSchema({
        headline: "ध्यान कैसे करें — शुरुआती लोगों के लिए संपूर्ण मार्गदर्शिका",
        description:
          "ध्यान की सही विधि, आसन, श्वास तकनीक और सामान्य गलतियाँ — शुरुआती लोगों के लिए।",
        path,
        inLanguage: "hi",
      }),
      buildFAQSchema(faqs),
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "हिंदी", path: "/hindi" },
        { name: "ध्यान कैसे करें", path },
      ]),
    ],
  });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">होम</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">ध्यान कैसे करें</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">
            शुरुआती लोगों के लिए · Beginner's Guide
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2 leading-tight">
            ध्यान कैसे करें — शुरुआती लोगों के लिए संपूर्ण मार्गदर्शिका
          </h1>
          <p className="text-lg text-muted-foreground mt-3">
            सही आसन, श्वास-विधि, समय, चरण-दर-चरण अभ्यास और सामान्य गलतियाँ — एक ही गाइड में।
          </p>
        </header>

        <div className="prose prose-lg max-w-none dark:prose-invert space-y-8">
          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">ध्यान क्या है?</h2>
            <p>
              ध्यान (Meditation) मन को एक बिन्दु पर स्थिर करने का अभ्यास है। पतंजलि योगसूत्र में
              इसे अष्टांग योग का सातवाँ अंग बताया गया है — <em>तत्र प्रत्ययैकतानता ध्यानम्</em> (जब
              चित्त की धारा एक ही विषय पर अखण्ड बहने लगे, वही ध्यान है)। भगवद्‌ गीता के छठे अध्याय
              (ध्यान योग) में श्रीकृष्ण ने अर्जुन को यही विधि विस्तार से सिखाई है।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">ध्यान की तैयारी</h2>
            <ul>
              <li><strong>स्थान:</strong> शान्त, स्वच्छ स्थान — मन्दिर का कोना, बालकनी, या कमरा।</li>
              <li><strong>समय:</strong> ब्रह्ममुहूर्त (सुबह 4–6 बजे) सर्वोत्तम; रोज़ एक ही समय।</li>
              <li><strong>आसन:</strong> पद्मासन, सुखासन या कुर्सी पर — जो भी 15 मिनट स्थिर रह सके।</li>
              <li><strong>वस्त्र:</strong> ढीले, सूती।</li>
              <li><strong>पेट:</strong> भोजन के 2 घंटे बाद।</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">चरण-दर-चरण विधि</h2>
            <ol>
              <li><strong>बैठें</strong> — रीढ़ सीधी, कंधे शिथिल, हाथ घुटनों पर ज्ञान-मुद्रा में।</li>
              <li><strong>आँखें बन्द करें</strong> — तीन गहरी श्वास लेकर शरीर को ढीला छोड़ें।</li>
              <li><strong>श्वास पर ध्यान दें</strong> — नासिका के प्रवेश-द्वार पर श्वास आते-जाते को महसूस करें। श्वास को नियंत्रित न करें, केवल देखें।</li>
              <li><strong>मन भटके तो लौटाएँ</strong> — बिना निर्णय के, धीरे से पुनः श्वास पर लौट आएँ। यही अभ्यास का सार है।</li>
              <li><strong>मन्त्र (वैकल्पिक)</strong> — 'ॐ', 'सो-हम्', या इष्ट-मन्त्र का मानसिक जप श्वास के साथ।</li>
              <li><strong>समाप्ति</strong> — 10 मिनट बाद हथेलियाँ रगड़कर आँखों पर रखें, फिर धीरे से खोलें।</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">6 सामान्य गलतियाँ</h2>
            <ol>
              <li><strong>मन को 'रोकने' की कोशिश करना</strong> — मन को रोकना असम्भव है; उसे केवल लौटाना है।</li>
              <li><strong>पहले ही दिन 30 मिनट का लक्ष्य</strong> — 5 मिनट से शुरू करें, बढ़ाएँ धीरे-धीरे।</li>
              <li><strong>अनियमितता</strong> — रोज़ 5 मिनट, हफ्ते में एक बार 40 मिनट से बेहतर है।</li>
              <li><strong>श्वास को नियंत्रित करना</strong> — प्राणायाम अलग अभ्यास है; ध्यान में श्वास स्वाभाविक रखें।</li>
              <li><strong>'अनुभव' की तलाश</strong> — प्रकाश, दृश्य आदि की अपेक्षा साधना बाधित करती है।</li>
              <li><strong>असुविधाजनक आसन में जबरन बैठना</strong> — दर्द ध्यान को असम्भव बना देता है।</li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">ध्यान के लाभ</h2>
            <p>
              नियमित ध्यान से — तनाव व चिन्ता में कमी, नींद में सुधार, रक्तचाप का सामान्य होना,
              एकाग्रता व स्मरण-शक्ति में वृद्धि, भावनात्मक स्थिरता, और आध्यात्मिक दृष्टि से आत्म-बोध
              की ओर प्रगति।
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">अगला कदम</h2>
            <p>
              21 दिन तक बिना नागा दैनिक अभ्यास करें। इसके बाद अपनी रुचि के अनुसार विशिष्ट तकनीक
              चुनें — विपश्यना, ज़ेन, TM, क्रिया योग, या 'मैं कौन हूँ?' आत्म-विचार। नीचे दिए लिंक
              से इन सब का तुलनात्मक अध्ययन करें।
            </p>
          </section>
        </div>

        <FaqAccordion items={faqs} title="अक्सर पूछे जाने वाले प्रश्न" />

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">आगे पढ़ें</h2>
          <ul className="space-y-2">
            <li><Link to="/meditation/techniques-compared" className="text-primary hover:underline">Vipassana, Zen, TM, Kriya & Who-Am-I — तकनीकों की तुलना →</Link></li>
            <li><Link to="/meditation/for-anxiety" className="text-primary hover:underline">चिन्ता (Anxiety) के लिए ध्यान →</Link></li>
            <li><Link to="/meditation/for-stress" className="text-primary hover:underline">तनाव (Stress) के लिए ध्यान →</Link></li>
            <li><Link to="/texts/bhagavad-gita" className="text-primary hover:underline">भगवद्‌ गीता — अध्याय 6: ध्यान योग →</Link></li>
          </ul>
        </section>
      </article>
    </Layout>
  );
};

export default DhyanKaiseKarein;
