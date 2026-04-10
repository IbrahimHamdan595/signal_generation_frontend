# Signal — Frontend Documentation

## Overview

**Signal** is an AI-powered trading signal dashboard built with Next.js 14 (App Router). It provides a real-time interface for monitoring machine-learning generated trading signals, market data, portfolio positions, and model performance metrics. The frontend communicates exclusively with the Signal FastAPI backend and is designed for a single authenticated user.

**Stack:**
- **Framework:** Next.js 14 (App Router, `"use client"` components)
- **Styling:** Tailwind CSS with a custom dark-theme design system
- **Data Fetching:** TanStack React Query v5 (server state, caching, polling)
- **Global State:** Zustand (auth tokens, user profile)
- **HTTP Client:** Axios with a JWT refresh interceptor
- **Charts:** Recharts (area charts, custom tooltips)
- **Notifications:** react-hot-toast
- **Icons:** lucide-react
- **PWA:** Web App Manifest + Service Worker (network-first for API, cache-first for assets)

---

## Authentication

All routes under `/(dashboard)` require a valid JWT. The auth flow:

1. User submits credentials on `/login` → receives `access_token` + `refresh_token`
2. Tokens are stored in `localStorage`
3. Every Axios request attaches `Authorization: Bearer <access_token>`
4. On 401, a **silent refresh** is attempted: a single shared promise (`_refreshing`) deduplicates concurrent refresh calls so only one `/auth/refresh` request fires even if multiple requests fail simultaneously
5. On refresh failure, tokens are cleared and the user is redirected to `/login`

**Files:** `src/lib/api.ts` (interceptor), `src/store/auth.ts` (Zustand), `src/app/(auth)/login/page.tsx`

---

## Design System

All UI follows a consistent dark theme defined in Tailwind config:

| Token | Usage |
|-------|-------|
| `text-ink` | Primary text |
| `text-muted` | Secondary / label text |
| `bg-card` | Card backgrounds |
| `bg-surface` | Inner surface / input backgrounds |
| `border-border` | Dividers and outlines |
| `text-buy` / `text-sell` / `text-hold` | Signal action colours (green / red / amber) |
| `text-accent` | Brand accent (highlights, active states) |

**Reusable components:** `Card`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `ActionBadge`, `Skeleton`, `SkeletonCard`, `SkeletonTable`

---

## Layout & Navigation

### Sidebar (`src/components/layout/Sidebar.tsx`)

Responsive sidebar with:
- **Desktop:** fixed 240px column on the left
- **Mobile:** slide-in drawer triggered by a hamburger button (top-left)

Navigation links:

| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/` | LayoutDashboard |
| Signals | `/signals` | TrendingUp |
| Market | `/market` | BarChart2 |
| Model | `/model` | Brain |
| Watchlist | `/watchlist` | Star |
| Portfolio | `/portfolio` | Briefcase |
| Settings | `/settings` | Settings |

### Header (`src/components/layout/Header.tsx`)

Per-page header with:
- Page title
- **Alert bell** with unread count badge
- Alert dropdown — shows recent alerts, supports unread-only filter and bulk mark-all-read

### Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)

Leader-key navigation: press `G` then a second key within 1.5 seconds. Ignores events fired inside input fields.

| Shortcut | Navigates to |
|----------|-------------|
| G → S | `/signals` |
| G → M | `/model` |
| G → O | `/portfolio` |
| G → W | `/watchlist` |
| G → D | `/` (Dashboard) |

---

## Pages

### Dashboard (`/`)

**File:** `src/app/(dashboard)/page.tsx`

Overview cards showing the current state of the system at a glance:
- **Model status** — trained / untrained + epoch
- **Signal count** — total signals in DB
- **Win Rate** — from the latest outcome summary
- **Unread alerts** — count from `/alerts/count`

Skeleton loaders shown while data is fetching. Links to Signals and Model pages.

---

### Signals (`/signals`)

**File:** `src/app/(dashboard)/signals/page.tsx`

Full signal log with:
- Filter by action (BUY / SELL / HOLD) and interval (1d / 1h)
- Signal table: ticker, action badge, confidence bar, entry/SL/TP prices, outcome badge (WIN / LOSS / EXPIRED + actual return %)
- **CSV export** button — downloads all visible rows as a `.csv` file
- Skeleton table while loading; auto-refreshes every 60 seconds

---

### Market (`/market`)

**File:** `src/app/(dashboard)/market/page.tsx`

Grid of all tickers with signals. Each card shows the ticker symbol and links to the ticker detail page. Skeleton grid while loading.

---

### Market Detail (`/market/[symbol]`)

**File:** `src/app/(dashboard)/market/[symbol]/page.tsx`

Per-ticker deep-dive page with:

**Live Price** (`useLivePrice`)
- WebSocket connection to `/ws/prices?tickers={symbol}`
- Price flashes **green** on up-tick, **red** on down-tick (600ms animation)
- "LIVE" badge shown while socket is connected; auto-reconnects after 5s on disconnect

**OHLCV Chart**
- Recharts `ComposedChart` with candlestick-style area for close price
- Configurable limit (50 / 100 / 200 bars)

**Technical Indicators Panel**
- RSI gauge, MACD line/signal/histogram, Bollinger Band position
- Latest indicator snapshot loaded via `useLatestIndicators`

**Sentiment Card**
- Dominant sentiment label, compound score, article count from `useTickerSentiment`

**Confluence Card** (`useConfluence`)
- Multi-timeframe score (0–100) displayed as a gradient progress bar
- Colour-coded strength: green ≥ 70, amber 40–70, red < 40
- Daily and hourly signal breakdown

**Backtest link** — navigates to `/model/backtest`

---

### Model (`/model`)

**File:** `src/app/(dashboard)/model/page.tsx`

ML model management hub:

**Status cards** (auto-refresh 30s)
- Model trained/untrained, test accuracy, Sharpe ratio, win rate

**Classification Report**
- 3×3 confusion matrix (`ConfusionMatrix` component)
- Per-class precision / recall / F1

**Regression Metrics**
- RMSE and MAE for entry price, stop-loss, take-profit, net profit

**Trading Simulation**
- Average return per trade, total trades, win rate, Sharpe (annualised)

**Trigger Training**
- Comma-separated ticker input (min 2 required)
- `POST /ml/train` returns `job_id` immediately; `useJobStatus` polls that job every 3s and displays live status: running → completed / failed with error message

**Walk-Forward Validation**
- Configurable folds (2–10 via slider)
- Per-fold table: accuracy, F1, Sharpe, win rate

**Last Training Run**
- Shows key metrics from the last completed training: val loss, val accuracy, epoch count, sample counts, tickers

**Model Versions**
- Scrollable list of all versioned checkpoints with metrics
- One-click rollback to any previous version

---

### Model Backtest (`/model/backtest`)

**File:** `src/app/(dashboard)/model/backtest/page.tsx`

Interactive backtester:
- Ticker input + interval selector + initial capital
- Results: total return, Sharpe ratio, max drawdown, win rate, trade count
- **Equity curve** — Recharts `AreaChart` with gradient fill
- **Trade log table** — every trade: action, entry/exit price, outcome badge, return %, P&L, bars held

---

### Watchlist (`/watchlist`)

**File:** `src/app/(dashboard)/watchlist/page.tsx`

User's followed tickers with:
- Add ticker form (input + submit)
- Per-ticker row showing:
  - **Confluence score** — colour-coded bar (green / amber / red)
  - **Action badge** from the confluence engine
  - **Outcome stats** — WIN% and LOSS% computed from historical outcomes
- Remove button per ticker
- Link to ticker detail page

---

### Portfolio (`/portfolio`)

**File:** `src/app/(dashboard)/portfolio/page.tsx`

Paper trading portfolio manager:

**Summary cards**
- Open positions count, total market value, unrealised P&L (with glow), realised P&L (with glow)
- Colour-coded: green for profit, red for loss

**Open Position form** (collapsible)
- Ticker, quantity, entry price inputs
- Submits to `POST /portfolio/positions`; handles averaging-down server-side

**Open Positions table**
- Columns: ticker, quantity, avg cost, current price, unrealised P&L ($), return (%)
- Close button — uses `current_price` if available, otherwise prompts for exit price
- Refreshes every 30 seconds

**Closed Positions table**
- Historical closed trades with realised P&L per row

---

### Settings (`/settings`)

**File:** `src/app/(dashboard)/settings/page.tsx`

User configuration in three sections:

**Profile**
- Edit full name and email via `PUT /users/me`

**Password**
- Change password via `POST /users/me/password` (requires current password verification)

**Price Alert Rules**
- Create rules: ticker + condition (`above` / `below`) + target price
- List all active rules with ticker, condition, and target price
- Delete individual rules
- Rules are checked every 5 minutes by the scheduler

**Keyboard Shortcuts Reference**
- Static table listing all available leader-key shortcuts

---

## Data Layer

### API Client (`src/lib/api.ts`)

Single Axios instance with base URL from `NEXT_PUBLIC_API_URL`. Organized into namespaced objects:

| Export | Covers |
|--------|--------|
| `authApi` | Login, register, refresh, me, update profile, change password |
| `signalsApi` | Generate, history, filter, explain, tickers override |
| `marketApi` | OHLCV, indicators, latest indicators |
| `sentimentApi` | Summary, ticker summary, snapshot, history, articles, fetch |
| `mlApi` | Train, predict, report, status, versions, walkforward |
| `ingestApi` | Tickers, SP500, ingest, enrich |
| `outcomesApi` | All outcomes, summary, trigger check |
| `alertsApi` | List, count, mark read, mark all read |
| `confluenceApi` | Single ticker, batch |
| `backtestApi` | Single ticker, portfolio |
| `watchlistApi` | Get, add, remove, replace |
| `portfolioApi` | Positions, summary, open, close |
| `priceAlertRulesApi` | List, create, delete |
| `jobsApi` | Get by ID, get latest by type |
| `createPriceSocket` | WebSocket factory for live price stream |

### React Query Hooks (`src/hooks/`)

| Hook file | Exports |
|-----------|---------|
| `useModel.ts` | `useModelStatus`, `useEvalReport`, `useTrainModel`, `useModelVersions`, `useRollbackModel`, `useWalkForwardResult`, `useRunWalkForward`, `useLastTrainResult` |
| `useSignalsByAction.ts` | `useSignalsByAction`, `useSignalTickers` |
| `useJobStatus.ts` | `useJobStatus` (polls 3s, auto-stops on terminal), `useLatestJob` |
| `usePortfolio.ts` | `usePositions`, `usePortfolioSummary`, `useOpenPosition`, `useClosePosition` |
| `useOutcomes.ts` | `useOutcomes`, `useOutcomeSummary`, `useTriggerOutcomeCheck` |
| `useAlerts.ts` | `useAlerts`, `useAlertCount`, `useMarkAlertRead`, `useMarkAllAlertsRead` |
| `useConfluence.ts` | `useConfluence`, `useConfluenceBatch` |
| `useBacktest.ts` | `useBacktest` (mutation + result state), `usePortfolioBacktest` |
| `useWatchlist.ts` | `useWatchlist`, `useAddToWatchlist`, `useRemoveFromWatchlist`, `useReplaceWatchlist` |
| `useSentiment.ts` | `useSentimentSummaries`, `useSentimentSnapshot`, `useSentimentHistory`, `useTickerSentiment`, `useSentimentArticles` |
| `useLivePrice.ts` | `useLivePrice` — WebSocket hook with flash animation and auto-reconnect |
| `usePriceAlerts.ts` | `usePriceAlertRules` (with `createRule`, `deleteRule`) |
| `useKeyboardShortcuts.ts` | Leader-key navigation, ignores inputs |

### Global State (`src/store/auth.ts`)

Zustand store with:
- `user: UserResponse | null`
- `setUser(user)`, `clearAuth()` — clears tokens from localStorage and resets state

---

## PWA

**Manifest:** `public/manifest.json` — app name, icons, theme colour, display mode, navigation shortcuts  
**Service Worker:** `public/sw.js`

| Request type | Strategy |
|-------------|----------|
| `/api/` requests | Network-first (never serve stale API data) |
| Static assets | Cache-first (shell, fonts, JS bundles) |

The service worker is registered in the root layout via a `<Script>` tag that runs after page load.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |
