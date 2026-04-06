"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
} from "lightweight-charts";
import type { OHLCVResponse, SignalResponse } from "@/types";

interface CandlestickChartProps {
  ohlcv: OHLCVResponse[];
  signal?: SignalResponse | null;
  height?: number;
}

export default function CandlestickChart({
  ohlcv,
  signal,
  height = 380,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || ohlcv.length === 0) return;

    chartRef.current = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7d8590",
      },
      grid: {
        vertLines: { color: "#21262d" },
        horzLines: { color: "#21262d" },
      },
      crosshair: {
        vertLine: { color: "#484f58", width: 1, style: 3 },
        horzLine: { color: "#484f58", width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: "#21262d" },
      timeScale: { borderColor: "#21262d", timeVisible: true },
    });

    const candleSeries = chartRef.current.addSeries(CandlestickSeries, {
      upColor: "#00d97e",
      downColor: "#ff4560",
      borderUpColor: "#00d97e",
      borderDownColor: "#ff4560",
      wickUpColor: "#00d97e",
      wickDownColor: "#ff4560",
    });

    const sorted = [...ohlcv].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    candleSeries.setData(
      sorted.map((d) => ({
        time: d.timestamp.split("T")[0] as import("lightweight-charts").Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    // Signal overlays — stop loss / take profit lines
    if (signal?.entry_price) {
      const lastTime = sorted[sorted.length - 1].timestamp.split("T")[0];

      if (signal.stop_loss) {
        const slSeries = chartRef.current.addSeries(LineSeries, {
          color: "#ff456066",
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: true,
          priceLineVisible: false,
          title: "SL",
        });
        slSeries.setData([
          { time: lastTime as import("lightweight-charts").Time, value: signal.stop_loss },
        ]);
      }

      if (signal.take_profit) {
        const tpSeries = chartRef.current.addSeries(LineSeries, {
          color: "#00d97e66",
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: true,
          priceLineVisible: false,
          title: "TP",
        });
        tpSeries.setData([
          { time: lastTime as import("lightweight-charts").Time, value: signal.take_profit },
        ]);
      }
    }

    chartRef.current.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
    };
  }, [ohlcv, signal, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
