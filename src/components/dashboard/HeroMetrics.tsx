"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { Wallet, TrendingUp, Target, Briefcase } from "lucide-react";
import { useTradingStatus, useTradingConfig, useMT5Positions } from "@/hooks/useTrading";
import { useLiveEdgeSummary } from "@/hooks/useDashboard";

const BREAKEVEN_WIN_RATE = 0.30;   // model needs ≥ 30% wins on the current avg-payoff ratio

function fmtUsd(n: number | null | undefined, sign = false): string {
  if (n == null || isNaN(Number(n))) return "—";
  const v = Number(n);
  const s = sign && v >= 0 ? "+" : "";
  return `${s}$${Math.abs(v) < 0.01 ? "0.00" : v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function HeroMetrics() {
  const { data: status,    isLoading: lStatus }   = useTradingStatus();
  const { data: config,    isLoading: lConfig }   = useTradingConfig();
  const { data: positions, isLoading: lPos }      = useMT5Positions();
  const { data: summary,   isLoading: lSummary }  = useLiveEdgeSummary(30);

  const loading = lStatus || lConfig || lPos || lSummary;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-surface animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const balance     = status?.account?.balance ?? 0;
  const equity      = status?.account?.equity  ?? 0;
  const equityDelta = equity - balance;   // float PnL today as a proxy "daily change"

  const pnl30       = summary?.realized_pnl ?? 0;
  const pnlPctOfBal = balance > 0 ? (pnl30 / balance) * 100 : 0;
  const grossWins   = summary?.gross_wins   ?? 0;
  const grossLosses = Math.abs(summary?.gross_losses ?? 0);
  const totalTrades = summary?.total_trades ?? 0;

  const winRate     = summary?.actual_win_rate ?? 0;
  const wins        = summary?.wins      ?? 0;
  const losses      = summary?.losses    ?? 0;
  const breakeven   = summary?.breakeven ?? 0;
  const winVerdict  = winRate >= BREAKEVEN_WIN_RATE;

  const openCount   = positions?.length ?? 0;
  const maxOpen     = (config as { max_open_positions?: number } | undefined)?.max_open_positions ?? 0;
  const floatPnl    = (positions ?? []).reduce((s, p) => s + (p.profit ?? 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Tile 1 — Balance */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Balance</CardTitle>
          <Wallet size={16} className="text-accent" />
        </div>
        <p className="text-2xl font-bold text-ink">{fmtUsd(balance)}</p>
        <p className={`text-xs mt-1 ${equityDelta >= 0 ? "text-buy" : "text-sell"}`}>
          Equity {fmtUsd(equity)} ({equityDelta >= 0 ? "+" : ""}{fmtUsd(equityDelta)})
        </p>
      </Card>

      {/* Tile 2 — 30-day net PnL with gross breakdown */}
      <Card glow={pnl30 >= 0 ? "buy" : "sell"}>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>30-day Net PnL</CardTitle>
          <TrendingUp size={16} className={pnl30 >= 0 ? "text-buy" : "text-sell"} />
        </div>
        <p className={`text-2xl font-bold ${pnl30 >= 0 ? "text-buy" : "text-sell"}`}>
          {fmtUsd(pnl30, true)}
        </p>
        <p className="text-xs mt-1">
          <span className="text-buy">{fmtUsd(grossWins, true)}</span>
          <span className="text-muted"> / </span>
          <span className="text-sell">-{fmtUsd(grossLosses)}</span>
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          {pnlPctOfBal >= 0 ? "+" : ""}{pnlPctOfBal.toFixed(2)}% of balance
        </p>
      </Card>

      {/* Tile 3 — Win rate with full breakdown (W / L / BE = total closed) */}
      <Card glow={winVerdict ? "buy" : "sell"}>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Win Rate</CardTitle>
          <Target size={16} className={winVerdict ? "text-buy" : "text-sell"} />
        </div>
        <p className={`text-2xl font-bold ${winVerdict ? "text-buy" : "text-sell"}`}>
          {(winRate * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-muted mt-1">
          <span className="text-buy">{wins}W</span> / <span className="text-sell">{losses}L</span>
          {breakeven > 0 && <> / <span className="text-muted">{breakeven} BE</span></>}
          <span className="text-muted"> · {totalTrades} closed</span>
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          {winVerdict ? "Above" : "Below"} breakeven (30%)
        </p>
      </Card>

      {/* Tile 4 — Open positions */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Open Positions</CardTitle>
          <Briefcase size={16} className="text-hold" />
        </div>
        <p className="text-2xl font-bold text-ink">{openCount}<span className="text-muted text-base font-normal"> / {maxOpen}</span></p>
        <p className={`text-xs mt-1 ${floatPnl >= 0 ? "text-buy" : "text-sell"}`}>
          Float {fmtUsd(floatPnl, true)}
        </p>
      </Card>

    </div>
  );
}
