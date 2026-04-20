"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingApi } from "@/lib/api";
import toast from "react-hot-toast";

export function useTradingStatus() {
  return useQuery({
    queryKey: ["trading", "status"],
    queryFn: async () => {
      const res = await tradingApi.getStatus();
      return res.data;
    },
    refetchInterval: 15_000,
  });
}

export function useTradingConfig() {
  return useQuery({
    queryKey: ["trading", "config"],
    queryFn: async () => {
      const res = await tradingApi.getConfig();
      return res.data;
    },
  });
}

export function useConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      account,
      password,
      server,
      path,
    }: {
      account: number;
      password: string;
      server: string;
      path?: string;
    }) => tradingApi.connect(account, password, server, path),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "MT5 connected");
      qc.invalidateQueries({ queryKey: ["trading"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Connection failed");
    },
  });
}

export function useDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tradingApi.disconnect(),
    onSuccess: () => {
      toast.success("MT5 disconnected");
      qc.invalidateQueries({ queryKey: ["trading"] });
    },
  });
}

export function useUpdateTradingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => tradingApi.updateConfig(updates),
    onSuccess: () => {
      toast.success("Config saved");
      qc.invalidateQueries({ queryKey: ["trading"] });
    },
    onError: () => toast.error("Failed to save config"),
  });
}

export function useExecuteSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signalId: number) => tradingApi.executeSignal(signalId),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(
        `Order filled — ${d.side} ${d.volume} lots of ${d.symbol} @ ${d.fill_price}`
      );
      qc.invalidateQueries({ queryKey: ["trading"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Execution failed");
    },
  });
}

export function useMT5Positions() {
  return useQuery({
    queryKey: ["trading", "positions"],
    queryFn: async () => {
      const res = await tradingApi.getPositions();
      return res.data as MT5Position[];
    },
    refetchInterval: 10_000,
  });
}

export function useClosePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticket: number) => tradingApi.closePosition(ticket),
    onSuccess: (res) => {
      toast.success(`Position closed @ ${res.data.close_price}`);
      qc.invalidateQueries({ queryKey: ["trading"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Close failed");
    },
  });
}

export function useExecutions(limit = 50) {
  return useQuery({
    queryKey: ["trading", "executions", limit],
    queryFn: async () => {
      const res = await tradingApi.getExecutions(limit);
      return res.data as Execution[];
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MT5Position {
  ticket: number;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  open_price: number;
  current_price: number;
  stop_loss: number;
  take_profit: number;
  profit: number;
  swap: number;
  open_time: number;
  comment: string;
}

export interface Execution {
  id: number;
  signal_id: number | null;
  symbol: string;
  mt5_ticket: number | null;
  order_type: string;
  volume: number | null;
  requested_price: number | null;
  fill_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  mt5_retcode: number | null;
  mt5_comment: string | null;
  pnl: number | null;
  closed_at: string | null;
  created_at: string;
  ticker: string | null;
  action: string | null;
  confidence: number | null;
}
