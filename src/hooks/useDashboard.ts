"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  liveEdgeApi,
  pipelinesApi,
  reportsApi,
  type Pipeline,
  type StrategyAggregate,
} from "@/lib/api";

// /health is mounted at root (not /api/v1) — needs its own axios call
const ROOT_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LiveEdgeSummary {
  days: number;
  total_trades: number;
  wins: number;
  losses: number;
  breakeven?: number;
  gross_wins?: number;
  gross_losses?: number;
  actual_win_rate: number;
  avg_predicted_conf: number;
  calibration_gap: number;
  realized_pnl: number;
  avg_pnl: number;
  avg_slippage_pct: number;
}

export interface RootHealth {
  status: "ok" | "degraded";
  scheduler: string;
  pipelines: Record<string, {
    enabled: boolean;
    trained: boolean;
    last_run_at: string | null;
    last_signals_count: number | null;
    last_error: string | null;
  }>;
  model_trained: boolean;
}

export function useLiveEdgeSummary(days = 30) {
  return useQuery<LiveEdgeSummary>({
    queryKey: ["liveEdge", "summary", days],
    queryFn: async () => {
      const r = await liveEdgeApi.getSummary(days);
      return r.data;
    },
    refetchInterval: 60_000,
  });
}

export function useRootHealth() {
  return useQuery<RootHealth>({
    queryKey: ["health", "root"],
    queryFn: async () => {
      // No auth required — /health is intentionally public
      const r = await axios.get<RootHealth>(`${ROOT_URL}/health`);
      return r.data;
    },
    refetchInterval: 30_000,
  });
}

export interface PerSourceRow {
  source: string;
  display_name: string;
  trades: number;
  win_rate: number;
  pnl_raw: number;
  pnl_adj: number;
  status: "active" | "retraining" | "disabled";
}

// Joins /reports/strategy-comparison (PnL) with /pipelines (enabled flag,
// last_error) so each row carries a status pill the UI can render directly.
export function usePerSourceBreakdown(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  return useQuery<PerSourceRow[]>({
    queryKey: ["dashboard", "perSource", days],
    queryFn: async () => {
      const [compRes, pipesRes] = await Promise.all([
        reportsApi.comparison(since),
        pipelinesApi.list(),
      ]);
      const sources = compRes.data.sources ?? [];
      const pipes: Pipeline[] = pipesRes.data.pipelines ?? [];
      const byPipe = new Map(pipes.map((p) => [p.source, p]));

      const rows: PerSourceRow[] = sources.map((agg: StrategyAggregate) => {
        const p = byPipe.get(agg.source as Pipeline["source"]);
        let status: PerSourceRow["status"];
        if (!p || !p.enabled) status = "disabled";
        else if (p.last_error) status = "retraining";
        else status = "active";

        return {
          source:       agg.source,
          display_name: agg.display_name,
          trades:       agg.total_trades,
          win_rate:     agg.win_rate,
          pnl_raw:      agg.total_pnl_usd,
          pnl_adj:      agg.total_pnl_usd_adj,
          status,
        };
      });

      // PnL DESC (adjusted) — highest earner on top
      rows.sort((a, b) => b.pnl_adj - a.pnl_adj);
      return rows;
    },
    refetchInterval: 60_000,
  });
}
