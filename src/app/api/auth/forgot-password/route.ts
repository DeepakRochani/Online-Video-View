export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/db";
import { CommunicationService } from "@/lib/communication-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();
    const result = createPasswordResetToken(normEmail);

    // Generic safe message to prevent email enumeration in production
    const responsePayload: { success: boolean; message: string; resetUrl?: string } = {
      success: true,
      message: "If an account exists with this email address, a password reset link has been generated.",
    };

    // Include development reset URL and dispatch email if generated
    if (result) {
      const origin = request.headers.get("origin") || "http://localhost:3000";
      const resetUrl = `${origin}/reset-password?token=${result.token}`;
      responsePayload.resetUrl = resetUrl;

      // Dispatch password reset email via centralized CommunicationService
      CommunicationService.dispatch({
        event: "PASSWORD_RESET",
        photographerId: result.photographer?.id || "system",
        recipientName: "User",
        recipientEmail: normEmail,
        idempotencyKey: `PASSWORD_RESET_${normEmail}_${result.token}`,
        metadata: {
          resetUrl,
        },
      }).catch((dispatchErr) => {
        console.error("[FORGOT_PASSWORD:EMAIL_DISPATCH_FAIL]", dispatchErr);
      });
    }

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
