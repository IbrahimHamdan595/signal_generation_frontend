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
  dominant_sentiment: string;
  avg_compound: number;
  article_count: number;
  latest_article_at: string | null;
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
