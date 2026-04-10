"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import type { Position, PortfolioSummary } from "@/types";
import toast from "react-hot-toast";

export function usePositions(openOnly = true) {
  return useQuery<Position[]>({
    queryKey: ["portfolio", "positions", openOnly],
    queryFn: async () => {
      const res = await portfolioApi.getPositions();
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function usePortfolioSummary() {
  return useQuery<PortfolioSummary>({
    queryKey: ["portfolio", "summary"],
    queryFn: async () => {
      const res = await portfolioApi.getSummary();
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useOpenPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticker,
      quantity,
      price,
      signal_id,
    }: {
      ticker: string;
      quantity: number;
      price: number;
      signal_id?: number;
    }) => portfolioApi.openPosition(ticker, quantity, price, signal_id),
    onSuccess: (_, { ticker }) => {
      toast.success(`Position opened: ${ticker}`);
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: () => toast.error("Failed to open position"),
  });
}

export function useClosePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) =>
      portfolioApi.closePosition(id, price),
    onSuccess: (res) => {
      const pnl = res.data.realized_pnl_this_close;
      toast.success(
        `Position closed — P&L: ${pnl >= 0 ? "+" : ""}$${pnl?.toFixed(2)}`
      );
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: () => toast.error("Failed to close position"),
  });
}
