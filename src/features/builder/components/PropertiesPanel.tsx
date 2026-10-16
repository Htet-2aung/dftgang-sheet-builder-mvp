import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  CircleCheck,
  Copy,
  LayoutGrid,
  Lock,
  Maximize,
  Minimize2,
  RotateCcw,
  Shrink,
  Trash2,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { appConfig } from "@/config/app";
import { pricingConfig } from "@/config/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/currency";
import { isValidSheetLength, summarise, sheetUnitPrice } from "@/features/pricing/pricingService";
import type { AlignMode } from "../services/layoutService";
import { NumField } from "./NumField";
import type { ArtworkItem, GangSheetProject, SheetArtworkPlacement, ValidationIssue } from "@/types";

export function IconAction({ label, onClick, disabled, children, className = "" }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={`size-8 ${className}`} onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ArtworkProperties({
  placement,
  artwork,
  sheetWidth,
  sheetLength,
  onChange,
  onDuplicate,
  onDelete,
  onResetSize,
  onZ,
}: {
  placement: SheetArtworkPlacement;
  artwork?: ArtworkItem;
  sheetWidth: number;
  sheetLength: number;
  onChange: (patch: Partial<SheetArtworkPlacement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResetSize: () => void;
  onZ: (dir: "front" | "back") => void;
}) {
  const p = placement;
  const ratio = p.heightInches / p.widthInches;
  const min = appConfig.editor.minArtworkInches;
  const effDpi = artwork ? Math.round(artwork.originalWidthPx / p.widthInches) : 0;
  return (
    <Panel title="Artwork">
      <div className="mb-4 flex items-center gap-3">
        <div className="checkerboard grid size-12 shrink-0 place-items-center overflow-hidden rounded border">
          {artwork?.dataUrl && <img src={artwork.dataUrl} alt="" className="max-h-full max-w-full object-contain" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={artwork?.filename}>{artwork?.filename ?? "Missing artwork"}</p>
          {artwork && <p className="font-mono text-[11px] text-muted-foreground">≈ {effDpi} px/in at this size</p>}
        </div>
      </div>
      {artwork && effDpi < 150 && (
        <p className="mb-3 flex gap-1.5 rounded-md bg-warning-soft p-2 text-[11px] text-warning">
          <TriangleAlert className="size-3.5 shrink-0" /> Low resolution for this size. Print quality may suffer.
        </p>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NumField label="Width" suffix="in" value={p.widthInches} min={min} max={200} onCommit={(w) => onChange(p.lockAspect ? { widthInches: w, heightInches: w * ratio } : { widthInches: w })} />
        <Button
          variant={p.lockAspect ? "secondary" : "ghost"}
          size="icon"
          className="mb-0 size-8"
          onClick={() => onChange({ lockAspect: !p.lockAspect })}
          aria-pressed={p.lockAspect}
          aria-label={p.lockAspect ? "Aspect ratio locked" : "Aspect ratio unlocked"}
          title={p.lockAspect ? "Aspect ratio locked" : "Unlocked — width and height change independently"}
        >
          {p.lockAspect ? <Lock /> : <Unlock />}
        </Button>
        <NumField label="Height" suffix="in" value={p.heightInches} min={min} max={200} onCommit={(h) => onChange(p.lockAspect ? { heightInches: h, widthInches: h / ratio } : { heightInches: h })} />
      </div>
      {!p.lockAspect && <p className="mt-2 text-[11px] text-warning">Aspect ratio unlocked: the artwork will stretch.</p>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <NumField label="X" suffix="in" value={p.xInches} min={0} max={sheetWidth} onCommit={(x) => onChange({ xInches: x })} />
        <NumField label="Y" suffix="in" value={p.yInches} min={0} max={sheetLength} onCommit={(y) => onChange({ yInches: y })} />
        <NumField label="Rotate" suffix="°" step={1} value={p.rotationDegrees} min={-360} max={360} onCommit={(r) => onChange({ rotationDegrees: ((r % 360) + 360) % 360 })} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={onDuplicate}><Copy /> Duplicate</Button>
        <Button size="sm" variant="outline" onClick={onResetSize}><RotateCcw /> Reset size</Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>
      </div>
      <div className="mt-2 flex gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => onZ("front")}><ArrowUpToLine /> Bring to front</Button>
        <Button size="sm" variant="ghost" onClick={() => onZ("back")}><ArrowDownToLine /> Send to back</Button>
      </div>
    </Panel>
  );
}

export function LayoutTools({ selectedCount, total, onAlign, onDistribute, onArrange, onFit }: { selectedCount: number; total: number; onAlign: (m: AlignMode) => void; onDistribute: (a: "x" | "y") => void; onArrange: () => void; onFit: () => void }) {
  const none = selectedCount === 0;
  return (
    <Panel title="Arrange">
      <p className="mb-2 text-[11px] text-muted-foreground">{selectedCount > 1 ? `Align ${selectedCount} selected designs to each other` : selectedCount === 1 ? "Align the selected design to the sheet" : "Select designs to align (Shift-click or drag a box)"}</p>
      <div className="flex flex-wrap gap-0.5">
        <IconAction label="Align left" disabled={none} onClick={() => onAlign("left")}><AlignStartVertical /></IconAction>
        <IconAction label="Align centre" disabled={none} onClick={() => onAlign("center")}><AlignCenterVertical /></IconAction>
        <IconAction label="Align right" disabled={none} onClick={() => onAlign("right")}><AlignEndVertical /></IconAction>
        <IconAction label="Align top" disabled={none} onClick={() => onAlign("top")}><AlignStartHorizontal /></IconAction>
        <IconAction label="Align middle" disabled={none} onClick={() => onAlign("middle")}><AlignCenterHorizontal /></IconAction>
        <IconAction label="Align bottom" disabled={none} onClick={() => onAlign("bottom")}><AlignEndHorizontal /></IconAction>
        <IconAction label="Distribute horizontally (3+)" disabled={selectedCount < 3} onClick={() => onDistribute("x")}><AlignHorizontalDistributeCenter /></IconAction>
        <IconAction label="Distribute vertically (3+)" disabled={selectedCount < 3} onClick={() => onDistribute("y")}><AlignVerticalDistributeCenter /></IconAction>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="outline" disabled={total === 0} onClick={onArrange}><LayoutGrid /> Auto-arrange</Button>
        <Button size="sm" variant="outline" disabled={total === 0} onClick={onFit}><Shrink /> Fit inside sheet</Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Auto-arrange packs designs into rows without resizing. It is a simple layout aid, not waste optimisation.</p>
    </Panel>
  );
}

export function SheetProperties({ project, onLength, onRename }: { project: GangSheetProject; onLength: (l: number) => void; onRename: (n: string) => void }) {
  const [custom, setCustom] = useState(false);
  const isPreset = (pricingConfig.lengthPresets as readonly number[]).includes(project.sheetLengthInches);
  return (
    <Panel title="Sheet">
      <div className="space-y-1">
        <Label htmlFor="project-name" className="text-xs font-normal text-muted-foreground">Project name</Label>
        <Input id="project-name" className="h-8 text-sm" value={project.name} maxLength={80} onChange={(e) => onRename(e.target.value)} />
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-xs text-muted-foreground">Width: <span className="font-mono text-foreground">{project.sheetWidthInches}″</span> (fixed)</p>
        <p className="mb-1.5 text-xs text-muted-foreground">Length</p>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Sheet length">
          {pricingConfig.lengthPresets.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={!custom && project.sheetLengthInches === l}
              onClick={() => {
                setCustom(false);
                onLength(l);
              }}
              className={`rounded-md border px-2 py-1.5 text-left transition-colors ${!custom && project.sheetLengthInches === l ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            >
              <span className="block font-mono text-xs font-medium">{l}″</span>
              <span className="block text-[10px] text-muted-foreground">{formatMoney(sheetUnitPrice(l))}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setCustom(true)} className={`mt-1.5 w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${custom || !isPreset ? "border-primary bg-accent" : "hover:bg-muted"}`} aria-pressed={custom || !isPreset}>
          Custom length
        </button>
        {(custom || !isPreset) && (
          <div className="mt-2">
            <NumField label={`Custom length (${pricingConfig.customLength.min}–${pricingConfig.customLength.max} in)`} suffix="in" step={1} value={project.sheetLengthInches} min={pricingConfig.customLength.min} max={pricingConfig.customLength.max} onCommit={(v) => isValidSheetLength(v) && onLength(Math.round(v * 4) / 4)} />
          </div>
        )}
      </div>
    </Panel>
  );
}

export function ValidationSummary({ issues, onSelect }: { issues: ValidationIssue[]; onSelect: (ids: string[]) => void }) {
  const visible = issues.filter((i) => i.code !== "empty_sheet");
  return (
    <Panel title="Checks">
      {visible.length === 0 ? (
        issues.length ? (
          <p className="text-xs text-muted-foreground">Add artwork to start checking your layout.</p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-success"><CircleCheck className="size-4" /> All artwork is within the sheet boundaries.</p>
        )
      ) : (
        <ul className="space-y-1.5" aria-live="polite">
          {visible.map((i) => (
            <li key={i.code}>
              <button
                onClick={() => i.placementIds.length && onSelect(i.placementIds)}
                className={`flex w-full gap-1.5 rounded-md p-2 text-left text-xs ${i.level === "error" ? "bg-error-soft text-destructive" : "bg-warning-soft text-warning"}`}
              >
                <TriangleAlert className="size-3.5 shrink-0" />
                <span>{i.message}{i.placementIds.length > 0 && <span className="underline underline-offset-2"> Select</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function PriceSummaryPanel({ lengthInches, widthInches }: { lengthInches: number; widthInches: number }) {
  const s = summarise([{ lengthInches, quantity: 1 }]);
  return (
    <Panel title="Estimate">
      <dl className="space-y-1.5 text-xs">
        <Row k="Sheet size" v={`${widthInches}″ × ${lengthInches}″`} />
        <Row k="Unit price" v={`${formatMoney(pricingConfig.pricePerLinearInch)} / linear in`} />
        {s.lines.map((l) => <Row key={l.label} k={l.label} v={formatMoney(l.amount)} />)}
        <div className="flex justify-between border-t pt-2 text-sm font-semibold"><dt>Estimated total</dt><dd className="font-mono">{formatMoney(s.total)}</dd></div>
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">Illustrative demo pricing — not a quote.</p>
    </Panel>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono tabular-nums">{v}</dd>
    </div>
  );
}

export const icons = { Maximize, Minimize2 };
