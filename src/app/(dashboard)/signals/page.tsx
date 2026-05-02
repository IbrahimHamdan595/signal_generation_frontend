"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAllSignals, useGenerateBatchSignals } from "@/hooks/useSignals";
import { useOutcomes } from "@/hooks/useOutcomes";
import { useTradingStatus, useExecuteSignal } from "@/hooks/useTrading";
import type { Action, SignalResponse, SignalOutcome } from "@/types";
import Header from "@/components/layout/Header";
import { Filter, RefreshCw, Zap, Download, ArrowUpRight, PlayCircle, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice, formatPercent, formatDate } from "@/lib/utils";
import { ActionBadge, Badge } from "@/components/ui/Badge";
import Link from "next/link";

const ACTION_FILTERS: (Action | "ALL")[] = ["ALL", "BUY", "SELL", "HOLD"];

function OutcomeBadge({ outcome }: { outcome: SignalOutcome["outcome"] }) {
  if (outcome === "WIN") return <Badge variant="positive">WIN</Badge>;
  if (outcome === "LOSS") return <Badge variant="negative">LOSS</Badge>;
  return <Badge variant="neutral">EXPIRED</Badge>;
}

// ── Lot-size dialog ────────────────────────────────────────────────────────────

function ExecuteDialog({
  signal,
  onConfirm,
  onCancel,
  loading,
}: {
  signal: SignalResponse;
  onConfirm: (volume: number | undefined) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [lotInput, setLotInput] = useState("");

  const volume = lotInput.trim() === "" ? undefined : parseFloat(lotInput);
  const invalid = lotInput.trim() !== "" && (isNaN(volume!) || volume! <= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-border rounded-xl shadow-2xl p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">Execute Signal</h3>
          <button onClick={onCancel} className="text-muted hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="bg-surface rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted">Ticker</span>
            <span className="font-mono font-bold text-ink">{signal.ticker}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Action</span>
            <span className={`font-semibold ${signal.action === "BUY" ? "text-buy" : "text-sell"}`}>
              {signal.action}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Confidence</span>
            <span className="text-ink">{formatPercent(signal.confidence)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Entry / SL</span>
            <span className="text-ink text-xs">
              {formatPrice(signal.entry_price)} / {formatPrice(signal.stop_loss)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">
            Lot size <span className="text-muted/60">(leave blank for auto-sizing)</span>
          </label>
          <input
            type="number"
            value={lotInput}
            onChange={(e) => setLotInput(e.target.value)}
            placeholder="e.g. 0.1"
            min="0.01"
            step="0.01"
            autoFocus
            className={`w-full bg-surface border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none transition-colors ${
              invalid ? "border-sell/60 focus:border-sell" : "border-border focus:border-accent/60"
            }`}
          />
          {invalid && (
            <p className="text-xs text-sell">Enter a positive number or leave blank</p>
          )}
          {!lotInput && (
            <p className="text-xs text-muted">
              Auto: fixed-fraction risk sizing based on your config
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 justify-center"
            disabled={invalid || loading}
            loading={loading}
            onClick={() => onConfirm(volume)}
          >
            <PlayCircle size={13} /> Place Order
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Signals table ─────────────────────────────────────────────────────────────

function SignalsWithOutcomesTable({
  signals,
  outcomeMap,
  mt5Connected,
  onExecute,
  executing,
}: {
  signals: SignalResponse[];
  outcomeMap: Record<string, SignalOutcome>;
  mt5Connected: boolean;
  onExecute: (id: number) => void;
  executing: boolean;
}) {
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
            <th className="text-left pb-3 font-medium">Outcome</th>
            <th className="text-right pb-3 font-medium">When</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => {
            const outcome = outcomeMap[s.id];
            const canExecute = mt5Connected && (s.action === "BUY" || s.action === "SELL");
            return (
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
                <td className="py-3">
                  {outcome ? (
                    <div className="flex flex-col gap-0.5">
                      <OutcomeBadge outcome={outcome.outcome} />
                      {outcome.actual_return != null && (
                        <span className={`text-[10px] ${outcome.actual_return >= 0 ? "text-buy" : "text-sell"}`}>
                          {outcome.actual_return >= 0 ? "+" : ""}
                          {(outcome.actual_return * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted text-xs">Pending</span>
                  )}
                </td>
                <td className="py-3 text-right text-muted text-xs">
                  {formatDate(s.created_at)}
                </td>
                <td className="py-3 pl-2">
                  <div className="flex items-center gap-1.5 justify-end">
                    {canExecute && (
                      <button
                        onClick={() => onExecute(Number(s.id))}
                        disabled={executing}
                        title="Execute via MT5"
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-accent border border-accent/20 hover:bg-accent/10 transition-colors disabled:opacity-40"
                      >
                        <PlayCircle size={11} /> Execute
                      </button>
                    )}
                    <Link
                      href={`/market/${s.ticker}`}
                      className="text-muted hover:text-accent transition-colors"
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function exportCSV(signals: SignalResponse[], outcomeMap: Record<string, SignalOutcome>) {
  const headers = [
    "Ticker", "Action", "Confidence", "Entry", "Stop Loss", "Take Profit",
    "Net P&L", "Outcome", "Return %", "Created At",
  ];
  const rows = signals.map((s) => {
    const o = outcomeMap[s.id];
    return [
      s.ticker,
      s.action,
      (s.confidence * 100).toFixed(1) + "%",
      s.entry_price ?? "",
      s.stop_loss ?? "",
      s.take_profit ?? "",
      s.net_profit ?? "",
      o?.outcome ?? "Pending",
      o?.actual_return != null ? (o.actual_return * 100).toFixed(2) + "%" : "",
      s.created_at,
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signals_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SignalsPage() {
  const { data: allSignals, isLoading } = useAllSignals();
  const { data: outcomes = [] } = useOutcomes();
  const { mutate: generateBatch, isPending: generating } = useGenerateBatchSignals();
  const { data: tradingStatus } = useTradingStatus();
  const { mutate: executeSignal, isPending: executing } = useExecuteSignal();
  const mt5Connected = tradingStatus?.connected ?? false;
  const [actionFilter, setActionFilter] = useState<Action | "ALL">("ALL");
  const [minConf, setMinConf] = useState(0);
  const [search, setSearch] = useState("");
  const [pendingSignalId, setPendingSignalId] = useState<number | null>(null);
  const qc = useQueryClient();

  const outcomeMap: Record<string, SignalOutcome> = {};
  for (const o of outcomes) {
    outcomeMap[String(o.signal_id)] = o;
  }

  let filtered: SignalResponse[] = allSignals ?? [];
  if (actionFilter !== "ALL") filtered = filtered.filter((s) => s.action === actionFilter);
  if (minConf > 0) filtered = filtered.filter((s) => s.confidence >= minConf);
  if (search) filtered = filtered.filter((s) => s.ticker.includes(search.toUpperCase()));

  const buyCount = allSignals?.filter((s) => s.action === "BUY").length ?? 0;
  const sellCount = allSignals?.filter((s) => s.action === "SELL").length ?? 0;
  const holdCount = allSignals?.filter((s) => s.action === "HOLD").length ?? 0;

  const pendingSignal = pendingSignalId != null
    ? (allSignals ?? []).find((s) => Number(s.id) === pendingSignalId) ?? null
    : null;

  function handleGenerateAll() {
    const tickers = (allSignals ?? []).map((s) => s.ticker);
    const unique = [...new Set(tickers)];
    if (unique.length > 0) generateBatch({ tickers: unique });
  }

  function handleConfirmExecute(volume: number | undefined) {
    if (pendingSignalId == null) return;
    executeSignal(
      { signalId: pendingSignalId, volume },
      { onSettled: () => setPendingSignalId(null) }
    );
  }

  return (
    <div>
      <Header title="Signals" />

      {pendingSignal && (
        <ExecuteDialog
          signal={pendingSignal}
          onConfirm={handleConfirmExecute}
          onCancel={() => setPendingSignalId(null)}
          loading={executing}
        />
      )}

      <div className="mt-6 space-y-5">
        {/* Summary chips + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-buy/10 border border-buy/20 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-buy font-bold">{buyCount}</span>
            <span className="text-muted">BUY</span>
          </div>
          <div className="flex items-center gap-2 bg-sell/10 border border-sell/20 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-sell font-bold">{sellCount}</span>
            <span className="text-muted">SELL</span>
          </div>
          <div className="flex items-center gap-2 bg-hold/10 border border-hold/20 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-hold font-bold">{holdCount}</span>
            <span className="text-muted">HOLD</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportCSV(filtered, outcomeMap)}
              disabled={!filtered.length}
            >
              <Download size={13} /> Export CSV
            </Button>
            <Button
              size="sm"
              loading={generating}
              onClick={handleGenerateAll}
              disabled={!allSignals?.length}
            >
              <Zap size={13} /> Generate All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["signals"] })}
            >
              <RefreshCw size={13} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Filter size={13} /> Action
            </div>
            <div className="flex gap-1">
              {ACTION_FILTERS.map((a) => (
                <button
                  key={a}
                  onClick={() => setActionFilter(a)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    actionFilter === a
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-muted hover:text-ink hover:bg-surface border border-transparent"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-muted">Min Confidence</span>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={minConf}
                onChange={(e) => setMinConf(Number(e.target.value))}
                className="w-24 accent-accent"
              />
              <span className="text-xs text-ink w-8">{Math.round(minConf * 100)}%</span>
            </div>

            <div className="ml-auto">
              <input
                type="text"
                placeholder="Filter ticker…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <SignalsWithOutcomesTable
              signals={filtered}
              outcomeMap={outcomeMap}
              mt5Connected={mt5Connected}
              onExecute={(id) => setPendingSignalId(id)}
              executing={executing}
            />
          ) : (
            <p className="text-sm text-muted text-center py-10">
              No signals match your filters
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
