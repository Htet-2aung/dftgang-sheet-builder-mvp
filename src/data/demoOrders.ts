import { summarise, sheetUnitPrice } from "@/features/pricing/pricingService";
import { makeSampleProject } from "@/data/sampleArtwork";
import type { Order } from "@/types";

/** Clearly fictional example orders shown in the admin demo. */
export function makeSeedOrders(): Order[] {
  const mk = (n: number, name: string, email: string, city: string, status: Order["status"], qty: number, len: number, daysAgo: number): Order => {
    const at = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const project = { ...makeSampleProject(`seed${n}`, at), sheetLengthInches: len, name: `Example sheet ${n}` };
    const s = summarise([{ lengthInches: len, quantity: qty }]);
    return {
      id: `seed_${n}`,
      orderNumber: `FF-DEMO${n}`,
      customer: { fullName: name, email, address: "1 Example Street", city, postcode: "AB1 2CD", country: "United Kingdom" },
      status,
      items: [{ id: `seed_item_${n}`, project, quantity: qty, unitPrice: sheetUnitPrice(len), addedAt: at }],
      subtotal: s.subtotal,
      discount: s.discount,
      shippingEstimate: s.shipping,
      taxEstimate: s.tax,
      total: s.total,
      createdAt: at,
      statusHistory: [{ status: "pending_review", at }],
      demoMode: true,
      isSeed: true,
    };
  };
  return [
    mk(1, "Sample Customer A", "customer.a@example.com", "Leeds", "in_production", 2, 36, 3),
    mk(2, "Sample Customer B", "customer.b@example.com", "Bristol", "pending_review", 1, 24, 1),
    mk(3, "Sample Customer C", "customer.c@example.com", "Glasgow", "completed", 3, 48, 9),
  ];
}
