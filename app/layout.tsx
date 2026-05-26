import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteWX – Route Weather Planner",
  description: "See weather along your route – tailwind, rain and temperature visualized on map",
  icons: { icon: "/weather-icon.png", apple: "/weather-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — setting it to 1 causes iOS Safari to swallow ALL pinch events,
  // so Mapbox never receives them. Pinch page-zoom is prevented per-page via gesturestart listeners.
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
