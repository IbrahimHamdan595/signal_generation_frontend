import { cn } from "@/lib/utils";

// Source palette matches the cumulative-PnL chart on /comparison so users
// can mentally connect a badge on /signals with a line on the chart.
const SOURCE_META: Record<string, { label: string; chip: string; dot: string }> = {
  ml_equities: {
    label: "Equities ML",
    chip:  "text-sky-300 border-sky-500/30 bg-sky-500/10",
    dot:   "bg-sky-400",
  },
  ml_fx: {
    label: "FX ML",
    chip:  "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    dot:   "bg-emerald-400",
  },
  rule_donchian: {
    label: "Donchian",
    chip:  "text-amber-300 border-amber-500/30 bg-amber-500/10",
    dot:   "bg-amber-400",
  },
};

interface Props {
  source?: string | null;
  className?: string;
  size?: "xs" | "sm";
}

export function SourceBadge({ source, className, size = "sm" }: Props) {
  // `source` may be undefined / empty / unknown — fall through to a neutral
  // "Unknown" chip in those cases. Using an explicit conditional (not `&& ?? `)
  // so TypeScript narrows the value to the meta-record shape, not `string`.
  const known = source ? SOURCE_META[source] : undefined;
  const meta = known ?? {
    label: source && source.length > 0 ? source : "Unknown",
    chip:  "text-muted border-border bg-surface",
    dot:   "bg-muted",
  };
  const padding = size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium border rounded-full whitespace-nowrap",
        padding,
        meta.chip,
        className,
      )}
      title={`source=${source ?? "?"}`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

// Also exported for the filter row so chip styles stay consistent.
export const SOURCE_OPTIONS = [
  { value: "ml_equities",   label: "Equities ML" },
  { value: "ml_fx",         label: "FX ML" },
  { value: "rule_donchian", label: "Donchian" },
] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number]["value"];
