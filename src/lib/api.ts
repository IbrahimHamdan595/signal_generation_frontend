import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Attach access token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: try silent refresh first, then redirect to login
let _refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (
      err.response?.status === 401 &&
      typeof window !== "undefined" &&
      !original._retried
    ) {
      original._retried = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        // Deduplicate concurrent refresh calls
        if (!_refreshing) {
          _refreshing = axios
            .post(`${BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken }, {
              headers: { "ngrok-skip-browser-warning": "true" },
            })
            .then((r) => {
              localStorage.setItem("access_token", r.data.access_token);
              localStorage.setItem("refresh_token", r.data.refresh_token);
              return r.data.access_token;
            })
            .catch(() => null)
            .finally(() => { _refreshing = null; });
        }

        const newToken = await _refreshing;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);          // retry with new token
        }
      }

      // Refresh failed — clear and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (full_name: string, email: string, password: string) =>
    api.post("/auth/register", { full_name, email, password }),
  me: () => api.get("/auth/me"),
  updateProfile: (data: { full_name?: string; email?: string }) =>
    api.put("/users/me", data),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/users/me/password", { current_password, new_password }),
};

// ── Signals ───────────────────────────────────────────────────────────────────

export const signalsApi = {
  getAll: () => api.get("/signals"),
  getLatest: (ticker: string) => api.get(`/signals/latest/${ticker}`),
  getHistory: (ticker: string, limit = 50) =>
    api.get(`/signals/history/${ticker}`, { params: { limit } }),
  filterByAction: (action: string, interval = "1d", limit = 50) =>
    api.get(`/signals/filter/action/${action}`, { params: { interval, limit } }),
  filterHighConfidence: (min_confidence = 0.6) =>
    api.get("/signals/filter/high-confidence", { params: { min_confidence } }),
  generate: (ticker: string, interval = "1d") =>
    api.post("/signals/generate", { ticker, interval }),
  generateBatch: (tickers: string[], interval = "1d") =>
    api.post("/signals/generate/batch", { tickers, interval }),
  explain: (signalId: string) => api.get(`/signals/${signalId}/explain`),
  getTickers: () => api.get("/signals/tickers"),
  setOverride: (tickers: string[]) => api.post("/signals/tickers/override", { tickers }),
  clearOverride: () => api.delete("/signals/tickers/override"),
};

// ── Market ────────────────────────────────────────────────────────────────────

export const marketApi = {
  getOHLCV: (ticker: string, interval = "1d", limit = 200) =>
    api.get(`/market/ohlcv/${ticker}`, { params: { interval, limit } }),
  getIndicators: (ticker: string, interval = "1d", limit = 200) =>
    api.get(`/market/indicators/${ticker}`, { params: { interval, limit } }),
  getLatestIndicators: (ticker: string, interval = "1d") =>
    api.get(`/market/indicators/${ticker}/latest`, { params: { interval } }),
};

// ── Sentiment ─────────────────────────────────────────────────────────────────

export const sentimentApi = {
  getDailyTickers: () => api.get<string[]>("/sentiment/daily/tickers"),
  getSummary: () => api.get("/sentiment/summary"),
  getTickerSummary: (ticker: string) => api.get(`/sentiment/summary/${ticker}`),
  getSnapshot: (ticker: string) => api.get(`/sentiment/snapshot/${ticker}`),
  getSnapshotHistory: (ticker: string, limit = 30) =>
    api.get(`/sentiment/snapshot/${ticker}/history`, { params: { limit } }),
  getArticles: (ticker: string) => api.get(`/sentiment/articles/${ticker}`),
  fetch: (tickers: string[], limit = 10) =>
    api.post("/sentiment/fetch", { tickers, limit }),
};

// ── ML ────────────────────────────────────────────────────────────────────────

// asset_class routes to the equities/fx checkpoint folders so each model's
// status, report, versions and rollback can be viewed independently.
export type AssetClass = "equities" | "fx";

export const mlApi = {
  getStatus: (asset_class: AssetClass = "equities") =>
    api.get("/ml/status", { params: { asset_class } }),
  getReport: (asset_class: AssetClass = "equities") =>
    api.get("/ml/report", { params: { asset_class } }),
  getLastResult: (asset_class: AssetClass = "equities") =>
    api.get("/ml/train/result", { params: { asset_class } }),
  train: (tickers: string[], epochs = 50, asset_class: AssetClass = "equities") =>
    api.post("/ml/train", { tickers, epochs, asset_class }),
  trainSync: (tickers: string[], epochs = 20, asset_class: AssetClass = "equities") =>
    api.post("/ml/train/sync", { tickers, epochs, asset_class }),
  predict: (ticker: string, interval = "1d") =>
    api.post("/ml/predict", { ticker, interval }),
  runWalkForward: (tickers: string[], n_splits = 5, epochs = 30) =>
    api.post("/ml/walkforward", { tickers, n_splits, epochs }),
  getWalkForwardResult: () => api.get("/ml/walkforward/result"),
  listVersions: (asset_class: AssetClass = "equities") =>
    api.get("/ml/versions", { params: { asset_class } }),
  rollback: (version: string, asset_class: AssetClass = "equities") =>
    api.post("/ml/versions/rollback", null, { params: { version, asset_class } }),
};

// ── Ingest ────────────────────────────────────────────────────────────────────

export const ingestApi = {
  getTickers: () => api.get("/ingest/tickers"),
  getSP500: () => api.get("/ingest/sp500"),
  ingest: (tickers: string[], interval = "1d", period = "1y") =>
    api.post("/ingest", { tickers, interval, period }),
  ingestBackground: (tickers: string[], interval = "1d", period = "1y") =>
    api.post("/ingest/background", { tickers, interval, period }),
  ingestTicker: (ticker: string, interval = "1d", period = "1y") =>
    api.post("/ingest/ticker", { ticker, interval, period }),
  enrichSentiment: (tickers: string[], period_years = 2) =>
    api.post("/sentiment/enrich", { tickers, period_years }),
  buildDailySentiment: (tickers: string[], years = 5) =>
    api.post("/sentiment/build-daily", { tickers, years }),
  fetchSentiment: (tickers: string[], limit = 10) =>
    sentimentApi.fetch(tickers, limit),
};

// ── Outcomes ──────────────────────────────────────────────────────────────────

export const outcomesApi = {
  getAll: (ticker?: string, limit = 100) =>
    api.get("/outcomes", { params: { ticker, limit } }),
  getSummary: () => api.get("/outcomes/summary"),
  triggerCheck: () => api.post("/outcomes/check"),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export const alertsApi = {
  getAll: (unread_only = false) =>
    api.get("/alerts", { params: { unread_only } }),
  getCount: () => api.get("/alerts/count"),
  markRead: (id: number) => api.post(`/alerts/${id}/read`),
  markAllRead: () => api.post("/alerts/read-all"),
};

// ── Confluence ────────────────────────────────────────────────────────────────

export const confluenceApi = {
  get: (ticker: string) => api.get(`/confluence/${ticker}`),
  getBatch: (tickers: string[]) => api.post("/confluence/batch", tickers),
};

// ── Backtest ──────────────────────────────────────────────────────────────────

export const backtestApi = {
  run: (ticker: string, interval = "1d", initial_capital = 10000) =>
    api.get(`/backtest/${ticker}`, { params: { interval, initial_capital } }),
  runPortfolio: (tickers: string[], interval = "1d", initial_capital = 100000) =>
    api.post("/backtest/portfolio", tickers, { params: { interval, initial_capital } }),
};

// ── Watchlist ─────────────────────────────────────────────────────────────────

export const watchlistApi = {
  get: () => api.get("/users/me/watchlist"),
  add: (ticker: string) => api.post(`/users/me/watchlist/${ticker}`),
  remove: (ticker: string) => api.delete(`/users/me/watchlist/${ticker}`),
  replace: (tickers: string[]) => api.put("/users/me/watchlist", { watchlist: tickers }),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────

export const portfolioApi = {
  getPositions: () => api.get("/portfolio/positions"),
  getSummary: () => api.get("/portfolio/summary"),
  openPosition: (ticker: string, quantity: number, price: number, signal_id?: number) =>
    api.post("/portfolio/positions", { ticker, quantity, price, signal_id }),
  closePosition: (id: number, price: number) =>
    api.post(`/portfolio/positions/${id}/close`, { price }),
};

// ── Price Alert Rules ─────────────────────────────────────────────────────────

export const priceAlertRulesApi = {
  getAll: () => api.get("/price-alerts"),
  create: (ticker: string, condition: "above" | "below", target_price: number) =>
    api.post("/price-alerts", { ticker, condition, target_price }),
  delete: (id: number) => api.delete(`/price-alerts/${id}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────

export const jobsApi = {
  get: (id: string) => api.get(`/jobs/${id}`),
  getLatest: (type: string) => api.get(`/jobs/latest/${type}`),
};

// ── Trading (MT5) ─────────────────────────────────────────────────────────────

export const tradingApi = {
  getStatus:    () => api.get("/trading/status"),
  connect:      (account: number, password: string, server: string, path?: string) =>
    api.post("/trading/connect", { account, password, server, path }),
  disconnect:   () => api.post("/trading/disconnect"),
  getConfig:    () => api.get("/trading/config"),
  updateConfig: (updates: Record<string, unknown>) => api.put("/trading/config", updates),
  executeSignal:(signalId: number, volume?: number) =>
    api.post(`/trading/execute/${signalId}`, volume != null ? { volume } : {}),
  getPositions: () => api.get("/trading/positions"),
  closePosition:(ticket: number) => api.post(`/trading/positions/${ticket}/close`),
  getExecutions:(limit?: number, offset?: number) =>
    api.get("/trading/executions", { params: { limit, offset } }),
  runNow:       () => api.post("/trading/run-now"),
};

// ── Live Edge ─────────────────────────────────────────────────────────────────

export const liveEdgeApi = {
  getSummary:     (days = 30) => api.get("/live-edge/summary", { params: { days } }),
  getDaily:       (days = 30) => api.get("/live-edge/daily",   { params: { days } }),
  getCalibration: ()          => api.get("/live-edge/calibration"),
  getSlippage:    ()          => api.get("/live-edge/slippage"),
};

// ── Three-pipeline orchestration (Phase 8b) ────────────────────────────────
export type PipelineSource = "ml_equities" | "ml_fx" | "rule_donchian";

export interface Pipeline {
  source:             PipelineSource;
  display_name:       string;
  description:        string;
  kind:               "ml" | "rule";
  enabled:            boolean;
  last_run_at:        string | null;
  last_signals_count: number | null;
  last_error:         string | null;
  config:             Record<string, unknown>;
  updated_at:         string | null;
}

export interface PipelineResetResult {
  status:                 "reset";
  pending_orders_cleared: number;
  pipeline_cards_reset:   boolean;
  equity_snapshot_rebased: boolean;
  auto_trade_reenabled:   number;
  note:                   string;
}

export const pipelinesApi = {
  list:       ()                                                                    => api.get<{ pipelines: Pipeline[] }>("/pipelines"),
  update:     (source: PipelineSource, body: Partial<Pick<Pipeline, "enabled" | "config">>) => api.patch<Pipeline>(`/pipelines/${source}`, body),
  runOne:     (source: PipelineSource) => api.post<{ status: string; source: string }>(`/pipelines/${source}/run`),
  runAll:     ()                       => api.post<{ status: string; sources?: string[] }>("/pipelines/run-all"),
  reset:      ()                       => api.post<PipelineResetResult>("/pipelines/reset"),
};

// ── Strategy comparison report (Phase 8) ────────────────────────────────────
export interface EquityCurvePoint { timestamp: string | null; cum_pnl_raw: number; cum_pnl_adj: number; }
export interface StrategyAggregate {
  source:             PipelineSource | string;
  display_name:       string;
  total_trades:       number;
  wins:               number;
  losses:             number;
  win_rate:           number;
  total_pnl_usd:      number;
  total_pnl_usd_adj:  number;
  avg_pnl_per_trade:  number;
  sharpe_per_trade:   number;
  max_drawdown_usd:   number;
  max_drawdown_pct:   number;
  equity_curve:       EquityCurvePoint[];
}
export interface StrategyComparison {
  since:      string;
  until:      string;
  cost_model: Record<string, number>;
  sources:    StrategyAggregate[];
}

export interface StrategyTrade {
  id:             number;
  signal_id:      number;
  ticker:         string;
  symbol:         string | null;
  mt5_ticket:     number | null;
  action:         "BUY" | "SELL" | "HOLD";
  order_type:     string | null;
  volume:         number;
  fill_price:     number;
  stop_loss:      number;
  take_profit:    number;
  confidence:     number | null;
  predicted_rr:   number | null;
  expected_value: number | null;
  pnl_raw_usd:    number;
  pnl_adj_usd:    number;
  cost_usd:       number;
  outcome:        "win" | "loss" | "flat";
  status:         string | null;
  closed_at:      string | null;
  created_at:     string | null;
}

export const reportsApi = {
  comparison: (since?: string) =>
    api.get<StrategyComparison>("/reports/strategy-comparison", { params: since ? { since } : {} }),
  trades:     (source: PipelineSource, since?: string, limit = 200) =>
    api.get<{ source: string; display_name: string; since: string; count: number; trades: StrategyTrade[] }>(
      `/reports/strategy-trades/${source}`,
      { params: { since, limit } },
    ),
};

// ── WebSocket helpers ─────────────────────────────────────────────────────────

export const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/^http/, "ws");

export function createPriceSocket(tickers: string[]): WebSocket {
  return new WebSocket(`${WS_BASE}/api/v1/ws/prices?tickers=${tickers.join(",")}`);
}
