import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no external request, no FOUT) — globals.css
// previously declared font-family: "Inter" without ever loading it, so every
// page was silently rendering in the OS system font.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "AEROUTE – Route Weather Planner",
  description: "See weather along your route – tailwind, rain and temperature visualized on map",
  icons: { icon: "/Logo visual.png", apple: "/Logo visual.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — setting it to 1 causes iOS Safari to swallow ALL pinch events,
  // so Mapbox never receives them. Pinch page-zoom is prevented per-page via gesturestart listeners.
  themeColor: "#0b2e4d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
