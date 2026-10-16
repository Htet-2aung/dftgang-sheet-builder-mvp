import type { SheetArtworkPlacement } from "@/types";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Axis-aligned bounding box (inches) of a placement, accounting for rotation. */
export function boundsOf(p: SheetArtworkPlacement): Box {
  const cx = p.xInches + p.widthInches / 2;
  const cy = p.yInches + p.heightInches / 2;
  const r = (p.rotationDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const bw = p.widthInches * cos + p.heightInches * sin;
  const bh = p.widthInches * sin + p.heightInches * cos;
  return { left: cx - bw / 2, top: cy - bh / 2, right: cx + bw / 2, bottom: cy + bh / 2 };
}

export const boxWidth = (b: Box) => b.right - b.left;
export const boxHeight = (b: Box) => b.bottom - b.top;

/** Move a placement so its bounding box's top-left lands at (left, top). */
export function moveBoundsTo(p: SheetArtworkPlacement, left: number, top: number): SheetArtworkPlacement {
  const b = boundsOf(p);
  return { ...p, xInches: p.xInches + (left - b.left), yInches: p.yInches + (top - b.top) };
}

export function round(n: number, d = 3) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function normaliseAngle(a: number) {
  let x = a % 360;
  if (x < 0) x += 360;
  return round(x, 2);
}
