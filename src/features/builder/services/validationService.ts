import { appConfig } from "@/config/app";
import { isValidSheetLength } from "@/features/pricing/pricingService";
import type { ArtworkItem, GangSheetProject, ValidationIssue } from "@/types";
import { boundsOf } from "./geometry";

const EPS = 0.01;

/** Shared rules — used by the editor, the cart and checkout. */
export function validateProject(
  project: GangSheetProject,
  artworks: Record<string, ArtworkItem | undefined>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const W = project.sheetWidthInches;
  const L = project.sheetLengthInches;

  if (!isValidSheetLength(L)) {
    issues.push({ level: "error", code: "invalid_size", message: "The sheet length is outside the allowed range.", placementIds: [] });
  }
  if (project.placements.length === 0) {
    issues.push({ level: "error", code: "empty_sheet", message: "The sheet has no artwork yet.", placementIds: [] });
    return issues;
  }

  const outIds: string[] = [];
  const missingIds: string[] = [];
  const badSize: string[] = [];
  for (const p of project.placements) {
    if (!(p.widthInches >= appConfig.editor.minArtworkInches) || !(p.heightInches >= appConfig.editor.minArtworkInches)) badSize.push(p.id);
    const b = boundsOf(p);
    if (b.left < -EPS || b.top < -EPS || b.right > W + EPS || b.bottom > L + EPS) outIds.push(p.id);
    if (!artworks[p.artworkId]?.dataUrl) missingIds.push(p.id);
  }
  if (badSize.length) issues.push({ level: "error", code: "invalid_size", message: `${plural(badSize.length, "design")} below the minimum printable size.`, placementIds: badSize });
  if (outIds.length)
    issues.push({ level: "error", code: "out_of_bounds", message: `${plural(outIds.length, "design")} ${outIds.length === 1 ? "exceeds" : "exceed"} the printable area.`, placementIds: outIds });
  if (missingIds.length)
    issues.push({ level: "error", code: "missing_artwork", message: `${plural(missingIds.length, "design")} ${missingIds.length === 1 ? "is" : "are"} missing image data — please re-upload the file.`, placementIds: missingIds });

  // Bounding-box overlap check (approximate for rotated designs).
  const overlapIds = new Set<string>();
  let pairs = 0;
  const ps = project.placements;
  for (let i = 0; i < ps.length; i++) {
    const a = boundsOf(ps[i]);
    for (let j = i + 1; j < ps.length; j++) {
      const b = boundsOf(ps[j]);
      if (a.left < b.right - EPS && a.right > b.left + EPS && a.top < b.bottom - EPS && a.bottom > b.top + EPS) {
        pairs++;
        overlapIds.add(ps[i].id);
        overlapIds.add(ps[j].id);
      }
    }
  }
  if (pairs)
    issues.push({ level: "warning", code: "overlap", message: `${plural(overlapIds.size, "design")} overlap (${plural(pairs, "overlapping pair")}). Check this is intentional.`, placementIds: [...overlapIds] });
  return issues;
}

export function isCheckoutReady(issues: ValidationIssue[]) {
  return !issues.some((i) => i.level === "error");
}

function plural(n: number, word: string) {
  const words: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five" };
  return `${words[n] ?? n} ${word}${n === 1 ? "" : "s"}`;
}
