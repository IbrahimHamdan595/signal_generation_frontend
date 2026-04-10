"use client";

import { useQuery } from "@tanstack/react-query";
import { confluenceApi } from "@/lib/api";
import type { ConfluenceResult } from "@/types";

export function useConfluence(ticker: string) {
  return useQuery<ConfluenceResult>({
    queryKey: ["confluence", ticker],
    queryFn: async () => {
      const res = await confluenceApi.get(ticker);
      return res.data;
    },
    enabled: !!ticker,
    refetchInterval: 60_000,
  });
}

export function useConfluenceBatch(tickers: string[]) {
  return useQuery<ConfluenceResult[]>({
    queryKey: ["confluence", "batch", tickers],
    queryFn: async () => {
      const res = await confluenceApi.getBatch(tickers);
      return res.data;
    },
    enabled: tickers.length > 0,
    refetchInterval: 60_000,
  });
}
