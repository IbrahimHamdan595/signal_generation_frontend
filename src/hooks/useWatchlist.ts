"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { watchlistApi } from "@/lib/api";
import toast from "react-hot-toast";

export function useWatchlist() {
  return useQuery<string[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await watchlistApi.get();
      return res.data.watchlist ?? res.data;
    },
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => watchlistApi.add(ticker),
    onSuccess: (_, ticker) => {
      toast.success(`${ticker} added to watchlist`);
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: () => toast.error("Failed to add to watchlist"),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => watchlistApi.remove(ticker),
    onSuccess: (_, ticker) => {
      toast.success(`${ticker} removed from watchlist`);
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: () => toast.error("Failed to remove from watchlist"),
  });
}

export function useReplaceWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tickers: string[]) => watchlistApi.replace(tickers),
    onSuccess: () => {
      toast.success("Watchlist updated");
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: () => toast.error("Failed to update watchlist"),
  });
}
