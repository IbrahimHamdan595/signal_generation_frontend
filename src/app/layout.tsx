import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Signal — AI Trading Dashboard",
  description: "Multimodal AI trading signal platform",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Signal" },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full" style={{ backgroundColor: "var(--bg-base)", color: "var(--text)" }}>
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            if (${process.env.NODE_ENV === "production" ? "true" : "false"}) {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            } else {
              // Dev: tear down any SW from a prior prod build so cached JS chunks
              // don't shadow live code (e.g., stale Sidebar with old nav items).
              navigator.serviceWorker.getRegistrations().then((rs) => {
                rs.forEach((r) => r.unregister());
              });
              if (window.caches) {
                caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
              }
            }
          }
        `}</Script>
      </body>
    </html>
  );
}
