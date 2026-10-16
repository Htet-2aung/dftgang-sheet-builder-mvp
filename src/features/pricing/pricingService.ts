import { pricingConfig } from "@/config/pricing";
import { roundMoney } from "@/lib/currency";
import type { PriceSummary } from "@/types";

/** The single source of truth for all price calculations. */
export function isValidSheetLength(lengthInches: number): boolean {
  const { min, max } = pricingConfig.customLength;
  return Number.isFinite(lengthInches) && lengthInches >= min && lengthInches <= max;
}

export function billableLength(lengthInches: number): number {
  return Math.max(lengthInches, pricingConfig.minimumLengthInches);
}

export function sheetUnitPrice(lengthInches: number): number {
  if (!isValidSheetLength(lengthInches)) return NaN;
  return roundMoney(billableLength(lengthInches) * pricingConfig.pricePerLinearInch);
}

export function summarise(items: { lengthInches: number; quantity: number }[]): PriceSummary {
  const c = pricingConfig;
  let linearInches = 0;
  let subtotal = 0;
  let sheetCount = 0;
  for (const it of items) {
    const unit = sheetUnitPrice(it.lengthInches);
    if (!Number.isFinite(unit)) continue;
    linearInches += billableLength(it.lengthInches) * it.quantity;
    subtotal += unit * it.quantity;
    sheetCount += it.quantity;
  }
  subtotal = roundMoney(subtotal);
  const discount =
    c.discount.enabled && linearInches >= c.discount.thresholdLinearInches
      ? roundMoney(subtotal * c.discount.rate)
      : 0;
  const afterDiscount = subtotal - discount;
  const shipping = sheetCount === 0 || afterDiscount >= c.shipping.freeOver ? 0 : c.shipping.flat;
  const tax = c.tax.enabled ? roundMoney((afterDiscount + shipping) * c.tax.rate) : 0;
  const total = roundMoney(afterDiscount + shipping + tax);

  const lines = [{ label: `Subtotal (${linearInches} linear in)`, amount: subtotal }];
  if (discount > 0) lines.push({ label: c.discount.label, amount: -discount });
  lines.push({ label: c.shipping.label, amount: shipping });
  if (c.tax.enabled) lines.push({ label: c.tax.label, amount: tax });

  return { linearInches, sheetCount, subtotal, discount, shipping, tax, total, lines };
}
