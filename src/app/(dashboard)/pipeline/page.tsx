"use client";

import { useState, useMemo, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useSP500,
  useAvailableTickers,
  useIngestOHLCV,
  useBuildDailySentiment,
  useStartTraining,
} from "@/hooks/useIngest";
import { useJobStatus } from "@/hooks/useJobStatus";
import { jobsApi, sentimentApi, mlApi } from "@/lib/api";
import {
  Database,
  Newspaper,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  Play,
  BarChart2,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "done" | "error";

interface StepState {
  status: StepStatus;
  done: number;
  total: number;
  errors: string[];
}

interface TickerResult {
  ticker: string;
  ohlcv_bars: number;
  article_count: number;
  avg_compound: number;
  dominant: string;
}

interface PipelineResult {
  tickers: TickerResult[];
  model: {
    accuracy: number;
    f1: number;
    sharpe: number;
    win_rate: number;
    total_trades: number;
  } | null;
}

const INITIAL_STEP: StepState = { status: "idle", done: 0, total: 0, errors: [] };

// ─── helpers ──────────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Loader2 size={18} className="text-hold animate-spin" />;
  if (status === "done") return <CheckCircle2 size={18} className="text-buy" />;
  if (status === "error") return <XCircle size={18} className="text-sell" />;
  return <div className="w-[18px] h-[18px] rounded-full border-2 border-border" />;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{done}/{total} tickers</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { data: sp500 = [], isLoading: loadingSP500 } = useSP500();
  const { data: ingestedTickers = [] } = useAvailableTickers();
  const ingestedSet = useMemo(() => new Set(ingestedTickers), [ingestedTickers]);

  // Selection state — persisted to localStorage so a page refresh keeps the selection
  // Start empty (matches server render), then load from localStorage after mount
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [showList, setShowList] = useState(true);

  // Pipeline config
  const [interval, setInterval] = useState("1d");
  const [period, setPeriod] = useState("1y");
  const [periodYears, setPeriodYears] = useState(1);
  const [epochs, setEpochs] = useState(50);

  // Yahoo Finance interval/period compatibility constraints
  // 1h → max 730 days (2y); 30m/15m/5m → max 60 days (1mo)
  const VALID_PERIODS_FOR_INTERVAL: Record<string, string[]> = {
    "1d":  ["3mo", "6mo", "1y", "2y", "5y"],
    "1h":  ["3mo", "6mo", "1y", "2y"],
    "30m": ["1mo"],
    "15m": ["1mo"],
    "5m":  ["1mo"],
  };

  const PERIOD_LABELS: Record<string, string> = {
    "1mo": "1 month", "3mo": "3 months", "6mo": "6 months",
    "1y": "1 year", "2y": "2 years", "5y": "5 years",
  };

  function handleIntervalChange(newInterval: string) {
    setInterval(newInterval);
    const validPeriods = VALID_PERIODS_FOR_INTERVAL[newInterval] ?? ["1y"];
    if (!validPeriods.includes(period)) {
      setPeriod(validPeriods[validPeriods.length - 1]);
    }
  }

  const validPeriods = VALID_PERIODS_FOR_INTERVAL[interval] ?? ["1y"];

  // Load saved selection from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pipeline_selected_tickers");
      if (saved) setSelected(new Set<string>(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  // Persist selection to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("pipeline_selected_tickers", JSON.stringify(Array.from(selected)));
    } catch { /* quota exceeded — ignore */ }
  }, [selected]);

  // Step states
  const [ohlcvStep, setOhlcvStep] = useState<StepState>(INITIAL_STEP);
  const [sentimentStep, setSentimentStep] = useState<StepState>(INITIAL_STEP);
  const [trainStep, setTrainStep] = useState<StepState>(INITIAL_STEP);
  const [ingestJobId, setIngestJobId] = useState<number | null>(null);
  const [trainJobId, setTrainJobId] = useState<number | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);

  const { data: trainJob } = useJobStatus(trainJobId);

  const { mutateAsync: ingestOHLCV } = useIngestOHLCV();
  const { mutateAsync: buildDailySentiment } = useBuildDailySentiment();
  const { mutateAsync: startTraining } = useStartTraining();

  // Derived
  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(sp500.map((t) => t.sector).filter(Boolean))).sort()],
    [sp500]
  );

  const filtered = useMemo(() => {
    return sp500.filter((t) => {
      const matchSector = sectorFilter === "All" || t.sector === sectorFilter;
      const matchSearch =
        !search ||
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name?.toLowerCase().includes(search.toLowerCase());
      return matchSector && matchSearch;
    });
  }, [sp500, sectorFilter, search]);

  const selectedArray = Array.from(selected);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.symbol));

  function toggleTicker(symbol: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((t) => next.delete(t.symbol));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((t) => next.add(t.symbol));
        return next;
      });
    }
  }

  function selectAll500() {
    setSelected(new Set(sp500.map((t) => t.symbol)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  // Poll a job by ID until terminal state, updating ohlcvStep progress along the way
  async function pollIngestJob(jobId: number): Promise<{ done: number; failed: string[] }> {
    while (true) {
      const res = await jobsApi.get(String(jobId));
      const job = res.data;
      const p = job.progress ?? {};

      setOhlcvStep({
        status: "running",
        done: p.done ?? 0,
        total: p.total ?? selectedArray.length,
        errors: p.failed_tickers ?? [],
      });

      if (job.status === "completed") {
        return { done: p.done ?? 0, failed: p.failed_tickers ?? [] };
      }
      if (job.status === "failed") {
        throw new Error(job.error ?? "Ingest job failed");
      }

      await new Promise((r) => setTimeout(r, 3_000));
    }
  }

  // Pipeline runner
  const isRunning =
    ohlcvStep.status === "running" ||
    sentimentStep.status === "running" ||
    trainStep.status === "running";

  // Tickers selected that already have OHLCV data in DB — Step 1 can be skipped for these
  const alreadyIngested = selectedArray.filter((t) => ingestedSet.has(t));
  const canResume = alreadyIngested.length > 0 && alreadyIngested.length === selectedArray.length;

  async function runSentimentAndTrain(tickersToUse: string[]) {
    setSentimentStep(INITIAL_STEP);
    setTrainStep(INITIAL_STEP);
    setTrainJobId(null);
    setPipelineResult(null);
    setResultFetched(false);
    setShowList(false);
    await runFromStep2(tickersToUse);
  }

  async function runFromStep2(successfulTickers: string[]) {
    // ── Step 2: Daily sentiment ──────────────────────────────────────
    setSentimentStep({ status: "running", done: 0, total: successfulTickers.length, errors: [] });
    try {
      const { job_ids, errors: dispatchErrors } = await buildDailySentiment({
        tickers: successfulTickers,
        years: periodYears,
      });

      const perJobDone: Record<number, number> = {};
      const perJobFailed: Record<number, number> = {};

      const updateSentimentProgress = () => {
        const done = Object.values(perJobDone).reduce((a, b) => a + b, 0) + dispatchErrors.length;
        setSentimentStep({ status: "running", done, total: successfulTickers.length, errors: [] });
      };

      await Promise.all(
        job_ids.map(async (jid: number) => {
          perJobDone[jid] = 0;
          perJobFailed[jid] = 0;
          while (true) {
            const res = await jobsApi.get(String(jid));
            const job = res.data;
            const p = job.progress ?? {};
            perJobDone[jid] = p.current ?? p.done ?? 0;
            perJobFailed[jid] = p.failed ?? 0;
            updateSentimentProgress();
            if (job.status === "completed" || job.status === "failed") {
              perJobDone[jid] = p.done ?? p.current ?? 0;
              updateSentimentProgress();
              break;
            }
            await new Promise((r) => setTimeout(r, 3_000));
          }
        })
      );

      const totalDone = Object.values(perJobDone).reduce((a, b) => a + b, 0);
      setSentimentStep({
        status: totalDone === 0 && dispatchErrors.length > 0 ? "error" : "done",
        done: totalDone,
        total: successfulTickers.length,
        errors: dispatchErrors,
      });
    } catch {
      setSentimentStep((s) => ({ ...s, status: "error" }));
    }

    // ── Step 3: Train ────────────────────────────────────────────────
    const trainTickers = successfulTickers.slice(0, 100);
    setTrainStep({ status: "running", done: 0, total: trainTickers.length, errors: [] });
    try {
      const { job_id } = await startTraining({ tickers: trainTickers, epochs });
      setTrainJobId(job_id);
      setTrainStep((s) => ({ ...s, done: trainTickers.length }));
    } catch {
      setTrainStep((s) => ({ ...s, status: "error" }));
    }
  }

  async function runPipeline() {
    if (selectedArray.length === 0 || isRunning) return;
    setShowList(false);

    // Reset all steps before re-run
    setOhlcvStep(INITIAL_STEP);
    setSentimentStep(INITIAL_STEP);
    setTrainStep(INITIAL_STEP);
    setIngestJobId(null);
    setTrainJobId(null);
    setPipelineResult(null);
    setResultFetched(false);

    // ── Step 1: OHLCV (background job + polling) ───────────────────
    setOhlcvStep({ status: "running", done: 0, total: selectedArray.length, errors: [] });
    let successfulTickers: string[] = [];
    try {
      const { job_id } = await ingestOHLCV({ tickers: selectedArray, interval, period });
      setIngestJobId(job_id);
      const { done, failed } = await pollIngestJob(job_id);
      successfulTickers = selectedArray.filter((t) => !failed.includes(t));
      setOhlcvStep({ status: done === 0 ? "error" : "done", done, total: selectedArray.length, errors: failed });
      if (done === 0) return;
    } catch {
      setOhlcvStep((s) => ({ ...s, status: "error" }));
      return;
    }

    await runFromStep2(successfulTickers);
  }

  // Sync train step status with live job + fetch results when done
  const jobStatus = trainJob?.status;
  const displayTrainStatus: StepStatus =
    jobStatus === "completed"
      ? "done"
      : jobStatus === "failed"
      ? "error"
      : trainStep.status;

  // When training job transitions to completed, fetch result data
  const [resultFetched, setResultFetched] = useState(false);
  if (jobStatus === "completed" && !resultFetched) {
    setResultFetched(true);
    // Fetch sentiment summaries + model report in parallel
    Promise.all([
      sentimentApi.getSummary(),
      mlApi.getReport(),
    ]).then(([sentRes, mlRes]) => {
      const sentMap: Record<string, { avg_compound: number; avg_positive: number; avg_negative: number; dominant_sentiment?: string; article_count?: number }> =
        {};
      (sentRes.data as { ticker: string; avg_compound: number; avg_positive: number; avg_negative: number; dominant_sentiment?: string; article_count?: number }[])
        .forEach((s) => { sentMap[s.ticker] = s; });

      const report = mlRes.data;
      const tickers: TickerResult[] = Array.from(selected).map((ticker) => {
        const s = sentMap[ticker] ?? {};
        return {
          ticker,
          ohlcv_bars: 0,          // not exposed by API — shown as placeholder
          article_count: s.article_count ?? 0,
          avg_compound: s.avg_compound ?? 0,
          dominant: s.avg_compound > 0.1 ? "positive" : s.avg_compound < -0.1 ? "negative" : "neutral",
        };
      });

      setPipelineResult({
        tickers,
        model: report
          ? {
              accuracy:     (report.accuracy ?? 0) * 100,
              f1:           report.f1_weighted ?? 0,
              sharpe:       report.trading?.sharpe_ratio ?? 0,
              win_rate:     (report.trading?.win_rate ?? 0) * 100,
              total_trades: report.trading?.total_trades ?? 0,
            }
          : null,
      });
    }).catch(() => {/* results optional — don't block UI */});
  }

  return (
    <div>
      <Header title="Data Pipeline" />
      <div className="mt-6 space-y-5">

        {/* Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Database, label: "Ingest OHLCV", desc: "Yahoo Finance price history + 50 technical indicators", color: "text-accent" },
            { icon: Newspaper, label: "Daily Sentiment", desc: "Finnhub news (recent ~1y) + SEC EDGAR filings (historical gap) → FinBERT scored per trading day", color: "text-hold" },
            { icon: Brain, label: "Train Model", desc: "Transformer + MLP fusion model on selected tickers", color: "text-buy" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <Card key={label}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className={color} />
                <CardTitle>{label}</CardTitle>
              </div>
              <p className="text-xs text-muted leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>

        {/* Ticker selection */}
        <Card>
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowList((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <CardTitle>Ticker Selection</CardTitle>
              <span className="text-xs text-accent font-semibold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                {selected.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showList ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </div>
          </div>

          {showList && (
            <div className="mt-4 space-y-3">
              {/* Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ticker or company…"
                    className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
                  />
                </div>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
                >
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={selectAll500}
                  className="text-xs px-3 py-2 rounded-lg border border-border text-muted hover:text-ink hover:bg-surface transition-colors"
                >
                  All S&P 500
                </button>
                {ingestedTickers.length > 0 && (
                  <button
                    onClick={() => setSelected(new Set(ingestedTickers))}
                    className="text-xs px-3 py-2 rounded-lg border border-buy/30 text-buy hover:bg-buy/10 transition-colors"
                  >
                    In DB ({ingestedTickers.length})
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs px-3 py-2 rounded-lg border border-border text-muted hover:text-sell hover:border-sell/30 transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* List header */}
              {loadingSP500 ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-9 bg-surface animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 bg-surface rounded-lg border border-border text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="accent-accent"
                    />
                    <span className="flex-1 font-medium">Select all visible ({filtered.length})</span>
                    <span className="w-48 hidden sm:block">Company</span>
                    <span className="w-36 hidden md:block">Sector</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
                    {filtered.map((ticker) => {
                      const isChecked = selected.has(ticker.symbol);
                      const alreadyIngested = ingestedSet.has(ticker.symbol);
                      return (
                        <label
                          key={ticker.symbol}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            isChecked
                              ? "bg-accent/8 border border-accent/20"
                              : "hover:bg-surface border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTicker(ticker.symbol)}
                            className="accent-accent"
                          />
                          <span className="font-mono font-semibold text-ink w-16 shrink-0">
                            {ticker.symbol}
                          </span>
                          {alreadyIngested && (
                            <span className="text-[10px] text-buy border border-buy/30 bg-buy/8 px-1 py-0.5 rounded shrink-0">
                              DB
                            </span>
                          )}
                          <span className="flex-1 text-muted truncate hidden sm:block">
                            {ticker.name}
                          </span>
                        </label>
                      );
                    })}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted text-center py-6">No tickers match your filter</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Pipeline configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Configuration</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            <div>
              <label className="text-xs text-muted block mb-1.5">OHLCV Interval</label>
              <select
                value={interval}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
              >
                {["1d", "1h", "30m", "15m", "5m"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">
                History Period
                {interval !== "1d" && (
                  <span className="ml-1 text-hold">
                    ({interval === "1h" ? "max 2y" : "max 1mo"} for {interval})
                  </span>
                )}
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
              >
                {validPeriods.map((v) => (
                  <option key={v} value={v}>{PERIOD_LABELS[v] ?? v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">News History (years)</label>
              <select
                value={periodYears}
                onChange={(e) => setPeriodYears(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent/60 transition-colors"
              >
                {[1, 2, 3, 5].map((v) => (
                  <option key={v} value={v}>{v} year{v > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">
                Training Epochs
                {selected.size > 100 && (
                  <span className="ml-1 text-hold">(top 100 tickers)</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-sm text-ink w-8 text-right">{epochs}</span>
              </div>
            </div>
          </div>

          {selected.size > 100 && (
            <p className="text-xs text-hold mt-3 bg-hold/5 border border-hold/20 rounded-lg px-3 py-2">
              Training is capped at 100 tickers — the first 100 selected will be used for the model.
              All {selected.size} tickers will still be ingested and have sentiment enriched.
            </p>
          )}
        </Card>

        {/* Pipeline steps + run */}
        <Card glow="accent">
          <CardHeader>
            <CardTitle>Run Pipeline</CardTitle>
          </CardHeader>

          <div className="space-y-4 mt-2">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                <StepIcon status={ohlcvStep.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">Step 1 — Ingest OHLCV</p>
                  {ohlcvStep.status !== "idle" && (
                    <span className={`text-xs ${
                      ohlcvStep.status === "done" ? "text-buy" :
                      ohlcvStep.status === "error" ? "text-sell" : "text-hold"
                    }`}>
                      {ohlcvStep.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Fetch price history + compute 50 technical indicators
                  {ohlcvStep.status === "idle" && selected.size > 0 && (
                    <> — {selected.size} tickers × {period} @ {interval}</>
                  )}
                  {ingestJobId && ohlcvStep.status === "running" && (
                    <span className="ml-1 text-hold">(job #{ingestJobId})</span>
                  )}
                </p>
                {ohlcvStep.status !== "idle" && (
                  <ProgressBar done={ohlcvStep.done} total={ohlcvStep.total} />
                )}
                {ohlcvStep.errors.length > 0 && (
                  <p className="text-xs text-sell mt-1">
                    Failed: {ohlcvStep.errors.slice(0, 5).join(", ")}
                    {ohlcvStep.errors.length > 5 && ` +${ohlcvStep.errors.length - 5} more`}
                  </p>
                )}
              </div>
            </div>

            <div className="ml-2 pl-5 border-l border-dashed border-border h-3" />

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                <StepIcon status={sentimentStep.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">Step 2 — Build Daily Sentiment</p>
                  {sentimentStep.status !== "idle" && (
                    <span className={`text-xs ${
                      sentimentStep.status === "done" ? "text-buy" :
                      sentimentStep.status === "error" ? "text-sell" : "text-hold"
                    }`}>
                      {sentimentStep.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Finnhub news (~1y) + SEC EDGAR 8-K/10-Q filings (historical gap to {periodYears}y) → FinBERT scored per trading day
                  {sentimentStep.status === "idle" && selected.size > 0 && (
                    <> — batched in groups of 20</>
                  )}
                </p>
                {sentimentStep.status === "done" && (
                  <p className="text-xs text-buy mt-1">
                    {sentimentStep.done}/{sentimentStep.total} tickers enriched — training will use per-bar sentiment scores.
                  </p>
                )}
                {sentimentStep.status !== "idle" && (
                  <ProgressBar done={sentimentStep.done} total={sentimentStep.total} />
                )}
                {sentimentStep.errors.length > 0 && (
                  <p className="text-xs text-sell mt-1">
                    {sentimentStep.errors.length} batches failed to dispatch
                  </p>
                )}
              </div>
            </div>

            <div className="ml-2 pl-5 border-l border-dashed border-border h-3" />

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                <StepIcon status={displayTrainStatus} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">Step 3 — Train Model</p>
                  {displayTrainStatus !== "idle" && (
                    <span className={`text-xs ${
                      displayTrainStatus === "done" ? "text-buy" :
                      displayTrainStatus === "error" ? "text-sell" : "text-hold"
                    }`}>
                      {displayTrainStatus.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Train Transformer + MLP fusion model for {epochs} epochs
                  {displayTrainStatus === "idle" && selected.size > 0 && (
                    <> — up to {Math.min(selected.size, 100)} ingested tickers (needs ≥60 bars each)</>
                  )}
                </p>
                {trainJobId && trainJob && (
                  <div className="mt-2 text-xs text-muted space-y-1">
                    <p>Job #{trainJob.id}</p>
                    {trainJob.status === "running" && (
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-hold rounded-full animate-pulse w-2/3" />
                      </div>
                    )}
                    {trainJob.status === "failed" && trainJob.error && (
                      <p className="text-sell">{trainJob.error}</p>
                    )}
                    {trainJob.status === "completed" && (
                      <p className="text-buy">Training complete — check the Model page for results.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run button */}
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={runPipeline}
              disabled={selected.size === 0 || isRunning}
              loading={isRunning}
              className="flex-1 sm:flex-none justify-center px-8"
            >
              <Play size={14} />
              {isRunning ? "Running Pipeline…" : `Run Pipeline (${selected.size} tickers)`}
            </Button>
            {canResume && !isRunning && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => runSentimentAndTrain(alreadyIngested)}
                className="flex-none justify-center px-5 border-hold/40 text-hold hover:bg-hold/10"
                title="OHLCV already ingested — skip Step 1 and go straight to sentiment + training"
              >
                <ArrowRight size={14} />
                Resume (skip Step 1)
              </Button>
            )}
            {selected.size === 0 && (
              <p className="text-xs text-muted">Select at least one ticker to begin</p>
            )}
          </div>

          {/* Done summary */}
          {displayTrainStatus === "done" && (
            <div className="mt-4 bg-buy/5 border border-buy/20 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-buy font-medium">Pipeline complete</p>
                <p className="text-xs text-muted mt-0.5">
                  {ohlcvStep.done} ingested · {sentimentStep.done} enriched · model trained
                </p>
              </div>
              <a
                href="/model"
                className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
              >
                View Model <ArrowRight size={13} />
              </a>
            </div>
          )}
        </Card>

        {/* ── Pipeline Results ─────────────────────────────────────────── */}
        {pipelineResult && (
          <div className="space-y-4">

            {/* Model metrics strip */}
            {pipelineResult.model && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Test Accuracy", value: `${pipelineResult.model.accuracy.toFixed(1)}%`, icon: BarChart2, color: "text-accent", border: "border-accent/20" },
                  { label: "F1 Weighted",   value: pipelineResult.model.f1.toFixed(3),             icon: TrendingUp, color: "text-buy",    border: "border-buy/20"    },
                  { label: "Sharpe Ratio",  value: pipelineResult.model.sharpe.toFixed(2),         icon: TrendingUp, color: "text-hold",   border: "border-hold/20"   },
                  { label: "Win Rate",      value: `${pipelineResult.model.win_rate.toFixed(1)}%`, icon: BarChart2,  color: "text-buy",    border: "border-buy/20"    },
                ].map(({ label, value, icon: Icon, color, border }) => (
                  <div key={label} className={`rounded-xl border ${border} bg-card p-4 flex items-center gap-3`}>
                    <div className="p-2 rounded-lg bg-surface border border-border">
                      <Icon size={14} className={color} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-1">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-ticker sentiment table */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-hold" />
                  <CardTitle>Sentiment Results by Ticker</CardTitle>
                </div>
                <span className="text-xs text-muted">{pipelineResult.tickers.length} tickers</span>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted font-medium">Ticker</th>
                      <th className="text-right py-2 px-3 text-muted font-medium">Articles</th>
                      <th className="text-right py-2 px-3 text-muted font-medium">Avg Compound</th>
                      <th className="text-left py-2 px-3 text-muted font-medium">Strength</th>
                      <th className="text-left py-2 px-3 text-muted font-medium">Tone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pipelineResult.tickers.map((t) => {
                      const c = t.avg_compound;
                      const pct = Math.min(Math.round(Math.abs(c) * 100), 100);
                      const isPos = c >= 0.1;
                      const isNeg = c <= -0.1;
                      const barColor   = isPos ? "bg-buy"  : isNeg ? "bg-sell"  : "bg-hold";
                      const textColor  = isPos ? "text-buy": isNeg ? "text-sell": "text-hold";
                      const badgeClass = isPos
                        ? "text-buy  bg-buy/10  border-buy/20"
                        : isNeg
                        ? "text-sell bg-sell/10 border-sell/20"
                        : "text-hold bg-hold/10 border-hold/20";
                      const tone = isPos ? "Positive" : isNeg ? "Negative" : "Neutral";

                      return (
                        <tr key={t.ticker} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-ink">{t.ticker}</td>
                          <td className="py-2.5 px-3 text-right text-muted">
                            {t.article_count > 0 ? t.article_count.toLocaleString() : "—"}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-semibold ${textColor}`}>
                            {c >= 0 ? "+" : ""}{c.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-muted w-6 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {tone}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
}
