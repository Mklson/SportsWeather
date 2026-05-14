import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Proxy for Kartverket topo4 TMS tiles.
// Mapbox GL uses XYZ (y=0 at top); Kartverket TMS uses y=0 at bottom.
// We convert here so the client can use a plain XYZ URL template.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const zoom = parseInt(z, 10);
  const tmsY = Math.pow(2, zoom) - 1 - parseInt(y, 10);

  const url = `https://opencache.statkart.no/gatekeeper/gk/cache.vc/tms/1.0.0/topo4/${z}/${x}/${tmsY}.png`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SportsWeather/1.0 github.com/Mklson/SportsWeather" },
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
