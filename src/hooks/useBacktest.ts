"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { backtestApi } from "@/lib/api";
import type { BacktestResult } from "@/types";
import toast from "react-hot-toast";

export function useBacktest() {
  const [result, setResult] = useState<BacktestResult | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      ticker,
      interval,
      initialCapital,
    }: {
      ticker: string;
      interval?: string;
      initialCapital?: number;
    }) => backtestApi.run(ticker, interval, initialCapital),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success(`Backtest complete for ${res.data.ticker}`);
    },
    onError: () => toast.error("Backtest failed"),
  });

  return { ...mutation, result };
}

export function usePortfolioBacktest() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      tickers,
      interval,
      initialCapital,
    }: {
      tickers: string[];
      interval?: string;
      initialCapital?: number;
    }) => backtestApi.runPortfolio(tickers, interval, initialCapital),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success("Portfolio backtest complete");
    },
    onError: () => toast.error("Portfolio backtest failed"),
  });

  return { ...mutation, result };
}
