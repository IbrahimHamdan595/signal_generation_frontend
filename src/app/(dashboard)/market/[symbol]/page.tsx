"use client";

import { use, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ActionBadge } from "@/components/ui/Badge";
import CandlestickChart from "@/components/charts/CandlestickChart";
import IndicatorPanel from "@/components/charts/IndicatorPanel";
import ArticlesList from "@/components/sentiment/ArticlesList";
import { useOHLCV, useIndicators } from "@/hooks/useMarket";
import { useLatestSignal, useGenerateSignal } from "@/hooks/useSignals";
import { useSentimentSnapshot, useSentimentArticles } from "@/hooks/useSentiment";
import {
  formatPrice,
  formatPercent,
  formatNumber,
  formatRelative,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import Header from "@/components/layout/Header";

const INTERVALS = ["1d", "1h"] as const;
type Interval = (typeof INTERVALS)[number];

export default function MarketPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const ticker = symbol.toUpperCase();
  const [interval, setInterval] = useState<Interval>("1d");

  const { data: ohlcv, isLoading: loadingOHLCV } = useOHLCV(ticker, interval);
  const { data: indicators } = useIndicators(ticker, interval);
  const { data: signal } = useLatestSignal(ticker);
  const { data: snapshot } = useSentimentSnapshot(ticker);
  const { data: articles } = useSentimentArticles(ticker);
  const { mutate: generate, isPending: generating } = useGenerateSignal();

  const latestOHLCV = ohlcv?.[ohlcv.length - 1];
  const prevOHLCV = ohlcv?.[ohlcv.length - 2];
  const change = latestOHLCV && prevOHLCV
    ? ((latestOHLCV.close - prevOHLCV.close) / prevOHLCV.close)
    : null;

  return (
    <div>
      <Header />
      <div className="mt-6 space-y-5">
        {/* Ticker header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ink">{ticker}</h1>
              {signal && <ActionBadge action={signal.action} />}
            </div>
            {latestOHLCV && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-semibold text-ink">
                  {formatPrice(latestOHLCV.close)}
                </span>
                {change !== null && (
                  <span className={`text-sm font-medium flex items-center gap-1 ${change >= 0 ? "text-buy" : "text-sell"}`}>
                    {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {change >= 0 ? "+" : ""}
                    {formatPercent(change)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  interval === iv
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-muted hover:text-ink bg-surface border border-border"
                }`}
              >
                {iv}
              </button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              loading={generating}
              onClick={() => generate({ ticker, interval })}
            >
              <RefreshCw size={13} /> Generate Signal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Main chart area */}
          <div className="xl:col-span-2 space-y-4">
            {/* Candlestick */}
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
                {signal && (
                  <span className="text-xs text-muted">
                    Signal: <span className="text-ink">{formatRelative(signal.created_at)}</span>
                  </span>
                )}
              </CardHeader>
              {loadingOHLCV ? (
                <Spinner />
              ) : ohlcv && ohlcv.length > 0 ? (
                <CandlestickChart ohlcv={ohlcv} signal={signal} />
              ) : (
                <p className="text-sm text-muted text-center py-12">
                  No price data — ingest data first
                </p>
              )}
            </Card>

            {/* Indicators */}
            {indicators && indicators.length > 0 && (
              <Card>
                <div className="space-y-4">
                  <IndicatorPanel indicators={indicators} type="rsi" />
                  <div className="border-t border-border pt-4">
                    <IndicatorPanel indicators={indicators} type="macd" />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Signal detail */}
            {signal && (
              <Card glow={signal.action === "BUY" ? "buy" : signal.action === "SELL" ? "sell" : undefined}>
                <CardHeader>
                  <CardTitle>Latest Signal</CardTitle>
                  <ActionBadge action={signal.action} />
                </CardHeader>

                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Confidence</span>
                    <span className="text-ink font-semibold">{formatPercent(signal.confidence)}</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${signal.confidence * 100}%`,
                        backgroundColor:
                          signal.action === "BUY" ? "var(--buy)" : signal.action === "SELL" ? "var(--sell)" : "var(--hold)",
                      }}
                    />
                  </div>
                </div>

                {/* Probabilities */}
                {signal.probabilities && (
                  <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                    {(["buy", "hold", "sell"] as const).map((k) => (
                      <div key={k} className="bg-surface rounded-lg p-2 text-center">
                        <p className="text-muted uppercase mb-0.5">{k}</p>
                        <p className="font-bold text-ink">
                          {formatPercent(signal.probabilities![k])}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk levels */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Target size={13} /> Entry
                    </span>
                    <span className="text-ink font-medium">{formatPrice(signal.entry_price)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="flex items-center gap-1.5 text-muted">
                      <ShieldAlert size={13} /> Stop Loss
                    </span>
                    <span className="text-sell font-medium">{formatPrice(signal.stop_loss)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="flex items-center gap-1.5 text-muted">
                      <TrendingUp size={13} /> Take Profit
                    </span>
                    <span className="text-buy font-medium">{formatPrice(signal.take_profit)}</span>
                  </div>
                  {signal.bars_to_entry != null && (
                    <div className="flex justify-between items-center py-2">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Clock size={13} /> Entry in
                      </span>
                      <span className="text-ink">
                        {signal.bars_to_entry === 0 ? "Now" : `~${Math.round(signal.bars_to_entry)} bar(s)`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Sentiment */}
            {snapshot && (
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment</CardTitle>
                  <span className="text-xs capitalize"
                    style={{
                      color: snapshot.dominant_sentiment === "positive"
                        ? "var(--buy)"
                        : snapshot.dominant_sentiment === "negative"
                        ? "var(--sell)"
                        : "var(--hold)",
                    }}
                  >
                    {snapshot.dominant_sentiment}
                  </span>
                </CardHeader>

                <div className="space-y-2 text-sm mb-4">
                  {[
                    { label: "Positive", val: snapshot.avg_positive, color: "var(--buy)" },
                    { label: "Negative", val: snapshot.avg_negative, color: "var(--sell)" },
                    { label: "Neutral", val: snapshot.avg_neutral, color: "var(--hold)" },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">{label}</span>
                        <span className="text-ink">{formatPercent(val)}</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${val * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">{snapshot.article_count} articles analysed</p>
              </Card>
            )}

            {/* News */}
            {articles && articles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>News</CardTitle>
                  <Newspaper size={14} className="text-muted" />
                </CardHeader>
                <ArticlesList articles={articles} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
