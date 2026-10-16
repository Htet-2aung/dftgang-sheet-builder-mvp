import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

/** Numeric input that validates and commits on blur / Enter. */
export function NumField({ label, value, onCommit, min, max, step = 0.1, suffix, disabled }: Props) {
  const id = useId();
  const [text, setText] = useState(fmt(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setText(fmt(value));
    setError(null);
  }, [value]);

  const commit = () => {
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v)) return setError("Enter a number");
    if (min !== undefined && v < min) return setError(`Minimum ${min}`);
    if (max !== undefined && v > max) return setError(`Maximum ${fmt(max)}`);
    setError(null);
    if (Math.abs(v - value) > 1e-6) onCommit(v);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          type="number"
          step={step}
          value={text}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setText(fmt(value));
          }}
          className="h-8 pr-7 font-mono text-[13px] tabular-nums aria-invalid:border-destructive"
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-err`} className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const fmt = (v: number) => String(Math.round(v * 100) / 100);
