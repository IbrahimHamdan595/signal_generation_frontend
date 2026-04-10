"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  usePositions,
  usePortfolioSummary,
  useOpenPosition,
  useClosePosition,
} from "@/hooks/usePortfolio";
import { formatNumber } from "@/lib/utils";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  X,
} from "lucide-react";

function PnlCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>;
  const pos = value >= 0;
  return (
    <span className={pos ? "text-buy" : "text-sell"}>
      {pos ? "+" : ""}${formatNumber(value, 2)}
    </span>
  );
}

function PctCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>;
  const pos = value >= 0;
  return (
    <span className={`text-xs ${pos ? "text-buy" : "text-sell"}`}>
      {pos ? "+" : ""}{formatNumber(value * 100, 2)}%
    </span>
  );
}

export default function PortfolioPage() {
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { data: summary, isLoading: loadingSummary } = usePortfolioSummary();
  const { mutate: openPosition, isPending: opening } = useOpenPosition();
  const { mutate: closePosition, isPending: closing } = useClosePosition();

  const [showOpen, setShowOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const openPositions = positions.filter((p) => p.is_open);
  const closedPositions = positions.filter((p) => !p.is_open);

  function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    if (!ticker || isNaN(qty) || isNaN(px) || qty <= 0 || px <= 0) return;
    openPosition(
      { ticker: ticker.toUpperCase(), quantity: qty, price: px },
      {
        onSuccess: () => {
          setTicker("");
          setQuantity("");
          setPrice("");
          setShowOpen(false);
        },
      }
    );
  }

  function handleClose(id: number, currentPrice: number | null) {
    const px = currentPrice ?? parseFloat(prompt("Enter exit price:") ?? "");
    if (!px || isNaN(px)) return;
    closePosition({ id, price: px });
  }

  return (
    <div>
      <Header title="Portfolio" />
      <div className="mt-6 space-y-5">

        {/* Summary cards */}
        {loadingSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Open Positions</CardTitle>
                <Briefcase size={16} className="text-accent" />
              </div>
              <p className="text-2xl font-bold text-ink">{summary?.open_positions ?? 0}</p>
              <p className="text-xs text-muted mt-1">Active trades</p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Market Value</CardTitle>
                <DollarSign size={16} className="text-accent" />
              </div>
              <p className="text-2xl font-bold text-ink">
                ${formatNumber(summary?.total_value ?? 0, 2)}
              </p>
              <p className="text-xs text-muted mt-1">
                Cost ${formatNumber(summary?.total_cost ?? 0, 2)}
              </p>
            </Card>

            <Card glow={summary && summary.unrealized_pnl >= 0 ? "buy" : "sell"}>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Unrealised P&L</CardTitle>
                {summary && summary.unrealized_pnl >= 0
                  ? <TrendingUp size={16} className="text-buy" />
                  : <TrendingDown size={16} className="text-sell" />}
              </div>
              <p className={`text-2xl font-bold ${summary && summary.unrealized_pnl >= 0 ? "text-buy" : "text-sell"}`}>
                {summary && summary.unrealized_pnl >= 0 ? "+" : ""}
                ${formatNumber(summary?.unrealized_pnl ?? 0, 2)}
              </p>
              <p className="text-xs text-muted mt-1">Open positions</p>
            </Card>

            <Card glow={summary && summary.realized_pnl >= 0 ? "buy" : "sell"}>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Realised P&L</CardTitle>
                <DollarSign size={16} className="text-muted" />
              </div>
              <p className={`text-2xl font-bold ${summary && summary.realized_pnl >= 0 ? "text-buy" : "text-sell"}`}>
                {summary && summary.realized_pnl >= 0 ? "+" : ""}
                ${formatNumber(summary?.realized_pnl ?? 0, 2)}
              </p>
              <p className="text-xs text-muted mt-1">Closed positions</p>
            </Card>
          </div>
        )}

        {/* Open position form */}
        <div className="flex justify-end">
          <Button onClick={() => setShowOpen((v) => !v)} variant="secondary" size="sm">
            <Plus size={14} />
            {showOpen ? "Cancel" : "Open Position"}
          </Button>
        </div>

        {showOpen && (
          <Card glow="accent">
            <CardHeader>
              <CardTitle>Open New Position</CardTitle>
            </CardHeader>
            <form onSubmit={handleOpen} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Ticker (e.g. AAPL)"
                required
                className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors uppercase"
              />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity"
                required
                min="0.0001"
                step="any"
                className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Entry Price ($)"
                required
                min="0.01"
                step="any"
                className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
              <div className="sm:col-span-3">
                <Button type="submit" loading={opening} className="w-full justify-center">
                  Open Position
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Open positions table */}
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          {loadingPositions ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : openPositions.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Ticker</th>
                    <th className="text-right py-2 pr-4">Qty</th>
                    <th className="text-right py-2 pr-4">Avg Cost</th>
                    <th className="text-right py-2 pr-4">Current</th>
                    <th className="text-right py-2 pr-4">Unreal. P&L</th>
                    <th className="text-right py-2 pr-4">Return</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((pos) => (
                    <tr key={pos.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-ink">{pos.ticker}</td>
                      <td className="text-right py-2.5 pr-4 text-ink">{formatNumber(pos.quantity, 4)}</td>
                      <td className="text-right py-2.5 pr-4 text-ink">${formatNumber(pos.avg_cost, 2)}</td>
                      <td className="text-right py-2.5 pr-4 text-muted">
                        {pos.current_price != null ? `$${formatNumber(pos.current_price, 2)}` : "—"}
                      </td>
                      <td className="text-right py-2.5 pr-4">
                        <PnlCell value={pos.unrealized_pnl} />
                      </td>
                      <td className="text-right py-2.5 pr-4">
                        <PctCell value={pos.unrealized_pct} />
                      </td>
                      <td className="text-right py-2.5">
                        <button
                          onClick={() => handleClose(pos.id, pos.current_price)}
                          disabled={closing}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-sell border border-sell/20 hover:bg-sell/10 transition-colors ml-auto"
                        >
                          <X size={11} /> Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Closed positions */}
        {closedPositions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Closed Positions</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Ticker</th>
                    <th className="text-right py-2 pr-4">Qty</th>
                    <th className="text-right py-2 pr-4">Avg Cost</th>
                    <th className="text-right py-2 pr-4">Realised P&L</th>
                    <th className="text-right py-2">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {closedPositions.map((pos) => (
                    <tr key={pos.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-ink">{pos.ticker}</td>
                      <td className="text-right py-2.5 pr-4 text-ink">{formatNumber(pos.quantity, 4)}</td>
                      <td className="text-right py-2.5 pr-4 text-muted">${formatNumber(pos.avg_cost, 2)}</td>
                      <td className="text-right py-2.5 pr-4">
                        <PnlCell value={pos.realized_pnl} />
                      </td>
                      <td className="text-right py-2.5 text-xs text-muted">
                        {pos.closed_at ? new Date(pos.closed_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
