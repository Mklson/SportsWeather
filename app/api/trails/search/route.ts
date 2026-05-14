import { NextRequest, NextResponse } from "next/server";
import { searchSkiTrails } from "@/lib/overpass";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ trails: [] });
  }

  try {
    const trails = await searchSkiTrails(q);
    return NextResponse.json({ trails });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), trails: [] },
      { status: 500 }
    );
  }
}
