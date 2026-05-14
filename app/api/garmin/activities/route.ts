import { NextRequest, NextResponse } from "next/server";
/**
 * Garmin Connect API integration placeholder.
 *
 * Garmin does NOT have a publicly documented OAuth API for third-party apps
 * equivalent to Strava. Options:
 *
 * 1. Garmin Health API (partner program) – requires Garmin partnership approval.
 *    Docs: https://developer.garmin.com/health-api/overview/
 *
 * 2. garmin-connect npm package (unofficial, reverse-engineered) – works today
 *    but may break. Use with caution in production.
 *
 * 3. User exports FIT/GPX from Garmin Connect manually → use /api/routes/upload.
 *
 * This file is structured as the definitive endpoint. Swap in real
 * implementation by replacing the TODOs below.
 */

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // TODO: Exchange Garmin OAuth tokens (Health API)
  // const token = req.cookies.get("garmin_access_token")?.value;
  // const activities = await garminClient.getActivities(token);

  return NextResponse.json(
    {
      error: "Garmin integration not yet implemented",
      suggestion:
        "Export your route as GPX from Garmin Connect and upload via /api/routes/upload",
    },
    { status: 501 }
  );
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO: Import a specific Garmin activity by id
  return NextResponse.json(
    { error: "Garmin import not yet implemented" },
    { status: 501 }
  );
}
