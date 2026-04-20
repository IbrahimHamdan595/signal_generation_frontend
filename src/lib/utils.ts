import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import type { Action } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy HH:mm");
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function actionColor(action: Action): string {
  return {
    BUY: "text-buy",
    SELL: "text-sell",
    HOLD: "text-hold",
  }[action];
}

export function actionBg(action: Action): string {
  return {
    BUY: "bg-buy/10 text-buy border-buy/30",
    SELL: "bg-sell/10 text-sell border-sell/30",
    HOLD: "bg-hold/10 text-hold border-hold/30",
  }[action];
}

export function sentimentColor(label: string): string {
  const l = label.toLowerCase();
  if (l === "positive") return "text-buy";
  if (l === "negative") return "text-sell";
  return "text-hold";
}

export function compoundToLabel(compound: number): string {
  if (compound > 0.2) return "positive";
  if (compound < -0.2) return "negative";
  return "neutral";
}
