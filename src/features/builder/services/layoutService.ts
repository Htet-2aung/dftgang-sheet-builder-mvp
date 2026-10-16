import { appConfig } from "@/config/app";
import type { SheetArtworkPlacement } from "@/types";
import { boundsOf, boxHeight, boxWidth, moveBoundsTo, round } from "./geometry";

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

const fix = (p: SheetArtworkPlacement) => ({ ...p, xInches: round(p.xInches), yInches: round(p.yInches) });

/**
 * Simple shelf (row) packing. Sorts by bounding-box height, fills rows left to
 * right. Never resizes or rotates. Not a waste-optimal algorithm.
 */
export function arrangeRows(placements: SheetArtworkPlacement[], sheetWidth: number, sheetLength: number) {
  const gap = appConfig.editor.arrangeGapInches;
  const sorted = [...placements].sort((a, b) => boxHeight(boundsOf(b)) - boxHeight(boundsOf(a)));
  const moved = new Map<string, SheetArtworkPlacement>();
  let x = gap;
  let y = gap;
  let rowH = 0;
  let tooWide = 0;
  for (const p of sorted) {
    const b = boundsOf(p);
    const w = boxWidth(b);
    const h = boxHeight(b);
    if (w > sheetWidth) tooWide++;
    if (x + w > sheetWidth - gap + 1e-6 && x > gap) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    moved.set(p.id, fix(moveBoundsTo(p, x, y)));
    x += w + gap;
    rowH = Math.max(rowH, h);
  }
  const usedLength = round(y + rowH + gap, 2);
  const result = placements.map((p) => moved.get(p.id) ?? p);
  return { placements: result, usedLength, fits: usedLength <= sheetLength + 1e-6 && tooWide === 0, tooWide };
}

export function align(placements: SheetArtworkPlacement[], ids: string[], mode: AlignMode, sheetWidth: number, sheetLength: number) {
  const sel = placements.filter((p) => ids.includes(p.id));
  if (!sel.length) return placements;
  const boxes = sel.map(boundsOf);
  // One item aligns to the sheet; several align to their combined bounds.
  const ref =
    sel.length === 1
      ? { left: 0, top: 0, right: sheetWidth, bottom: sheetLength }
      : {
          left: Math.min(...boxes.map((b) => b.left)),
          top: Math.min(...boxes.map((b) => b.top)),
          right: Math.max(...boxes.map((b) => b.right)),
          bottom: Math.max(...boxes.map((b) => b.bottom)),
        };
  return placements.map((p) => {
    if (!ids.includes(p.id)) return p;
    const b = boundsOf(p);
    let { left, top } = b;
    if (mode === "left") left = ref.left;
    if (mode === "right") left = ref.right - boxWidth(b);
    if (mode === "center") left = (ref.left + ref.right) / 2 - boxWidth(b) / 2;
    if (mode === "top") top = ref.top;
    if (mode === "bottom") top = ref.bottom - boxHeight(b);
    if (mode === "middle") top = (ref.top + ref.bottom) / 2 - boxHeight(b) / 2;
    return fix(moveBoundsTo(p, left, top));
  });
}

/** Equal gaps between selected designs (needs 3+). */
export function distribute(placements: SheetArtworkPlacement[], ids: string[], axis: "x" | "y") {
  const sel = placements.filter((p) => ids.includes(p.id));
  if (sel.length < 3) return placements;
  const items = sel.map((p) => ({ p, b: boundsOf(p) })).sort((a, b) => (axis === "x" ? a.b.left - b.b.left : a.b.top - b.b.top));
  const start = axis === "x" ? items[0].b.left : items[0].b.top;
  const end = axis === "x" ? Math.max(...items.map((i) => i.b.right)) : Math.max(...items.map((i) => i.b.bottom));
  const total = items.reduce((s, i) => s + (axis === "x" ? boxWidth(i.b) : boxHeight(i.b)), 0);
  const gap = (end - start - total) / (items.length - 1);
  let cursor = start;
  const moved = new Map<string, SheetArtworkPlacement>();
  for (const { p, b } of items) {
    moved.set(p.id, fix(axis === "x" ? moveBoundsTo(p, cursor, b.top) : moveBoundsTo(p, b.left, cursor)));
    cursor += (axis === "x" ? boxWidth(b) : boxHeight(b)) + gap;
  }
  return placements.map((p) => moved.get(p.id) ?? p);
}

/** Move (never resize) every design so it sits inside the sheet where possible. */
export function fitWithinSheet(placements: SheetArtworkPlacement[], sheetWidth: number, sheetLength: number) {
  let tooLarge = 0;
  const result = placements.map((p) => {
    const b = boundsOf(p);
    const w = boxWidth(b);
    const h = boxHeight(b);
    if (w > sheetWidth || h > sheetLength) tooLarge++;
    const left = Math.min(Math.max(b.left, 0), Math.max(0, sheetWidth - w));
    const top = Math.min(Math.max(b.top, 0), Math.max(0, sheetLength - h));
    return fix(moveBoundsTo(p, left, top));
  });
  return { placements: result, tooLarge };
}

/** Default first-placement size: fits the printable area, keeps aspect ratio. */
export function initialSize(pxW: number, pxH: number, sheetWidth: number, sheetLength: number, dpi: number) {
  const aspect = pxH / pxW;
  let w = Math.min(Math.max(pxW / dpi, 2), 10, sheetWidth - 1);
  let h = w * aspect;
  const maxH = Math.max(1, sheetLength - 1);
  if (h > maxH) {
    h = maxH;
    w = h / aspect;
  }
  return { widthInches: round(w, 2), heightInches: round(h, 2) };
}
