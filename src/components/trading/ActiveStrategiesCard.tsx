"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/Card";
import { pipelinesApi, type Pipeline } from "@/lib/api";
import { Layers, ArrowRight, Check, Pause, AlertTriangle } from "lucide-react";

// Compact read-only summary of the three pipelines, shown on /trading near
// the MT5 connection bar. Lets users see at a glance which signal sources
// are feeding the executor without leaving the page. Full toggle controls
// live on /strategies (the dot links over there).

function relative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatusDot({ p }: { p: Pipeline }) {
  if (!p.enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted">
        <Pause size={9} /> Disabled
      </span>
    );
  }
  if (p.last_error) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-sell">
        <AlertTriangle size={9} /> Last run failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-buy">
      <Check size={9} /> Active
    </span>
  );
}

export function ActiveStrategiesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => (await pipelinesApi.list()).data,
    refetchInterval: 30_000,
  });
  const pipelines: Pipeline[] = data?.pipelines ?? [];

  if (isLoading) {
    return (
      <Card>
        <div className="h-16 animate-pulse bg-surface rounded-lg" />
      </Card>
    );
  }
  if (pipelines.length === 0) return null;

  const enabledCount = pipelines.filter((p) => p.enabled).length;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <Layers size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Active Strategies</CardTitle>
            <Link
              href="/strategies"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {enabledCount} of {pipelines.length} feeding the executor — signals from enabled pipelines flow into Auto Trade.
          </p>

          {/* One row per pipeline */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pipelines.map((p) => (
              <div
                key={p.source}
                className={`rounded-lg border px-3 py-2 ${
                  p.enabled
                    ? "border-border bg-surface/50"
                    : "border-dashed border-border bg-surface/20 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink truncate">
                    {p.display_name}
                  </span>
                  <StatusDot p={p} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-muted">
                  <span>last run {relative(p.last_run_at)}</span>
                  <span>
                    {p.last_signals_count != null
                      ? `${p.last_signals_count} signals`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
