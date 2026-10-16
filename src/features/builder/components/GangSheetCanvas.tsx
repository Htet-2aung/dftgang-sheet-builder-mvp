import { useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import { appConfig } from "@/config/app";
import { brand } from "@/config/brand";
import { normaliseAngle, round } from "../services/geometry";
import type { ArtworkItem, GangSheetProject, SheetArtworkPlacement } from "@/types";

type FabricModule = typeof import("fabric");
type Tagged = FabricObject & { ffId?: string; ffSrc?: string };

export interface TransformUpdate {
  id: string;
  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
  rotationDegrees: number;
}

interface Props {
  project: GangSheetProject;
  artworks: Record<string, ArtworkItem | undefined>;
  /** Screen pixels per physical inch. */
  scale: number;
  showGrid: boolean;
  selectedIds: string[];
  problemIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
  onTransform: (updates: TransformUpdate[]) => void;
  onImageError: (artworkId: string) => void;
}

/**
 * fabric.js adapter. React state (inches) is the source of truth; this component
 * mirrors it onto the canvas and reports user transforms back on `object:modified`
 * (not on every pointer move). Canvas px = (inches + sheet margin) × scale.
 * Objects use centre origin so rotation pivots around the artwork centre.
 */
export function GangSheetCanvas(props: Props) {
  const { project, artworks, scale, selectedIds, showGrid } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const fab = useRef<{ canvas: FabricCanvas; mod: FabricModule } | null>(null);
  const objects = useRef(new Map<string, Tagged>());
  const pending = useRef(new Set<string>());
  const syncing = useRef(false);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const lastSynced = useRef<Record<string, unknown> | null>(null);

  const M = appConfig.editor.sheetMarginInches;
  const W = project.sheetWidthInches;
  const L = project.sheetLengthInches;
  const cw = Math.round((W + 2 * M) * scale);
  const ch = Math.round((L + 2 * M) * scale);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    const objs = objects.current;
    import("fabric").then((mod) => {
      if (disposed || !host) return;
      const el = document.createElement("canvas");
      host.appendChild(el);
      const canvas = new mod.Canvas(el, {
        width: cw,
        height: ch,
        preserveObjectStacking: true,
        selectionColor: brand.canvasTheme.selectionFill,
        selectionBorderColor: brand.canvasTheme.selection,
        uniformScaling: true,
      });
      fab.current = { canvas, mod };
      const emitSel = () => {
        if (syncing.current) return;
        latest.current.onSelectionChange(
          canvas.getActiveObjects().map((o) => (o as Tagged).ffId).filter((x): x is string => !!x),
        );
      };
      canvas.on("selection:created", emitSel);
      canvas.on("selection:updated", emitSel);
      canvas.on("selection:cleared", emitSel);
      canvas.on("object:modified", (e) => {
        const s = latest.current.scale;
        const active = canvas.getActiveObjects();
        const targets = active.length ? active : e.target ? [e.target] : [];
        const updates: TransformUpdate[] = [];
        for (const o of targets as Tagged[]) {
          if (!o.ffId) continue;
          const d = mod.util.qrDecompose(o.calcTransformMatrix());
          const w = ((o.width ?? 1) * Math.abs(d.scaleX)) / s;
          const h = ((o.height ?? 1) * Math.abs(d.scaleY)) / s;
          updates.push({
            id: o.ffId,
            widthInches: round(w),
            heightInches: round(h),
            xInches: round(d.translateX / s - M - w / 2),
            yInches: round(d.translateY / s - M - h / 2),
            rotationDegrees: normaliseAngle(d.angle),
          });
        }
        if (updates.length) latest.current.onTransform(updates);
      });
      setReady(true);
    });
    return () => {
      disposed = true;
      objs.clear();
      pending.current.clear();
      const f = fab.current;
      fab.current = null;
      if (f) void f.canvas.dispose().catch(() => undefined);
      if (host) host.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const f = fab.current;
    if (!f || !ready) return;
    const { canvas, mod } = f;
    const s = scale;
    const activeIds = canvas.getActiveObjects().map((o) => (o as Tagged).ffId);
    const sameSelection = activeIds.length === selectedIds.length && activeIds.every((id, i) => id === selectedIds[i]);
    const key = { placements: project.placements, scale, cw, ch, version, artworks, problems: props.problemIds };
    const last = lastSynced.current;
    const dataSame = !!last && (Object.keys(key) as (keyof typeof key)[]).every((k) => last[k] === key[k]);
    lastSynced.current = key;
    if (sameSelection && dataSame) return;
    syncing.current = true;
    // Only break the active selection when needed (it would interrupt a drag in progress).
    const resetSelection = !sameSelection || activeIds.length > 1;
    if (resetSelection) canvas.discardActiveObject();
    canvas.setDimensions({ width: cw, height: ch });

    const map = objects.current;
    const ids = new Set(project.placements.map((p) => p.id));
    for (const [id, o] of map) {
      if (!ids.has(id)) {
        canvas.remove(o);
        map.delete(id);
      }
    }

    const style = (o: Tagged, p: SheetArtworkPlacement) => {
      const problem = latest.current.problemIds.has(p.id);
      o.set({
        originX: "center",
        originY: "center",
        left: (M + p.xInches + p.widthInches / 2) * s,
        top: (M + p.yInches + p.heightInches / 2) * s,
        angle: p.rotationDegrees,
        scaleX: (p.widthInches * s) / (o.width || 1),
        scaleY: (p.heightInches * s) / (o.height || 1),
        cornerStyle: "circle",
        cornerColor: "#FFFFFF",
        cornerStrokeColor: brand.canvasTheme.selection,
        borderColor: problem ? brand.canvasTheme.missingStroke : brand.canvasTheme.selection,
        transparentCorners: false,
        cornerSize: 10,
        borderScaleFactor: 1.5,
        lockScalingFlip: true,
      });
      o.setControlsVisibility({ ml: !p.lockAspect, mr: !p.lockAspect, mt: !p.lockAspect, mb: !p.lockAspect });
      o.setCoords();
    };

    for (const p of project.placements) {
      const art = latest.current.artworks[p.artworkId];
      const src = art?.dataUrl ?? "missing";
      let o = map.get(p.id);
      if (o && o.ffSrc !== src) {
        canvas.remove(o);
        map.delete(p.id);
        o = undefined;
      }
      if (!o) {
        if (art?.dataUrl) {
          if (!pending.current.has(p.id)) {
            pending.current.add(p.id);
            const pid = p.id;
            mod.FabricImage.fromURL(art.dataUrl)
              .then((img) => {
                pending.current.delete(pid);
                if (!fab.current || fab.current.canvas !== canvas) return;
                const t = img as Tagged;
                t.ffId = pid;
                t.ffSrc = src;
                map.set(pid, t);
                canvas.add(t);
                setVersion((v) => v + 1);
              })
              .catch(() => {
                pending.current.delete(pid);
                latest.current.onImageError(p.artworkId);
              });
          }
          continue;
        }
        const r = new mod.Rect({
          width: 100,
          height: 100,
          fill: brand.canvasTheme.missingFill,
          stroke: brand.canvasTheme.missingStroke,
          strokeDashArray: [6, 4],
          strokeUniform: true,
          strokeWidth: 1.5,
        }) as Tagged;
        r.ffId = p.id;
        r.ffSrc = src;
        map.set(p.id, r);
        canvas.add(r);
        o = r;
      }
      style(o, p);
    }

    // Stacking order follows zIndex.
    let i = 0;
    for (const p of [...project.placements].sort((a, b) => a.zIndex - b.zIndex)) {
      const o = map.get(p.id);
      if (o) canvas.moveObjectTo(o, i++);
    }

    const sel = !resetSelection ? [] : selectedIds.map((id) => map.get(id)).filter((o): o is Tagged => !!o);
    if (sel.length === 1) canvas.setActiveObject(sel[0]);
    else if (sel.length > 1) canvas.setActiveObject(new mod.ActiveSelection(sel, { canvas }));
    syncing.current = false;
    canvas.requestRenderAll();
  }, [ready, version, project.placements, scale, selectedIds, cw, ch, artworks, M, props.problemIds]);

  return (
    <div className="relative" style={{ width: cw, height: ch }}>
      <div
        className={`${showGrid ? "sheet-grid" : "bg-sheet"} absolute shadow-soft ring-1 ring-border`}
        style={{ left: M * scale, top: M * scale, width: W * scale, height: L * scale, backgroundSize: `${scale}px ${scale}px` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute font-mono text-[11px] text-muted-foreground" style={{ left: M * scale, top: M * scale - 18, width: W * scale }}>
        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-muted-foreground/40" />
          {W}″ wide
          <span className="h-px flex-1 bg-muted-foreground/40" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute flex items-center font-mono text-[11px] text-muted-foreground"
        style={{ left: (M + W) * scale + 6, top: M * scale, height: L * scale }}
      >
        <span className="[writing-mode:vertical-rl]">{L}″ long</span>
      </div>
      <div ref={hostRef} className="absolute inset-0" role="application" aria-label={`Gang sheet canvas, ${W} by ${L} inches`} />
    </div>
  );
}
