import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", req.url));
  const cookieOpts = { path: "/", maxAge: 0 } as const;
  response.cookies.set("strava_access_token", "", cookieOpts);
  response.cookies.set("strava_refresh_token", "", cookieOpts);
  response.cookies.set("strava_athlete_id", "", cookieOpts);
  return response;
}
