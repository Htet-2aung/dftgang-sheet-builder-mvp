import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout, PageHeader } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cartStore, createOrder, getArtworkMap, useCart } from "@/data/repositories";
import { summarise } from "@/features/pricing/pricingService";
import { isCheckoutReady, validateProject } from "@/features/builder/services/validationService";
import { OrderTotals } from "./cart";
const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional().refine((v) => !v || /^[+0-9 ()-]{7,}$/.test(v), "Enter a valid phone number"),
  address: z.string().trim().min(3, "Enter your address").max(200),
  city: z.string().trim().min(2, "Enter your city").max(80),
  postcode: z.string().trim().min(3, "Enter your postcode").max(12),
  country: z.string().trim().min(2, "Enter your country").max(60),
  notes: z.string().max(500).optional(),
  confirm: z.literal(true, { message: "Please confirm the order summary" }),
});
type F = z.infer<typeof schema>;
export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — FilmForge" },{ name: "description", content: "Demo checkout." },{ property: "og:title", content: "Checkout — FilmForge" },{ property: "og:description", content: "Demo checkout." }] }),
  component: Checkout,
});
function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { country: "United Kingdom" } });
  if (!cart.length) return <SiteLayout><div className="p-16 text-center"><p>Your cart is empty.</p><Button asChild className="mt-4"><Link to="/builder">Build a sheet</Link></Button></div></SiteLayout>;
  const submit = (d: F) => {
    const arts = getArtworkMap();
    if (cart.some((i) => !isCheckoutReady(validateProject(i.project, arts)))) return toast.error("A sheet has layout errors. Edit it before ordering.");
    const s = summarise(cart.map((i) => ({ lengthInches: i.project.sheetLengthInches, quantity: i.quantity })));
    try {
      const { confirm: _c, ...customer } = d;
      const now = new Date().toISOString();
      const o = createOrder({ customer, status: "pending_review", items: cart, subtotal: s.subtotal, discount: s.discount, shippingEstimate: s.shipping, taxEstimate: s.tax, total: s.total, createdAt: now, statusHistory: [{ status: "pending_review", at: now }], demoMode: true });
      cartStore.set([]);
      navigate({ to: "/order-confirmation/$orderId", params: { orderId: o.id } });
    } catch { toast.error("The demo order couldn't be saved. Browser storage may be full."); }
  };
  const field = (k: keyof F, label: string, opt?: boolean) => (<div className="space-y-1"><Label htmlFor={k}>{label}{opt && <span className="text-muted-foreground"> (optional)</span>}</Label><Input id={k} {...register(k)} aria-invalid={!!errors[k]} />{errors[k] && <p className="text-xs text-destructive">{errors[k]?.message as string}</p>}</div>);
  return (
    <SiteLayout>
      <PageHeader eyebrow="Checkout" title="Demo checkout">No payment details are collected. Placing an order creates a demonstration record in this browser only.</PageHeader>
      <form onSubmit={handleSubmit(submit)} noValidate className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">{field("fullName", "Full name")}{field("email", "Email")}{field("phone", "Telephone", true)}{field("address", "Delivery address")}{field("city", "City")}{field("postcode", "Postcode")}{field("country", "Country")}
          <div className="space-y-1 sm:col-span-2"><Label htmlFor="notes">Order notes <span className="text-muted-foreground">(optional)</span></Label><Textarea id="notes" {...register("notes")} /></div></div>
        <aside className="h-fit space-y-4 rounded-lg border p-5"><ul className="space-y-1 text-sm">{cart.map((i) => <li key={i.id} className="flex justify-between"><span>{i.project.name} × {i.quantity}</span><span className="font-mono text-xs">{i.project.sheetWidthInches}″×{i.project.sheetLengthInches}″</span></li>)}</ul><OrderTotals items={cart} />
          <label className="flex gap-2 text-sm"><input type="checkbox" {...register("confirm")} /> I have reviewed the order summary.</label>{errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>Place Demo Order</Button></aside>
      </form>
    </SiteLayout>
  );
}
