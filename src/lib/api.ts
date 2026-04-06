import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach access token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear tokens and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
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
};

// ── Signals ───────────────────────────────────────────────────────────────────

export const signalsApi = {
  getAll: () => api.get("/signals"),
  getLatest: (ticker: string) => api.get(`/signals/latest/${ticker}`),
  getHistory: (ticker: string, limit = 50) =>
    api.get(`/signals/history/${ticker}`, { params: { limit } }),
  filterByAction: (action: string) => api.get(`/signals/filter/action/${action}`),
  filterHighConfidence: (min_confidence = 0.6) =>
    api.get("/signals/filter/high-confidence", { params: { min_confidence } }),
  generate: (ticker: string, interval = "1d") =>
    api.post("/signals/generate", { ticker, interval }),
  generateBatch: (tickers: string[], interval = "1d") =>
    api.post("/signals/generate/batch", { tickers, interval }),
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
  getSummary: () => api.get("/sentiment/summary"),
  getTickerSummary: (ticker: string) => api.get(`/sentiment/summary/${ticker}`),
  getSnapshot: (ticker: string) => api.get(`/sentiment/snapshot/${ticker}`),
  getArticles: (ticker: string) => api.get(`/sentiment/articles/${ticker}`),
};

// ── ML ────────────────────────────────────────────────────────────────────────

export const mlApi = {
  getStatus: () => api.get("/ml/status"),
  getReport: () => api.get("/ml/report"),
  getLastResult: () => api.get("/ml/train/result"),
  train: (tickers: string[], epochs = 50) =>
    api.post("/ml/train", { tickers, epochs }),
  predict: (ticker: string, interval = "1d") =>
    api.post("/ml/predict", { ticker, interval }),
};

// ── Ingest ────────────────────────────────────────────────────────────────────

export const ingestApi = {
  getTickers: () => api.get("/ingest/tickers"),
  getSP500: () => api.get("/ingest/sp500"),
  ingest: (tickers: string[], interval = "1d", period = "1y") =>
    api.post("/ingest", { tickers, interval, period }),
};
