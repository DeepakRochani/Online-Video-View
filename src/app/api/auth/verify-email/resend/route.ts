export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resendEmailVerification } from "@/lib/db";
import { dispatchNotification } from "@/lib/notifications";

// Rate limiting map: ip:email -> { attempts, resetAt }
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, maxAttempts = 3, windowMs = 5 * 60 * 1000): { allowed: boolean; retryAfterSec?: number } {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const normEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normEmail) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const rateLimitKey = `resend_verify:${ip}:${normEmail}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many resend requests. Please wait ${rateLimit.retryAfterSec} seconds before requesting again.` },
        { status: 429 }
      );
    }

    const result = resendEmailVerification(normEmail);

    if (result.token) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
      const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
      const verifyUrl = `${baseUrl}/verify-email?token=${result.token}`;

      dispatchNotification("EMAIL_VERIFICATION", {
        recipientEmail: normEmail,
        data: {
          verifyUrl,
          expires: result.expires,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error("Resend email verification error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while resending verification email." },
      { status: 500 }
    );
  }
}
