"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LineChart as ChartIcon } from "lucide-react";
import { liveEdgeApi } from "@/lib/api";

interface DailyRow {
  day:           string;
  trades:        number;
  pnl:           number;
  win_rate:      number;
  avg_conf:      number;
  slippage_pct:  number;
}

interface ChartPoint {
  day:     string;
  cum_raw: number;
}

export default function EquityCurveChart() {
  const { data, isLoading } = useQuery<DailyRow[]>({
    queryKey: ["liveEdge", "daily", 30],
    queryFn: async () => {
      const r = await liveEdgeApi.getDaily(30);
      return r.data;
    },
    refetchInterval: 60_000,
  });

  // /live-edge/daily returns rows ordered DESC by day. Reverse to ASC and
  // build a running cumulative sum so the curve trends in time order.
  const points: ChartPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    const asc = [...data].reverse();
    let cum = 0;
    return asc.map((r) => {
      cum += Number(r.pnl) || 0;
      return { day: r.day.slice(5), cum_raw: Math.round(cum * 100) / 100 };
    });
  }, [data]);

  const finalPnl = points.length > 0 ? points[points.length - 1].cum_raw : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartIcon size={14} className="text-accent" />
          <CardTitle>30-day Equity Curve</CardTitle>
        </div>
        <span className={`text-sm font-bold ${finalPnl >= 0 ? "text-buy" : "text-sell"}`}>
          {finalPnl >= 0 ? "+" : ""}${finalPnl.toFixed(2)}
        </span>
      </CardHeader>

      {isLoading ? (
        <div className="h-[220px] bg-surface animate-pulse rounded-lg" />
      ) : points.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">No closed trades yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              stroke="#9ca3af"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Cumulative PnL"]}
            />
            <Line
              type="monotone"
              dataKey="cum_raw"
              stroke={finalPnl >= 0 ? "#86efac" : "#fca5a5"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
