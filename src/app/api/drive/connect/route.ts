export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get("returnTo") || "/onboarding";

  if (!googleClientId) {
    return NextResponse.redirect(
      new URL(`${returnTo}?drive_error=google_not_configured`, request.url)
    );
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${baseUrl}/api/drive/callback`;

  const nonce = crypto.randomBytes(24).toString("hex");
  const statePayload = {
    photographerId: session.photographerId,
    returnTo,
    nonce,
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // Ensure refresh token is returned
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set({
    name: "wvg_drive_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
