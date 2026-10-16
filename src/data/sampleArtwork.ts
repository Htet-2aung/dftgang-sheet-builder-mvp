import { pricingConfig } from "@/config/pricing";
import type { ArtworkItem, GangSheetProject } from "@/types";

/** Original sample artwork (trusted, in-repo SVG) with transparent backgrounds. */
const svgs: { id: string; filename: string; w: number; h: number; svg: string }[] = [
  {
    id: "sample_sun",
    filename: "sunrise-badge.svg",
    w: 600,
    h: 600,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><circle cx="300" cy="300" r="270" fill="#171923"/><circle cx="300" cy="300" r="240" fill="none" stroke="#F4B740" stroke-width="10"/><circle cx="300" cy="330" r="110" fill="#F4B740"/><rect x="90" y="330" width="420" height="140" fill="#171923"/><g stroke="#F4B740" stroke-width="14" stroke-linecap="round"><path d="M300 150v-40M190 200l-28-28M410 200l28-28M150 300h-40M450 300h40"/></g><path d="M120 360h360M150 395h300M185 430h230" stroke="#5B4CF0" stroke-width="14" stroke-linecap="round"/></svg>`,
  },
  {
    id: "sample_wave",
    filename: "wave-club.svg",
    w: 900,
    h: 420,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420"><path d="M20 250c80-120 160-120 240 0s160 120 240 0 160-120 240 0 100 60 140 40" fill="none" stroke="#5B4CF0" stroke-width="48" stroke-linecap="round"/><path d="M20 340c80-90 160-90 240 0s160 90 240 0 160-90 240 0 100 45 140 30" fill="none" stroke="#16845B" stroke-width="30" stroke-linecap="round"/><text x="450" y="120" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="110" fill="#171923">WAVE CLUB</text></svg>`,
  },
  {
    id: "sample_star",
    filename: "bold-star.svg",
    w: 500,
    h: 500,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><path d="M250 20l62 148 160 14-122 104 38 156-138-84-138 84 38-156L28 182l160-14z" fill="#D14343" stroke="#171923" stroke-width="16" stroke-linejoin="round"/><circle cx="250" cy="270" r="50" fill="#F4B740"/></svg>`,
  },
  {
    id: "sample_type",
    filename: "made-local.svg",
    w: 800,
    h: 300,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300"><rect x="10" y="10" width="780" height="280" rx="40" fill="none" stroke="#171923" stroke-width="16"/><text x="400" y="150" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="120" fill="#5B4CF0">Made</text><text x="400" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="24" font-size="70" fill="#171923">LOCAL</text></svg>`,
  },
];

const toDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function getSampleArtworks(): ArtworkItem[] {
  return svgs.map((s) => ({
    id: s.id,
    filename: s.filename,
    mimeType: "image/svg+xml",
    originalWidthPx: s.w,
    originalHeightPx: s.h,
    fileSizeBytes: s.svg.length,
    dataUrl: toDataUrl(s.svg),
    persisted: true,
    source: "sample" as const,
    fingerprint: `sample:${s.id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

export const sampleArtworkUrls = Object.fromEntries(svgs.map((s) => [s.id, toDataUrl(s.svg)]));

export function makeSampleProject(id: string, now: string): GangSheetProject {
  const P = (n: number, artworkId: string, x: number, y: number, w: number, h: number, r = 0) => ({
    id: `${id}_p${n}`,
    artworkId,
    xInches: x,
    yInches: y,
    widthInches: w,
    heightInches: h,
    rotationDegrees: r,
    zIndex: n,
    lockAspect: true,
  });
  return {
    id,
    name: "Example merch sheet",
    sheetWidthInches: pricingConfig.sheetWidthInches,
    sheetLengthInches: 24,
    placements: [
      P(0, "sample_wave", 0.5, 0.5, 12, 5.6),
      P(1, "sample_sun", 13.5, 0.5, 8, 8),
      P(2, "sample_star", 0.5, 7, 5, 5),
      P(3, "sample_star", 6, 7, 5, 5),
      P(4, "sample_type", 0.5, 13, 10, 3.75),
      P(5, "sample_sun", 13.5, 10, 4, 4),
      P(6, "sample_sun", 17.75, 10, 4, 4),
      P(7, "sample_type", 11.5, 17, 10, 3.75),
      P(8, "sample_wave", 0.5, 18, 9, 4.2),
    ],
    createdAt: now,
    updatedAt: now,
  };
}
