"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { IndicatorsResponse } from "@/types";
import { format } from "date-fns";

interface IndicatorPanelProps {
  indicators: IndicatorsResponse[];
  type: "rsi" | "macd";
  height?: number;
}

function formatTime(ts: string) {
  try { return format(new Date(ts), "MMM d"); } catch { return ts; }
}

export default function IndicatorPanel({ indicators, type, height = 140 }: IndicatorPanelProps) {
  const sorted = [...indicators].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (type === "rsi") {
    const data = sorted.map((d) => ({ time: formatTime(d.timestamp), rsi: d.rsi_14 }));
    return (
      <div>
        <p className="text-xs text-muted mb-2 px-1">RSI (14)</p>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#7d8590" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#7d8590" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: "#7d8590" }}
              itemStyle={{ color: "#e6edf3" }}
            />
            <ReferenceLine y={70} stroke="#ff456040" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#00d97e40" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="rsi" stroke="#3b82f6" dot={false} strokeWidth={1.5} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const data = sorted.map((d) => ({
    time: formatTime(d.timestamp),
    macd: d.macd_line,
    signal: d.macd_signal,
    histogram: d.macd_histogram,
  }));

  return (
    <div>
      <p className="text-xs text-muted mb-2 px-1">MACD</p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#7d8590" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#7d8590" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "#7d8590" }}
            itemStyle={{ color: "#e6edf3" }}
          />
          <ReferenceLine y={0} stroke="#21262d" />
          <Bar dataKey="histogram" fill="#3b82f620" stroke="none" />
          <Line type="monotone" dataKey="macd" stroke="#00d97e" dot={false} strokeWidth={1.5} connectNulls />
          <Line type="monotone" dataKey="signal" stroke="#ff4560" dot={false} strokeWidth={1.5} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
