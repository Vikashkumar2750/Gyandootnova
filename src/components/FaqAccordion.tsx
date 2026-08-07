import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FAQItem } from "@/lib/jsonLd";

interface Props {
  items: FAQItem[];
  title?: string;
}

const FaqAccordion = ({ items, title = "Frequently Asked Questions" }: Props) => {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-12">
      <h2 id="faq-heading" className="font-serif text-2xl md:text-3xl font-bold text-primary mb-4">
        {title}
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqAccordion;
