export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveGoogleDriveTokens } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  let returnTo = "/onboarding";
  let photographerId = "";

  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (parsed.returnTo) returnTo = parsed.returnTo;
      if (parsed.photographerId) photographerId = parsed.photographerId;
    } catch {
      // ignore
    }
  }

  if (errorParam) {
    console.warn("Google Drive OAuth error received:", errorParam);
    const target = errorParam === "access_denied" ? "drive_cancelled" : "drive_auth_failed";
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=${target}`, baseUrl));
  }

  if (!code || !state || !photographerId) {
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=missing_parameters`, baseUrl));
  }

  const storedState = request.cookies.get("wvg_drive_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=invalid_state`, baseUrl));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=google_not_configured`, baseUrl));
  }

  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${baseUrl}/api/drive/callback`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Google Drive token exchange failed:", errorText);
      return NextResponse.redirect(new URL(`${returnTo}?drive_error=token_exchange_failed`, baseUrl));
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiresIn = tokens.expires_in;

    if (!accessToken) {
      return NextResponse.redirect(new URL(`${returnTo}?drive_error=no_access_token`, baseUrl));
    }

    const expiryDate = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    saveGoogleDriveTokens(photographerId, {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiryDate,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    });

    const response = NextResponse.redirect(new URL(`${returnTo}?drive_connected=true`, baseUrl));

    response.cookies.set({
      name: "wvg_drive_oauth_state",
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Unexpected error in Drive OAuth callback:", err);
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=exception`, baseUrl));
  }
}
