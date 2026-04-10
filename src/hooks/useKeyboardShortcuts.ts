"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts using "leader + key" style (like vim-go):
 *   G S → /signals
 *   G M → /market
 *   G O → /model
 *   G W → /watchlist
 *   G D → / (dashboard)
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const pendingG = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignore if typing in an input, textarea, select, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (pendingG.current) {
        pendingG.current = false;
        if (timer.current) clearTimeout(timer.current);

        switch (key) {
          case "S": router.push("/signals"); break;
          case "M": router.push("/market"); break;
          case "O": router.push("/model"); break;
          case "W": router.push("/watchlist"); break;
          case "D": router.push("/"); break;
        }
        return;
      }

      if (key === "G") {
        pendingG.current = true;
        // Reset after 1.5s if no follow-up key
        timer.current = setTimeout(() => {
          pendingG.current = false;
        }, 1500);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);
}
