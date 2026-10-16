import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
const steps = ["Upload artwork (PNG, JPEG or WebP, processed in your browser).","Adjust sizes and position in inches on a 22″-wide sheet.","Review the gang-sheet preview and layout checks.","Confirm the illustrative price estimate.","Submit a demo order."];
export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "How It Works — FilmForge" },{ name: "description", content: "Five steps from artwork upload to DTF gang sheet order." },{ property: "og:title", content: "How It Works — FilmForge" },{ property: "og:description", content: "Five steps from artwork upload to DTF gang sheet order." }] }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="How it works" title="From artwork to print-ready gang sheet">Build your layout online in minutes.</PageHeader>
      <ol className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-5">
        {steps.map((s, i) => (<li key={s} className="rounded-lg border p-5"><span className="font-mono text-sm text-primary">0{i + 1}</span><p className="mt-2 text-sm">{s}</p></li>))}
      </ol>
      <div className="pb-16 text-center"><Button asChild><Link to="/builder">Start building</Link></Button></div>
    </SiteLayout>
  ),
});
