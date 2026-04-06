import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "buy" | "sell" | "hold" | "accent";
}

const glowMap = {
  buy: "shadow-[0_0_20px_rgba(0,217,126,0.08)] border-buy/20",
  sell: "shadow-[0_0_20px_rgba(255,69,96,0.08)] border-sell/20",
  hold: "shadow-[0_0_20px_rgba(245,158,11,0.08)] border-hold/20",
  accent: "shadow-[0_0_20px_rgba(59,130,246,0.08)] border-accent/20",
};

export function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        "bg-card border-border",
        glow && glowMap[glow],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-sm font-semibold text-muted uppercase tracking-wider", className)}>
      {children}
    </h3>
  );
}
