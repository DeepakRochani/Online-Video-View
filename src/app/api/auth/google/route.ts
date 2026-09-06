export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode") || "login"; // login | signup

  // If Google OAuth Client ID is not configured, redirect back with friendly error
  if (!googleClientId) {
    const errorTarget = mode === "signup" ? "/signup" : "/login";
    return NextResponse.redirect(
      new URL(`${errorTarget}?error=google_not_configured`, request.url)
    );
  }

  // Derive base application URL (supports localhost in dev & dynamic production domain)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Generate secure random state token with mode metadata
  const randomNonce = crypto.randomBytes(24).toString("hex");
  const statePayload = {
    nonce: randomNonce,
    mode,
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // Construct official Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", googleClientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/drive.readonly");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(googleAuthUrl.toString());

  // Store state cookie for CSRF verification (10 minutes lifetime)
  response.cookies.set({
    name: "wvg_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
