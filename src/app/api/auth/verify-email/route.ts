export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyPhotographerEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 }
      );
    }

    const result = verifyPhotographerEmail(token.trim());
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      photographer: result.photographer
        ? {
            id: result.photographer.id,
            email: result.photographer.email,
            name: result.photographer.name,
            emailVerified: true,
          }
        : undefined,
    });
  } catch (err) {
    console.error("Email verification error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during email verification." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Verification token query parameter is required." },
      { status: 400 }
    );
  }

  const result = verifyPhotographerEmail(token.trim());
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    email: result.photographer?.email,
  });
}
