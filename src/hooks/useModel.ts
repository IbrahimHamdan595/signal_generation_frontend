"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mlApi } from "@/lib/api";
import type { ModelStatus, EvalReport } from "@/types";
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
