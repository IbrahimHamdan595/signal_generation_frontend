"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { outcomesApi } from "@/lib/api";
import type { SignalOutcome, OutcomeSummary } from "@/types";
import toast from "react-hot-toast";

export function useOutcomes(ticker?: string, limit = 100) {
  return useQuery<SignalOutcome[]>({
    queryKey: ["outcomes", ticker, limit],
    queryFn: async () => {
      const res = await outcomesApi.getAll(ticker, limit);
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useOutcomeSummary() {
  return useQuery<OutcomeSummary>({
    queryKey: ["outcomes", "summary"],
    queryFn: async () => {
      const res = await outcomesApi.getSummary();
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useTriggerOutcomeCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => outcomesApi.triggerCheck(),
    onSuccess: (res) => {
      const { resolved } = res.data;
      toast.success(`Resolved ${resolved} pending outcomes`);
      qc.invalidateQueries({ queryKey: ["outcomes"] });
    },
    onError: () => toast.error("Outcome check failed"),
  });
}
