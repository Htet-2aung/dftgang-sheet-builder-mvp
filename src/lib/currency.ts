import { pricingConfig } from "@/config/pricing";

const formatter = new Intl.NumberFormat(pricingConfig.locale, {
  style: "currency",
  currency: pricingConfig.currency,
});

export function formatMoney(amount: number): string {
  return formatter.format(Number.isFinite(amount) ? amount : 0);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatInches(value: number, digits = 2): string {
  return `${Number(value.toFixed(digits))}″`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(pricingConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function newId(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + rnd;
}
