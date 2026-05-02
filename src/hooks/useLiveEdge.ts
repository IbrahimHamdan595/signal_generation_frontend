"use client";

import { useQuery } from "@tanstack/react-query";
import { liveEdgeApi } from "@/lib/api";

export function useLiveEdgeSummary(days = 30) {
  return useQuery({
    queryKey: ["live-edge", "summary", days],
    queryFn: async () => {
      const res = await liveEdgeApi.getSummary(days);
      return res.data as LiveEdgeSummary;
    },
    refetchInterval: 60_000,
  });
}

export function useLiveEdgeDaily(days = 30) {
  return useQuery({
    queryKey: ["live-edge", "daily", days],
    queryFn: async () => {
      const res = await liveEdgeApi.getDaily(days);
      return res.data as DailyRow[];
    },
  });
}

export function useLiveEdgeCalibration() {
  return useQuery({
    queryKey: ["live-edge", "calibration"],
    queryFn: async () => {
      const res = await liveEdgeApi.getCalibration();
      return res.data as CalibrationBucket[];
    },
  });
}

export function useLiveEdgeSlippage() {
  return useQuery({
    queryKey: ["live-edge", "slippage"],
    queryFn: async () => {
      const res = await liveEdgeApi.getSlippage();
      return res.data as SlippageStats;
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveEdgeSummary {
  days: number;
  total_trades: number;
  no_data?: boolean;
  wins: number;
  losses: number;
  actual_win_rate: number;
  avg_predicted_conf: number;
  calibration_gap: number;
  realized_pnl: number;
  avg_pnl: number;
  avg_slippage_pct: number;
}

export interface DailyRow {
  day: string;
  trades: number;
  pnl: number;
  win_rate: number;
  avg_conf: number;
  slippage_pct: number;
}

export interface CalibrationBucket {
  bucket: number;
  n: number;
  avg_confidence: number;
  actual_win_rate: number;
  calibration_gap: number;
}

export interface SlippageStats {
  no_data?: boolean;
  avg_pct: number;
  p50_pct: number;
  p95_pct: number;
  p99_pct: number;
  worst_pct: number;
}
