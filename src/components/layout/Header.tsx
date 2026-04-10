"use client";

import { useAuthStore } from "@/store/auth";
import { Bell, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAlertCount, useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from "@/hooks/useAlerts";
import { formatRelative } from "@/lib/utils";
import { ActionBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function Header({ title }: { title?: string }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: countData } = useAlertCount();
  const { data: alerts = [] } = useAlerts(unreadOnly);
  const { mutate: markRead } = useMarkAlertRead();
  const { mutate: markAll } = useMarkAllAlertsRead();

  const unread = countData?.unread ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const ticker = search.trim().toUpperCase();
    if (ticker) {
      router.push(`/market/${ticker}`);
      setSearch("");
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center px-6 gap-4 pl-16 lg:pl-6">
      {title && (
        <h1 className="text-sm font-semibold text-ink mr-2">{title}</h1>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker…"
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </form>

      <div className="flex-1" />

      {/* Alert bell */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setAlertsOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-surface text-muted hover:text-ink transition-colors relative"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-sell text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {/* Alert dropdown */}
        {alertsOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-ink">Alerts</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUnreadOnly((v) => !v)}
                  className={`text-xs transition-colors ${unreadOnly ? "text-accent font-medium" : "text-muted hover:text-ink"}`}
                >
                  {unreadOnly ? "All" : "Unread only"}
                </button>
                {unread > 0 && (
                  <button onClick={() => markAll()} className="text-xs text-accent hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-muted text-sm">No alerts</div>
              ) : (
                alerts.slice(0, 20).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => { if (!alert.is_read) markRead(alert.id); }}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-surface/60 transition-colors",
                      !alert.is_read && "bg-accent/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!alert.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-ink">{alert.ticker}</span>
                            <ActionBadge action={alert.action} />
                          </div>
                          <p className="text-xs text-muted leading-snug">{alert.message}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted flex-shrink-0">
                        {formatRelative(alert.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
        {initials}
      </div>
    </header>
  );
}
