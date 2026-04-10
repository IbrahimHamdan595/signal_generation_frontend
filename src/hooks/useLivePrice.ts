"use client";

import { useEffect, useRef, useState } from "react";
import { createPriceSocket } from "@/lib/api";

interface PriceUpdate {
  price: number | null;
  change: number | null;   // fractional, e.g. 0.012 = +1.2%
  flash: "up" | "down" | null;
}

export function useLivePrice(ticker: string): PriceUpdate {
  const [state, setState] = useState<PriceUpdate>({ price: null, change: null, flash: null });
  const wsRef = useRef<WebSocket | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ticker || typeof window === "undefined") return;

    function connect() {
      const ws = createPriceSocket([ticker]);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type !== "prices") return;
          const price: number | null = msg.data?.[ticker] ?? null;
          const change: number | null = msg.changes?.[ticker] ?? null;

          let flash: "up" | "down" | null = null;
          if (price !== null && prevPriceRef.current !== null) {
            flash = price > prevPriceRef.current ? "up" : price < prevPriceRef.current ? "down" : null;
          }
          prevPriceRef.current = price;

          setState({ price, change, flash });

          if (flash) {
            if (flashTimer.current) clearTimeout(flashTimer.current);
            flashTimer.current = setTimeout(() => {
              setState((prev) => ({ ...prev, flash: null }));
            }, 600);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => ws.close();
      ws.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [ticker]);

  return state;
}
