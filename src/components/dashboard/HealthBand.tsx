"use client";

import { Card } from "@/components/ui/Card";
import { useTradingStatus } from "@/hooks/useTrading";
import { useRootHealth } from "@/hooks/useDashboard";
import { formatRelative } from "@/lib/utils";

interface PillProps {
  tone: "buy" | "sell" | "hold" | "muted";
  label: string;
  detail?: string;
}

function Pill({ tone, label, detail }: PillProps) {
  const cls =
    tone === "buy"  ? "text-buy  border-buy/30  bg-buy/10"  :
    tone === "sell" ? "text-sell border-sell/30 bg-sell/10" :
    tone === "hold" ? "text-hold border-hold/30 bg-hold/10" :
                      "text-muted border-border bg-surface";
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone === "buy" ? "bg-buy" : tone === "sell" ? "bg-sell" : tone === "hold" ? "bg-hold" : "bg-muted"}`} />
      <span>{label}</span>
      {detail && <span className="opacity-70">— {detail}</span>}
    </div>
  );
}

export default function HealthBand() {
  const { data: status }  = useTradingStatus();
  const { data: health }  = useRootHealth();

  const mt5Connected = !!status?.connected;

  // Most recent pipeline run across all enabled pipelines
  const pipelines = health?.pipelines ?? {};
  const lastRuns = Object.values(pipelines)
    .map((p) => p.last_run_at)
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());
  const lastRun = lastRuns.length ? Math.max(...lastRuns) : null;
  const minsAgo = lastRun ? Math.floor((Date.now() - lastRun) / 60_000) : null;
  const schedulerTone: "buy" | "hold" | "sell" | "muted" =
    minsAgo == null      ? "muted" :
    minsAgo < 70         ? "buy"   :
    minsAgo < 120        ? "hold"  :
                           "sell";

  const total       = Object.keys(pipelines).length;
  const activeCount = Object.values(pipelines).filter((p) => p.enabled).length;

  // First non-null error becomes the alert pill
  const firstError = Object.entries(pipelines).find(([, p]) => p.last_error);

  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Pill
          tone={mt5Connected ? "buy" : "sell"}
          label="MT5"
          detail={mt5Connected ? "connected" : "disconnected"}
        />
        <Pill
          tone={schedulerTone}
          label="Scheduler"
          detail={minsAgo == null ? "no runs yet" : `last fire ${minsAgo}m ago`}
        />
        <Pill
          tone={activeCount > 0 ? "buy" : "muted"}
          label="Pipelines"
          detail={`${activeCount}/${total} on`}
        />
        {firstError ? (
          <Pill
            tone="sell"
            label={`Error in ${firstError[0]}`}
            detail={(firstError[1].last_error ?? "").slice(0, 60)}
          />
        ) : (
          <Pill tone="muted" label="No errors" detail={lastRun ? `${formatRelative(new Date(lastRun).toISOString())}` : "—"} />
        )}
      </div>
    </Card>
  );
}
