"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import SignalsTable from "@/components/signals/SignalsTable";
import { useAllSignals, useHighConfidenceSignals } from "@/hooks/useSignals";
import type { Action, SignalResponse } from "@/types";
import Header from "@/components/layout/Header";
import { Filter, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ACTION_FILTERS: (Action | "ALL")[] = ["ALL", "BUY", "SELL", "HOLD"];

export default function SignalsPage() {
  const { data: allSignals, isLoading } = useAllSignals();
  const [actionFilter, setActionFilter] = useState<Action | "ALL">("ALL");
  const [minConf, setMinConf] = useState(0);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  let filtered: SignalResponse[] = allSignals ?? [];
  if (actionFilter !== "ALL") filtered = filtered.filter((s) => s.action === actionFilter);
  if (minConf > 0) filtered = filtered.filter((s) => s.confidence >= minConf);
  if (search) filtered = filtered.filter((s) => s.ticker.includes(search.toUpperCase()));

  const buyCount = allSignals?.filter((s) => s.action === "BUY").length ?? 0;
  const sellCount = allSignals?.filter((s) => s.action === "SELL").length ?? 0;
  const holdCount = allSignals?.filter((s) => s.action === "HOLD").length ?? 0;

  return (
    <div>
      <Header title="Signals" />
      <div className="mt-6 space-y-5">
        {/* Summary chips */}
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
          <div className="ml-auto">
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
            <Spinner />
          ) : filtered.length > 0 ? (
            <SignalsTable signals={filtered} />
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
