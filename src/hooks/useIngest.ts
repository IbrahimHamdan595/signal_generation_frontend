"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestApi, mlApi } from "@/lib/api";
import type { SP500Ticker } from "@/types";
import toast from "react-hot-toast";

export function useSP500() {
  return useQuery<SP500Ticker[]>({
    queryKey: ["ingest", "sp500"],
    queryFn: async () => {
      const res = await ingestApi.getSP500();
      // Backend returns { total, tickers: { "AAPL": "Apple Inc.", ... } }
      const tickersMap: Record<string, string> = res.data.tickers ?? {};
      return Object.entries(tickersMap).map(([symbol, name]) => ({
        symbol,
        name: name as string,
        sector: "",
        market_cap: null,
      }));
    },
    staleTime: Infinity,
  });
}

export function useAvailableTickers() {
  return useQuery<string[]>({
    queryKey: ["ingest", "tickers"],
    queryFn: async () => {
      const res = await ingestApi.getTickers();
      return res.data;
    },
    staleTime: 60_000,
  });
}

/**
 * Ingest OHLCV data via background job.
 * Sends all tickers in one request (max 500), returns { job_id } immediately.
 * Poll GET /jobs/{job_id} for progress.
 */
export function useIngestOHLCV() {
  return useMutation<
    { job_id: number },
    Error,
    { tickers: string[]; interval?: string; period?: string }
  >({
    mutationFn: async ({ tickers, interval = "1d", period = "1y" }) => {
      const res = await ingestApi.ingestBackground(tickers, interval, period);
      return res.data; // { job_id, message }
    },
    onSuccess: ({ job_id }) => {
      toast.success(`Ingestion job #${job_id} started — running in background`);
    },
    onError: () => toast.error("Failed to start OHLCV ingestion"),
  });
}

/**
 * Enrich sentiment for tickers in batches of 10 (AV rate limit).
 * Each batch returns a job_id immediately. Returns all job IDs.
 */
export function useEnrichSentiment() {
  return useMutation<
    { job_ids: number[]; total_batches: number; errors: string[] },
    Error,
    { tickers: string[]; period_years?: number }
  >({
    mutationFn: async ({ tickers, period_years = 1 }) => {
      const BATCH = 10;
      const job_ids: number[] = [];
      const errors: string[] = [];

      for (let i = 0; i < tickers.length; i += BATCH) {
        const batch = tickers.slice(i, i + BATCH);
        try {
          const res = await ingestApi.enrichSentiment(batch, period_years);
          if (res.data.job_id) job_ids.push(res.data.job_id);
        } catch {
          errors.push(...batch);
        }
      }

      return { job_ids, total_batches: Math.ceil(tickers.length / BATCH), errors };
    },
    onSuccess: ({ job_ids, errors }) => {
      if (errors.length === 0) {
        toast.success(`Sentiment enrichment started (${job_ids.length} job${job_ids.length !== 1 ? "s" : ""})`);
      } else {
        toast.error(`${errors.length} tickers failed to dispatch`);
      }
    },
    onError: () => toast.error("Sentiment enrichment failed"),
  });
}

/**
 * Build per-day sentiment from Finnhub news + FinBERT.
 * Batches tickers in groups of 20 (route limit), returns all job IDs.
 */
export function useBuildDailySentiment() {
  return useMutation<
    { job_ids: number[]; total_batches: number; errors: string[] },
    Error,
    { tickers: string[]; years?: number }
  >({
    mutationFn: async ({ tickers, years = 5 }) => {
      const BATCH = 20;
      const job_ids: number[] = [];
      const errors: string[] = [];

      for (let i = 0; i < tickers.length; i += BATCH) {
        const batch = tickers.slice(i, i + BATCH);
        try {
          const res = await ingestApi.buildDailySentiment(batch, years);
          if (res.data.job_id) job_ids.push(res.data.job_id);
        } catch {
          errors.push(...batch);
        }
      }

      return { job_ids, total_batches: Math.ceil(tickers.length / BATCH), errors };
    },
    onSuccess: ({ job_ids, errors }) => {
      if (errors.length === 0) {
        toast.success(`Daily sentiment build started (${job_ids.length} job${job_ids.length !== 1 ? "s" : ""})`);
      } else {
        toast.error(`${errors.length} tickers failed to dispatch`);
      }
    },
    onError: () => toast.error("Daily sentiment build failed"),
  });
}

/**
 * Start model training. Returns job_id for polling.
 */
export function useStartTraining() {
  const qc = useQueryClient();
  return useMutation<{ job_id: number }, Error, { tickers: string[]; epochs?: number }>({
    mutationFn: async ({ tickers, epochs = 50 }) => {
      const res = await mlApi.train(tickers, epochs);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Model training started");
      qc.invalidateQueries({ queryKey: ["model"] });
    },
    onError: () => toast.error("Failed to start training"),
  });
}
