import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { pricingConfig } from "@/config/pricing";
import { summarise } from "@/features/pricing/pricingService";
import { formatMoney } from "@/lib/currency";
export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — FilmForge" },{ name: "description", content: "Illustrative linear-inch pricing for DTF gang sheets." },{ property: "og:title", content: "Pricing — FilmForge" },{ property: "og:description", content: "Illustrative linear-inch pricing for DTF gang sheets." }] }),
  component: PricingPage,
});
function PricingPage() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Pricing" title="Simple linear-inch pricing">{formatMoney(pricingConfig.pricePerLinearInch)} per linear inch on a {pricingConfig.sheetWidthInches}″-wide sheet. All figures are illustrative demonstration values to be replaced with the client's approved pricing.</PageHeader>
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Sheet</th><th>Subtotal</th><th>Est. total (inc. delivery & VAT)</th></tr></thead>
          <tbody>{pricingConfig.lengthPresets.map((l) => { const s = summarise([{ lengthInches: l, quantity: 1 }]); return (<tr key={l} className="border-b"><td className="py-2 font-mono">{pricingConfig.sheetWidthInches}″ × {l}″</td><td className="font-mono">{formatMoney(s.subtotal)}</td><td className="font-mono">{formatMoney(s.total)}</td></tr>); })}</tbody></table>
        <p className="mt-4 text-xs text-muted-foreground">Example: 36″ × {formatMoney(pricingConfig.pricePerLinearInch)} = {formatMoney(36 * pricingConfig.pricePerLinearInch)}. Delivery {formatMoney(pricingConfig.shipping.flat)} (free over {formatMoney(pricingConfig.shipping.freeOver)}), VAT estimate 20%, {pricingConfig.discount.rate * 100}% example discount over {pricingConfig.discount.thresholdLinearInches} linear inches.</p>
        <Button asChild className="mt-8"><Link to="/builder" search={{ length: 24, fresh: true }}>Open builder with a 22″ × 24″ sheet</Link></Button>
      </div>
    </SiteLayout>
  );
}
