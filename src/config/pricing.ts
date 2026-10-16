/**
 * ILLUSTRATIVE demonstration pricing. Every value here must be replaced with
 * the client's approved pricing before launch. The UI never hardcodes prices.
 */
export const pricingConfig = {
  isIllustrative: true,
  currency: "GBP",
  locale: "en-GB",
  sheetWidthInches: 22,
  pricePerLinearInch: 3,
  minimumLengthInches: 12,
  lengthPresets: [12, 24, 36, 48, 60, 72],
  customLength: { min: 6, max: 200 },
  maxQuantityPerItem: 50,
  discount: {
    enabled: true,
    label: "Volume discount (example)",
    thresholdLinearInches: 120,
    rate: 0.1,
  },
  shipping: { label: "Delivery estimate (example)", flat: 4.95, freeOver: 75 },
  tax: { enabled: true, label: "VAT estimate (example, 20%)", rate: 0.2 },
} as const;

export type PricingConfig = typeof pricingConfig;
