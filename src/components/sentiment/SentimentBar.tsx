"use client";

import type { SentimentSummaryResponse } from "@/types";
import { cn } from "@/lib/utils";

interface SentimentBarProps {
  summary: SentimentSummaryResponse;
}

export default function SentimentBar({ summary }: SentimentBarProps) {
  const compound = summary.avg_compound; // -1 to 1
  const pct = ((compound + 1) / 2) * 100; // map to 0-100
  const label =
    summary.dominant_sentiment?.toLowerCase() ??
    (compound > 0.05 ? "positive" : compound < -0.05 ? "negative" : "neutral");

  const color =
    label === "positive"
      ? "var(--buy)"
      : label === "negative"
      ? "var(--sell)"
      : "var(--hold)";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-ink w-16 shrink-0">{summary.ticker}</span>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium w-16 text-right shrink-0",
          label === "positive" ? "text-buy" : label === "negative" ? "text-sell" : "text-hold"
        )}
      >
        {label}
      </span>
    </div>
  );
}
