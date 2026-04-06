"use client";

import { useAuthStore } from "@/store/auth";
import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Header({ title }: { title?: string }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [search, setSearch] = useState("");

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
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center px-6 gap-4">
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

      <button className="p-2 rounded-lg hover:bg-surface text-muted hover:text-ink transition-colors relative">
        <Bell size={16} />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
        {initials}
      </div>
    </header>
  );
}
