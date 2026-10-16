import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { sampleArtworkUrls } from "@/data/sampleArtwork";
import { faqs } from "./faq";
import studio from "@/assets/dtf-studio.jpg";
import { pricingConfig } from "@/config/pricing";
import { formatMoney } from "@/lib/currency";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "FilmForge — Custom DTF Gang Sheets, Precisely Printed" },{ name: "description", content: "Upload artwork, size it precisely and build custom DTF gang sheets with instant previews and pricing." },{ property: "og:title", content: "FilmForge — Custom DTF Gang Sheets" },{ property: "og:description", content: "Build print-ready DTF gang sheets online." }] }),
  component: Home,
});
function Home() {
  return (
    <SiteLayout>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">DTF gang sheet builder</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Your Artwork. Your Layout. Print-Ready Precision.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Create custom DTF gang sheets with precise sizing, intuitive artwork placement, and instant previews. Upload your designs and prepare your next print order in minutes.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/builder">Start Building</Link></Button><Button asChild size="lg" variant="outline"><Link to="/how-it-works">See How It Works</Link></Button><Button asChild size="lg" variant="ghost"><Link to="/builder" search={{ sample: true }}>Open example sheet</Link></Button></div>
        </div>
        <div className="rounded-xl border bg-workspace p-6 shadow-lift">
          <div className="sheet-grid relative mx-auto aspect-[22/24] max-w-md ring-1 ring-border" style={{ backgroundSize: "4.5% 4.1%" }}>
            <img src={sampleArtworkUrls.sample_wave} alt="" className="absolute left-[3%] top-[3%] w-[55%]" />
            <img src={sampleArtworkUrls.sample_sun} alt="" className="absolute right-[3%] top-[3%] w-[35%]" />
            <img src={sampleArtworkUrls.sample_star} alt="" className="absolute left-[3%] top-[32%] w-[23%]" />
            <img src={sampleArtworkUrls.sample_star} alt="" className="absolute left-[28%] top-[32%] w-[23%] rotate-12" />
            <img src={sampleArtworkUrls.sample_type} alt="" className="absolute bottom-[10%] left-[3%] w-[46%]" />
            <img src={sampleArtworkUrls.sample_sun} alt="" className="absolute bottom-[8%] right-[5%] w-[30%]" />
          </div>
          <p className="mt-3 text-center font-mono text-xs text-muted-foreground">22″ × 24″ example layout</p>
        </div>
      </section>
      <section className="border-y bg-secondary"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <img src={studio} alt="Printed DTF transfer sheets next to a t-shirt" loading="lazy" width={1280} height={896} className="rounded-lg" />
        <div><h2 className="text-3xl font-semibold">What is DTF printing?</h2><p className="mt-4 text-muted-foreground">Direct-to-Film printing puts your design onto a transfer film, which is heat-pressed onto cotton, polyester and blends. Gang sheets let you combine many designs on one sheet and pay by length.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">{["Upload PNG, JPEG or WebP","Size precisely in inches","Arrange and align layouts","Transparent live pricing"].map((f) => <li key={f} className="rounded-md border bg-background p-3">{f}</li>)}</ul></div>
      </div></section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6"><h2 className="text-3xl font-semibold">How ordering works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">{["Upload your artwork","Size and position designs","Preview and check layout","Add to cart and order"].map((s, i) => <li key={s} className="rounded-lg border p-5"><span className="font-mono text-primary">0{i + 1}</span><p className="mt-2 font-medium">{s}</p></li>)}</ol>
        <div className="mt-12 rounded-lg border p-6"><h3 className="text-xl font-semibold">Pricing, explained</h3><p className="mt-2 text-muted-foreground">Sheet length × {formatMoney(pricingConfig.pricePerLinearInch)} per linear inch (illustrative). A 22″ × 36″ sheet is {formatMoney(36 * pricingConfig.pricePerLinearInch)}. <Link to="/pricing" className="text-primary underline">See pricing</Link></p></div>
        <h2 className="mt-16 text-2xl font-semibold">Common questions</h2>
        <dl className="mt-6 grid gap-6 md:grid-cols-2">{faqs.slice(0, 4).map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd className="mt-1 text-sm text-muted-foreground">{a}</dd></div>)}</dl>
      </section>
      <section className="bg-ink text-ink-foreground"><div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6"><h2 className="text-3xl font-semibold">Ready to build your sheet?</h2><Button asChild size="lg" className="mt-6"><Link to="/builder">Build Your Gang Sheet</Link></Button></div></section>
    </SiteLayout>
  );
}
