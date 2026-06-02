"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, CheckCircle2, TrendingUp, TrendingDown, ShieldX, Zap } from "lucide-react";
import { tradingApi, type ActivityEvent } from "@/lib/api";
import { formatRelative } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  ml_equities:      "Equities ML",
  ml_fx:            "FX ML",
  rule_donchian:    "Donchian",
  ml_equities_1h:   "Equities ML (1h)",
  ml_fx_1h:         "FX ML (1h)",
  rule_donchian_1h: "Donchian (1h)",
};

function renderEvent(ev: ActivityEvent) {
  const src = SOURCE_LABEL[ev.source ?? ""] ?? ev.source ?? "—";

  switch (ev.kind) {
    case "signal_generation":
      return {
        icon: <Zap size={14} className="text-accent" />,
        text: `${ev.count} ${src} signal${ev.count === 1 ? "" : "s"} generated`,
        tone: "text-ink",
      };
    case "order_fill":
      return {
        icon: <CheckCircle2 size={14} className="text-buy" />,
        text: `Filled ${ev.symbol ?? "—"} (${src})`,
        tone: "text-ink",
      };
    case "order_close": {
      const pnl = ev.pnl ?? 0;
      const sign = pnl >= 0 ? "+" : "";
      return {
        icon: pnl >= 0
          ? <TrendingUp   size={14} className="text-buy"  />
          : <TrendingDown size={14} className="text-sell" />,
        text: `Closed ${ev.symbol ?? "—"} (${sign}$${pnl.toFixed(2)})`,
        tone: pnl >= 0 ? "text-buy" : "text-sell",
      };
    }
    case "order_reject":
      return {
        icon: <ShieldX size={14} className="text-hold" />,
        text: `Blocked ${ev.symbol ?? "—"} — commission gate`,
        tone: "text-hold",
      };
    default:
      return {
        icon: <Activity size={14} className="text-muted" />,
        text: ev.kind,
        tone: "text-muted",
      };
  }
}

export default function ActivityFeed() {
  const { data, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["trading", "activity", 20],
    queryFn: async () => {
      const r = await tradingApi.getActivity(20);
      return r.data as ActivityEvent[];
    },
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          <CardTitle>Activity (24h)</CardTitle>
        </div>
        {data && <span className="text-xs text-muted">{data.length} events</span>}
      </CardHeader>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No activity in the last 24h</p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {data.map((ev, i) => {
            const r = renderEvent(ev);
            return (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-surface/50">
                <div className="mt-0.5">{r.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${r.tone}`}>{r.text}</p>
                  {ev.ts && (
                    <p className="text-xs text-muted mt-0.5">{formatRelative(ev.ts)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
