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

// Retry failed API calls with exponential backoff and max attempts
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 5,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts) throw err;
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️  Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`, lastError.message);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

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

      // Restore checkpoint if page was refreshed during pipeline run
      const checkpoint = localStorage.getItem("pipeline_checkpoint");
      if (checkpoint) {
        const parsed = JSON.parse(checkpoint);
        setLastCheckpoint(parsed);
        setConnectionLost(true);
      }
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
  // Persisted so resume buttons work after a step errors
  const [step1Tickers, setStep1Tickers] = useState<string[]>([]);
  const [sentimentDone, setSentimentDone] = useState<Set<string>>(new Set());
  const [lastCheckpoint, setLastCheckpoint] = useState<any>(null);
  const [connectionLost, setConnectionLost] = useState(false);

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

  // Poll a job by ID until terminal state, updating ohlcvStep progress along the way (with retry on connection loss)
  async function pollIngestJob(jobId: number): Promise<{ done: number; failed: string[] }> {
    while (true) {
      try {
        const res = await retryWithBackoff(() => jobsApi.get(String(jobId)), 5, 1000);
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
      } catch (err) {
        console.error("❌ Connection lost during OHLCV polling:", err);
        localStorage.setItem("pipeline_checkpoint", JSON.stringify({
          step: "ohlcv",
          jobId,
          timestamp: Date.now(),
        }));
        throw err;
      }
    }
  }

  // Poll sentiment jobs until all complete or fail (with retry on connection loss)
  // Returns the actual list of tickers that completed sentiment enrichment so
  // training can be restricted to ticker-data that's actually been enriched.
  async function pollSentimentJobs(
    jobIds: number[],
    totalTickers: number,
  ): Promise<{ completedTickers: string[]; failedTickers: string[]; errors: string[] }> {
    const errorMessages: string[] = [];
    while (true) {
      try {
        if (jobIds.length === 0) {
          setSentimentStep((s) => ({ ...s, done: totalTickers, status: "done" }));
          return { completedTickers: [], failedTickers: [], errors: errorMessages };
        }

        const statuses = await retryWithBackoff(
          () => Promise.all(
            jobIds.map((id) => jobsApi.get(String(id)).then((r) => ({ id, ...r.data })))
          ),
          5,
          1000
        );

        // Count tickers (not batch-jobs) — each job's progress.done is per-ticker.
        // For completed jobs, prefer the result.success / result.failed_tickers lists
        // so we know exactly which tickers ended up in the daily_sentiment table.
        const completedTickers = new Set<string>();
        const failedTickers = new Set<string>();
        let liveDone = 0;
        let liveFailed = 0;

        for (const job of statuses) {
          if (job.status === "completed") {
            const success: string[] = job.result?.success ?? job.progress?.completed ?? [];
            const failed: string[] = job.result?.failed_tickers ?? [];
            success.forEach((t) => completedTickers.add(t));
            failed.forEach((t) => failedTickers.add(t));
          } else if (job.status === "failed") {
            if (job.error) errorMessages.push(job.error);
          } else {
            // running — read live per-ticker progress
            liveDone += job.progress?.done ?? 0;
            liveFailed += job.progress?.failed ?? 0;
            (job.progress?.completed ?? []).forEach((t: string) => completedTickers.add(t));
          }
        }

        const doneTickers = completedTickers.size + failedTickers.size + liveDone + liveFailed;
        setSentimentStep((s) => ({
          ...s,
          done: Math.min(doneTickers, totalTickers),
          total: totalTickers,
          errors: errorMessages,
        }));

        const finishedJobs = statuses.filter(
          (s) => s.status === "completed" || s.status === "failed"
        ).length;
        if (finishedJobs === jobIds.length) {
          return {
            completedTickers: Array.from(completedTickers),
            failedTickers: Array.from(failedTickers),
            errors: errorMessages,
          };
        }

        await new Promise((r) => setTimeout(r, 5_000));
      } catch (err) {
        console.error("❌ Connection lost during sentiment polling:", err);
        localStorage.setItem("pipeline_checkpoint", JSON.stringify({
          step: "sentiment",
          jobIds,
          totalTickers,
          timestamp: Date.now(),
        }));
        throw err;
      }
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
    setStep1Tickers(tickersToUse);
    setSentimentDone(new Set());
    setSentimentStep(INITIAL_STEP);
    setTrainStep(INITIAL_STEP);
    setTrainJobId(null);
    setPipelineResult(null);
    setResultFetched(false);
    setShowList(false);
    await runFromStep2(tickersToUse);
  }

  async function runFromStep3(tickersToUse: string[]) {
    // Restrict to tickers that actually have daily_sentiment rows, so the
    // model trains only on enriched data — falling back to the input list
    // if the lookup fails (offline / endpoint error).
    const enriched = await sentimentApi.getDailyTickers()
      .then((r) => new Set<string>(r.data))
      .catch(() => new Set<string>(tickersToUse));
    const filtered = tickersToUse.filter((t) => enriched.has(t));
    const trainTickers = (filtered.length > 0 ? filtered : tickersToUse).slice(0, 100);
    setTrainStep({ status: "running", done: 0, total: trainTickers.length, errors: [] });
    setTrainJobId(null);
    setPipelineResult(null);
    setResultFetched(false);
    try {
      const { job_id } = await startTraining({ tickers: trainTickers, epochs });
      setTrainJobId(job_id);
      setTrainStep((s) => ({ ...s, done: trainTickers.length }));
    } catch {
      setTrainStep((s) => ({ ...s, status: "error" }));
    }
  }

  // Recover from checkpoint saved during connection loss
  async function recoverFromCheckpoint() {
    if (!lastCheckpoint) return;
    setConnectionLost(false);
    const { step, ...data } = lastCheckpoint;

    try {
      if (step === "ohlcv") {
        // Resume polling OHLCV job
        setOhlcvStep({ status: "running", done: 0, total: selectedArray.length, errors: [] });
        const { done, failed } = await pollIngestJob(data.jobId);
        const successfulTickers = selectedArray.filter((t) => !failed.includes(t));
        setStep1Tickers(successfulTickers);
        setOhlcvStep({ status: done === 0 ? "error" : "done", done, total: selectedArray.length, errors: failed });
        if (done > 0) await runFromStep2(successfulTickers);
      } else if (step === "sentiment") {
        // Resume polling sentiment jobs
        setSentimentStep({ status: "running", done: 0, total: data.totalTickers, errors: [] });
        const { completedTickers, errors } = await pollSentimentJobs(data.jobIds, data.totalTickers);
        const enriched = completedTickers.length;
        setSentimentDone(new Set(completedTickers));
        setSentimentStep({
          status: enriched === 0 ? "error" : "done",
          done: enriched,
          total: data.totalTickers,
          errors,
        });
        if (enriched > 0) await runFromStep3(completedTickers);
      } else if (step === "sentiment_dispatch") {
        // Restart sentiment from dispatch
        await runFromStep2(data.tickers);
      }
      localStorage.removeItem("pipeline_checkpoint");
    } catch (err) {
      console.error("❌ Recovery failed:", err);
      setSentimentStep((s) => ({ ...s, status: "error" }));
    }
  }

  async function runFromStep2(successfulTickers: string[]) {
    // ── Step 2: Daily sentiment ──────────────────────────────────────
    setSentimentStep({ status: "running", done: 0, total: successfulTickers.length, errors: [] });
    localStorage.setItem("pipeline_checkpoint", JSON.stringify({
      step: "sentiment_dispatch",
      tickers: successfulTickers,
      periodYears,
      timestamp: Date.now(),
    }));
    try {
      const { job_ids, errors: dispatchErrors } = await buildDailySentiment({
        tickers: successfulTickers,
        years: periodYears,
      });

      // If all dispatches failed, early exit
      if (dispatchErrors.length === successfulTickers.length) {
        setSentimentStep({ status: "error", done: 0, total: successfulTickers.length, errors: dispatchErrors });
        return;
      }

      // Wait for all sentiment jobs to complete before proceeding to training
      const { completedTickers, errors: jobErrors } = await pollSentimentJobs(
        job_ids,
        successfulTickers.length,
      );
      const completedSet = new Set(completedTickers);
      setSentimentDone(completedSet);

      if (completedSet.size === 0) {
        setSentimentStep({ status: "error", done: 0, total: successfulTickers.length, errors: jobErrors });
        return;
      }

      setSentimentStep({
        status: "done",
        done: completedSet.size,
        total: successfulTickers.length,
        errors: jobErrors,
      });
    } catch {
      setSentimentStep((s) => ({ ...s, status: "error" }));
      return;  // don't start training on exception
    }

    // ── Step 3: Train ────────────────────────────────────────────────
    // Train only on tickers that have ACTUAL daily sentiment data,
    // preserving the user-selected order. (sentimentDone set above.)
    const enrichedFromSentiment = await sentimentApi.getDailyTickers().then(
      (r) => new Set<string>(r.data),
    ).catch(() => sentimentDone);
    const enrichedTickers = successfulTickers.filter((t) => enrichedFromSentiment.has(t));
    const trainTickers = (enrichedTickers.length > 0 ? enrichedTickers : successfulTickers).slice(0, 100);
    setTrainStep({ status: "running", done: 0, total: trainTickers.length, errors: [] });
    try {
      const { job_id } = await startTraining({ tickers: trainTickers, epochs });
      setTrainJobId(job_id);
      setTrainStep((s) => ({ ...s, done: trainTickers.length }));
    } catch {
      setTrainStep((s) => ({ ...s, status: "error" }));
    }
  }

  async function trainOnly() {
    if (ingestedTickers.length === 0 || isRunning) return;
    setShowList(false);
    setConnectionLost(false);
    localStorage.removeItem("pipeline_checkpoint");
    // Mark steps 1+2 as already done (data is in DB)
    setOhlcvStep({ status: "done", done: ingestedTickers.length, total: ingestedTickers.length, errors: [] });
    setSentimentStep({ status: "done", done: ingestedTickers.length, total: ingestedTickers.length, errors: [] });
    await runFromStep3(ingestedTickers);
  }

  async function runPipeline() {
    if (selectedArray.length === 0 || isRunning) return;
    setShowList(false);
    setConnectionLost(false);
    localStorage.removeItem("pipeline_checkpoint");

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
      setStep1Tickers(successfulTickers);
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

          {/* Connection loss recovery banner */}
          {connectionLost && lastCheckpoint && (
            <div className="mt-4 bg-hold/5 border border-hold/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-hold font-medium">⚠️ Connection lost during pipeline</p>
                <p className="text-xs text-muted mt-1">
                  Checkpoint saved at {new Date(lastCheckpoint.timestamp).toLocaleTimeString()} — Resume to continue from where you left off.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={recoverFromCheckpoint}
                className="flex-none justify-center px-4 border-hold/40 text-hold hover:bg-hold/10"
              >
                <ArrowRight size={14} />
                Resume
              </Button>
            </div>
          )}

          {/* Run button */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={runPipeline}
              disabled={selected.size === 0 || isRunning}
              loading={isRunning}
              className="flex-1 sm:flex-none justify-center px-8"
            >
              <Play size={14} />
              {isRunning ? "Running Pipeline…" : `Run Pipeline (${selected.size} tickers)`}
            </Button>

            {/* Train Only — skip Steps 1+2, use DB data directly */}
            {ingestedTickers.length > 0 && !isRunning && ohlcvStep.status === "idle" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={trainOnly}
                className="flex-none justify-center px-5 border-accent/40 text-accent hover:bg-accent/10"
                title={`Train model on ${ingestedTickers.length} tickers already in DB — skips OHLCV ingest and sentiment`}
              >
                <Brain size={14} />
                Train Only ({ingestedTickers.length})
              </Button>
            )}

            {/* Skip Step 1 — all tickers already ingested (fresh page, no active run) */}
            {canResume && !isRunning && ohlcvStep.status === "idle" && (
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

            {/* Resume from Step 2 — skips tickers that already completed, dispatches only remaining */}
            {sentimentStep.status === "error" && step1Tickers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const remaining = step1Tickers.filter(t => !sentimentDone.has(t));
                  setSentimentStep(INITIAL_STEP);
                  setTrainStep(INITIAL_STEP);
                  setTrainJobId(null);
                  runFromStep2(remaining.length > 0 ? remaining : step1Tickers);
                }}
                className="flex-none justify-center px-5 border-hold/40 text-hold hover:bg-hold/10"
                title="Continue from where sentiment stopped — already-completed tickers are skipped"
              >
                <ArrowRight size={14} />
                {`Resume from Step 2${sentimentDone.size > 0 ? ` (${step1Tickers.length - sentimentDone.size} left)` : ""}`}
              </Button>
            )}

            {/* Retry Training — Step 2 done but training errored */}
            {!isRunning && sentimentStep.status === "done" && trainStep.status === "error" && step1Tickers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => runFromStep3(step1Tickers)}
                className="flex-none justify-center px-5 border-hold/40 text-hold hover:bg-hold/10"
                title="Steps 1+2 are done — retry training only"
              >
                <ArrowRight size={14} />
                Retry Training
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
