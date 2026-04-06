"use client";

import { Card } from "@/components/ui/Card";
import { ActionBadge } from "@/components/ui/Badge";
import type { SignalResponse } from "@/types";
import { formatPrice, formatPercent, formatRelative } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, ShieldAlert, Clock } from "lucide-react";
import Link from "next/link";

interface SignalCardProps {
  signal: SignalResponse;
}

export default function SignalCard({ signal }: SignalCardProps) {
  const glow =
    signal.action === "BUY" ? "buy" : signal.action === "SELL" ? "sell" : undefined;

  return (
    <Link href={`/market/${signal.ticker}`}>
      <Card glow={glow} className="hover:border-border/60 transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-base font-bold text-ink">{signal.ticker}</p>
            <p className="text-xs text-muted">{signal.interval} · {formatRelative(signal.created_at)}</p>
          </div>
          <ActionBadge action={signal.action} />
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">Confidence</span>
            <span className="text-ink font-medium">{formatPercent(signal.confidence)}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${signal.confidence * 100}%`,
                backgroundColor:
                  signal.action === "BUY"
                    ? "var(--buy)"
                    : signal.action === "SELL"
                    ? "var(--sell)"
                    : "var(--hold)",
              }}
            />
          </div>
        </div>

        {/* Risk metrics */}
        {signal.entry_price && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-surface rounded-lg p-2">
              <div className="flex items-center gap-1 text-muted mb-1">
                <Target size={10} /> Entry
              </div>
              <p className="font-semibold text-ink">{formatPrice(signal.entry_price)}</p>
            </div>
            <div className="bg-surface rounded-lg p-2">
              <div className="flex items-center gap-1 text-muted mb-1">
                <ShieldAlert size={10} /> Stop
              </div>
              <p className="font-semibold text-sell">{formatPrice(signal.stop_loss)}</p>
            </div>
            <div className="bg-surface rounded-lg p-2">
              <div className="flex items-center gap-1 text-muted mb-1">
                <TrendingUp size={10} /> Target
              </div>
              <p className="font-semibold text-buy">{formatPrice(signal.take_profit)}</p>
            </div>
          </div>
        )}

        {/* Probabilities */}
        {signal.probabilities && (
          <div className="mt-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1">
              <TrendingUp size={10} className="text-buy" />
              <span className="text-muted">B</span>
              <span className="text-buy font-medium">
                {formatPercent(signal.probabilities.buy)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown size={10} className="text-sell" />
              <span className="text-muted">S</span>
              <span className="text-sell font-medium">
                {formatPercent(signal.probabilities.sell)}
              </span>
            </span>
            {signal.bars_to_entry != null && (
              <span className="flex items-center gap-1 ml-auto">
                <Clock size={10} className="text-muted" />
                <span className="text-muted">
                  {signal.bars_to_entry === 0 ? "Now" : `+${Math.round(signal.bars_to_entry)}d`}
                </span>
              </span>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
