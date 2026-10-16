import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, TriangleAlert, Upload } from "lucide-react";
import { appConfig } from "@/config/app";
import { Button } from "@/components/ui/button";
import { formatBytes } from "../services/artworkService";
import type { ArtworkItem } from "@/types";

interface Props {
  artworks: ArtworkItem[];
  usage: Record<string, number>;
  uploading: string[];
  onFiles: (files: File[]) => void;
  onAdd: (artworkId: string) => void;
  onRemove: (artworkId: string) => void;
}

export function UploadDropzone({ onFiles, compact }: { onFiles: (f: File[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-lg border border-dashed p-4 text-center transition-colors ${over ? "border-primary bg-accent" : "bg-background"}`}
    >
      <Upload className="mx-auto size-5 text-muted-foreground" aria-hidden />
      <p className="mt-2 text-sm font-medium">Drop artwork here</p>
      {!compact && <p className="mt-0.5 text-xs text-muted-foreground">PNG, JPEG or WebP · max {appConfig.upload.maxFileSizeMb} MB</p>}
      <Button size="sm" variant="outline" className="mt-3" onClick={() => input.current?.click()}>
        <ImagePlus /> Choose files
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={appConfig.upload.acceptedExtensions}
        className="sr-only"
        data-testid="artwork-upload"
        aria-label="Upload artwork files"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ArtworkLibrary({ artworks, usage, uploading, onFiles, onAdd, onRemove }: Props) {
  const uploads = artworks.filter((a) => a.source === "upload");
  const samples = artworks.filter((a) => a.source === "sample");
  return (
    <div className="space-y-5">
      <UploadDropzone onFiles={onFiles} />
      {uploading.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {uploading.map((n) => (
            <li key={n} className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin text-primary" /> Processing {n}…
            </li>
          ))}
        </ul>
      )}
      <Section title="My artwork" empty="Uploaded designs appear here." items={uploads} usage={usage} onAdd={onAdd} onRemove={onRemove} />
      <Section title="Sample artwork" items={samples} usage={usage} onAdd={onAdd} />
    </div>
  );
}

function Section({ title, items, usage, onAdd, onRemove, empty }: { title: string; items: ArtworkItem[]; usage: Record<string, number>; onAdd: (id: string) => void; onRemove?: (id: string) => void; empty?: string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {items.length === 0 && empty && <p className="text-xs text-muted-foreground">{empty}</p>}
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li key={a.id} className="group flex items-center gap-2.5 rounded-md border bg-background p-1.5">
            <div className="checkerboard grid size-11 shrink-0 place-items-center overflow-hidden rounded">
              {a.dataUrl ? <img src={a.dataUrl} alt="" className="max-h-full max-w-full object-contain" /> : <TriangleAlert className="size-4 text-destructive" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium" title={a.filename}>{a.filename}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {a.originalWidthPx}×{a.originalHeightPx}px · {formatBytes(a.fileSizeBytes)}
                {usage[a.id] ? ` · ${usage[a.id]} on sheet` : ""}
              </p>
              {!a.dataUrl && <p className="text-[10px] text-destructive">Image not saved — re-upload</p>}
              {a.dataUrl && !a.persisted && <p className="text-[10px] text-warning">Too large to save locally</p>}
            </div>
            <Button size="icon" variant="ghost" className="size-7" disabled={!a.dataUrl} onClick={() => onAdd(a.id)} aria-label={`Add ${a.filename} to sheet`}>
              <Plus />
            </Button>
            {onRemove && (
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(a.id)} aria-label={`Remove ${a.filename} from library`}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
