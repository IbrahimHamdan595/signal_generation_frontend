"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import ConfusionMatrix from "@/components/model/ConfusionMatrix";
import { useModelStatus, useEvalReport, useTrainModel } from "@/hooks/useModel";
import { formatPercent, formatNumber } from "@/lib/utils";
import { Brain, Zap, TrendingUp, Target, Activity } from "lucide-react";
import Header from "@/components/layout/Header";

const REGRESSION_LABELS: Record<string, string> = {
  entry_price: "Entry Price",
  stop_loss: "Stop Loss",
  take_profit: "Take Profit",
  net_profit: "Net Profit",
};

export default function ModelPage() {
  const { data: status, isLoading: loadingStatus } = useModelStatus();
  const { data: report, isLoading: loadingReport } = useEvalReport();
  const { mutate: train, isPending: training } = useTrainModel();
  const [tickerInput, setTickerInput] = useState("");

  function handleTrain() {
    const tickers = tickerInput
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length < 2) return;
    train({ tickers });
  }

  return (
    <div>
      <Header title="Model" />
      <div className="mt-6 space-y-5">
        {/* Status cards */}
        {loadingStatus ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card glow={status?.trained ? "accent" : undefined}>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Status</CardTitle>
                <Brain size={16} className={status?.trained ? "text-buy" : "text-muted"} />
              </div>
              <p className={`text-lg font-bold ${status?.trained ? "text-buy" : "text-muted"}`}>
                {status?.trained ? "Trained" : "Untrained"}
              </p>
              {status?.info.epoch && (
                <p className="text-xs text-muted mt-1">Epoch {status.info.epoch}</p>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Test Accuracy</CardTitle>
                <Activity size={16} className="text-accent" />
              </div>
              <p className="text-2xl font-bold text-ink">
                {report ? formatPercent(report.accuracy) : "—"}
              </p>
              <p className="text-xs text-muted mt-1">
                F1 weighted: {report ? formatNumber(report.f1_weighted) : "—"}
              </p>
            </Card>

            <Card glow={report && report.trading.sharpe_ratio > 0 ? "buy" : "sell"}>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Sharpe Ratio</CardTitle>
                <TrendingUp size={16} className="text-muted" />
              </div>
              <p className={`text-2xl font-bold ${
                report && report.trading.sharpe_ratio > 0 ? "text-buy" : "text-sell"
              }`}>
                {report ? formatNumber(report.trading.sharpe_ratio) : "—"}
              </p>
              <p className="text-xs text-muted mt-1">Annualised</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Win Rate</CardTitle>
                <Target size={16} className="text-hold" />
              </div>
              <p className="text-2xl font-bold text-hold">
                {report ? formatPercent(report.trading.win_rate) : "—"}
              </p>
              <p className="text-xs text-muted mt-1">
                {report?.trading.total_trades ?? 0} trades simulated
              </p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Confusion matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Classification Report</CardTitle>
            </CardHeader>
            {loadingReport ? (
              <Spinner />
            ) : report ? (
              <div className="space-y-5">
                <ConfusionMatrix matrix={report.confusion_matrix} />
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted mb-3">Per-class Metrics</p>
                  <div className="space-y-2">
                    {["0", "1", "2"].map((cls) => {
                      const label = cls === "0" ? "Hold" : cls === "1" ? "Buy" : "Sell";
                      const metrics = report.classification_report[cls];
                      if (!metrics) return null;
                      return (
                        <div key={cls} className="flex items-center gap-4 text-xs">
                          <span className="text-muted w-8">{label}</span>
                          <span className="text-muted">P:</span>
                          <span className="text-ink w-12">{formatPercent(metrics.precision)}</span>
                          <span className="text-muted">R:</span>
                          <span className="text-ink w-12">{formatPercent(metrics.recall)}</span>
                          <span className="text-muted">F1:</span>
                          <span className="text-ink">{formatNumber(metrics["f1-score"])}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">No report — train first</p>
            )}
          </Card>

          {/* Regression metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Regression Metrics</CardTitle>
            </CardHeader>
            {loadingReport ? (
              <Spinner />
            ) : report ? (
              <div className="space-y-3">
                {Object.entries(REGRESSION_LABELS).map(([key, label]) => {
                  const m = report.regression[key];
                  if (!m) return null;
                  return (
                    <div key={key} className="bg-surface rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-ink font-medium">{label}</span>
                      </div>
                      <div className="flex gap-6 text-xs">
                        <div>
                          <p className="text-muted mb-0.5">RMSE</p>
                          <p className="text-ink font-semibold">{formatNumber(m.rmse, 3)}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-0.5">MAE</p>
                          <p className="text-ink font-semibold">{formatNumber(m.mae, 3)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">No report — train first</p>
            )}
          </Card>

          {/* Trading simulation */}
          {report && (
            <Card>
              <CardHeader>
                <CardTitle>Trading Simulation</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Avg Return / Trade</p>
                  <p className={`text-lg font-bold ${report.trading.avg_return >= 0 ? "text-buy" : "text-sell"}`}>
                    {report.trading.avg_return >= 0 ? "+" : ""}
                    {formatPercent(report.trading.avg_return)}
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Total Trades</p>
                  <p className="text-lg font-bold text-ink">{report.trading.total_trades}</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Win Rate</p>
                  <p className="text-lg font-bold text-hold">{formatPercent(report.trading.win_rate)}</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Sharpe (annualised)</p>
                  <p className={`text-lg font-bold ${report.trading.sharpe_ratio >= 0 ? "text-buy" : "text-sell"}`}>
                    {formatNumber(report.trading.sharpe_ratio)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Train trigger */}
          <Card glow="accent">
            <CardHeader>
              <CardTitle>Trigger Training</CardTitle>
              <Zap size={14} className="text-accent" />
            </CardHeader>
            <p className="text-xs text-muted mb-3">
              Provide comma-separated tickers (min 2). Training runs in background.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                placeholder="AAPL, MSFT, GOOGL, AMZN…"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
              <Button
                onClick={handleTrain}
                loading={training}
                disabled={tickerInput.split(",").filter((t) => t.trim()).length < 2}
                className="w-full justify-center"
              >
                Start Training
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
