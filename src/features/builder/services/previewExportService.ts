import type { ArtworkItem, GangSheetProject } from "@/types";

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

/**
 * Renders a SCREEN-RESOLUTION preview of the sheet. This is a demonstration
 * preview only — not a verified production (e.g. 300 DPI) print file.
 * Production export should be generated server-side from original files.
 */
export async function renderSheet(
  project: GangSheetProject,
  artworks: Record<string, ArtworkItem | undefined>,
  pxPerInch: number,
  opts: { background?: string } = {},
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(project.sheetWidthInches * pxPerInch);
  canvas.height = Math.round(project.sheetLengthInches * pxPerInch);
  const ctx = canvas.getContext("2d")!;
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const sorted = [...project.placements].sort((a, b) => a.zIndex - b.zIndex);
  for (const p of sorted) {
    const art = artworks[p.artworkId];
    const w = p.widthInches * pxPerInch;
    const h = p.heightInches * pxPerInch;
    ctx.save();
    ctx.translate((p.xInches + p.widthInches / 2) * pxPerInch, (p.yInches + p.heightInches / 2) * pxPerInch);
    ctx.rotate((p.rotationDegrees * Math.PI) / 180);
    try {
      if (!art?.dataUrl) throw new Error("missing");
      ctx.drawImage(await load(art.dataUrl), -w / 2, -h / 2, w, h);
    } catch {
      ctx.strokeStyle = "#D14343";
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
  return canvas;
}

export async function renderThumbnail(project: GangSheetProject, artworks: Record<string, ArtworkItem | undefined>) {
  const ppi = Math.min(12, 260 / project.sheetLengthInches, 260 / project.sheetWidthInches);
  const c = await renderSheet(project, artworks, Math.max(ppi, 3), { background: "#FFFFFF" });
  return c.toDataURL("image/jpeg", 0.8);
}

export async function downloadPreviewPng(project: GangSheetProject, artworks: Record<string, ArtworkItem | undefined>) {
  const c = await renderSheet(project, artworks, 40);
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Export failed");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "gang-sheet"}-demo-preview.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
