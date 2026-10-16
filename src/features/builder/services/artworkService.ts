import { appConfig } from "@/config/app";
import { newId } from "@/lib/currency";
import type { ArtworkItem } from "@/types";

export class ArtworkError extends Error {}

export function validateFile(file: File) {
  const accepted = appConfig.upload.acceptedMimeTypes as readonly string[];
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    throw new ArtworkError(`${file.name}: SVG uploads aren't supported in this demo yet. Please export a PNG with a transparent background.`);
  }
  if (!accepted.includes(file.type)) {
    throw new ArtworkError(`${file.name}: unsupported file type. Use PNG, JPEG or WebP.`);
  }
  const maxBytes = appConfig.upload.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ArtworkError(`${file.name}: file is larger than ${appConfig.upload.maxFileSizeMb} MB.`);
  }
  if (file.size === 0) throw new ArtworkError(`${file.name}: the file is empty.`);
}

export const fingerprintOf = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = src;
  });
}

/** Load a local file in the browser (never uploaded anywhere in demo mode). */
export async function processFile(file: File): Promise<ArtworkItem> {
  validateFile(file);
  const url = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(url);
    } catch {
      throw new ArtworkError(`${file.name}: the image couldn't be read. It may be corrupt.`);
    }
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new ArtworkError(`${file.name}: image has no readable dimensions.`);
    const max = appConfig.upload.maxWorkingEdgePx;
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ArtworkError("Your browser couldn't process this image.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // JPEG has no alpha; PNG/WebP keep transparency via PNG output.
    const dataUrl = file.type === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.9) : canvas.toDataURL("image/png");
    return {
      id: newId("art_"),
      filename: file.name,
      mimeType: file.type,
      originalWidthPx: w,
      originalHeightPx: h,
      fileSizeBytes: file.size,
      dataUrl,
      persisted: true,
      source: "upload",
      fingerprint: fingerprintOf(file),
      createdAt: new Date().toISOString(),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
