export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resetPhotographerPassword } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "New password is required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const result = await resetPhotographerPassword(token, password);
    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed to reset password" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Password has been reset successfully. You can now log in.",
    });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
