"use client";

import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import type { Job } from "@/types";

/**
 * Poll a specific job by ID until it reaches a terminal state.
 * Polls every 3s while running, stops when completed/failed.
 */
export function useJobStatus(jobId: number | null) {
  return useQuery<Job>({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await jobsApi.get(String(jobId!));
      return res.data;
    },
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 3_000;
    },
  });
}

/**
 * Fetch the latest job of a given type.
 */
export function useLatestJob(jobType: string) {
  return useQuery<Job>({
    queryKey: ["job", "latest", jobType],
    queryFn: async () => {
      const res = await jobsApi.getLatest(jobType);
      return res.data;
    },
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running") return 3_000;
      return false;
    },
  });
}
