"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useBacktest } from "@/hooks/useBacktest";
import type { BacktestResult, BacktestTrade } from "@/types";
import { ActionBadge, Badge } from "@/components/ui/Badge";
import { formatPrice, formatPercent, formatDate } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Activity, Target, AlertTriangle, DollarSign, Award } from "lucide-react";

function MetricCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
        <Icon size={16} className={color ?? "text-muted"} />
      </div>
      <div>
        <p className="text-xs text-muted mb-0.5">{label}</p>
        <p className={`text-sm font-bold ${color ?? "text-ink"}`}>{value}</p>
      </div>
    </Card>
  );
}

function TradeRow({ trade }: { trade: BacktestTrade }) {
  return (
    <tr className="border-b border-border/50 hover:bg-surface/50 transition-colors text-sm">
      <td className="py-2.5">
        <ActionBadge action={trade.action} />
      </td>
      <td className="py-2.5 text-right text-ink">{formatPrice(trade.entry_price)}</td>
      <td className="py-2.5 text-right text-ink">{formatPrice(trade.exit_price)}</td>
      <td className="py-2.5 text-right text-sell">{formatPrice(trade.stop_loss)}</td>
      <td className="py-2.5 text-right text-buy">{formatPrice(trade.take_profit)}</td>
      <td className="py-2.5 text-right">
        <span className={trade.return_pct >= 0 ? "text-buy" : "text-sell"}>
          {trade.return_pct >= 0 ? "+" : ""}
          {(trade.return_pct).toFixed(2)}%
        </span>
      </td>
      <td className="py-2.5 text-right">
        <span className={trade.pnl >= 0 ? "text-buy" : "text-sell"}>
          {trade.pnl >= 0 ? "+" : ""}
          {formatPrice(trade.pnl)}
        </span>
      </td>
      <td className="py-2.5 text-center">
        {trade.outcome === "WIN" ? (
          <Badge variant="positive">WIN</Badge>
        ) : trade.outcome === "LOSS" ? (
          <Badge variant="negative">LOSS</Badge>
        ) : (
          <Badge variant="neutral">EXP</Badge>
        )}
      </td>
      <td className="py-2.5 text-right text-muted text-xs">{trade.bars_held}b</td>
    </tr>
  );
}

function ResultView({ result }: { result: BacktestResult }) {
  const totalReturn = result.total_return_pct;
  const returnColor = totalReturn >= 0 ? "text-buy" : "text-sell";

  return (
    <div className="space-y-5">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Return"
          value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
          color={returnColor}
          icon={TrendingUp}
        />
        <MetricCard
          label="Final Equity"
          value={formatPrice(result.final_equity)}
          icon={DollarSign}
        />
        <MetricCard
          label="Win Rate"
          value={formatPercent(result.win_rate)}
          color={result.win_rate >= 0.5 ? "text-buy" : "text-sell"}
          icon={Award}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={result.sharpe_ratio.toFixed(2)}
          color={result.sharpe_ratio >= 1 ? "text-buy" : result.sharpe_ratio >= 0 ? "text-hold" : "text-sell"}
          icon={Activity}
        />
        <MetricCard
          label="Max Drawdown"
          value={`-${result.max_drawdown_pct.toFixed(2)}%`}
          color="text-sell"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Total Trades"
          value={`${result.total_trades} (${result.wins}W/${result.losses}L)`}
          icon={Target}
        />
      </div>

      {/* Equity curve */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <span className="text-xs text-muted">{result.ticker} · {result.interval}</span>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.equity_curve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={totalReturn >= 0 ? "#00d97e" : "#ff4560"} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={totalReturn >= 0 ? "#00d97e" : "#ff4560"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5, 10)}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{ background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v) => [formatPrice(Number(v)), "Equity"]}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={totalReturn >= 0 ? "#00d97e" : "#ff4560"}
                strokeWidth={2}
                fill="url(#equityGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Trade log */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Log</CardTitle>
          <span className="text-xs text-muted">{result.trades.length} trades</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="text-left pb-2 font-medium">Action</th>
                <th className="text-right pb-2 font-medium">Entry</th>
                <th className="text-right pb-2 font-medium">Exit</th>
                <th className="text-right pb-2 font-medium">SL</th>
                <th className="text-right pb-2 font-medium">TP</th>
                <th className="text-right pb-2 font-medium">Return</th>
                <th className="text-right pb-2 font-medium">P&L</th>
                <th className="text-center pb-2 font-medium">Outcome</th>
                <th className="text-right pb-2 font-medium">Held</th>
              </tr>
            </thead>
            <tbody>
              {result.trades.map((t, i) => (
                <TradeRow key={i} trade={t} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const INTERVALS = ["1d", "1h", "4h", "1wk"];

export default function BacktestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [interval, setInterval] = useState("1d");
  const [capital, setCapital] = useState(10000);

  const { mutate: run, isPending, result } = useBacktest();

  function handleRun() {
    run({ ticker: ticker.toUpperCase(), interval, initialCapital: capital });
  }

  return (
    <div>
      <Header title="Backtesting" />
      <div className="mt-6 space-y-5">
        {/* Config form */}
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-muted block mb-1.5">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink w-28 focus:outline-none focus:border-accent/50 uppercase"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Interval</label>
              <div className="flex gap-1">
                {INTERVALS.map((iv) => (
                  <button
                    key={iv}
                    onClick={() => setInterval(iv)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      interval === iv
                        ? "bg-accent/20 text-accent border-accent/30"
                        : "text-muted hover:text-ink hover:bg-surface border-border"
                    }`}
                  >
                    {iv}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Initial Capital ($)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink w-32 focus:outline-none focus:border-accent/50"
                min={100}
                step={1000}
              />
            </div>
            <Button onClick={handleRun} loading={isPending}>
              <TrendingUp size={14} /> Run Backtest
            </Button>
          </div>
        </Card>

        {/* Results */}
        {isPending && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-surface animate-pulse rounded-xl" />
            ))}
          </div>
        )}
        {result && !isPending && <ResultView result={result} />}
        {!result && !isPending && (
          <div className="text-center py-16 text-muted text-sm">
            <TrendingUp size={36} className="mx-auto mb-3 opacity-20" />
            <p>Configure a backtest above and click Run Backtest</p>
          </div>
        )}
      </div>
    </div>
  );
}
