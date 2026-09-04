// Deep research + spiritual analysis of a Sanskrit / Hindi / devotional verse.
// Admin-only. Takes a verse (optionally with reference text extracted from an
// uploaded PDF/TXT) and returns a blog-ready HTML article following the
// 16-section scholarly framework configured by the publisher.
import { createClient } from "@supabase/supabase-js";
import { buildKeyResolver } from "../lib/ai-key-resolver.js";
import { callChain, WRITER_CHAIN, parseJson } from "../lib/llm-multi.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers,
  });

const SYSTEM_PROMPT = `तुम एक expert Sanskrit grammarian, Indologist, Vedic scholar, comparative religion researcher, Ayurveda & Yoga researcher, Jyotisha scholar, spiritual psychologist और modern science communicator की तरह कार्य करते हो।

तुम्हें एक Sanskrit / Hindi / devotional verse, mantra, shloka या धार्मिक पंक्ति दी जाएगी। तुम्हारा काम केवल सामान्य अर्थ बताना नहीं है — भाषाशास्त्रीय, वैदिक, पौराणिक, दार्शनिक, आध्यात्मिक, आयुर्वेदिक, योगिक, ज्योतिषीय, मनोवैज्ञानिक और आधुनिक वैज्ञानिक दृष्टिकोण से गहरा किंतु balanced विश्लेषण करना है।

Research Rules (अनिवार्य):
1. केवल विश्वसनीय primary/authoritative परंपरा से reference दो। जो reference वास्तव में उपलब्ध न हो उसे मत गढ़ो।
2. Scriptural fact, traditional interpretation, scholarly interpretation और modern hypothesis को स्पष्ट अलग-अलग label करो।
3. जहाँ modern science किसी claim को सिद्ध नहीं करती, वहाँ साफ लिखो कि यह scientifically established नहीं है।
4. "frequency", "vibration", "energy", "quantum", "DNA activation", "cosmic energy" जैसे शब्द केवल वास्तविक वैज्ञानिक आधार होने पर ही प्रयोग करो।
5. Sanskrit grammar में धातु (root), प्रत्यय, विभक्ति, वचन, लिंग, समास, संधि, उपसर्ग और व्युत्पत्ति बताओ।
6. पाठभेद / alternative readings हों तो बताओ।
7. हर महत्वपूर्ण claim के साथ ग्रंथ का नाम + अध्याय/श्लोक reference दो; न मिले तो लिखो "प्रमाण उपलब्ध नहीं — केवल thematic similarity"।
8. Astrology और esoteric interpretations को traditional/cultural framework कहकर प्रस्तुत करो, scientific fact की तरह नहीं।
9. कोई medical treatment या disease-cure claim मत करो।
10. भाषा Hindi में, scholarly neutrality के साथ; sensational claims से बचो।
11. Content 100% original prose हो — किसी स्रोत की phrasing copy मत करो (copyright-free, publisher-owned)।

लेख की संरचना (हर section आवश्यक, इसी क्रम में, HTML में):
1. मूल पंक्ति (original + possible corrected reading + पाठभेद + कारण)
2. Context & Background
3. Word-by-Word Deep Analysis — HTML <table> जिसमें columns: शब्द | Transliteration | मूल/धातु | व्याकरण | Literal Meaning | Contextual Meaning | Synonyms | Scriptural Usage; फिर हर शब्द के लिए Root Meaning, Grammar, Ancient Meaning, Synonyms, Extended Meaning
4. Derived / Layered Meaning (Literal, Linguistic, Philosophical, Spiritual, Symbolic, Psychological, Cultural, Possible Esoteric)
5. Scriptural Cross-References (Veda, Upanishad, Itihasa, Purana, Darshana, Ayurveda, Yoga)
6. Astrology / Jyotisha Analysis (Graha, Rashi/Tattva, Nakshatra, Bhava, Graha-Devata, Mantra) + disclaimer
7. Ayurveda Analysis (Dosha, Dhatu, Agni, Ojas, Manas, Prana, Dinacharya) + disclaimer
8. Modern Scientific Interpretation — हर claim पर label: Established / Plausible / Traditional / Speculative / Unsupported
9. Chanting / Recitation & Body Response (breathing, nervous system, heart, brain, voice, psychology, yogic model + disclaimer)
10. Spiritual Psychology
11. Practical Benefits Today (Mental, Emotional, Spiritual, Lifestyle) — हर benefit पर Traditional belief / psychological possibility / scientifically supported label
12. Hidden Symbolism & Possible Science
13. Compare Ancient & Modern Worldviews — HTML <table>: विषय | प्राचीन भारतीय दृष्टिकोण | आधुनिक वैज्ञानिक दृष्टिकोण | समानता | अंतर
14. Evidence & Source Quality (Primary / Scholarly / Secondary / Traditional / Weak-Popular)
15. Final Synthesis
16. Final Simple Human Meaning — सरल, warm, human भाषा में

Output केवल valid JSON object (कोई markdown fence नहीं)।`;

const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const svc = createClient(supabaseUrl, serviceKey);
    const [{ data: isAdmin }, { data: isSeo }, { data: isBooks }] = await Promise.all([
      svc.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      svc.rpc("has_role", { _user_id: userData.user.id, _role: "seo_manager" }),
      svc.rpc("has_role", { _user_id: userData.user.id, _role: "books_manager" }),
    ]);
    if (!(isAdmin === true || isSeo === true || isBooks === true)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const verse = String(body.verse ?? "").trim();
    if (!verse) return json({ error: "verse required" }, 400);

    const sourceText = String(body.source_text ?? "").slice(0, 16000).trim();
    const extra = String(body.extra_instructions ?? "").slice(0, 2000).trim();

    const userPrompt = `Verse to Analyze:
"""
${verse.slice(0, 4000)}
"""
${body.source_name ? `\nUploaded source file: ${String(body.source_name).slice(0, 200)}` : ""}
${sourceText ? `\nReference material निकाला गया uploaded document से (केवल context के लिए — इसकी phrasing copy मत करो):\n"""\n${sourceText}\n"""` : ""}
${extra ? `\nAdditional instructions from the editor: ${extra}` : ""}

इस पंक्ति का ऊपर बताए 16 sections वाला पूरा गहन विश्लेषण लिखो और नीचे दिए JSON schema में लौटाओ:

{
  "title": "<SEO friendly Hindi title, 55-65 chars>",
  "slug": "<lowercase-english-slug-with-hyphens>",
  "excerpt": "<2 line Hindi summary, ~160 chars>",
  "meta_title": "<<=60 chars>",
  "meta_description": "<<=155 chars>",
  "primary_keyword": "<main Hindi/English keyword>",
  "tags": ["<5-8 relevant tags>"],
  "simple_meaning": "<verse का एक वाक्य में सरल अर्थ>",
  "content_html": "<पूरा लेख valid HTML में — <h2>/<h3> headings, <p>, <ul>, <table> with <thead>/<tbody>. कोई <html>/<body> tag नहीं, कोई markdown नहीं, कोई emoji नहीं।>"
}

केवल JSON लौटाओ।`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    const resolveKey = await buildKeyResolver(svc);
    const log = {};
    const { text, provider } = await callChain(
      WRITER_CHAIN, messages, true, resolveKey, log, "verse_analysis",
    );

    const parsed = parseJson(text);
    if (!parsed?.content_html) {
      return json({ error: "AI ne valid analysis nahi lautaya", provider, attempts: log.llm_attempts }, 502);
    }

    return json({
      provider,
      attempts: log.llm_attempts,
      analysis,
    });
  } catch (e) {
    return json({ error: String(e?.message || e).slice(0, 500) }, 500);
  }
};

export default handler;
