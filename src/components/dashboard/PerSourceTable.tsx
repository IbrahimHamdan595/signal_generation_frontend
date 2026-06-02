"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SourceBadge } from "@/components/signals/SourceBadge";
import { Layers } from "lucide-react";
import { usePerSourceBreakdown, type PerSourceRow } from "@/hooks/useDashboard";

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const STATUS_PILL: Record<PerSourceRow["status"], { label: string; cls: string }> = {
  active:     { label: "✅ active",     cls: "text-buy  border-buy/30  bg-buy/10"  },
  retraining: { label: "🚧 retraining", cls: "text-hold border-hold/30 bg-hold/10" },
  disabled:   { label: "✋ disabled",   cls: "text-muted border-border bg-surface" },
};

export default function PerSourceTable() {
  const { data: rows, isLoading } = usePerSourceBreakdown(30);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-accent" />
          <CardTitle>Per-Source Breakdown (30d)</CardTitle>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !rows || rows.length === 0 || rows.every((r) => r.trades === 0) ? (
        <p className="text-sm text-muted text-center py-8">
          No trades yet — click <span className="text-ink">Run all &amp; trade</span> on <span className="text-ink">Strategies</span> to start the forward test
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted border-b border-border text-xs">
                <th className="text-left py-2 pr-3 font-medium">Source</th>
                <th className="text-right py-2 pr-3 font-medium">Trades</th>
                <th className="text-right py-2 pr-3 font-medium">Win%</th>
                <th className="text-right py-2 pr-3 font-medium">PnL (raw)</th>
                <th className="text-right py-2 pr-3 font-medium">PnL (adj)</th>
                <th className="text-right py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.source} className="border-b border-border/40 hover:bg-surface/50">
                  <td className="py-2.5 pr-3">
                    <SourceBadge source={r.source} />
                  </td>
                  <td className="text-right py-2.5 pr-3 text-ink">{r.trades}</td>
                  <td className="text-right py-2.5 pr-3 text-hold">
                    {(r.win_rate * 100).toFixed(1)}%
                  </td>
                  <td className={`text-right py-2.5 pr-3 ${r.pnl_raw >= 0 ? "text-buy" : "text-sell"}`}>
                    {fmtUsd(r.pnl_raw)}
                  </td>
                  <td className={`text-right py-2.5 pr-3 font-medium ${r.pnl_adj >= 0 ? "text-buy" : "text-sell"}`}>
                    {fmtUsd(r.pnl_adj)}
                  </td>
                  <td className="text-right py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_PILL[r.status].cls}`}>
                      {STATUS_PILL[r.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
