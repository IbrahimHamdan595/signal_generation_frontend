"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mlApi } from "@/lib/api";
import type { ModelStatus, EvalReport, ModelVersion, WalkForwardResult } from "@/types";
import toast from "react-hot-toast";

export function useModelStatus() {
  return useQuery<ModelStatus>({
    queryKey: ["model", "status"],
    queryFn: async () => {
      const res = await mlApi.getStatus();
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useEvalReport() {
  return useQuery<EvalReport>({
    queryKey: ["model", "report"],
    queryFn: async () => {
      const res = await mlApi.getReport();
      return res.data;
    },
  });
}

export function useTrainModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tickers, epochs }: { tickers: string[]; epochs?: number }) =>
      mlApi.train(tickers, epochs),
    onSuccess: () => {
      toast.success("Training started in background");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["model"] }), 3000);
    },
    onError: () => toast.error("Failed to start training"),
  });
}

export function useModelVersions() {
  return useQuery<ModelVersion[]>({
    queryKey: ["model", "versions"],
    queryFn: async () => {
      const res = await mlApi.listVersions();
      return res.data.versions;
    },
  });
}

export function useRollbackModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: string) => mlApi.rollback(version),
    onSuccess: (_, version) => {
      toast.success(`Rolled back to ${version}`);
      qc.invalidateQueries({ queryKey: ["model"] });
    },
    onError: () => toast.error("Rollback failed"),
  });
}

export function useWalkForwardResult() {
  return useQuery<WalkForwardResult>({
    queryKey: ["model", "walkforward"],
    queryFn: async () => {
      const res = await mlApi.getWalkForwardResult();
      return res.data;
    },
    retry: false,
  });
}

export function useLastTrainResult() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["model", "last-result"],
    queryFn: async () => {
      const res = await mlApi.getLastResult();
      return res.data;
    },
    retry: false,
    refetchInterval: 10_000,
  });
}

export function useRunWalkForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tickers, n_splits, epochs }: { tickers: string[]; n_splits?: number; epochs?: number }) =>
      mlApi.runWalkForward(tickers, n_splits, epochs),
    onSuccess: () => {
      toast.success("Walk-forward validation started in background");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["model", "walkforward"] }), 5000);
    },
    onError: () => toast.error("Failed to start walk-forward validation"),
  });
}
