export type Action = "BUY" | "SELL" | "HOLD";

export interface SignalResponse {
  id: string;
  ticker: string;
  interval: string;
  action: Action;
  confidence: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  net_profit: number | null;
  bars_to_entry: number | null;
  entry_time: string | null;
  probabilities: { buy: number; sell: number; hold: number } | null;
  prob_buy: number | null;
  prob_sell: number | null;
  prob_hold: number | null;
  source: string;
  created_at: string;
}

export interface OHLCVResponse {
  ticker: string;
  interval: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorsResponse {
  ticker: string;
  interval: string;
  timestamp: string;
  rsi_14: number | null;
  macd_line: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  sma_20: number | null;
  sma_50: number | null;
  ema_12: number | null;
  ema_26: number | null;
  atr_14: number | null;
  obv: number | null;
  volume_roc: number | null;
  adx: number | null;
  stoch_k: number | null;
  stoch_d: number | null;
  [key: string]: unknown;
}

export interface SentimentSnapshotResponse {
  ticker: string;
  window_start: string;
  window_end: string;
  article_count: number;
  avg_positive: number;
  avg_negative: number;
  avg_neutral: number;
  avg_compound: number;
  dominant_sentiment: string;
  computed_at: string;
}

export interface SentimentSummaryResponse {
  ticker: string;
  avg_compound: number;
  avg_positive: number;
  avg_negative: number;
  avg_neutral: number;
  // These may be present depending on query path
  dominant_sentiment?: string;
  article_count?: number;
  latest_article_at?: string | null;
}

export interface SentimentArticleResponse {
  id: string;
  ticker: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  published_at: string;
  sentiment_label: string;
  positive_score: number;
  negative_score: number;
  neutral_score: number;
  compound_score: number;
  ingested_at: string;
}

export interface ModelStatus {
  trained: boolean;
  info: {
    epoch?: number;
    val_loss?: number;
    val_acc?: number;
    test_accuracy?: number;
    test_f1_weighted?: number;
    sharpe_ratio?: number;
  };
}

export interface EvalReport {
  accuracy: number;
  f1_weighted: number;
  f1_macro: number;
  classification_report: Record<string, Record<string, number>>;
  confusion_matrix: number[][];
  regression: Record<string, { rmse: number; mae: number }>;
  trading: {
    sharpe_ratio: number;
    win_rate: number;
    total_trades: number;
    avg_return: number;
  };
}

export interface ModelVersion {
  version: string;
  created_at: string;
  val_loss: number;
  val_acc: number;
  is_best: boolean;
  tickers: string[];
  sharpe: number | null;
  accuracy: number | null;
}

export interface WalkForwardFold {
  fold: number;
  train_size: number;
  val_size: number;
  accuracy: number;
  f1_weighted: number;
  sharpe: number;
  win_rate: number;
  max_drawdown: number;
}

export interface WalkForwardResult {
  status: string;
  summary: {
    n_folds: number;
    avg_accuracy: number;
    avg_f1: number;
    avg_sharpe: number;
    avg_win_rate: number;
    avg_max_dd: number;
    std_sharpe: number;
  };
  folds: WalkForwardFold[];
  n_tickers: number;
  n_samples: number;
}

export interface SignalOutcome {
  id: number;
  signal_id: number;
  ticker: string;
  action: Action;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  outcome: "WIN" | "LOSS" | "EXPIRED";
  actual_return: number;
  bars_held: number;
  exit_price: number;
  exit_time: string;
  checked_at: string;
  confidence?: number;
  signal_at?: string;
}

export interface OutcomeSummary {
  total: number;
  wins: number;
  losses: number;
  expired: number;
  win_rate: number;
  avg_return: number;
  avg_win: number;
  avg_loss: number;
}

export interface Alert {
  id: number;
  ticker: string;
  action: Action;
  confidence: number;
  signal_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ConfluenceResult {
  ticker: string;
  label: Action;
  score: number;
  strength: "strong" | "weak" | "conflicting" | "neutral";
  daily: {
    action: Action;
    confidence: number;
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    updated_at: string | null;
  };
  hourly: {
    action: Action;
    confidence: number;
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    updated_at: string | null;
  };
}

export interface BacktestTrade {
  signal_id: number;
  action: Action;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  take_profit: number;
  outcome: "WIN" | "LOSS" | "EXPIRED";
  return_pct: number;
  pnl: number;
  bars_held: number;
  entry_time: string;
  exit_time: string | null;
  confidence: number;
}

export interface BacktestResult {
  ticker: string;
  interval: string;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_return_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  equity_curve: { date: string; equity: number }[];
  trades: BacktestTrade[];
}

export interface Position {
  id: number;
  user_id: number;
  ticker: string;
  quantity: number;
  avg_cost: number;
  opened_at: string;
  closed_at: string | null;
  realized_pnl: number;
  is_open: boolean;
  current_price: number | null;
  unrealized_pnl: number | null;
  unrealized_pct: number | null;
}

export interface PortfolioSummary {
  open_positions: number;
  total_cost: number;
  total_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
}

export interface Job {
  id: number;
  job_type: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface PriceAlertRule {
  id: number;
  ticker: string;
  condition: "above" | "below";
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface SP500Ticker {
  symbol: string;
  name: string;
  sector: string;
  market_cap: number | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  watchlist: string[];
  created_at: string;
}
