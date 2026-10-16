import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  FilePlus2,
  Images,
  Loader2,
  Grid2X2,
  Maximize2,
  Minimize2,
  MousePointer2,
  Redo2,
  Save,
  ScanSearch,
  ShoppingCart,
  Sparkles,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { appConfig } from "@/config/app";
import { pricingConfig } from "@/config/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney, newId } from "@/lib/currency";
import { StorageQuotaError, useStore } from "@/lib/storage";
import { getSampleArtworks, makeSampleProject } from "@/data/sampleArtwork";
import { artworkStore, cartStore, getArtworkMap, projectStore, removeArtwork, saveArtwork, upsertCartItem, useArtworkMap } from "@/data/repositories";
import { CartLink } from "@/components/layout/SiteHeader";
import { summarise, sheetUnitPrice } from "@/features/pricing/pricingService";
import { emptyProject, useGangSheet, type EditorState } from "./useGangSheet";
import { GangSheetCanvas, type TransformUpdate } from "./components/GangSheetCanvas";
import { ArtworkLibrary } from "./components/ArtworkLibrary";
import { ArtworkProperties, IconAction, LayoutTools, PriceSummaryPanel, SheetProperties, ValidationSummary } from "./components/PropertiesPanel";
import { ArtworkError, fingerprintOf, processFile } from "./services/artworkService";
import { align, arrangeRows, distribute, fitWithinSheet, initialSize } from "./services/layoutService";
import { boundsOf } from "./services/geometry";
import { isCheckoutReady, validateProject } from "./services/validationService";
import { downloadPreviewPng, renderSheet, renderThumbnail } from "./services/previewExportService";
import type { GangSheetProject, SheetArtworkPlacement } from "@/types";

export interface BuilderSearch {
  sample?: boolean;
  edit?: string;
  length?: number;
  fresh?: boolean;
}

const M = appConfig.editor.sheetMarginInches;

function initState(search: BuilderSearch): EditorState {
  const now = new Date().toISOString();
  const base = { selectedIds: [], past: [], future: [], dirty: false };
  if (search.edit) {
    const item = cartStore.get().find((i) => i.id === search.edit);
    if (item) return { ...base, project: structuredClone(item.project), editingCartItemId: item.id };
  }
  if (search.sample) return { ...base, project: makeSampleProject(newId("prj_"), now), dirty: true };
  const length = search.length && (pricingConfig.lengthPresets as readonly number[]).includes(search.length) ? search.length : 24;
  if (!search.fresh) {
    const saved = projectStore.get();
    if (saved) return { ...base, project: saved.project, editingCartItemId: saved.editingCartItemId };
  }
  return { ...base, project: emptyProject(newId("prj_"), now, length, pricingConfig.sheetWidthInches) };
}

function findFreeSpot(placements: SheetArtworkPlacement[], w: number, h: number, W: number, L: number) {
  const boxes = placements.map(boundsOf);
  const g = appConfig.editor.arrangeGapInches;
  for (let y = g; y + h <= L - g + 1e-6; y += 0.5) {
    for (let x = g; x + w <= W - g + 1e-6; x += 0.5) {
      if (!boxes.some((b) => x < b.right + g && x + w + g > b.left && y < b.bottom + g && y + h + g > b.top)) return { x, y, free: true };
    }
  }
  return { x: g, y: g, free: false };
}

export function BuilderPage({ search }: { search: BuilderSearch }) {
  const navigate = useNavigate();
  const { state, dispatch, commit, updatePlacements, select, undo, redo } = useGangSheet(() => initState(search));
  const { project, selectedIds, dirty } = state;
  const W = project.sheetWidthInches;
  const L = project.sheetLengthInches;
  const artworkMap = useArtworkMap();
  const uploaded = useStore(artworkStore);
  const libraryItems = useMemo(() => [...uploaded].reverse().concat(getSampleArtworks()), [uploaded]);
  const [uploading, setUploading] = useState<string[]>([]);
  const [scale, setScale] = useState(16);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [clientView, setClientView] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; action: string; run: () => void }>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  // Re-initialise when the search params point at a different project (e.g. Edit design from cart).
  const searchKey = JSON.stringify(search);
  const firstKey = useRef(searchKey);
  useEffect(() => {
    if (firstKey.current === searchKey) return;
    firstKey.current = searchKey;
    const s = initState(search);
    dispatch({ type: "load", project: s.project, editingCartItemId: s.editingCartItemId, dirty: s.dirty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const issues = useMemo(() => validateProject(project, artworkMap), [project, artworkMap]);
  const problemIds = useMemo(() => new Set(issues.filter((i) => i.code !== "overlap").flatMap((i) => i.placementIds)), [issues]);
  const usage = useMemo(() => {
    const u: Record<string, number> = {};
    for (const p of project.placements) u[p.artworkId] = (u[p.artworkId] ?? 0) + 1;
    return u;
  }, [project.placements]);
  const selected = selectedIds.length === 1 ? project.placements.find((p) => p.id === selectedIds[0]) : undefined;
  const price = summarise([{ lengthInches: L, quantity: 1 }]);

  // ---- Zoom ----
  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const s = Math.min((el.clientWidth - 48) / (W + 2 * M), (el.clientHeight - 48) / (L + 2 * M));
    setScale(Math.max(appConfig.editor.minZoom, Math.min(appConfig.editor.maxZoom, s)));
  }, [W, L]);
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, W, project.id]);
  const zoom = (f: number) => setScale((s) => Math.max(appConfig.editor.minZoom, Math.min(appConfig.editor.maxZoom, s * f)));

  // ---- Placement helpers ----
  const nextZ = () => Math.max(-1, ...project.placements.map((p) => p.zIndex)) + 1;

  const addArtwork = useCallback(
    (artworkId: string) => {
      const art = getArtworkMap()[artworkId];
      if (!art?.dataUrl) return;
      const size = initialSize(art.originalWidthPx, art.originalHeightPx, W, L, appConfig.upload.defaultPlacementDpi);
      const id = newId("pl_");
      commit((s) => {
        const spot = findFreeSpot(s.placements, size.widthInches, size.heightInches, s.sheetWidthInches, s.sheetLengthInches);
        if (!spot.free) toast.warning("No free space left — the design was placed at the top and may overlap. Try a longer sheet.");
        const z = Math.max(-1, ...s.placements.map((p) => p.zIndex)) + 1;
        return { placements: [...s.placements, { id, artworkId, xInches: spot.x, yInches: spot.y, ...size, rotationDegrees: 0, zIndex: z, lockAspect: true }] };
      }, [id]);
    },
    [commit, W, L],
  );

  const onFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const existing = artworkStore.get().find((a) => a.fingerprint === fingerprintOf(file) && a.dataUrl);
        if (existing) {
          toast.info(`${file.name} is already in your library — added another copy to the sheet.`);
          addArtwork(existing.id);
          continue;
        }
        setUploading((u) => [...u, file.name]);
        try {
          const art = await processFile(file);
          const persisted = saveArtwork(art);
          if (!persisted) toast.warning(`${file.name} is too large to save in this browser. It works now, but you'll need to select it again after reloading.`);
          addArtwork(art.id);
          toast.success(`${file.name} added to the sheet`);
        } catch (e) {
          toast.error(e instanceof ArtworkError ? e.message : `${file.name}: upload failed.`);
        } finally {
          setUploading((u) => u.filter((n) => n !== file.name));
        }
      }
    },
    [addArtwork],
  );

  const duplicate = useCallback(() => {
    if (!selectedIds.length) return;
    const ids: string[] = [];
    commit((s) => {
      let z = Math.max(-1, ...s.placements.map((p) => p.zIndex)) + 1;
      const copies = s.placements
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => {
          const id = newId("pl_");
          ids.push(id);
          return { ...p, id, zIndex: z++, xInches: Math.min(p.xInches + 0.5, Math.max(0, s.sheetWidthInches - p.widthInches)), yInches: Math.min(p.yInches + 0.5, Math.max(0, s.sheetLengthInches - p.heightInches)) };
        });
      return { placements: [...s.placements, ...copies] };
    }, ids);
  }, [commit, selectedIds]);

  const remove = useCallback(() => {
    if (!selectedIds.length) return;
    commit((s) => ({ placements: s.placements.filter((p) => !selectedIds.includes(p.id)) }), []);
  }, [commit, selectedIds]);

  const onTransform = useCallback((u: TransformUpdate[]) => updatePlacements(u), [updatePlacements]);

  const setZ = (dir: "front" | "back") => {
    if (!selected) return;
    const zs = project.placements.map((p) => p.zIndex);
    updatePlacements([{ id: selected.id, zIndex: dir === "front" ? Math.max(...zs) + 1 : Math.min(...zs) - 1 }]);
  };

  const resetSize = () => {
    if (!selected) return;
    const art = artworkMap[selected.artworkId];
    if (!art) return;
    updatePlacements([{ id: selected.id, ...initialSize(art.originalWidthPx, art.originalHeightPx, W, L, appConfig.upload.defaultPlacementDpi), rotationDegrees: 0, lockAspect: true }]);
  };

  const arrange = () => {
    const r = arrangeRows(project.placements, W, L);
    commit(() => ({ placements: r.placements }));
    if (r.tooWide) toast.warning(`${r.tooWide} design(s) are wider than the sheet. Reduce their size to fit.`);
    else if (!r.fits) toast.warning(`Designs need about ${Math.ceil(r.usedLength)}″ of length but the sheet is ${L}″. Choose a longer sheet or resize designs.`);
    else toast.success(`Arranged ${project.placements.length} designs into rows (uses ${r.usedLength}″ of ${L}″).`);
  };

  const fitAll = () => {
    const r = fitWithinSheet(project.placements, W, L);
    commit(() => ({ placements: r.placements }));
    if (r.tooLarge) toast.warning(`${r.tooLarge} design(s) are larger than the sheet and still overflow. Reduce their size.`);
    else toast.success("All designs moved inside the sheet.");
  };

  const save = useCallback(() => {
    try {
      projectStore.set({ project, editingCartItemId: state.editingCartItemId, savedAt: new Date().toISOString() });
      dispatch({ type: "saved" });
      toast.success("Project saved in this browser");
    } catch (e) {
      toast.error(e instanceof StorageQuotaError ? "Browser storage is full. Remove unused artwork and try again." : "Couldn't save the project.");
    }
  }, [project, state.editingCartItemId, dispatch]);

  const startNew = (sample = false) => {
    const run = () => {
      const now = new Date().toISOString();
      const p = sample ? makeSampleProject(newId("prj_"), now) : emptyProject(newId("prj_"), now, L, W);
      dispatch({ type: "load", project: p, dirty: sample });
      projectStore.set(null);
    };
    if (project.placements.length && dirty) setConfirm({ title: sample ? "Load example sheet?" : "Start a new sheet?", body: "Your current sheet has unsaved changes that will be lost.", action: sample ? "Load example" : "Start new", run });
    else run();
  };

  const removeFromLibrary = (artworkId: string) => {
    const n = usage[artworkId] ?? 0;
    const run = () => {
      if (n) commit((s) => ({ placements: s.placements.filter((p) => p.artworkId !== artworkId) }));
      removeArtwork(artworkId);
    };
    if (n) setConfirm({ title: "Remove artwork?", body: `This design is placed ${n} time(s) on the sheet. Removing it from the library also removes those placements.`, action: "Remove", run });
    else run();
  };

  const addToCart = async () => {
    if (!isCheckoutReady(issues)) {
      toast.error(issues.find((i) => i.level === "error")?.message ?? "Please fix the issues on your sheet first.");
      return;
    }
    const unit = sheetUnitPrice(L);
    if (!Number.isFinite(unit)) return toast.error("This sheet configuration has no valid price.");
    setBusy(true);
    try {
      const previewDataUrl = await renderThumbnail(project, artworkMap);
      const existing = state.editingCartItemId ? cartStore.get().find((i) => i.id === state.editingCartItemId) : undefined;
      upsertCartItem({
        id: existing?.id ?? newId("ci_"),
        project: structuredClone({ ...project, id: existing?.project.id ?? newId("prj_") }),
        quantity: existing?.quantity ?? 1,
        unitPrice: unit,
        previewDataUrl,
        addedAt: existing?.addedAt ?? new Date().toISOString(),
      });
      projectStore.set(null);
      dispatch({ type: "saved" });
      toast.success(existing ? "Cart item updated" : "Sheet added to cart");
      navigate({ to: "/cart" });
    } catch (e) {
      toast.error(e instanceof StorageQuotaError ? "Browser storage is full — remove unused artwork or cart items." : "Couldn't add to cart.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreview(null);
    const c = await renderSheet(project, artworkMap, Math.min(30, 900 / L));
    setPreview(c.toDataURL("image/png"));
  };

  // ---- Keyboard shortcuts & unsaved-work guard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault();
        remove();
      } else if (e.key.startsWith("Arrow") && selectedIds.length) {
        e.preventDefault();
        const d = e.shiftKey ? 1 : 0.1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        updatePlacements(project.placements.filter((p) => selectedIds.includes(p.id)).map((p) => ({ id: p.id, xInches: Math.round((p.xInches + dx) * 1000) / 1000, yInches: Math.round((p.yInches + dy) * 1000) / 1000 })));
      } else if (e.key === "Escape") select([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicate, save, remove, selectedIds, project.placements, updatePlacements, select]);

  useEffect(() => {
    if (!dirty || !project.placements.length) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, project.placements.length]);

  const sel = selectedIds.length;

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/95 px-3 py-2 shadow-sm sm:px-4">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/"><ArrowLeft /> <span className="hidden sm:inline">Website</span></Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 border-l pl-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gang sheet builder</p>
            <p className="max-w-[220px] truncate text-sm font-semibold" title={project.name}>{project.name || "Untitled"}</p>
          </div>
          {dirty ? <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">Unsaved</Badge> : <Badge variant="outline" className="border-success/30 bg-success-soft text-success">Saved</Badge>}
          {state.editingCartItemId && <Badge variant="secondary">Editing cart item</Badge>}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!clientView && <>
            <Button size="sm" variant="ghost" onClick={() => startNew(true)}><Sparkles /> <span className="hidden md:inline">Example sheet</span></Button>
            <Button size="sm" variant="ghost" onClick={() => startNew(false)}><FilePlus2 /> <span className="hidden md:inline">New sheet</span></Button>
            <Button size="sm" variant="outline" onClick={save}><Save /> Save</Button>
          </>}
          <Button size="sm" variant="outline" onClick={openPreview}><Eye /> Preview</Button>
          {!clientView && <div className="hidden items-baseline gap-1.5 border-l px-3 sm:flex">
            <span className="font-mono text-xs text-muted-foreground">{W}″×{L}″</span>
            <span className="font-mono text-sm font-semibold">{formatMoney(price.subtotal)}</span>
          </div>}
          {!clientView && <Button size="sm" onClick={addToCart} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ShoppingCart />} {state.editingCartItemId ? "Update cart item" : "Continue to cart"}
          </Button>}
          {!clientView && <CartLink />}
          <Button size="sm" variant={clientView ? "default" : "outline"} aria-label={clientView ? "Exit client view" : "Enter client view"} onClick={() => setClientView((v) => !v)}>
            {clientView ? <Minimize2 /> : <Maximize2 />}<span className="hidden sm:inline">{clientView ? "Exit client view" : "Client view"}</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Toolbar */}
        {!clientView && <nav aria-label="Editor tools" className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-background px-2 py-1.5 lg:flex-col lg:border-b-0 lg:border-r lg:px-1.5 lg:py-3">
          <IconAction label="My artwork & upload" onClick={() => setShowLibrary((v) => !v)} className={showLibrary ? "bg-accent text-accent-foreground" : ""}><Images /></IconAction>
          <IconAction label="Select tool (click or drag a box)" onClick={() => select([])}><MousePointer2 /></IconAction>
          <Sep />
          <IconAction label="Zoom in" onClick={() => zoom(1.25)}><ZoomIn /></IconAction>
          <IconAction label="Zoom out" onClick={() => zoom(0.8)}><ZoomOut /></IconAction>
          <IconAction label="Fit sheet to view" onClick={fit}><ScanSearch /></IconAction>
          <IconAction label={showGrid ? "Hide sheet grid" : "Show sheet grid"} onClick={() => setShowGrid((v) => !v)} className={showGrid ? "bg-accent text-accent-foreground" : ""}><Grid2X2 /></IconAction>
          <Sep />
          <IconAction label="Duplicate (Ctrl+D)" onClick={duplicate} disabled={!sel}><Copy /></IconAction>
          <IconAction label="Delete (Del)" onClick={remove} disabled={!sel}><Trash2 /></IconAction>
          <Sep />
          <IconAction label="Undo (Ctrl+Z)" onClick={undo} disabled={!state.past.length}><Undo2 /></IconAction>
          <IconAction label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!state.future.length}><Redo2 /></IconAction>
          <span className="ml-auto px-2 font-mono text-[10px] text-muted-foreground lg:ml-0 lg:mt-auto lg:px-0">{Math.round((scale / 16) * 100)}%</span>
        </nav>}

        {!clientView && showLibrary && (
          <aside aria-label="Artwork library" className="order-3 border-t p-4 lg:order-none lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-t-0">
            <ArtworkLibrary artworks={libraryItems} usage={usage} uploading={uploading} onFiles={onFiles} onAdd={addArtwork} onRemove={removeFromLibrary} />
          </aside>
        )}

        {/* Canvas */}
        <div className="relative flex min-h-[60vh] min-w-0 flex-1 flex-col bg-workspace lg:min-h-0">
          <div ref={viewport} className="min-h-0 flex-1 overflow-auto" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFiles(Array.from(e.dataTransfer.files)); }}>
            <div className="flex min-h-full min-w-full w-max items-start justify-center p-6">
              <GangSheetCanvas project={project} artworks={artworkMap} scale={scale} showGrid={showGrid} selectedIds={selectedIds} problemIds={problemIds} onSelectionChange={select} onTransform={onTransform} onImageError={() => toast.error("An artwork image couldn't be loaded. Try uploading it again.")} />
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lift backdrop-blur">
            <IconAction label="Zoom out" onClick={() => zoom(0.8)}><ZoomOut /></IconAction>
            <span className="min-w-12 text-center font-mono text-[11px] tabular-nums text-muted-foreground">{Math.round((scale / 16) * 100)}%</span>
            <IconAction label="Zoom in" onClick={() => zoom(1.25)}><ZoomIn /></IconAction>
            <span className="mx-1 h-5 w-px bg-border" />
            <IconAction label="Fit sheet to view" onClick={fit}><ScanSearch /></IconAction>
            <IconAction label={showGrid ? "Hide sheet grid" : "Show sheet grid"} onClick={() => setShowGrid((v) => !v)} className={showGrid ? "bg-accent text-accent-foreground" : ""}><Grid2X2 /></IconAction>
          </div>
          {project.placements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className="pointer-events-auto max-w-sm rounded-lg border bg-background p-5 text-center shadow-lift">
                <p className="font-semibold">Your sheet is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">Upload your artwork, or add a sample design from the library to try the editor.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button size="sm" onClick={() => setShowLibrary(true)}><Images /> Open library</Button>
                  <Button size="sm" variant="outline" onClick={() => startNew(true)}><Sparkles /> Load example</Button>
                </div>
              </div>
            </div>
          )}
          {!clientView && <Walkthrough />}
        </div>

        {/* Properties */}
        {!clientView && <aside aria-label="Properties" className="order-4 border-t bg-background lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          {selected ? (
            <ArtworkProperties
              placement={selected}
              artwork={artworkMap[selected.artworkId]}
              sheetWidth={W}
              sheetLength={L}
              onChange={(patch) => updatePlacements([{ id: selected.id, ...patch }])}
              onDuplicate={duplicate}
              onDelete={remove}
              onResetSize={resetSize}
              onZ={setZ}
            />
          ) : (
            <SheetProperties
              project={project}
              onRename={(name) => dispatch({ type: "rename", name })}
              onLength={(l) => commit(() => ({ sheetLengthInches: l }))}
            />
          )}
          {sel > 1 && <p className="border-b px-4 py-3 text-xs text-muted-foreground">{sel} designs selected. Drag to move them together.</p>}
          <LayoutTools
            selectedCount={sel}
            total={project.placements.length}
            onAlign={(m) => commit((s) => ({ placements: align(s.placements, selectedIds, m, s.sheetWidthInches, s.sheetLengthInches) }))}
            onDistribute={(a) => commit((s) => ({ placements: distribute(s.placements, selectedIds, a) }))}
            onArrange={arrange}
            onFit={fitAll}
          />
          <ValidationSummary issues={issues} onSelect={select} />
          <PriceSummaryPanel lengthInches={L} widthInches={W} />
        </aside>}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm?.run(); setConfirm(null); }}>{confirm?.action}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} preview={preview} project={project} total={price.total} issues={issues.filter((i) => i.code !== "empty_sheet").map((i) => i.message)} />
    </div>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden />;
}

function PreviewDialog({ open, onOpenChange, preview, project, total, issues }: { open: boolean; onOpenChange: (o: boolean) => void; preview: string | null; project: GangSheetProject; total: number; issues: string[] }) {
  const artworks = useArtworkMap();
  const [exporting, setExporting] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sheet preview</DialogTitle>
          <DialogDescription>
            {project.name} · {project.sheetWidthInches}″ × {project.sheetLengthInches}″ · {project.placements.length} designs · estimated {formatMoney(total)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="checkerboard grid max-h-[60dvh] place-items-center overflow-auto rounded-md border p-3">
            {preview ? <img src={preview} alt={`Preview of ${project.name}`} className="max-h-[56dvh] w-auto shadow-soft ring-1 ring-border" /> : <Loader2 className="size-6 animate-spin text-muted-foreground" />}
          </div>
          <div className="space-y-3 text-sm">
            {issues.length ? (
              <ul className="space-y-1.5">{issues.map((m) => <li key={m} className="rounded-md bg-warning-soft p-2 text-xs text-warning">{m}</li>)}</ul>
            ) : (
              <p className="rounded-md bg-success-soft p-2 text-xs text-success">No layout issues detected.</p>
            )}
            <Button
              className="w-full"
              variant="outline"
              disabled={exporting || !project.placements.length}
              onClick={async () => {
                setExporting(true);
                try {
                  await downloadPreviewPng(project, artworks);
                } catch {
                  toast.error("The preview couldn't be exported.");
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export demo preview (PNG)
            </Button>
            <p className="text-[11px] text-muted-foreground">Demonstration preview export at 40 px/in with transparency. It is not a verified production print file — production files would be generated from your original uploads.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const WALK_KEY = "filmforge.walkthrough.dismissed";
const steps = [
  { t: "Add artwork", b: "Upload PNG, JPEG or WebP files from the library panel, or use a sample design." },
  { t: "Move, resize, rotate", b: "Drag designs on the sheet. Corner handles resize proportionally; the top handle rotates." },
  { t: "Fine-tune in inches", b: "Select a design to edit its exact width, height, position and rotation on the right." },
  { t: "Check, preview, order", b: "Watch the checks panel for boundary and overlap warnings, then preview and continue to cart." },
];
function Walkthrough() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    if (!localStorage.getItem(WALK_KEY)) setStep(0);
  }, []);
  if (step === null) return null;
  const close = () => {
    localStorage.setItem(WALK_KEY, "1");
    setStep(null);
  };
  const s = steps[step];
  return (
    <div className="absolute bottom-4 left-4 z-10 w-72 rounded-lg border bg-background p-4 shadow-lift" role="dialog" aria-label="Editor walkthrough">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-primary">Quick tour · {step + 1}/{steps.length}</p>
        <button onClick={close} aria-label="Dismiss walkthrough" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
      <p className="mt-1 font-semibold">{s.t}</p>
      <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={close}>Skip</Button>
        <Button size="sm" onClick={() => (step + 1 < steps.length ? setStep(step + 1) : close())}>{step + 1 < steps.length ? "Next" : "Done"}</Button>
      </div>
    </div>
  );
}
