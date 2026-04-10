"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from "@/hooks/useWatchlist";
import { useConfluenceBatch } from "@/hooks/useConfluence";
import { useOutcomes } from "@/hooks/useOutcomes";
import { ActionBadge } from "@/components/ui/Badge";
import { formatPercent } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight, Plus, Star, Trash2, BarChart2 } from "lucide-react";

export default function WatchlistPage() {
  const { data: watchlist = [], isLoading } = useWatchlist();
  const { mutate: add, isPending: adding } = useAddToWatchlist();
  const { mutate: remove } = useRemoveFromWatchlist();
  const { data: confluence = [] } = useConfluenceBatch(watchlist);
  const { data: outcomes = [] } = useOutcomes();

  const [input, setInput] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const ticker = input.trim().toUpperCase();
    if (ticker && !watchlist.includes(ticker)) {
      add(ticker);
      setInput("");
    }
  }

  const confluenceByTicker = Object.fromEntries(
    confluence.map((c) => [c.ticker, c])
  );

  // Compute per-ticker outcome stats from resolved outcomes
  const outcomeStatsByTicker: Record<string, { wins: number; losses: number; total: number; winRate: number }> = {};
  for (const o of outcomes) {
    if (!outcomeStatsByTicker[o.ticker]) {
      outcomeStatsByTicker[o.ticker] = { wins: 0, losses: 0, total: 0, winRate: 0 };
    }
    const s = outcomeStatsByTicker[o.ticker];
    s.total++;
    if (o.outcome === "WIN") s.wins++;
    if (o.outcome === "LOSS") s.losses++;
    s.winRate = s.total > 0 ? s.wins / s.total : 0;
  }

  function scoreColor(score: number) {
    if (score >= 0.7) return "#00d97e";    // buy green
    if (score >= 0.4) return "#f59e0b";    // hold amber
    return "#ff4560";                       // sell red
  }

  return (
    <div>
      <Header title="Watchlist" />
      <div className="mt-6 space-y-5">
        {/* Add ticker */}
        <Card>
          <form onSubmit={handleAdd} className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted">
              <Star size={15} />
              <span className="text-sm">Add Ticker</span>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              className="flex-1 max-w-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors uppercase"
            />
            <Button type="submit" size="sm" loading={adding} disabled={!input.trim()}>
              <Plus size={13} /> Add
            </Button>
          </form>
        </Card>

        {/* Watchlist table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Watchlist</CardTitle>
            <span className="text-xs text-muted">{watchlist.length} tickers</span>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">
              <Star size={32} className="mx-auto mb-3 opacity-30" />
              <p>Your watchlist is empty</p>
              <p className="text-xs mt-1">Add tickers above to track them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="text-left pb-3 font-medium">Ticker</th>
                    <th className="text-left pb-3 font-medium">1d</th>
                    <th className="text-left pb-3 font-medium">1h</th>
                    <th className="text-left pb-3 font-medium">Strength</th>
                    <th className="text-left pb-3 font-medium">Score</th>
                    <th className="text-right pb-3 font-medium">Win Rate</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((ticker) => {
                    const c = confluenceByTicker[ticker];
                    const ost = outcomeStatsByTicker[ticker];
                    return (
                      <tr
                        key={ticker}
                        className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                      >
                        <td className="py-3 font-bold text-ink">{ticker}</td>
                        <td className="py-3">
                          {c ? (
                            <div className="flex items-center gap-1.5">
                              <ActionBadge action={c.daily.action} />
                              <span className="text-xs text-muted">{formatPercent(c.daily.confidence)}</span>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="py-3">
                          {c ? (
                            <div className="flex items-center gap-1.5">
                              <ActionBadge action={c.hourly.action} />
                              <span className="text-xs text-muted">{formatPercent(c.hourly.confidence)}</span>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="py-3">
                          {c ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              c.strength === "strong" ? "bg-buy/10 text-buy border-buy/20" :
                              c.strength === "weak" ? "bg-hold/10 text-hold border-hold/20" :
                              c.strength === "conflicting" ? "bg-sell/10 text-sell border-sell/20" :
                              "bg-surface text-muted border-border"
                            }`}>{c.strength}</span>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="py-3 w-28">
                          {c ? (
                            <div>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-muted">{(c.score * 100).toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-surface rounded-full overflow-hidden w-20">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${c.score * 100}%`, backgroundColor: scoreColor(c.score) }}
                                />
                              </div>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="py-3 text-right">
                          {ost && ost.total > 0 ? (
                            <div className="text-xs">
                              <span className={ost.winRate >= 0.5 ? "text-buy font-semibold" : "text-sell font-semibold"}>
                                {formatPercent(ost.winRate)}
                              </span>
                              <span className="text-muted ml-1">({ost.wins}W/{ost.losses}L)</span>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-1 justify-end">
                            <Link
                              href={`/market/${ticker}`}
                              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface transition-colors"
                              title="View chart"
                            >
                              <BarChart2 size={13} />
                            </Link>
                            <Link
                              href={`/market/${ticker}`}
                              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface transition-colors"
                            >
                              <ArrowUpRight size={13} />
                            </Link>
                            <button
                              onClick={() => remove(ticker)}
                              className="p-1.5 rounded-lg text-muted hover:text-sell hover:bg-sell/5 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
