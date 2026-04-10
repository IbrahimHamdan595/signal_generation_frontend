"use client";

import { useQuery } from "@tanstack/react-query";
import { signalsApi } from "@/lib/api";
import type { Action, SignalResponse } from "@/types";

export function useSignalsByAction(
  action: Action,
  interval = "1d",
  limit = 50
) {
  return useQuery<SignalResponse[]>({
    queryKey: ["signals", "by-action", action, interval, limit],
    queryFn: async () => {
      const res = await signalsApi.filterByAction(action, interval, limit);
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useSignalTickers() {
  return useQuery<{ tickers: string[]; count: number }>({
    queryKey: ["signals", "tickers"],
    queryFn: async () => {
      const res = await signalsApi.getTickers();
      return res.data;
    },
    staleTime: 300_000,
  });
}
