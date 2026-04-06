"use client";

import { useQuery } from "@tanstack/react-query";
import { sentimentApi } from "@/lib/api";
import type {
  SentimentSummaryResponse,
  SentimentSnapshotResponse,
  SentimentArticleResponse,
} from "@/types";

export function useSentimentSummaries() {
  return useQuery<SentimentSummaryResponse[]>({
    queryKey: ["sentiment", "summary"],
    queryFn: async () => {
      const res = await sentimentApi.getSummary();
      return res.data;
    },
    staleTime: 120_000,
  });
}

export function useSentimentSnapshot(ticker: string) {
  return useQuery<SentimentSnapshotResponse>({
    queryKey: ["sentiment", "snapshot", ticker],
    queryFn: async () => {
      const res = await sentimentApi.getSnapshot(ticker);
      return res.data;
    },
    enabled: !!ticker,
  });
}

export function useSentimentArticles(ticker: string) {
  return useQuery<SentimentArticleResponse[]>({
    queryKey: ["sentiment", "articles", ticker],
    queryFn: async () => {
      const res = await sentimentApi.getArticles(ticker);
      return res.data;
    },
    enabled: !!ticker,
  });
}
