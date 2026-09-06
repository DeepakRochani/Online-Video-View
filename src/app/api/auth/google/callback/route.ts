export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { getOrCreateGooglePhotographerAccount, saveGoogleDriveTokens } from "@/lib/db";
import { dispatchNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  // Handle user cancellation or OAuth error
  if (errorParam) {
    console.warn("Google OAuth callback error received:", errorParam);
    const target = errorParam === "access_denied" ? "google_cancelled" : "google_auth_failed";
    return NextResponse.redirect(new URL(`/login?error=${target}`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google_missing_code", baseUrl));
  }

  // Validate state cookie for CSRF protection
  const storedState = request.cookies.get("wvg_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login?error=google_invalid_state", baseUrl));
  }

  let mode = "login";
  try {
    const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    if (parsedState.mode) mode = parsedState.mode;
  } catch {
    // Ignore state parse error, default to login
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!googleClientId || !googleClientSecret) {
    console.error("Google OAuth client configuration missing on server");
    return NextResponse.redirect(new URL("/login?error=google_not_configured", baseUrl));
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
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
      const errorDetails = await tokenResponse.text();
      console.error("Google OAuth token exchange failed:", errorDetails);
      return NextResponse.redirect(new URL("/login?error=google_token_exchange_failed", baseUrl));
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=google_no_access_token", baseUrl));
    }

    // 2. Fetch verified Google user info
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      console.error("Failed to fetch Google userinfo:", await userinfoResponse.text());
      return NextResponse.redirect(new URL("/login?error=google_userinfo_failed", baseUrl));
    }

    const userinfo = await userinfoResponse.json();
    const { sub, email, name, picture, email_verified } = userinfo;

    if (!email || (email_verified !== undefined && !email_verified)) {
      return NextResponse.redirect(new URL("/login?error=google_email_unverified", baseUrl));
    }

    // 3. Link or create photographer account in database
    const result = await getOrCreateGooglePhotographerAccount({
      googleId: sub,
      email: email.trim().toLowerCase(),
      name: name?.trim(),
      avatarUrl: picture || "",
    });

    if (!result.success || !result.photographer) {
      console.error("Failed to process Google photographer account:", result.error);
      return NextResponse.redirect(new URL("/login?error=account_creation_failed", baseUrl));
    }

    const photographer = result.photographer;

    // Save Google Drive OAuth tokens to photographer account
    if (accessToken) {
      const expiresIn = tokens.expires_in;
      const refreshToken = tokens.refresh_token;
      const expiryDate = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
      saveGoogleDriveTokens(
        photographer.id,
        {
          accessToken,
          refreshToken: refreshToken || undefined,
          expiryDate,
          scope: tokens.scope,
          tokenType: tokens.token_type,
        },
        photographer.email
      );
    }

    // Dispatch welcome email if new account
    if (result.isNewAccount) {
      dispatchNotification("PHOTOGRAPHER_WELCOME", {
        recipientEmail: photographer.email,
        recipientName: photographer.name,
        photographerId: photographer.id,
        data: { studioName: photographer.studioName, provider: "Google" },
      }).catch(() => {});
    }

    // 4. Create canonical application session cookie
    const sessionToken = await createSessionCookie(
      photographer.id,
      photographer.email,
      "PHOTOGRAPHER", // STRICT: Google authentication always issues PHOTOGRAPHER session
      photographer.tokenVersion || 1
    );

    // 5. Determine target redirect (onboarding if incomplete, otherwise dashboard)
    const targetPath = !photographer.onboardingCompleted ? "/onboarding" : "/dashboard";
    const response = NextResponse.redirect(new URL(targetPath, baseUrl));

    // Set secure authentication cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Clear state cookie
    response.cookies.set({
      name: "wvg_oauth_state",
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Unexpected error in Google OAuth callback:", err);
    return NextResponse.redirect(new URL("/login?error=google_oauth_exception", baseUrl));
  }
}
