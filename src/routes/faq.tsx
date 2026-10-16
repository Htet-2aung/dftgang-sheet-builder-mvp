import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/layout/SiteLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
export const faqs: [string, string][] = [
  ["What is DTF printing?", "Direct-to-Film printing prints your design onto a special film, which is then heat-pressed onto garments and other fabrics."],
  ["What is a gang sheet?", "A single sheet of film with many designs arranged on it, so you can print several designs or copies at once."],
  ["Which file formats can I upload?", "PNG, JPEG and WebP in this demo. SVG upload is not yet supported."],
  ["Why should artwork have a transparent background?", "Anything that isn't transparent prints. A transparent PNG ensures only your design transfers, not a white box."],
  ["How do I change the size of my design?", "Drag the corner handles on the sheet, or type an exact width and height in inches in the properties panel."],
  ["Can I place multiple designs on one sheet?", "Yes — add as many designs and copies as fit. Auto-arrange can pack them into rows."],
  ["How is the sheet price calculated?", "Sheet length in inches × the price per linear inch. Demo prices are illustrative only."],
  ["What happens when artwork overlaps?", "The builder warns you but doesn't block it, because overlaps can be intentional. Please check before ordering."],
  ["Can I save a design and return later?", "Yes. Projects save in this browser. Very large images may need to be re-selected after a reload."],
  ["Which files are accepted for final production?", "To be confirmed by the business. Typically high-resolution transparent PNGs (around 300 DPI at print size)."],
  ["What should I know before ordering?", "Check sizes, resolution warnings and overlaps. Turnaround, delivery and quality policies are awaiting client confirmation."],
];
export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — FilmForge" },{ name: "description", content: "Answers about DTF printing, gang sheets, files and pricing." },{ property: "og:title", content: "FAQ — FilmForge" },{ property: "og:description", content: "Answers about DTF printing, gang sheets, files and pricing." }] }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="FAQ" title="Frequently asked questions" />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Accordion type="single" collapsible>{faqs.map(([q, a]) => (<AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>))}</Accordion>
        <p id="legal" className="mt-10 text-xs text-muted-foreground">Privacy Policy and Terms of Service are placeholders awaiting client approval.</p>
      </div>
    </SiteLayout>
  ),
});
