"use client";

import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/api";
import type { OHLCVResponse, IndicatorsResponse } from "@/types";

export function useOHLCV(ticker: string, interval = "1d", limit = 200) {
  return useQuery<OHLCVResponse[]>({
    queryKey: ["ohlcv", ticker, interval, limit],
    queryFn: async () => {
      const res = await marketApi.getOHLCV(ticker, interval, limit);
      return res.data;
    },
    enabled: !!ticker,
    staleTime: 60_000,
  });
}

export function useIndicators(ticker: string, interval = "1d", limit = 200) {
  return useQuery<IndicatorsResponse[]>({
    queryKey: ["indicators", ticker, interval, limit],
    queryFn: async () => {
      const res = await marketApi.getIndicators(ticker, interval, limit);
      return res.data;
    },
    enabled: !!ticker,
    staleTime: 60_000,
  });
}

export function useLatestIndicators(ticker: string, interval = "1d") {
  return useQuery<IndicatorsResponse>({
    queryKey: ["indicators", "latest", ticker, interval],
    queryFn: async () => {
      const res = await marketApi.getLatestIndicators(ticker, interval);
      return res.data;
    },
    enabled: !!ticker,
  });
}
