"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { reportsApi, type PipelineSource, type StrategyComparison, type StrategyTrade } from "@/lib/api";
import { GitCompare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "1y",   days: 365 },
  { label: "All",  days: 3650 },
];

// Distinct colours per source — sit on the existing palette
const SOURCE_COLOR: Record<string, string> = {
  ml_equities:   "#7dd3fc",   // sky blue
  ml_fx:         "#86efac",   // mint green
  rule_donchian: "#fbbf24",   // amber
};

function fmtMoney(v: number): string {
  const sign = v >= 0 ? "+" : "-";
  const abs  = Math.abs(v);
  return `${sign}$${abs.toFixed(2)}`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

// Highlight the best column-value per metric (green) and worst (red).
function bestColor(values: number[], my: number, biggerIsBetter = true): string {
  if (values.length < 2) return "text-ink";
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return "text-ink";
  const isBest  = biggerIsBetter ? my === max : my === min;
  const isWorst = biggerIsBetter ? my === min : my === max;
  if (isBest)  return "text-buy  font-semibold";
  if (isWorst) return "text-sell font-semibold";
  return "text-ink";
}

function outcomeBadge(outcome: "win" | "loss" | "flat") {
  if (outcome === "win") {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-buy/10 text-buy border border-buy/20">
      <TrendingUp size={10} /> win
    </span>;
  }
  if (outcome === "loss") {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sell/10 text-sell border border-sell/20">
      <TrendingDown size={10} /> loss
    </span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-hold/10 text-hold border border-hold/20">
    <Minus size={10} /> flat
  </span>;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString();
  }, [rangeDays]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["strategy-comparison", since],
    queryFn: async () => (await reportsApi.comparison(since)).data,
    refetchInterval: 60_000,
  });

  const [expanded, setExpanded] = useState<PipelineSource | null>(null);

  // Build a merged equity-curve dataset for the chart, indexing by timestamp.
  // Each source contributes its own column; missing values forward-fill in the chart.
  const chartData = useMemo(() => {
    if (!data) return [];
    type Row = Record<string, number | string | null>;
    const all: Record<string, Row> = {};

    for (const src of data.sources) {
      const key = src.source;
      for (const pt of src.equity_curve) {
        if (!pt.timestamp) continue;
        const ts = pt.timestamp;
        if (!all[ts]) all[ts] = { timestamp: ts };
        all[ts][key] = pt.cum_pnl_adj;
      }
    }

    // Sort chronologically and forward-fill each source's last known value
    const sorted = Object.values(all).sort((a, b) =>
      String(a.timestamp).localeCompare(String(b.timestamp))
    );
    const sources = data.sources.map((s) => s.source);
    const lastVal: Record<string, number> = {};
    for (const row of sorted) {
      for (const s of sources) {
        if (typeof row[s] === "number") lastVal[s] = row[s] as number;
        else if (lastVal[s] !== undefined) row[s] = lastVal[s];
        else row[s] = 0;   // before this source's first trade
      }
    }
    return sorted;
  }, [data]);

  return (
    <div>
      <Header title="Strategy Comparison" />

      <div className="mt-6 space-y-5">
        {/* Intro + range picker */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20">
                <GitCompare size={18} className="text-accent" />
              </div>
              <div>
                <CardTitle>Three-strategy head-to-head</CardTitle>
                <p className="text-xs text-muted mt-1">
                  Real PnL per strategy, raw and net of broker spreads.
                  Source: <code className="text-ink bg-surface px-1 rounded">trade_executions</code> joined to <code className="text-ink bg-surface px-1 rounded">signals</code>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRangeDays(r.days)}
                  className={`text-xs px-3 py-1 rounded ${
                    rangeDays === r.days
                      ? "bg-accent/20 text-accent"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Loading / error */}
        {isLoading && (
          <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
        )}
        {error && (
          <Card><p className="text-sm text-sell">Could not load comparison data.</p></Card>
        )}

        {!isLoading && data && (
          <>
            {/* Metrics table */}
            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
                <span className="text-xs text-muted">
                  since {new Date(data.since).toLocaleDateString()}
                </span>
              </CardHeader>

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-border text-muted">
                      <th className="py-2 px-3 font-medium">Strategy</th>
                      <th className="py-2 px-3 font-medium text-right">Trades</th>
                      <th className="py-2 px-3 font-medium text-right">Win rate</th>
                      <th className="py-2 px-3 font-medium text-right">Total PnL (raw)</th>
                      <th className="py-2 px-3 font-medium text-right">Total PnL (adj)</th>
                      <th className="py-2 px-3 font-medium text-right">Avg / trade</th>
                      <th className="py-2 px-3 font-medium text-right">Sharpe</th>
                      <th className="py-2 px-3 font-medium text-right">Max DD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.sources.map((s) => {
                      // For best/worst highlighting, only compare across sources WITH trades
                      const peers = data.sources.filter((x) => x.total_trades > 0);
                      const adjs    = peers.map((x) => x.total_pnl_usd_adj);
                      const wrs     = peers.map((x) => x.win_rate);
                      const shps    = peers.map((x) => x.sharpe_per_trade);
                      const dds     = peers.map((x) => x.max_drawdown_pct);

                      const isOpen = expanded === (s.source as PipelineSource);
                      const canExpand = s.total_trades > 0;
                      return (
                        <Fragment key={s.source}>
                          <tr
                            className={`${canExpand ? "hover:bg-surface/50 cursor-pointer" : ""} transition-colors`}
                            onClick={() => canExpand && setExpanded(isOpen ? null : (s.source as PipelineSource))}
                          >
                            <td className="py-3 px-3 font-medium">
                              <span className="flex items-center gap-2">
                                {canExpand ? (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span className="w-3" />}
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: SOURCE_COLOR[s.source] ?? "#888" }}
                                />
                                {s.display_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-ink">{s.total_trades}</td>
                            <td className={`py-3 px-3 text-right ${bestColor(wrs, s.win_rate)}`}>
                              {s.total_trades > 0 ? pct(s.win_rate) : "—"}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono ${s.total_pnl_usd >= 0 ? "text-buy" : "text-sell"}`}>
                              {fmtMoney(s.total_pnl_usd)}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono ${bestColor(adjs, s.total_pnl_usd_adj)}`}>
                              {fmtMoney(s.total_pnl_usd_adj)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-ink">
                              {s.total_trades > 0 ? fmtMoney(s.avg_pnl_per_trade) : "—"}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono ${bestColor(shps, s.sharpe_per_trade)}`}>
                              {s.total_trades > 0 ? s.sharpe_per_trade.toFixed(3) : "—"}
                            </td>
                            <td className={`py-3 px-3 text-right font-mono ${bestColor(dds, s.max_drawdown_pct, false)}`}>
                              {s.total_trades > 0 ? `${s.max_drawdown_pct.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={8} className="bg-surface/30 px-4 py-3">
                                <TradeDrilldown source={s.source as PipelineSource} since={data.since} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted mt-3">
                Adjusted PnL applies per-asset-class round-trip costs:
                {" "}equity {data.cost_model.equity}bps,
                {" "}fx_major {data.cost_model.fx_major}bps,
                {" "}fx_metal {data.cost_model.fx_metal}bps.
                Click a row to expand per-trade details.
              </p>
            </Card>

            {/* Cumulative PnL chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cumulative PnL — cost-adjusted</CardTitle>
                <span className="text-xs text-muted">
                  {chartData.length} closed-trade events
                </span>
              </CardHeader>

              {chartData.length === 0 ? (
                <p className="text-sm text-muted text-center py-12">
                  No closed trades in this range yet.
                  Trades from <a href="/strategies" className="text-accent hover:underline">/strategies</a> will appear here once they close.
                </p>
              ) : (
                <div className="h-72 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(v) => new Date(v as string | number).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${Number(v ?? 0).toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "#1c1f29", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                        labelFormatter={(v) => new Date(v as string | number).toLocaleString()}
                        formatter={(value, name) => {
                          // Recharts v3 widened ValueType to include undefined and arrays;
                          // coerce defensively so the tooltip never renders NaN.
                          const num = typeof value === "number" ? value : Number(value ?? 0);
                          const key = String(name ?? "");
                          const label = data.sources.find((s) => s.source === key)?.display_name ?? key;
                          return [fmtMoney(num), label];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value) => {
                          const key = String(value ?? "");
                          return data.sources.find((s) => s.source === key)?.display_name ?? key;
                        }}
                      />
                      {data.sources.map((s) => (
                        <Line
                          key={s.source}
                          type="monotone"
                          dataKey={s.source}
                          stroke={SOURCE_COLOR[s.source] ?? "#888"}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── per-trade drill-down ────────────────────────────────────────────────────

function TradeDrilldown({ source, since }: { source: PipelineSource; since: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["strategy-trades", source, since],
    queryFn: async () => (await reportsApi.trades(source, since)).data,
  });

  if (isLoading) {
    return <p className="text-xs text-muted py-2">Loading trades...</p>;
  }
  if (!data || data.trades.length === 0) {
    return <p className="text-xs text-muted py-2">No trades in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted mb-2">{data.count} trades</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted border-b border-border">
            <th className="py-2 px-2 font-medium">Closed</th>
            <th className="py-2 px-2 font-medium">Ticker</th>
            <th className="py-2 px-2 font-medium">Side</th>
            <th className="py-2 px-2 font-medium text-right">Fill</th>
            <th className="py-2 px-2 font-medium text-right">PnL raw</th>
            <th className="py-2 px-2 font-medium text-right">PnL adj</th>
            <th className="py-2 px-2 font-medium text-right">Cost</th>
            <th className="py-2 px-2 font-medium text-right">Conf</th>
            <th className="py-2 px-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.trades.slice(0, 50).map((t: StrategyTrade) => (
            <tr key={t.id} className="hover:bg-surface/30">
              <td className="py-2 px-2 text-muted">
                {t.closed_at ? new Date(t.closed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
              </td>
              <td className="py-2 px-2 font-mono text-ink">{t.ticker}</td>
              <td className={`py-2 px-2 ${t.action === "BUY" ? "text-buy" : t.action === "SELL" ? "text-sell" : "text-hold"}`}>
                {t.action}
              </td>
              <td className="py-2 px-2 text-right font-mono">{t.fill_price.toFixed(4)}</td>
              <td className={`py-2 px-2 text-right font-mono ${t.pnl_raw_usd >= 0 ? "text-buy" : "text-sell"}`}>
                {fmtMoney(t.pnl_raw_usd)}
              </td>
              <td className={`py-2 px-2 text-right font-mono ${t.pnl_adj_usd >= 0 ? "text-buy" : "text-sell"}`}>
                {fmtMoney(t.pnl_adj_usd)}
              </td>
              <td className="py-2 px-2 text-right font-mono text-muted">${t.cost_usd.toFixed(2)}</td>
              <td className="py-2 px-2 text-right font-mono text-muted">
                {t.confidence != null ? t.confidence.toFixed(2) : "—"}
              </td>
              <td className="py-2 px-2">{outcomeBadge(t.outcome)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.trades.length > 50 && (
        <p className="text-[10px] text-muted text-center mt-2">
          Showing first 50 of {data.trades.length}
        </p>
      )}
    </div>
  );
}
