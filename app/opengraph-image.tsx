import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AEROUTE – Route Weather Planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Weather pills styled to match the real in-app map markers (RouteMap.tsx's
// makeWeatherEl/pillColors) — same rounded-pill-with-stem look, so the share
// card reads as "this is what the product actually looks like."
// Plain colored dot instead of a weather emoji — satori/@vercel-og renders
// emoji via a bundled fallback font that has a Windows-only path bug, and
// pulling in an emoji-glyph dependency at all is fragile for a static asset.
function Pill({ left, bottom, dotColor, label, textColor }: { left: number; bottom: number; dotColor: string; label: string; textColor: string }) {
  return (
    <div style={{ position: "absolute", left, bottom, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(15, 23, 42, 0.82)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999,
          padding: "8px 16px",
          fontSize: 24,
          fontWeight: 700,
          color: textColor,
        }}
      >
        <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: dotColor }} />
        <span>{label}</span>
      </div>
      <div style={{ width: 3, height: 14, background: "rgba(11,46,77,0.35)", borderRadius: 2 }} />
    </div>
  );
}

// next/og's bundled default font loader has a Windows-only path bug (it builds
// a malformed file:// URL from backslash paths), so we supply Inter explicitly
// rather than relying on it — works the same on Vercel's Linux runtime too.
async function loadInter(weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error("Could not resolve Inter font URL from Google Fonts CSS");
  const res = await fetch(match[1]);
  if (!res.ok) throw new Error(`Failed to fetch Inter font file: ${res.status}`);
  return res.arrayBuffer();
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default async function Image() {
  // Bundler-resolved local-file fetch — the documented pattern for edge-runtime
  // OG images (no filesystem/request access at runtime, unlike the node runtime).
  // Buffer isn't a guaranteed edge-runtime global, so base64-encode manually.
  const logoBuffer = await (
    await fetch(new URL("../public/Logo with text on side-cropped.png", import.meta.url))
  ).arrayBuffer();
  const logoSrc = `data:image/png;base64,${arrayBufferToBase64(logoBuffer)}`;

  const text =
    "Weather-smart route planningWind, rain & temperature — mapped to every kilometer of your route14°8°6 m/sAEROUTE";
  const [interBold, interRegular] = await Promise.all([loadInter(800, text), loadInter(400, text)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "64px 80px 0",
          background: "linear-gradient(160deg, #ffffff 0%, #eef4f8 100%)",
          fontFamily: "Inter",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={440} height={170} style={{ objectFit: "contain" }} />

        <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: "#0b2e4d", marginTop: 22, textAlign: "center" }}>
          Weather-smart route planning
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#64748b", marginTop: 14, textAlign: "center" }}>
          Wind, rain &amp; temperature — mapped to every kilometer of your route
        </div>

        {/* Sample route with weather markers, mirroring the real map UI */}
        <div style={{ position: "relative", width: "100%", height: 220, marginTop: 36, display: "flex" }}>
          <svg
            width="1040"
            height="150"
            viewBox="0 0 1040 150"
            style={{ position: "absolute", left: 20, bottom: 30 }}
          >
            <polyline
              points="0,120 130,95 260,60 340,110 470,45 600,75 720,20 850,55 940,35 1040,70"
              fill="none"
              stroke="#4caf50"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="130" cy="95" r="8" fill="#10b981" />
            <circle cx="470" cy="45" r="8" fill="#f59e0b" />
            <circle cx="850" cy="55" r="8" fill="#ef4444" />
          </svg>

          <Pill left={40} bottom={130} dotColor="#fde68a" label="14°" textColor="#fde68a" />
          <Pill left={400} bottom={175} dotColor="#93c5fd" label="8°" textColor="#93c5fd" />
          <Pill left={780} bottom={165} dotColor="#a7f3d0" label="6 m/s" textColor="#a7f3d0" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interBold, weight: 800, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
