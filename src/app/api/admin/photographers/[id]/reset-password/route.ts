export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { adminResetPhotographerPassword } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Photographer ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await adminResetPhotographerPassword(
      id,
      newPassword,
      auth.session.photographerId,
      auth.session.email
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed to reset password" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Photographer password has been updated and old sessions invalidated.",
    });
  } catch (err: unknown) {
    console.error("Admin reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
