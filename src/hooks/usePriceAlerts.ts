"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priceAlertRulesApi } from "@/lib/api";
import toast from "react-hot-toast";

interface PriceAlertRule {
  id: number;
  ticker: string;
  condition: "above" | "below";
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export function usePriceAlertRules() {
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery<PriceAlertRule[]>({
    queryKey: ["price-alerts"],
    queryFn: async () => {
      const res = await priceAlertRulesApi.getAll();
      return res.data;
    },
  });

  const { mutate: createRule, isPending: creating } = useMutation({
    mutationFn: (body: { ticker: string; condition: "above" | "below"; target_price: number }) =>
      priceAlertRulesApi.create(body.ticker, body.condition, body.target_price),
    onSuccess: () => {
      toast.success("Price alert rule created");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: () => toast.error("Failed to create rule"),
  });

  const { mutate: deleteRule } = useMutation({
    mutationFn: (id: number) => priceAlertRulesApi.delete(id),
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: () => toast.error("Failed to delete rule"),
  });

  return { rules, createRule, deleteRule, creating };
}
