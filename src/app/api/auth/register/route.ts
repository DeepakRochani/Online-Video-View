export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { registerPhotographerAccount } from "@/lib/db";
import { dispatchNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      studioName, 
      email, 
      phone, 
      website, 
      city, 
      country, 
      password, 
      confirmPassword,
      termsAccepted 
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Your full name is required." }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match. Please re-enter." },
        { status: 400 }
      );
    }

    const result = await registerPhotographerAccount({
      name: name.trim(),
      studioName: (studioName || name).trim(),
      email: email.trim(),
      phone: phone?.trim(),
      website: website?.trim(),
      city: city?.trim(),
      country: country?.trim(),
      termsAccepted: !!termsAccepted,
      password,
    });

    if (!result.success || !result.photographer) {
      return NextResponse.json({ error: result.error || "Failed to create account" }, { status: 400 });
    }

    const photographer = result.photographer;
    const token = await createSessionCookie(
      photographer.id,
      photographer.email,
      photographer.role,
      photographer.tokenVersion || 1
    );

    // Trigger asynchronous welcome notification
    dispatchNotification("PHOTOGRAPHER_WELCOME", {
      recipientEmail: photographer.email,
      recipientName: photographer.name,
      photographerId: photographer.id,
      data: { studioName: photographer.studioName },
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      message: "Photographer account created successfully",
      redirect: "/onboarding",
      user: {
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        studioName: photographer.studioName,
        role: photographer.role,
        plan: photographer.plan || "FREE",
        onboardingStep: photographer.onboardingStep || 1,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
