export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPhotographerId } from "@/lib/auth";
import { getPhotographerById, updatePhotographer } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const photographer = getPhotographerById(photographerId);
    if (!photographer) {
      return NextResponse.json({ error: "Photographer account not found" }, { status: 404 });
    }

    // Verify current password if user has passwordHash set
    if (photographer.passwordHash) {
      const currentHash = crypto.createHash("sha256").update(currentPassword || "").digest("hex");
      if (photographer.passwordHash !== currentHash) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const newHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    updatePhotographer(photographerId, {
      passwordHash: newHash,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to change password" }, { status: 500 });
  }
}
