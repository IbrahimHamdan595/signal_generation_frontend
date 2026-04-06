"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ActionBadge } from "@/components/ui/Badge";
import { ingestApi } from "@/lib/api";
import { useAllSignals } from "@/hooks/useSignals";
import { formatPrice, formatPercent, formatRelative } from "@/lib/utils";
import Header from "@/components/layout/Header";
import { Search, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

export default function MarketPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: tickers, isLoading: loadingTickers } = useQuery<string[]>({
    queryKey: ["ingest", "tickers"],
    queryFn: async () => {
      const res = await ingestApi.getTickers();
      return res.data;
    },
  });

  const { data: signals } = useAllSignals();

  const signalMap = Object.fromEntries(
    (signals ?? []).map((s) => [s.ticker, s])
  );

  const filtered = (tickers ?? []).filter((t) =>
    t.toUpperCase().includes(search.toUpperCase())
  );

  return (
    <div>
      <Header title="Market" />
      <div className="mt-6 space-y-5">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker…"
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
            <BarChart2 size={14} className="text-muted" />
            <span className="text-muted">Tickers with data:</span>
            <span className="text-ink font-semibold">{tickers?.length ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
            <TrendingUp size={14} className="text-buy" />
            <span className="text-muted">BUY signals:</span>
            <span className="text-buy font-semibold">
              {signals?.filter((s) => s.action === "BUY").length ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
            <TrendingDown size={14} className="text-sell" />
            <span className="text-muted">SELL signals:</span>
            <span className="text-sell font-semibold">
              {signals?.filter((s) => s.action === "SELL").length ?? 0}
            </span>
          </div>
        </div>

        {/* Ticker grid */}
        <Card>
          <CardHeader>
            <CardTitle>Available Tickers</CardTitle>
            <span className="text-xs text-muted">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </CardHeader>

          {loadingTickers ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">
              {tickers?.length === 0
                ? "No data ingested yet — use POST /api/v1/ingest to load tickers"
                : "No tickers match your search"}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filtered.map((ticker) => {
                const sig = signalMap[ticker];
                return (
                  <button
                    key={ticker}
                    onClick={() => router.push(`/market/${ticker}`)}
                    className="group flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                        {ticker}
                      </span>
                      {sig && <ActionBadge action={sig.action} className="text-[9px] px-1.5 py-0" />}
                    </div>

                    {sig ? (
                      <>
                        <p className="text-xs text-ink font-medium">
                          {formatPrice(sig.entry_price)}
                        </p>
                        <p className="text-[10px] text-muted">
                          {formatPercent(sig.confidence)} conf
                        </p>
                        <p className="text-[10px] text-muted truncate">
                          {formatRelative(sig.created_at)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted mt-1">No signal</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
