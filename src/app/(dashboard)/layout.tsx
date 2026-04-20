"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Sidebar from "@/components/layout/Sidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const router = useRouter();
  useKeyboardShortcuts();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  return (
    <div className="flex h-full min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar />
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
