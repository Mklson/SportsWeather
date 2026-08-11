import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/dictionary";
import "./globals.css";

// Self-hosted via next/font (no external request, no FOUT) — globals.css
// previously declared font-family: "Inter" without ever loading it, so every
// page was silently rendering in the OS system font.
const inter = Inter({ subsets: ["latin"], display: "swap" });

const title = "AEROUTE – Route Weather Planner";
const description = "See weather along your route – tailwind, rain and temperature visualized on map";

export const metadata: Metadata = {
  metadataBase: new URL("https://aeroute.no"),
  title,
  description,
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  // Standalone display (no Safari chrome) and a proper name/icon when a user
  // adds the site to their home screen — iOS has no install-prompt API, so
  // this only takes effect once they do that manually via the share sheet.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AEROUTE",
  },
  openGraph: {
    title,
    description,
    url: "https://aeroute.no",
    siteName: "AEROUTE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — setting it to 1 causes iOS Safari to swallow ALL pinch events,
  // so Mapbox never receives them. Pinch page-zoom is prevented per-page via gesturestart listeners.
  themeColor: "#0b2e4d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";

  return (
    <html lang={lang}>
      <body className={inter.className}>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
