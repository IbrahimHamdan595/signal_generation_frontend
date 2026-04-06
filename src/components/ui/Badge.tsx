"use client";

import { cn, actionBg } from "@/lib/utils";
import type { Action } from "@/types";

interface ActionBadgeProps {
  action: Action;
  className?: string;
}

export function ActionBadge({ action, className }: ActionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wider border",
        actionBg(action),
        className
      )}
    >
      {action}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "positive" | "negative" | "neutral";
  className?: string;
}

const variantMap = {
  default: "bg-surface text-muted border-border",
  positive: "bg-buy/10 text-buy border-buy/30",
  negative: "bg-sell/10 text-sell border-sell/30",
  neutral: "bg-hold/10 text-hold border-hold/30",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
