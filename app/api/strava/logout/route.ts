import { NextRequest, NextResponse } from "next/server";
import { deauthorizeStrava } from "@/lib/strava";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get("strava_access_token")?.value;
  if (accessToken) {
    try {
      await deauthorizeStrava(accessToken);
    } catch (e) {
      // Best-effort — the token may already be expired/revoked. Local cookies
      // are cleared below regardless, so the app forgets the connection either way.
      console.warn("[strava logout] deauthorize call failed:", e);
    }
  }

  const response = NextResponse.redirect(new URL("/", req.url));
  const cookieOpts = { path: "/", maxAge: 0 } as const;
  response.cookies.set("strava_access_token", "", cookieOpts);
  response.cookies.set("strava_refresh_token", "", cookieOpts);
  response.cookies.set("strava_athlete_id", "", cookieOpts);
  return response;
}
