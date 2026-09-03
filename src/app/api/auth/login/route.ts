export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { 
  getPhotographerByEmail, 
  verifyUserPassword, 
  savePhotographer 
} from "@/lib/db";

// In-memory rate limiting map: ip + email -> { attempts, resetAt }
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, maxAttempts = 10, windowMs = 5 * 60 * 1000): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.attempts >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  entry.attempts++;
  return { allowed: true };
}

function resetRateLimit(key: string) {
  rateLimitMap.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "127.0.0.1";

    const normEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const rateLimitKey = `${ip}:${normEmail}`;

    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateLimit.retryAfterSec} seconds before trying again.` },
        { status: 429 }
      );
    }

    if (!normEmail || !password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const photographer = getPhotographerByEmail(normEmail);

    if (!photographer) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Role check: Super Admins must use the Super Admin login portal, not Photographer portal
    if (photographer.role === "SUPER_ADMIN" || photographer.role === "platform_admin") {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check account status
    const status = (photographer.status || "ACTIVE").toUpperCase();
    if (status === "SUSPENDED") {
      const reason = photographer.suspensionReason 
        ? ` Reason: ${photographer.suspensionReason}` 
        : "";
      return NextResponse.json(
        { error: `This photographer account has been suspended by platform administration.${reason}` },
        { status: 403 }
      );
    }

    if (status === "DELETED" || status === "PENDING_DELETION") {
      return NextResponse.json(
        { error: "This account has been deleted or is pending deletion." },
        { status: 403 }
      );
    }

    // Verify Password
    const isValid = await verifyUserPassword(password, photographer.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Success: reset rate limiter
    resetRateLimit(rateLimitKey);

    // Update lastLoginAt
    photographer.lastLoginAt = new Date().toISOString();
    savePhotographer(photographer);

    const tokenVersion = photographer.tokenVersion || 1;
    const role = photographer.role || "PHOTOGRAPHER";

    const token = await createSessionCookie(
      photographer.id,
      photographer.email,
      role,
      tokenVersion
    );

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        studioName: photographer.studioName || photographer.businessName,
        role: photographer.role,
        plan: photographer.plan || "FREE",
      },
      redirect: "/dashboard",
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
