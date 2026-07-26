import { NextRequest, NextResponse } from "next/server";
import { searchKartverketTrails, searchKartverketTrailsInBbox } from "@/lib/kartverket";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const bboxParam = req.nextUrl.searchParams.get("bbox");

  try {
    if (bboxParam) {
      const parts = bboxParam.split(",").map(Number);
      if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
        return NextResponse.json({ error: "Invalid bbox", trails: [] }, { status: 400 });
      }
      const [south, west, north, east] = parts;
      const trails = await searchKartverketTrailsInBbox({ south, west, north, east });
      return NextResponse.json({ trails });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ trails: [] });
    }
    const trails = await searchKartverketTrails(q);
    return NextResponse.json({ trails });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), trails: [] },
      { status: 500 }
    );
  }
}
