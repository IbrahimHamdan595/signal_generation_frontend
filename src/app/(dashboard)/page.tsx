"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ActionBadge } from "@/components/ui/Badge";
import SignalCard from "@/components/signals/SignalCard";
import SentimentBar from "@/components/sentiment/SentimentBar";
import { useAllSignals } from "@/hooks/useSignals";
import { useModelStatus } from "@/hooks/useModel";
import { useSentimentSummaries } from "@/hooks/useSentiment";
import { formatPercent, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Brain, Activity } from "lucide-react";
import Header from "@/components/layout/Header";

export default function DashboardPage() {
  const { data: signals, isLoading: loadingSignals } = useAllSignals();
  const { data: status } = useModelStatus();
  const { data: sentiments, isLoading: loadingSentiment } = useSentimentSummaries();

  const buyCount = signals?.filter((s) => s.action === "BUY").length ?? 0;
  const sellCount = signals?.filter((s) => s.action === "SELL").length ?? 0;
  const holdCount = signals?.filter((s) => s.action === "HOLD").length ?? 0;
  const total = signals?.length ?? 0;

  const topSignals = signals
    ?.filter((s) => s.action !== "HOLD")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  return (
    <div>
      <Header title="Dashboard" />
      <div className="mt-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow="buy">
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Buy Signals</CardTitle>
              <TrendingUp size={16} className="text-buy" />
            </div>
            <p className="text-3xl font-bold text-buy">{buyCount}</p>
            <p className="text-xs text-muted mt-1">
              {total > 0 ? formatPercent(buyCount / total) : "—"} of total
            </p>
          </Card>

          <Card glow="sell">
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Sell Signals</CardTitle>
              <TrendingDown size={16} className="text-sell" />
            </div>
            <p className="text-3xl font-bold text-sell">{sellCount}</p>
            <p className="text-xs text-muted mt-1">
              {total > 0 ? formatPercent(sellCount / total) : "—"} of total
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Hold Signals</CardTitle>
              <Minus size={16} className="text-hold" />
            </div>
            <p className="text-3xl font-bold text-hold">{holdCount}</p>
            <p className="text-xs text-muted mt-1">{total} total tickers</p>
          </Card>

          <Card glow="accent">
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Model Accuracy</CardTitle>
              <Brain size={16} className="text-accent" />
            </div>
            {status?.trained ? (
              <>
                <p className="text-3xl font-bold text-accent">
                  {status.info.test_accuracy
                    ? formatPercent(status.info.test_accuracy)
                    : "—"}
                </p>
                <p className="text-xs text-muted mt-1">
                  F1: {formatNumber(status.info.test_f1_weighted)} · Epoch{" "}
                  {status.info.epoch}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted mt-2">Not trained</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top signals */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Signals</CardTitle>
                <span className="text-xs text-muted">by confidence</span>
              </CardHeader>
              {loadingSignals ? (
                <Spinner />
              ) : topSignals && topSignals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topSignals.map((s) => (
                    <SignalCard key={s.id} signal={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-8">
                  No signals yet — generate signals from the Signals page
                </p>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Model health */}
            <Card glow={status?.trained ? "accent" : undefined}>
              <CardHeader>
                <CardTitle>Model Health</CardTitle>
                <Activity size={14} className="text-muted" />
              </CardHeader>
              {status?.trained ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Status</span>
                    <span className="text-buy font-medium">Trained</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Sharpe</span>
                    <span className={
                      (status.info.sharpe_ratio ?? 0) > 0 ? "text-buy" : "text-sell"
                    }>
                      {formatNumber(status.info.sharpe_ratio)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Val Loss</span>
                    <span className="text-ink">{formatNumber(status.info.val_loss, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Val Acc</span>
                    <span className="text-ink">{formatPercent(status.info.val_acc)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Model not trained yet</p>
              )}
            </Card>

            {/* Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle>Market Sentiment</CardTitle>
              </CardHeader>
              {loadingSentiment ? (
                <Spinner />
              ) : sentiments && sentiments.length > 0 ? (
                <div className="space-y-3">
                  {sentiments.slice(0, 8).map((s) => (
                    <SentimentBar key={s.ticker} summary={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-4">No sentiment data</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
