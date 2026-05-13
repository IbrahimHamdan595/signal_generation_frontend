"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  useLiveEdgeSummary,
  useLiveEdgeDaily,
  useLiveEdgeCalibration,
  useLiveEdgeSlippage,
} from "@/hooks/useLiveEdge";
import { formatNumber } from "@/lib/utils";
import { Activity, Target, Zap, BarChart2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "yellow" | "default";
}) {
  const colorClass =
    color === "green"
      ? "text-buy"
      : color === "red"
      ? "text-sell"
      : color === "yellow"
      ? "text-amber-400"
      : "text-ink";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

function CalibrationBar({ conf, winRate }: { conf: number; winRate: number }) {
  const gap = conf - winRate;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-right text-xs text-muted">
        {(conf * 100).toFixed(0)}% conf
      </div>
      <div className="flex-1 relative h-5 bg-surface rounded overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-accent/30 rounded"
          style={{ width: `${conf * 100}%` }}
        />
        <div
          className="absolute left-0 top-0 h-full bg-buy/60 rounded"
          style={{ width: `${winRate * 100}%` }}
        />
      </div>
      <div className="w-28 text-xs text-muted">
        {(winRate * 100).toFixed(0)}% actual
        <span
          className={`ml-1 font-medium ${
            gap > 0.05 ? "text-sell" : gap < -0.02 ? "text-buy" : "text-muted"
          }`}
        >
          ({gap > 0 ? "+" : ""}
          {(gap * 100).toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

const DAY_OPTIONS = [7, 14, 30, 90];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveEdgePage() {
  const [days, setDays] = useState(30);

  const { data: summary, isLoading: loadingSummary } = useLiveEdgeSummary(days);
  const { data: daily = [], isLoading: loadingDaily } = useLiveEdgeDaily(days);
  const { data: calibration = [] } = useLiveEdgeCalibration();
  const { data: slippage } = useLiveEdgeSlippage();

  // Treat undefined summary (auth error, network failure, etc.) as no-data
  // so the page doesn't crash dereferencing summary! later.
  const noData = !summary || summary.no_data || summary.total_trades === 0;

  return (
    <div>
      <Header title="Live Edge" />
      <div className="mt-6 space-y-5">

        {/* Day selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Period:</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                days === d
                  ? "bg-accent/20 text-accent border-accent/30"
                  : "text-muted border-border hover:text-ink hover:bg-surface"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Summary */}
        <Card glow="accent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-muted" />
              <CardTitle>Performance Summary</CardTitle>
            </div>
          </CardHeader>

          {loadingSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : noData ? (
            <p className="text-sm text-muted text-center py-8">
              No closed trades in the last {days} days. Trades will appear here once
              positions are opened and closed via auto-execution.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
              <Stat label="Total Trades" value={String(summary!.total_trades)} />
              <Stat
                label="Actual Win Rate"
                value={`${(summary!.actual_win_rate * 100).toFixed(1)}%`}
                sub={`${summary!.wins}W / ${summary!.losses}L`}
                color={summary!.actual_win_rate >= 0.5 ? "green" : "red"}
              />
              <Stat
                label="Avg Predicted Conf"
                value={`${(summary!.avg_predicted_conf * 100).toFixed(1)}%`}
              />
              <Stat
                label="Calibration Gap"
                value={`${summary!.calibration_gap > 0 ? "+" : ""}${(summary!.calibration_gap * 100).toFixed(1)}%`}
                sub="conf − actual win rate"
                color={
                  Math.abs(summary!.calibration_gap) < 0.05
                    ? "green"
                    : summary!.calibration_gap > 0.1
                    ? "red"
                    : "yellow"
                }
              />
              <Stat
                label="Realized P&L"
                value={`$${formatNumber(summary!.realized_pnl, 2)}`}
                color={summary!.realized_pnl >= 0 ? "green" : "red"}
              />
              <Stat
                label="Avg P&L / Trade"
                value={`$${formatNumber(summary!.avg_pnl, 2)}`}
                color={summary!.avg_pnl >= 0 ? "green" : "red"}
              />
              <Stat
                label="Avg Slippage"
                value={`${summary!.avg_slippage_pct.toFixed(3)}%`}
                color={
                  summary!.avg_slippage_pct < 0.1
                    ? "green"
                    : summary!.avg_slippage_pct > 0.3
                    ? "red"
                    : "yellow"
                }
              />
            </div>
          )}
        </Card>

        {/* Calibration + Slippage row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Calibration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target size={15} className="text-muted" />
                <CardTitle>Model Calibration</CardTitle>
              </div>
            </CardHeader>
            <p className="text-xs text-muted mt-1 mb-4">
              Blue = actual win rate. Purple = predicted confidence. Gap should be near 0.
            </p>
            {calibration.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-3">
                {calibration.map((b) => (
                  <CalibrationBar
                    key={b.bucket}
                    conf={b.avg_confidence}
                    winRate={b.actual_win_rate}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Slippage */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-muted" />
                <CardTitle>Fill Slippage</CardTitle>
              </div>
            </CardHeader>
            <p className="text-xs text-muted mt-1 mb-4">
              Distance between signal entry price and actual fill price. Under 0.2% is healthy.
            </p>
            {!slippage || slippage.no_data ? (
              <p className="text-sm text-muted text-center py-6">No filled orders yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Average"
                  value={`${slippage.avg_pct.toFixed(3)}%`}
                  color={slippage.avg_pct < 0.2 ? "green" : "red"}
                />
                <Stat label="Median (p50)" value={`${slippage.p50_pct.toFixed(3)}%`} />
                <Stat
                  label="p95"
                  value={`${slippage.p95_pct.toFixed(3)}%`}
                  color={slippage.p95_pct > 0.5 ? "red" : "default"}
                />
                <Stat
                  label="Worst"
                  value={`${slippage.worst_pct.toFixed(3)}%`}
                  color={slippage.worst_pct > 1 ? "red" : "default"}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Daily breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-muted" />
              <CardTitle>Daily Breakdown</CardTitle>
            </div>
          </CardHeader>

          {loadingDaily ? (
            <div className="space-y-2 mt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : daily.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No data for this period</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-right py-2 pr-4">Trades</th>
                    <th className="text-right py-2 pr-4">P&L</th>
                    <th className="text-right py-2 pr-4">Win Rate</th>
                    <th className="text-right py-2 pr-4">Avg Conf</th>
                    <th className="text-right py-2">Slippage</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr
                      key={row.day}
                      className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                    >
                      <td className="py-2.5 pr-4 text-ink font-medium">{row.day}</td>
                      <td className="text-right py-2.5 pr-4 text-ink">{row.trades}</td>
                      <td className="text-right py-2.5 pr-4">
                        <span className={row.pnl >= 0 ? "text-buy" : "text-sell"}>
                          {row.pnl >= 0 ? "+" : ""}${formatNumber(row.pnl, 2)}
                        </span>
                      </td>
                      <td className="text-right py-2.5 pr-4">
                        <span
                          className={
                            row.win_rate >= 0.5
                              ? "text-buy"
                              : row.win_rate < 0.4
                              ? "text-sell"
                              : "text-amber-400"
                          }
                        >
                          {(row.win_rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-right py-2.5 pr-4 text-muted">
                        {(row.avg_conf * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-2.5 text-muted">
                        {row.slippage_pct.toFixed(3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
