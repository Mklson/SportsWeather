import { NextRequest, NextResponse } from "next/server";
import { buildStravaAuthUrl } from "@/lib/strava";
import { nanoid } from "@/lib/nanoid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // CSRF state token – store in a short-lived cookie
  const state = nanoid(16);
  const force = req.nextUrl.searchParams.get("force") === "1";

  const authUrl = buildStravaAuthUrl(state, force);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
