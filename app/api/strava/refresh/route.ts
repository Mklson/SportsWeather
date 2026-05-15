import { NextRequest, NextResponse } from "next/server";
import { refreshStravaToken } from "@/lib/strava";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get("strava_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/api/strava/auth", req.url));
  }

  try {
    const tokens = await refreshStravaToken(refreshToken);
    const response = NextResponse.redirect(new URL("/strava/activities", req.url));

    response.cookies.set("strava_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 21600,
      path: "/",
    });

    if (tokens.refresh_token) {
      response.cookies.set("strava_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL("/api/strava/auth", req.url));
  }
}
