"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Wallet } from "lucide-react";
import type { EvalReport } from "@/types";
import type { AssetClass } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const COST_BPS_BY_BUCKET: Record<"equity" | "fx_major" | "fx_metal", number> = {
  equity:   5,
  fx_major: 1,
  fx_metal: 3,
};

function costBucketFor(ac: AssetClass): "equity" | "fx_major" | "fx_metal" {
  if (ac === "equities" || ac === "equities_1h") return "equity";
  return "fx_major";
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs < 0.01) return "$0.00";
  return `${n < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

interface Props {
  report: EvalReport;
  assetClass: AssetClass;
}

export default function AccountProjection({ report, assetClass }: Props) {
  const [balance, setBalance] = useState(10_000);
  const [riskPct, setRiskPct] = useState(0.01);

  const proj = useMemo(() => {
    const t = report.trading;
    const avgRet = Number(t.avg_return) || 0;
    const sharpe = Number(t.sharpe_ratio) || 0;
    const winRate = Number(t.win_rate) || 0;
    const totalTrades = Number(t.total_trades) || 0;
    const maxDdPct = Number(t.max_drawdown) || 0;

    const tradesPerYear = t.annualisation?.trades_per_year ?? (totalTrades / 5);
    const tradesPerMonth = tradesPerYear / 12;

    const costBps = COST_BPS_BY_BUCKET[costBucketFor(assetClass)];
    const costPerTrade = costBps / 10_000;

    const rawMonthly = tradesPerMonth * avgRet * riskPct * balance;
    const adjMonthly = tradesPerMonth * (avgRet - costPerTrade) * riskPct * balance;
    const maxDdUsd = Math.abs(maxDdPct) * balance;

    const adjSharpe = avgRet !== 0
      ? sharpe * Math.max(0, (avgRet - costPerTrade) / avgRet)
      : 0;

    const monthlyRate = balance > 0 ? adjMonthly / balance : 0;
    const monthsToDouble = monthlyRate > 0
      ? Math.ceil(Math.log(2) / monthlyRate)
      : null;

    const verdict =
      adjSharpe >= 0.5 ? { label: "Deploy",   tone: "buy"  as const } :
      adjSharpe >=  0  ? { label: "Marginal", tone: "hold" as const } :
                         { label: "Disable",  tone: "sell" as const };

    return {
      rawMonthly, adjMonthly, maxDdUsd, sharpe, adjSharpe,
      monthsToDouble, verdict, tradesPerMonth, costBps, winRate,
    };
  }, [report, assetClass, balance, riskPct]);

  const verdictClass =
    proj.verdict.tone === "buy"  ? "text-buy  border-buy/30  bg-buy/10"  :
    proj.verdict.tone === "hold" ? "text-hold border-hold/30 bg-hold/10" :
                                   "text-sell border-sell/30 bg-sell/10";

  return (
    <Card glow={proj.verdict.tone}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-accent" />
          <CardTitle>Account Sizing — Forward Projection</CardTitle>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${verdictClass}`}>
          {proj.verdict.label}
        </span>
      </CardHeader>

      <p className="text-xs text-muted mb-4">
        Projects model simulation onto a chosen account size. Cost-adjusted figures apply{" "}
        <span className="text-ink font-medium">{proj.costBps} bps</span> round-trip
        ({costBucketFor(assetClass)}). Assumes {formatNumber(proj.tradesPerMonth, 1)} trades/month based on annualised simulation frequency.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="text-xs text-muted">Starting Balance ($)</span>
          <input
            type="number"
            value={balance}
            min={100}
            step={500}
            onChange={(e) => setBalance(Math.max(100, Number(e.target.value) || 100))}
            className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Risk per Trade (%)</span>
          <input
            type="number"
            value={Number((riskPct * 100).toFixed(2))}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(e) => setRiskPct(Math.max(0.001, (Number(e.target.value) || 1) / 100))}
            className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <Metric
          label="Monthly PnL (raw)"
          value={fmtUsd(proj.rawMonthly)}
          tone={proj.rawMonthly >= 0 ? "buy" : "sell"}
        />
        <Metric
          label="Monthly PnL (cost-adj)"
          value={fmtUsd(proj.adjMonthly)}
          tone={proj.adjMonthly >= 0 ? "buy" : "sell"}
        />
        <Metric
          label="Max Drawdown ($)"
          value={fmtUsd(-proj.maxDdUsd)}
          tone="sell"
        />
        <Metric
          label="Sharpe (raw)"
          value={formatNumber(proj.sharpe)}
          tone={proj.sharpe >= 0 ? "buy" : "sell"}
        />
        <Metric
          label="Sharpe (cost-adj)"
          value={formatNumber(proj.adjSharpe)}
          tone={proj.adjSharpe >= 0.5 ? "buy" : proj.adjSharpe >= 0 ? "hold" : "sell"}
        />
        <Metric
          label="Months to Double"
          value={proj.monthsToDouble !== null ? `${proj.monthsToDouble}` : "—"}
          sub={proj.monthsToDouble !== null ? "@ current edge" : "negative edge"}
        />
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "buy" | "sell" | "hold";
  sub?: string;
}) {
  const toneClass =
    tone === "buy"  ? "text-buy"  :
    tone === "sell" ? "text-sell" :
    tone === "hold" ? "text-hold" : "text-ink";
  return (
    <div className="bg-surface rounded-lg p-3">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
