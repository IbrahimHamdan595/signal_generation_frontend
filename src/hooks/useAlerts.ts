"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api";
import type { Alert } from "@/types";
import toast from "react-hot-toast";

export function useAlerts(unreadOnly = false) {
  return useQuery<Alert[]>({
    queryKey: ["alerts", unreadOnly],
    queryFn: async () => {
      const res = await alertsApi.getAll(unreadOnly);
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useAlertCount() {
  return useQuery<{ unread: number }>({
    queryKey: ["alerts", "count"],
    queryFn: async () => {
      const res = await alertsApi.getCount();
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => alertsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: () => toast.error("Failed to mark alert as read"),
  });
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: () => {
      toast.success("All alerts marked as read");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: () => toast.error("Failed to mark all alerts as read"),
  });
}
