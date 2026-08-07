import Layout from "@/components/layout/Layout";
import { Star } from "lucide-react";
import useSEO from "@/hooks/useSEO";

const testimonials = [
  {
<<<<<<< HEAD
    name: "अनिल तिवारी",
    location: "बेंगलुरु, कर्नाटक",
    text: "मेट्रो में रोज़ आधा घंटा — इतने में ही गीता का एक अध्याय निबट जाता है। ऑफ़िस पहुँचने तक मन एकदम शांत। किताब हमेशा जेब में है यही सबसे बड़ी बात।",
    rating: 5,
  },
  {
    name: "सीमा अग्रवाल",
    location: "इंदौर, मध्य प्रदेश",
    text: "पहले लगता था डाउनलोड न होने से दिक़्क़त होगी। अब समझ आया — नया फ़ोन लिया, बस login किया, और सब कुछ वैसा का वैसा। बच्चों को भी उसी login से पढ़ा देती हूँ।",
    rating: 5,
  },
  {
    name: "गौरव मिश्रा",
    location: "वाराणसी, उत्तर प्रदेश",
    text: "पिताजी की आँखें कमज़ोर हैं। Font बड़ा किया और रात वाला mode चलाया — अब वे रोज़ हनुमान चालीसा पढ़ते हैं। छोटी-सी बात, पर घर में उजाला-सा हो गया।",
    rating: 5,
  },
  {
    name: "प्रीति नायर",
    location: "कोच्चि, केरल",
    text: "दक्षिण भारत में रहकर भी शुद्ध हिंदी अनुवाद वाले उपनिषद पढ़ पाना — यह पहले सोच भी नहीं सकती थी। संस्कृत मूल साथ में मिलने से पढ़ाई और गहरी हो जाती है।",
    rating: 5,
  },
  {
    name: "हरजीत सिंह",
    location: "मोहाली, पंजाब",
    text: "बहुत सी websites घूमीं, ज़्यादातर पर आधी बात लिखी होती है और आधी अटक जाती है। यहाँ पूरा पाठ मिलता है, अनुवाद भरोसे वाला है। पैसा वसूल है सच में।",
    rating: 4,
  },
  {
    name: "Rohan Deshpande",
    location: "लंदन, यूके",
    text: "Being outside India for a decade, finding authentic Sanskrit texts with a clean Hindi translation was tough. This site solved that in one login. Reader is clutter-free — no ads, no pop-ups.",
=======
    name: "Arjun Sharma",
    location: "New Delhi, India",
    text: "GyandootNova has transformed my spiritual journey. The online reader is so convenient — I can read sacred texts anywhere, anytime. The collection is truly remarkable.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    location: "Mumbai, India",
    text: "The quality of publications and the ease of access is unmatched. I love the dark mode feature for late-night reading sessions. A truly divine platform.",
    rating: 5,
  },
  {
    name: "David Wilson",
    location: "London, UK",
    text: "As someone living abroad, GyandootNova has been my bridge to Indian spiritual wisdom. The articles are insightful and the books are beautifully presented online.",
    rating: 5,
  },
  {
    name: "Meera Joshi",
    location: "Pune, India",
    text: "I've been using GyandootNova for over a year now. The variety of spiritual content — from meditation guides to philosophical discourses — keeps me coming back.",
    rating: 4,
  },
  {
    name: "Rajesh Kumar",
    location: "Varanasi, India",
    text: "What I appreciate most is that many books are free. This platform truly embodies the spirit of knowledge sharing. The donation option lets me give back too.",
    rating: 5,
  },
  {
    name: "Sarah Johnson",
    location: "New York, USA",
    text: "The online book reader is smooth and distraction-free. I can track my progress across chapters which helps me maintain a consistent reading practice.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    rating: 5,
  },
];

const TestimonialsPage = () => {
  useSEO({
<<<<<<< HEAD
    title: "पाठकों का अनुभव — GyandootNova Reviews",
    description:
      "GyandootNova पर पढ़ने वाले पाठकों ने क्या कहा — असली अनुभव, असली शब्द।",
=======
    title: "Reader Testimonials — GyandootNova Spiritual Books Reviews",
    description: "Read what spiritual seekers say about GyandootNova. Testimonials from readers of Vishnu Sahasraname, Bhagwat Geeta & other dharmik granth.",
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    canonical: "/testimonials",
  });

  return (
    <Layout>
      <main className="container py-16">
        <section className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
<<<<<<< HEAD
            पाठकों की ज़ुबानी
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            हमारे बारे में हम क्या कहें — सुनिए उन लोगों को जो रोज़ पढ़ रहे हैं।
=======
            What Our Readers Say
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from spiritual seekers who have found wisdom and inspiration through GyandootNova.
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
          </p>
        </section>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-xl border border-border bg-card">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < t.rating ? "fill-secondary text-secondary" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.text}"</p>
              <div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
};

export default TestimonialsPage;
