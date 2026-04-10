"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signalsApi } from "@/lib/api";
import type { SignalResponse } from "@/types";
import toast from "react-hot-toast";

export function useAllSignals() {
  return useQuery<SignalResponse[]>({
    queryKey: ["signals", "all"],
    queryFn: async () => {
      const res = await signalsApi.getAll();
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useSignalHistory(ticker: string, limit = 50) {
  return useQuery<SignalResponse[]>({
    queryKey: ["signals", "history", ticker, limit],
    queryFn: async () => {
      const res = await signalsApi.getHistory(ticker, limit);
      return res.data;
    },
    enabled: !!ticker,
  });
}

export function useLatestSignal(ticker: string) {
  return useQuery<SignalResponse>({
    queryKey: ["signals", "latest", ticker],
    queryFn: async () => {
      const res = await signalsApi.getLatest(ticker);
      return res.data;
    },
    enabled: !!ticker,
  });
}

export function useHighConfidenceSignals(minConfidence = 0.6) {
  return useQuery<SignalResponse[]>({
    queryKey: ["signals", "high-confidence", minConfidence],
    queryFn: async () => {
      const res = await signalsApi.filterHighConfidence(minConfidence);
      return res.data;
    },
  });
}

export function useGenerateSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, interval }: { ticker: string; interval?: string }) =>
      signalsApi.generate(ticker, interval),
    onSuccess: (_, { ticker }) => {
      toast.success(`Signal generated for ${ticker}`);
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
    onError: () => toast.error("Failed to generate signal"),
  });
}

export function useGenerateBatchSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tickers, interval }: { tickers: string[]; interval?: string }) =>
      signalsApi.generateBatch(tickers, interval),
    onSuccess: (res) => {
      const { generated, skipped } = res.data;
      toast.success(`Generated ${generated} signals${skipped > 0 ? `, skipped ${skipped}` : ""}`);
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
    onError: () => toast.error("Batch generation failed"),
  });
}
