export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { 
  getPhotographerByEmail, 
  verifyUserPassword, 
  savePhotographer, 
  recordAdminAuditLog,
  ensureSuperAdminAccount
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

    // Rate limit check
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

    // Ensure database account matches configured environment variables
    await ensureSuperAdminAccount();

    const user = getPhotographerByEmail(normEmail);

    // Generic failure helper to prevent credential enumeration
    const genericFailure = (reason: string, targetUser?: { id?: string; name?: string }) => {
      recordAdminAuditLog({
        adminId: targetUser?.id || "unauthenticated",
        adminEmail: normEmail,
        action: "SUPER_ADMIN_LOGIN_FAILED",
        targetType: "system",
        targetId: targetUser?.id || "auth",
        targetName: targetUser?.name || "Super Admin Portal",
        result: "failed",
        metadata: { reason },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    };

    if (!user) {
      return genericFailure("User not found");
    }

    // Role check: ONLY SUPER_ADMIN or platform_admin can access
    const isSuperAdmin = user.role === "SUPER_ADMIN" || user.role === "platform_admin";
    if (!isSuperAdmin) {
      return genericFailure("Insufficient role: " + user.role, user);
    }

    // Status check
    const status = (user.status || "ACTIVE").toUpperCase();
    if (status === "SUSPENDED" || status === "DELETED" || status === "PENDING_DELETION") {
      recordAdminAuditLog({
        adminId: user.id,
        adminEmail: user.email,
        action: "SUPER_ADMIN_LOGIN_FAILED",
        targetType: "system",
        targetId: user.id,
        targetName: user.name,
        result: "failed",
        metadata: { reason: "Account inactive: " + status },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: "This administrative account is not active. Please contact platform operations." },
        { status: 403 }
      );
    }

    // Verify Password Hash
    const isValid = await verifyUserPassword(password, user.passwordHash);
    if (!isValid) {
      return genericFailure("Invalid password", user);
    }

    // Success: reset rate limiter
    resetRateLimit(rateLimitKey);

    // Update lastLoginAt
    user.lastLoginAt = new Date().toISOString();
    savePhotographer(user);

    const token = await createSessionCookie(
      user.id,
      user.email,
      "SUPER_ADMIN",
      user.tokenVersion || 1
    );

    recordAdminAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: "SUPER_ADMIN_LOGIN_SUCCESS",
      targetType: "system",
      targetId: user.id,
      targetName: user.name,
      result: "success",
      metadata: {},
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      message: "Authenticated as Platform Super Admin",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "SUPER_ADMIN",
      },
      redirect: "/admin",
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
    console.error("Super Admin Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
