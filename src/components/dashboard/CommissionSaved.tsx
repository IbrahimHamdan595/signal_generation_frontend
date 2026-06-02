"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";
import { tradingApi, type CommissionStats } from "@/lib/api";

export default function CommissionSaved() {
  const { data, isLoading } = useQuery<CommissionStats>({
    queryKey: ["trading", "commissionStats", 7],
    queryFn: async () => {
      const r = await tradingApi.getCommissionStats(7);
      return r.data as CommissionStats;
    },
    refetchInterval: 60_000,
  });

  return (
    <Card glow="buy">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-buy" />
          <CardTitle>Commission Saved (7d)</CardTitle>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 bg-surface animate-pulse rounded-lg w-2/3" />
          <div className="h-4 bg-surface animate-pulse rounded-lg w-1/2" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-buy">
            ${(data?.commission_saved_usd ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted mt-1">
            {data?.signals_filtered ?? 0} signals filtered by commission gate
          </p>
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            Trades blocked before reaching MT5 because predicted profit didn&apos;t
            cover broker commission.
          </p>
        </>
      )}
    </Card>
  );
}
