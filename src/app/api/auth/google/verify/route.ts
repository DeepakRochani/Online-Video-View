export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { getOrCreateGooglePhotographerAccount } from "@/lib/db";
import { dispatchNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json({ error: "Missing Google credential token" }, { status: 400 });
    }

    // Verify token with Google's public tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Invalid Google credential" }, { status: 401 });
    }

    const payload = await verifyRes.json();
    const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

    // Verify audience matches configured client ID if configured
    if (googleClientId && payload.aud !== googleClientId) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
    }

    const { sub, email, name, picture, email_verified } = payload;

    if (!email || (email_verified !== undefined && email_verified !== "true" && email_verified !== true)) {
      return NextResponse.json({ error: "Google email is unverified" }, { status: 400 });
    }

    const result = await getOrCreateGooglePhotographerAccount({
      googleId: sub,
      email: email.trim().toLowerCase(),
      name: name?.trim(),
      avatarUrl: picture || "",
    });

    if (!result.success || !result.photographer) {
      return NextResponse.json({ error: result.error || "Failed to authenticate photographer" }, { status: 400 });
    }

    const photographer = result.photographer;

    if (result.isNewAccount) {
      dispatchNotification("PHOTOGRAPHER_WELCOME", {
        recipientEmail: photographer.email,
        recipientName: photographer.name,
        photographerId: photographer.id,
        data: { studioName: photographer.studioName, provider: "Google" },
      }).catch(() => {});
    }

    const sessionToken = await createSessionCookie(
      photographer.id,
      photographer.email,
      "PHOTOGRAPHER", // STRICT: Google authentication always issues PHOTOGRAPHER session
      photographer.tokenVersion || 1
    );

    const targetRedirect = !photographer.onboardingCompleted ? "/onboarding" : "/dashboard";

    const response = NextResponse.json({
      success: true,
      message: "Authenticated with Google successfully",
      redirect: targetRedirect,
      user: {
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        studioName: photographer.studioName,
        role: "PHOTOGRAPHER",
        avatarUrl: photographer.avatarUrl,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Error verifying Google credential:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
