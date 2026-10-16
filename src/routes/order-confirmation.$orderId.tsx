import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/data/repositories";
import { formatMoney } from "@/lib/currency";
export const Route = createFileRoute("/order-confirmation/$orderId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Order confirmation — FilmForge" },{ name: "description", content: "Demo order confirmation." },{ property: "og:title", content: "Order confirmation — FilmForge" },{ property: "og:description", content: "Demo order confirmation." }] }),
  component: Confirm,
});
function Confirm() {
  const { orderId } = Route.useParams();
  const o = useOrders().find((x) => x.id === orderId);
  return (
    <SiteLayout><div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      {!o ? <p>We couldn't find that demo order in this browser.</p> : (<>
        <p className="font-mono text-sm text-success">Demo order {o.orderNumber}</p>
        <h1 className="mt-2 text-3xl font-semibold">Your demonstration order was created</h1>
        <p className="mt-2 text-muted-foreground">No real payment was taken and no production order or email was sent.</p>
        <ul className="mt-6 space-y-2 rounded-lg border p-5 text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.project.name} × {i.quantity}</span><span className="font-mono">{i.project.sheetWidthInches}″ × {i.project.sheetLengthInches}″</span></li>)}<li className="flex justify-between border-t pt-2 font-semibold"><span>Estimated total</span><span>{formatMoney(o.total)}</span></li></ul>
        <p className="mt-4 text-sm">{o.customer.fullName} · {o.customer.email}<br />{o.customer.address}, {o.customer.city} {o.customer.postcode}, {o.customer.country}</p></>)}
      <div className="mt-8 flex gap-3"><Button asChild variant="outline"><Link to="/">Return home</Link></Button><Button asChild><Link to="/builder" search={{ fresh: true }}>Start another order</Link></Button></div>
    </div></SiteLayout>
  );
}
