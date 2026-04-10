"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ConfusionMatrix from "@/components/model/ConfusionMatrix";
import {
  useModelStatus,
  useEvalReport,
  useTrainModel,
  useModelVersions,
  useRollbackModel,
  useWalkForwardResult,
  useRunWalkForward,
  useLastTrainResult,
} from "@/hooks/useModel";
import { useJobStatus } from "@/hooks/useJobStatus";
import { formatPercent, formatNumber, formatRelative } from "@/lib/utils";
import { Brain, Zap, TrendingUp, Target, Activity, RotateCcw, GitBranch, BarChart2, ClipboardList, Loader2 } from "lucide-react";
import Link from "next/link";
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
  const { data: versions, isLoading: loadingVersions } = useModelVersions();
  const { data: wfResult } = useWalkForwardResult();
  const { data: lastResult } = useLastTrainResult();
  const { mutate: train, isPending: training } = useTrainModel();
  const { mutate: rollback, isPending: rollingBack } = useRollbackModel();
  const { mutate: runWF, isPending: runningWF } = useRunWalkForward();

  const [tickerInput, setTickerInput] = useState("");
  const [wfTickerInput, setWfTickerInput] = useState("");
  const [wfSplits, setWfSplits] = useState(5);
  const [trainJobId, setTrainJobId] = useState<number | null>(null);
  const { data: trainJob } = useJobStatus(trainJobId);

  function handleTrain() {
    const tickers = tickerInput.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) return;
    train({ tickers }, { onSuccess: (data) => setTrainJobId(data.job_id) });
  }

  function handleWalkForward() {
    const tickers = wfTickerInput.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) return;
    runWF({ tickers, n_splits: wfSplits });
  }

  return (
    <div>
      <Header title="Model" />
      <div className="mt-6 space-y-5">

        {/* Status cards */}
        {loadingStatus ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface animate-pulse rounded-xl" />
            ))}
          </div>
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
              <p className={`text-2xl font-bold ${report && report.trading.sharpe_ratio > 0 ? "text-buy" : "text-sell"}`}>
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
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-surface animate-pulse rounded-lg" />)}</div>
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
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-surface animate-pulse rounded-lg" />)}</div>
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
              <Link
                href="/model/backtest"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface hover:bg-border text-muted hover:text-ink border border-border transition-colors"
              >
                <BarChart2 size={14} /> Open Backtester
              </Link>
            </div>
          </Card>
        </div>

        {/* Walk-forward validation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Walk-Forward Validation</CardTitle>
              <BarChart2 size={14} className="text-accent" />
            </CardHeader>
            <p className="text-xs text-muted mb-4">
              Expanding-window validation across multiple time folds. Tests the model on each market regime it was never trained on.
            </p>
            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={wfTickerInput}
                onChange={(e) => setWfTickerInput(e.target.value)}
                placeholder="AAPL, MSFT, GOOGL…"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted whitespace-nowrap">Folds</span>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={wfSplits}
                  onChange={(e) => setWfSplits(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs text-ink w-4">{wfSplits}</span>
              </div>
              <Button
                onClick={handleWalkForward}
                loading={runningWF}
                variant="secondary"
                disabled={wfTickerInput.split(",").filter((t) => t.trim()).length < 2}
                className="w-full justify-center"
              >
                Run Walk-Forward
              </Button>
            </div>

            {wfResult && (
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs text-muted font-medium uppercase tracking-wide">Last Result — {wfResult.summary.n_folds} folds</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Avg Accuracy", val: formatPercent(wfResult.summary.avg_accuracy) },
                    { label: "Avg F1", val: formatNumber(wfResult.summary.avg_f1) },
                    { label: "Avg Sharpe", val: formatNumber(wfResult.summary.avg_sharpe) },
                    { label: "Sharpe Std", val: `±${formatNumber(wfResult.summary.std_sharpe)}` },
                    { label: "Avg Win Rate", val: formatPercent(wfResult.summary.avg_win_rate) },
                    { label: "Avg Max DD", val: formatPercent(wfResult.summary.avg_max_dd) },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-surface rounded-lg p-2">
                      <p className="text-muted mb-0.5">{label}</p>
                      <p className="text-ink font-semibold">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Per-fold table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="text-left py-1.5 pr-3">Fold</th>
                        <th className="text-right py-1.5 pr-3">Acc</th>
                        <th className="text-right py-1.5 pr-3">F1</th>
                        <th className="text-right py-1.5 pr-3">Sharpe</th>
                        <th className="text-right py-1.5">Win%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wfResult.folds.map((fold) => (
                        <tr key={fold.fold} className="border-b border-border/50 hover:bg-surface/50">
                          <td className="py-1.5 pr-3 text-muted">#{fold.fold}</td>
                          <td className="text-right py-1.5 pr-3 text-ink">{formatPercent(fold.accuracy)}</td>
                          <td className="text-right py-1.5 pr-3 text-ink">{formatNumber(fold.f1_weighted)}</td>
                          <td className={`text-right py-1.5 pr-3 font-medium ${fold.sharpe >= 0 ? "text-buy" : "text-sell"}`}>
                            {formatNumber(fold.sharpe)}
                          </td>
                          <td className="text-right py-1.5 text-hold">{formatPercent(fold.win_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Last Training Result */}
          <Card>
            <CardHeader>
              <CardTitle>Last Training Run</CardTitle>
              <ClipboardList size={14} className="text-muted" />
            </CardHeader>
            {!lastResult ? (
              <p className="text-sm text-muted text-center py-8">No training run yet</p>
            ) : lastResult.status === "running" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-hold">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Training in progress…</span>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-hold rounded-full animate-pulse w-2/3" />
                </div>
                {trainJob && (
                  <div className="text-xs text-muted space-y-1">
                    {trainJob.status === "running" && (
                      <p>Job #{trainJob.id} — polling every 3s</p>
                    )}
                    {trainJob.status === "completed" && (
                      <p className="text-buy">Job #{trainJob.id} completed</p>
                    )}
                    {trainJob.status === "failed" && (
                      <p className="text-sell">Job #{trainJob.id} failed: {trainJob.error}</p>
                    )}
                  </div>
                )}
                {!trainJob && (
                  <p className="text-xs text-muted">
                    Refreshing automatically every 10s — results will appear when done.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Status badge */}
                {typeof lastResult.status === "string" && (
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        lastResult.status === "completed"
                          ? "text-buy border-buy/30 bg-buy/10"
                          : lastResult.status === "running"
                          ? "text-hold border-hold/30 bg-hold/10"
                          : "text-muted border-border bg-surface"
                      }`}
                    >
                      {String(lastResult.status).toUpperCase()}
                    </span>
                    {typeof lastResult.started_at === "string" && (
                      <span className="text-xs text-muted">{formatRelative(lastResult.started_at)}</span>
                    )}
                  </div>
                )}
                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Best Val Loss",  key: "best_val_loss",  fmt: (v: unknown) => formatNumber(Number(v), 4) },
                    { label: "Val Accuracy",   key: "val_acc",        fmt: (v: unknown) => formatPercent(Number(v)) },
                    { label: "Epoch",          key: "epoch",          fmt: (v: unknown) => String(v) },
                    { label: "Tickers",        key: "n_tickers",      fmt: (v: unknown) => String(v) },
                    { label: "Train Samples",  key: "n_train",        fmt: (v: unknown) => Number(v).toLocaleString() },
                    { label: "Val Samples",    key: "n_val",          fmt: (v: unknown) => Number(v).toLocaleString() },
                  ].map(({ label, key, fmt }) =>
                    lastResult[key] != null ? (
                      <div key={key} className="bg-surface rounded-lg p-2">
                        <p className="text-muted mb-0.5">{label}</p>
                        <p className="text-ink font-semibold">{fmt(lastResult[key])}</p>
                      </div>
                    ) : null
                  )}
                </div>
                {/* Tickers list */}
                {Array.isArray(lastResult.tickers) && lastResult.tickers.length > 0 && (
                  <div className="bg-surface rounded-lg p-2 mt-1">
                    <p className="text-muted text-xs mb-1">Trained on</p>
                    <p className="text-ink text-xs font-mono leading-relaxed">
                      {(lastResult.tickers as string[]).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Model Versions */}
          <Card>
            <CardHeader>
              <CardTitle>Model Versions</CardTitle>
              <GitBranch size={14} className="text-muted" />
            </CardHeader>
            {loadingVersions ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-surface animate-pulse rounded-lg" />)}</div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {versions.map((v) => (
                  <div
                    key={v.version}
                    className={`rounded-lg p-3 border transition-colors ${
                      v.is_best
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-ink font-mono truncate">{v.version}</span>
                          {v.is_best && (
                            <span className="text-xs text-accent border border-accent/30 rounded px-1 shrink-0">best</span>
                          )}
                        </div>
                        <div className="flex gap-3 text-xs text-muted">
                          <span>loss {formatNumber(v.val_loss, 4)}</span>
                          {v.sharpe != null && <span>sharpe {formatNumber(v.sharpe)}</span>}
                          {v.accuracy != null && <span>acc {formatPercent(v.accuracy)}</span>}
                          <span>{formatRelative(v.created_at)}</span>
                        </div>
                      </div>
                      {!v.is_best && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={rollingBack}
                          onClick={() => rollback(v.version)}
                          className="shrink-0"
                        >
                          <RotateCcw size={11} /> Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">No versions yet — train first</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
