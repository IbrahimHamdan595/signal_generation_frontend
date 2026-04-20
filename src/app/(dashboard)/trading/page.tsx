"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useTradingStatus,
  useTradingConfig,
  useConnect,
  useDisconnect,
  useUpdateTradingConfig,
  useMT5Positions,
  useClosePosition,
  useExecutions,
} from "@/hooks/useTrading";
import { formatNumber } from "@/lib/utils";
import {
  Wifi, WifiOff, Shield, TrendingUp, TrendingDown,
  X, Settings, Activity,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        connected
          ? "bg-buy/10 text-buy border border-buy/20"
          : "bg-muted/10 text-muted border border-border"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-buy animate-pulse" : "bg-muted"}`} />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function PnlSpan({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span className={pos ? "text-buy" : "text-sell"}>
      {pos ? "+" : ""}${formatNumber(value, 2)}
    </span>
  );
}

// ── Connect form ──────────────────────────────────────────────────────────────

function ConnectForm() {
  const [account, setAccount]   = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer]     = useState("");
  const { mutate: connect, isPending } = useConnect();

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const acc = parseInt(account, 10);
    if (!acc || !password || !server) return;
    connect({ account: acc, password, server });
  }

  return (
    <Card glow="accent">
      <CardHeader>
        <CardTitle>Connect to MetaTrader 5</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <input
          type="number"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Account number"
          required
          className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="Server (e.g. AmanaCapital-Demo)"
          required
          className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        <div className="sm:col-span-3">
          <Button type="submit" loading={isPending} className="w-full justify-center">
            <Wifi size={15} /> Connect
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted mt-3">
        MT5 terminal must be installed and running on this machine.
        Find your server name in MT5 → File → Open Account.
      </p>
    </Card>
  );
}

// ── Risk config ───────────────────────────────────────────────────────────────

function RiskConfig() {
  const { data: config } = useTradingConfig();
  const { mutate: update, isPending } = useUpdateTradingConfig();

  const [risk, setRisk]         = useState(String(config?.risk_per_trade_pct ?? 1));
  const [maxPos, setMaxPos]     = useState(String(config?.max_open_positions ?? 5));
  const [maxLoss, setMaxLoss]   = useState(String(config?.max_daily_loss_pct ?? 3));
  const [minConf, setMinConf]   = useState(String(config?.min_confidence ?? 0.7));
  const [suffix, setSuffix]     = useState(config?.symbol_suffix ?? "");
  const [autoTrade, setAutoTrade] = useState(config?.auto_trade ?? false);

  function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    update({
      risk_per_trade_pct: parseFloat(risk),
      max_open_positions: parseInt(maxPos, 10),
      max_daily_loss_pct: parseFloat(maxLoss),
      min_confidence:     parseFloat(minConf),
      symbol_suffix:      suffix,
      auto_trade:         autoTrade,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-muted" />
          <CardTitle>Risk Configuration</CardTitle>
        </div>
      </CardHeader>
      <form onSubmit={handleSave} className="mt-3 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted">Risk per trade (%)</span>
            <input
              type="number" value={risk} onChange={(e) => setRisk(e.target.value)}
              min="0.1" max="10" step="0.1"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Max open positions</span>
            <input
              type="number" value={maxPos} onChange={(e) => setMaxPos(e.target.value)}
              min="1" max="50"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Max daily loss (%)</span>
            <input
              type="number" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)}
              min="0.5" max="20" step="0.5"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Min confidence</span>
            <input
              type="number" value={minConf} onChange={(e) => setMinConf(e.target.value)}
              min="0.5" max="1" step="0.05"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
            />
          </label>
        </div>

        <div className="flex items-center gap-4">
          <label className="space-y-1 flex-1">
            <span className="text-xs text-muted">Symbol suffix</span>
            <input
              type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)}
              placeholder='e.g. ".a" or ".US" — leave empty for forex'
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <div
              onClick={() => setAutoTrade((v: boolean) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                autoTrade ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  autoTrade ? "translate-x-5" : ""
                }`}
              />
            </div>
            <span className="text-sm text-ink">Auto-trade</span>
          </label>
        </div>

        {autoTrade && (
          <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
            Auto-trade is enabled. The scheduler will automatically execute BUY/SELL signals
            that meet the minimum confidence threshold after each signal generation cycle.
          </p>
        )}

        <Button type="submit" loading={isPending} size="sm">Save Configuration</Button>
      </form>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TradingPage() {
  const { data: status, isLoading: loadingStatus } = useTradingStatus();
  const { data: positions = [], isLoading: loadingPositions } = useMT5Positions();
  const { data: executions = [], isLoading: loadingExec } = useExecutions(50);
  const { mutate: disconnect, isPending: disconnecting } = useDisconnect();
  const { mutate: closePos, isPending: closing } = useClosePosition();

  const connected = status?.connected ?? false;
  const account   = status?.account;

  const totalProfit = positions.reduce((s, p) => s + (p.profit ?? 0), 0);

  return (
    <div>
      <Header title="Trading" />
      <div className="mt-6 space-y-5">

        {/* Account status bar */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge connected={connected} />
              {connected && account ? (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted">#{account.login}</span>
                  <span className="text-muted">{account.server}</span>
                  <span className="font-semibold text-ink">
                    ${formatNumber(account.balance, 2)} {account.currency}
                  </span>
                  <span className="text-muted">
                    Equity ${formatNumber(account.equity, 2)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {account.is_demo ? "DEMO" : "LIVE"} · {account.leverage}x
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted">No MT5 connection</span>
              )}
            </div>
            {connected && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => disconnect()}
                loading={disconnecting}
              >
                <WifiOff size={14} /> Disconnect
              </Button>
            )}
          </div>
        </Card>

        {/* Connect form — shown when not connected */}
        {!loadingStatus && !connected && <ConnectForm />}

        {/* Risk config — always visible once configured */}
        {(connected || status?.account) && <RiskConfig />}

        {/* Live positions */}
        {connected && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-muted" />
                  <CardTitle>Open Positions ({positions.length})</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {positions.length > 0 && (
                    <span className={`text-sm font-semibold ${totalProfit >= 0 ? "text-buy" : "text-sell"}`}>
                      Float P&L: {totalProfit >= 0 ? "+" : ""}${formatNumber(totalProfit, 2)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            {loadingPositions ? (
              <div className="space-y-2 mt-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No open positions in MT5</p>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted border-b border-border">
                      <th className="text-left py-2 pr-4">Symbol</th>
                      <th className="text-left py-2 pr-4">Side</th>
                      <th className="text-right py-2 pr-4">Volume</th>
                      <th className="text-right py-2 pr-4">Open</th>
                      <th className="text-right py-2 pr-4">Current</th>
                      <th className="text-right py-2 pr-4">SL / TP</th>
                      <th className="text-right py-2 pr-4">Profit</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.ticket} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 pr-4 font-mono font-semibold text-ink">{p.symbol}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`flex items-center gap-1 text-xs font-semibold ${p.side === "BUY" ? "text-buy" : "text-sell"}`}>
                            {p.side === "BUY" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {p.side}
                          </span>
                        </td>
                        <td className="text-right py-2.5 pr-4 text-ink">{p.volume}</td>
                        <td className="text-right py-2.5 pr-4 text-muted">{formatNumber(p.open_price, 5)}</td>
                        <td className="text-right py-2.5 pr-4 text-ink">{formatNumber(p.current_price, 5)}</td>
                        <td className="text-right py-2.5 pr-4 text-xs text-muted">
                          {formatNumber(p.stop_loss, 5)} / {formatNumber(p.take_profit, 5)}
                        </td>
                        <td className="text-right py-2.5 pr-4">
                          <PnlSpan value={p.profit} />
                        </td>
                        <td className="text-right py-2.5">
                          <button
                            onClick={() => closePos(p.ticket)}
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
        )}

        {/* Execution history */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-muted" />
              <CardTitle>Execution History</CardTitle>
            </div>
          </CardHeader>

          {loadingExec ? (
            <div className="space-y-2 mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No executions yet — connect MT5 and execute a signal to get started
            </p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Symbol</th>
                    <th className="text-left py-2 pr-4">Side</th>
                    <th className="text-right py-2 pr-4">Volume</th>
                    <th className="text-right py-2 pr-4">Fill Price</th>
                    <th className="text-right py-2 pr-4">Status</th>
                    <th className="text-right py-2 pr-4">P&L</th>
                    <th className="text-right py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e) => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-ink">{e.symbol}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-semibold ${e.order_type === "BUY" ? "text-buy" : "text-sell"}`}>
                          {e.order_type}
                        </span>
                      </td>
                      <td className="text-right py-2.5 pr-4 text-ink">{e.volume ?? "—"}</td>
                      <td className="text-right py-2.5 pr-4 text-muted">
                        {e.fill_price != null ? formatNumber(e.fill_price, 5) : "—"}
                      </td>
                      <td className="text-right py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          e.status === "filled"
                            ? "bg-buy/10 text-buy border border-buy/20"
                            : e.status === "closed"
                            ? "bg-muted/10 text-muted border border-border"
                            : "bg-sell/10 text-sell border border-sell/20"
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="text-right py-2.5 pr-4">
                        {e.pnl != null ? <PnlSpan value={e.pnl} /> : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-right py-2.5 text-xs text-muted">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
