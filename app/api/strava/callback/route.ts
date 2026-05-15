import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCode } from "@/lib/strava";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=strava_denied`, req.url));
  }

  // Verify CSRF state
  const cookieState = req.cookies.get("strava_oauth_state")?.value;
  if (!state || state !== cookieState) {
    return NextResponse.redirect(new URL("/?error=strava_state_mismatch", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=strava_no_code", req.url));
  }

  try {
    const tokens = await exchangeStravaCode(code);

    // In a real app: store tokens in DB, create a session cookie
    // For now: pass access_token via a secure, short-lived cookie
    const response = NextResponse.redirect(
      new URL("/strava/activities", req.url)
    );

    response.cookies.set("strava_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 21600, // 6 hours
      path: "/",
    });

    response.cookies.set("strava_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90, // 90 days — refresh tokens are long-lived
      path: "/",
    });

    response.cookies.delete("strava_oauth_state");

    return response;
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(new URL("/?error=strava_token_exchange", req.url));
  }
}
