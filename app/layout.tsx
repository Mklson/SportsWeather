import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
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
  icons: { icon: "/Logo visual.png", apple: "/Logo visual.png" },
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
      </body>
    </html>
  );
}
