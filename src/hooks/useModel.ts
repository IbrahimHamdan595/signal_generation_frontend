"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mlApi, type AssetClass } from "@/lib/api";
import type { ModelStatus, EvalReport, ModelVersion, WalkForwardResult } from "@/types";
import toast from "react-hot-toast";

// Each hook accepts an asset class so the Model page can render two columns
// (Equities ML / FX ML) side by side. The query key includes the asset class
// so TanStack Query caches the two views separately and switching tabs is
// instant on the second visit.

export function useModelStatus(assetClass: AssetClass = "equities") {
  return useQuery<ModelStatus>({
    queryKey: ["model", "status", assetClass],
    queryFn: async () => {
      const res = await mlApi.getStatus(assetClass);
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useEvalReport(assetClass: AssetClass = "equities") {
  return useQuery<EvalReport>({
    queryKey: ["model", "report", assetClass],
    queryFn: async () => {
      const res = await mlApi.getReport(assetClass);
      return res.data;
    },
    retry: false,
  });
}

export function useTrainModel(assetClass: AssetClass = "equities") {
  const qc = useQueryClient();
  return useMutation<{ job_id: number }, Error, { tickers: string[]; epochs?: number }>({
    mutationFn: async ({ tickers, epochs }) => {
      const res = await mlApi.train(tickers, epochs ?? 50, assetClass);
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Training started (${assetClass === "fx" ? "FX" : "Equities"})`);
      setTimeout(() => qc.invalidateQueries({ queryKey: ["model"] }), 3000);
    },
    onError: () => toast.error("Failed to start training"),
  });
}

export function useModelVersions(assetClass: AssetClass = "equities") {
  return useQuery<ModelVersion[]>({
    queryKey: ["model", "versions", assetClass],
    queryFn: async () => {
      const res = await mlApi.listVersions(assetClass);
      return res.data.versions;
    },
  });
}

export function useRollbackModel(assetClass: AssetClass = "equities") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: string) => mlApi.rollback(version, assetClass),
    onSuccess: (_, version) => {
      toast.success(`Rolled back ${assetClass === "fx" ? "FX" : "Equities"} to ${version}`);
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

export function useLastTrainResult(assetClass: AssetClass = "equities") {
  return useQuery<Record<string, unknown>>({
    queryKey: ["model", "last-result", assetClass],
    queryFn: async () => {
      const res = await mlApi.getLastResult(assetClass);
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
