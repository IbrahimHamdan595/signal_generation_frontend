"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { pipelinesApi, type Pipeline, type PipelineSource } from "@/lib/api";
import { PipelineConfigEditor } from "@/components/pipeline/PipelineConfigEditor";
import { Layers, Brain, Workflow, Play, PlayCircle, Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

// ─── visual helpers ──────────────────────────────────────────────────────────

const SOURCE_ICON: Record<PipelineSource, typeof Brain> = {
  ml_equities:   Brain,
  ml_fx:         Brain,
  rule_donchian: Workflow,
};

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ p }: { p: Pipeline }) {
  if (!p.enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/10 text-muted border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-muted" />
        Disabled
      </span>
    );
  }
  if (p.last_error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-sell/10 text-sell border border-sell/30">
        <AlertTriangle size={11} />
        Last run failed
      </span>
    );
  }
  if (p.last_run_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-buy/10 text-buy border border-buy/30">
        <CheckCircle2 size={11} />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-hold/10 text-hold border border-hold/30">
      <span className="w-1.5 h-1.5 rounded-full bg-hold" />
      Enabled · awaiting first run
    </span>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => (await pipelinesApi.list()).data,
    refetchInterval: 30_000,   // poll every 30s so last_run_at stays fresh
  });
  const pipelines: Pipeline[] = data?.pipelines ?? [];

  const [busySource, setBusySource] = useState<PipelineSource | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Which card's config accordion is currently open. Only one open at a time
  // to keep the grid layout from jumping unpredictably.
  const [openConfig, setOpenConfig] = useState<PipelineSource | null>(null);

  async function toggleEnabled(p: Pipeline) {
    try {
      await pipelinesApi.update(p.source, { enabled: !p.enabled });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success(`${p.display_name} ${p.enabled ? "disabled" : "enabled"}`);
    } catch (e) {
      toast.error(`Failed to toggle ${p.display_name}`);
    }
  }

  async function runOne(p: Pipeline) {
    try {
      setBusySource(p.source);
      await pipelinesApi.runOne(p.source);
      toast.success(`${p.display_name} scheduled — refresh in ~30s for results`);
      // Poll a few times so the user sees last_run_at update without manual refresh
      setTimeout(() => qc.invalidateQueries({ queryKey: ["pipelines"] }), 5_000);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["pipelines"] }), 30_000);
    } catch {
      toast.error(`Failed to schedule ${p.display_name}`);
    } finally {
      setBusySource(null);
    }
  }

  async function runAll() {
    try {
      setRunningAll(true);
      const res = await pipelinesApi.runAll();
      const sources = res.data.sources ?? [];
      if (sources.length === 0) {
        toast(`No enabled pipelines — toggle at least one on first`, { icon: "ℹ️" });
      } else {
        toast.success(`Scheduled ${sources.length} pipeline${sources.length > 1 ? "s" : ""}`);
      }
      setTimeout(() => qc.invalidateQueries({ queryKey: ["pipelines"] }), 5_000);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["pipelines"] }), 30_000);
    } catch {
      toast.error("Run All failed");
    } finally {
      setRunningAll(false);
    }
  }

  async function resetState() {
    // Confirm because this flips pending orders to failed and re-enables
    // auto_trade — both have downstream consequences a misclick would regret.
    const ok = window.confirm(
      "Reset pipeline state?\n\n" +
      "• Pending orders will be marked failed\n" +
      "• Card timestamps will reset to \"awaiting first run\"\n" +
      "• Equity guardrail will rebase at current MT5 equity\n" +
      "• Auto-trade will be re-enabled for all users\n\n" +
      "Historical signals and executions are preserved."
    );
    if (!ok) return;
    try {
      setResetting(true);
      const res = await pipelinesApi.reset();
      const d = res.data;
      const parts = [
        `${d.pending_orders_cleared} pending orders cleared`,
        d.equity_snapshot_rebased ? "equity guardrail rebased" : null,
        d.auto_trade_reenabled > 0 ? `${d.auto_trade_reenabled} user(s) re-enabled` : null,
      ].filter(Boolean);
      toast.success(`Reset complete — ${parts.join(" • ")}`);
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      qc.invalidateQueries({ queryKey: ["trading"] });
    } catch {
      toast.error("Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <Header title="Strategies" />

      <div className="mt-6 space-y-5">

        {/* Intro card */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20">
              <Layers size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <CardTitle>Three-pipeline experiment</CardTitle>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Each strategy generates signals into the same <code className="text-ink bg-surface px-1.5 py-0.5 rounded">signals</code> table
                tagged with its <code className="text-ink bg-surface px-1.5 py-0.5 rounded">source</code>. Auto-execute (in Trading config)
                fires the highest-EV non-HOLD signals across all enabled strategies.
                The <a href="/comparison" className="text-accent hover:underline">Comparison</a> page aggregates per-strategy PnL once trades close.
              </p>
            </div>
          </div>
        </Card>

        {/* Run-all bar */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {pipelines.filter((p) => p.enabled).length} of {pipelines.length} enabled
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetState}
              disabled={resetting || runningAll}
              loading={resetting}
              variant="secondary"
              title="Clear pending orders, rebase equity guardrail, re-enable auto-trade, and reset card timestamps. Historical data is preserved."
            >
              <RotateCcw size={14} />
              Reset state
            </Button>
            <Button
              onClick={runAll}
              disabled={runningAll || pipelines.every((p) => !p.enabled)}
              loading={runningAll}
              className="px-5"
            >
              <PlayCircle size={14} />
              Run all enabled
            </Button>
          </div>
        </div>

        {/* Pipeline cards */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <Card>
            <p className="text-sm text-sell">Could not load pipelines. Is the backend running?</p>
          </Card>
        )}

        {!isLoading && pipelines.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pipelines.map((p) => {
              const Icon = SOURCE_ICON[p.source as PipelineSource] ?? Brain;
              const isBusy = busySource === p.source;
              return (
                <Card key={p.source} glow={p.enabled ? "accent" : undefined}>
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg border ${p.kind === "ml" ? "bg-accent/8 border-accent/20" : "bg-buy/8 border-buy/20"}`}>
                      <Icon size={16} className={p.kind === "ml" ? "text-accent" : "text-buy"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle>{p.display_name}</CardTitle>
                        <StatusBadge p={p} />
                      </div>
                      <p className="text-xs text-muted mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface rounded-lg px-3 py-2 border border-border">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Last run</p>
                      <p className="text-ink font-medium">{formatRelative(p.last_run_at)}</p>
                    </div>
                    <div className="bg-surface rounded-lg px-3 py-2 border border-border">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Signals</p>
                      <p className="text-ink font-medium">{p.last_signals_count ?? "—"}</p>
                    </div>
                  </div>

                  {/* Error banner */}
                  {p.last_error && (
                    <div className="mt-3 text-xs bg-sell/5 border border-sell/20 rounded-lg px-3 py-2 text-sell">
                      <p className="font-medium flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Last run failed
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted line-clamp-2">{p.last_error}</p>
                    </div>
                  )}

                  {/* Configuration — accordion */}
                  <div className="mt-3 text-xs">
                    <button
                      onClick={() =>
                        setOpenConfig(openConfig === (p.source as PipelineSource) ? null : (p.source as PipelineSource))
                      }
                      className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors"
                    >
                      {openConfig === p.source ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      Configuration
                    </button>

                    {/* Compact preview when collapsed */}
                    {openConfig !== p.source && Object.keys(p.config).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Object.entries(p.config).slice(0, 4).map(([k, v]) => (
                          <span key={k} className="font-mono text-[10px] bg-surface border border-border px-2 py-0.5 rounded">
                            {k}: <span className="text-ink">{Array.isArray(v) ? `[${(v as unknown[]).length}]` : String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Full editor when expanded */}
                    {openConfig === p.source && (
                      <div className="mt-2 bg-surface/40 border border-border rounded-lg p-3">
                        <PipelineConfigEditor pipeline={p} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant={p.enabled ? "ghost" : "primary"}
                      size="sm"
                      onClick={() => toggleEnabled(p)}
                      className="flex-1 justify-center"
                    >
                      {p.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runOne(p)}
                      disabled={isBusy}
                      className="flex-1 justify-center border-accent/40 text-accent hover:bg-accent/10"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      Run now
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
