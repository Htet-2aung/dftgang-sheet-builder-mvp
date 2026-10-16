import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart, removeCartItem, setCartQuantity } from "@/data/repositories";
import { summarise } from "@/features/pricing/pricingService";
import { formatMoney } from "@/lib/currency";
import { pricingConfig } from "@/config/pricing";
export const Route = createFileRoute("/cart")({
  ssr: false,
  head: () => ({ meta: [{ title: "Cart — FilmForge" },{ name: "description", content: "Review your gang sheets." },{ property: "og:title", content: "Cart — FilmForge" },{ property: "og:description", content: "Review your gang sheets." }] }),
  component: CartPage,
});
export function OrderTotals({ items }: { items: { project: { sheetLengthInches: number }; quantity: number }[] }) {
  const s = summarise(items.map((i) => ({ lengthInches: i.project.sheetLengthInches, quantity: i.quantity })));
  return (<dl className="space-y-2 text-sm">{s.lines.map((l) => <div key={l.label} className="flex justify-between"><dt className="text-muted-foreground">{l.label}</dt><dd className="font-mono">{formatMoney(l.amount)}</dd></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><dt>Estimated total</dt><dd className="font-mono">{formatMoney(s.total)}</dd></div></dl>);
}
function CartPage() {
  const cart = useCart();
  return (
    <SiteLayout>
      <PageHeader eyebrow="Cart" title="Your gang sheets" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {cart.length === 0 ? (<div className="rounded-lg border p-10 text-center"><p className="font-medium">Your cart is empty</p><Button asChild className="mt-4"><Link to="/builder">Build a gang sheet</Link></Button></div>) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-3">{cart.map((i) => (
              <li key={i.id} className="flex flex-wrap gap-4 rounded-lg border p-4">
                {i.previewDataUrl && <img src={i.previewDataUrl} alt="" className="h-28 w-auto rounded border" />}
                <div className="flex-1"><p className="font-medium">{i.project.name}</p><p className="font-mono text-xs text-muted-foreground">{i.project.sheetWidthInches}″ × {i.project.sheetLengthInches}″ · {i.project.placements.length} designs</p><p className="mt-1 text-sm">{formatMoney(i.unitPrice)} each · subtotal {formatMoney(i.unitPrice * i.quantity)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">Qty <input type="number" min={1} max={pricingConfig.maxQuantityPerItem} value={i.quantity} onChange={(e) => { const q = Math.max(1, Math.min(pricingConfig.maxQuantityPerItem, Number(e.target.value) || 1)); setCartQuantity(i.id, q); }} className="ml-1 w-16 rounded border px-2 py-1" /></label>
                    <Button size="sm" variant="outline" asChild><Link to="/builder" search={{ edit: i.id }}>Edit design</Link></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeCartItem(i.id)}>Remove</Button>
                  </div></div>
              </li>))}</ul>
            <aside className="h-fit rounded-lg border p-5"><OrderTotals items={cart} /><Button asChild className="mt-5 w-full"><Link to="/checkout">Continue to checkout</Link></Button><p className="mt-2 text-xs text-muted-foreground">Illustrative demo pricing.</p></aside>
          </div>)}
      </div>
    </SiteLayout>
  );
}
