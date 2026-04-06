"use client";

import { ActionBadge } from "@/components/ui/Badge";
import type { SignalResponse } from "@/types";
import { formatPrice, formatPercent, formatRelative } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface SignalsTableProps {
  signals: SignalResponse[];
}

export default function SignalsTable({ signals }: SignalsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="text-left pb-3 font-medium">Ticker</th>
            <th className="text-left pb-3 font-medium">Action</th>
            <th className="text-right pb-3 font-medium">Confidence</th>
            <th className="text-right pb-3 font-medium">Entry</th>
            <th className="text-right pb-3 font-medium">Stop Loss</th>
            <th className="text-right pb-3 font-medium">Take Profit</th>
            <th className="text-right pb-3 font-medium">Net P&L</th>
            <th className="text-right pb-3 font-medium">When</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border/50 hover:bg-surface/50 transition-colors"
            >
              <td className="py-3 font-bold text-ink">{s.ticker}</td>
              <td className="py-3">
                <ActionBadge action={s.action} />
              </td>
              <td className="py-3 text-right">
                <span className="text-ink font-medium">{formatPercent(s.confidence)}</span>
              </td>
              <td className="py-3 text-right text-ink">{formatPrice(s.entry_price)}</td>
              <td className="py-3 text-right text-sell">{formatPrice(s.stop_loss)}</td>
              <td className="py-3 text-right text-buy">{formatPrice(s.take_profit)}</td>
              <td className="py-3 text-right">
                {s.net_profit != null ? (
                  <span className={s.net_profit >= 0 ? "text-buy" : "text-sell"}>
                    {s.net_profit >= 0 ? "+" : ""}
                    {formatPrice(s.net_profit)}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="py-3 text-right text-muted text-xs">
                {formatRelative(s.created_at)}
              </td>
              <td className="py-3 pl-2">
                <Link
                  href={`/market/${s.ticker}`}
                  className="text-muted hover:text-accent transition-colors"
                >
                  <ArrowUpRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
