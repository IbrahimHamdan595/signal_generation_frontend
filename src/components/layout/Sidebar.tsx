"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  Brain,
  LogOut,
  Zap,
  Star,
  Menu,
  X,
  Settings,
  Workflow,
  CandlestickChart,
  Activity,
  GitCompare,
  Layers,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const nav = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/signals",    label: "Signals",    icon: TrendingUp },
  { href: "/strategies", label: "Strategies", icon: Layers },
  { href: "/comparison", label: "Comparison", icon: GitCompare },
  { href: "/market",     label: "Market",     icon: BarChart2 },
  { href: "/model",      label: "Model",      icon: Brain },
  { href: "/watchlist",  label: "Watchlist",  icon: Star },
  { href: "/trading",    label: "Trading",    icon: CandlestickChart },
  { href: "/live-edge",  label: "Live Edge",  icon: Activity },
  { href: "/pipeline",   label: "Pipeline",   icon: Workflow },
  { href: "/settings",   label: "Settings",   icon: Settings },
];

interface SidebarContentProps {
  onClose?: () => void;
  onLogout: () => void;
}

function SidebarContent({ onClose, onLogout }: SidebarContentProps) {
  const pathname = usePathname();

  // Delay active-class calculation until after mount so the server-rendered
  // HTML (where pathname can differ from client) matches exactly, preventing
  // React hydration from partially re-rendering the nav list.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Zap size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Signal</p>
            <p className="text-[10px] text-muted">AI Trading Platform</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-muted hover:text-ink lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            mounted &&
            (pathname === href || (href !== "/" && pathname.startsWith(href)));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-muted hover:text-ink hover:bg-surface"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-muted hover:text-sell hover:bg-sell/5 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  // Own the store subscription here — isolated from SidebarContent so that
  // a Zustand re-render (triggered by hydrate()) never touches the nav list.
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border text-muted hover:text-ink"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-60 bg-card border-r border-border z-50 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 border-r border-border bg-card z-30">
        <SidebarContent onLogout={handleLogout} />
      </aside>
    </>
  );
}
