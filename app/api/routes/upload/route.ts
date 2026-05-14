import { NextRequest, NextResponse } from "next/server";
import { parseGpx } from "@/lib/gpx-parser";
import { parseTcx } from "@/lib/tcx-parser";
import { totalDistanceKm, totalElevationGain } from "@/lib/route-sampler";
import { saveRoute } from "@/lib/db/client";
import type { RouteSource, UploadResponse } from "@/types";

export const runtime = "nodejs"; // xml2js needs Node runtime

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["gpx", "tcx"].includes(ext)) {
      return NextResponse.json(
        { error: "Only GPX and TCX files are supported" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    }

    const xml = await file.text();
    const source = ext as RouteSource;

    const coordinates =
      source === "gpx" ? await parseGpx(xml) : await parseTcx(xml);

    if (coordinates.length < 2) {
      return NextResponse.json(
        { error: "File contains fewer than 2 coordinates" },
        { status: 422 }
      );
    }

    const distanceKm = totalDistanceKm(coordinates);
    const elevationGainM = totalElevationGain(coordinates);
    const name = file.name.replace(/\.(gpx|tcx)$/i, "");

    const saved = await saveRoute({
      user_id: null, // TODO: set from session when auth is wired up
      name,
      source,
      coordinates,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM > 0 ? elevationGainM : null,
      external_id: null,
      sport: null,
    });

    const response: UploadResponse = {
      route: {
        id: saved.id,
        name: saved.name,
        source: saved.source,
        coordinates,
        distanceKm,
        elevationGainM,
        createdAt: saved.created_at,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
