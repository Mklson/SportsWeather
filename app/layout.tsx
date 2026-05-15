import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportsWeather – Route Weather Planner",
  description: "See weather along your route – tailwind, rain and temperature visualized on map",
  icons: { icon: "/weather-icon.png", apple: "/weather-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
