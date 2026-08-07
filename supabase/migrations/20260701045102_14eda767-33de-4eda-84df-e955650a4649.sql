
CREATE TABLE public.lsi_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  category text,
  related_terms text[] DEFAULT '{}',
  description text,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lsi_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lsi_keywords TO authenticated;
GRANT ALL ON public.lsi_keywords TO service_role;

ALTER TABLE public.lsi_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active LSI keywords"
  ON public.lsi_keywords FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert LSI keywords"
  ON public.lsi_keywords FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update LSI keywords"
  ON public.lsi_keywords FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete LSI keywords"
  ON public.lsi_keywords FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_lsi_keywords_updated_at
  BEFORE UPDATE ON public.lsi_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lsi_keywords_active_priority ON public.lsi_keywords (is_active, priority DESC);

INSERT INTO public.lsi_keywords (term, category, related_terms, description, priority) VALUES
  ('भगवद्गीता', 'Scripture', ARRAY['Bhagavad Gita','गीता सार','Krishna teachings','कर्म योग','भक्ति योग','ज्ञान योग'], 'श्रीमद्भगवद्गीता — 18 अध्यायों में श्रीकृष्ण द्वारा अर्जुन को दिया गया दिव्य ज्ञान।', 100),
  ('रामायण', 'Scripture', ARRAY['Ramayana','वाल्मीकि रामायण','राम कथा','सुंदरकांड','रामचरितमानस','Ram Katha'], 'महर्षि वाल्मीकि रचित प्रभु श्रीराम की महागाथा।', 95),
  ('महाभारत', 'Scripture', ARRAY['Mahabharata','व्यास','कुरुक्षेत्र','पांडव','कौरव','Vyasa Mahabharat'], 'महर्षि वेदव्यास रचित विश्व का सबसे बड़ा महाकाव्य।', 90),
  ('वेद', 'Scripture', ARRAY['Vedas','ऋग्वेद','यजुर्वेद','सामवेद','अथर्ववेद','Sanatan Dharma texts'], 'चार वेद — सनातन धर्म के मूल ग्रंथ।', 88),
  ('उपनिषद', 'Philosophy', ARRAY['Upanishads','ईशावास्य','कठोपनिषद','मुण्डक','ब्रह्मज्ञान'], '108 उपनिषद — वेदांत दर्शन का सार।', 85),
  ('सनातन धर्म', 'Philosophy', ARRAY['Sanatan Dharma','Hinduism','हिंदू धर्म','Eternal religion','धर्म शास्त्र'], 'अनादि-अनंत शाश्वत धर्म परंपरा।', 82),
  ('योग', 'Practice', ARRAY['Yoga','अष्टांग योग','पतंजलि योग सूत्र','ध्यान','प्राणायाम','meditation'], 'महर्षि पतंजलि के योग सूत्र और आध्यात्मिक साधना।', 80),
  ('भक्ति', 'Practice', ARRAY['Bhakti','devotion','नवधा भक्ति','कीर्तन','सत्संग','spiritual devotion'], 'ईश्वर के प्रति प्रेम और समर्पण का मार्ग।', 78),
  ('पुराण', 'Scripture', ARRAY['Puranas','18 महापुराण','भागवत पुराण','शिव पुराण','विष्णु पुराण'], 'अठारह महापुराण — हिंदू पौराणिक साहित्य।', 75),
  ('संस्कृत', 'Language', ARRAY['Sanskrit','देववाणी','मंत्र','श्लोक','Sanskrit shlokas'], 'देवभाषा संस्कृत — शास्त्रों की मूल भाषा।', 70);
