import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSuperAdmin, createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { getPhotographerById, recordAdminAuditLog } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { photographerId } = await request.json();
    if (!photographerId) {
      return NextResponse.json({ error: "Photographer ID is required" }, { status: 400 });
    }

    const target = getPhotographerById(photographerId);
    if (!target) {
      return NextResponse.json({ error: "Target photographer not found" }, { status: 404 });
    }

    // Generate impersonated session token
    const token = await createSessionCookie(
      target.id,
      target.email,
      target.role || "owner",
      target.tokenVersion || 1,
      {
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        photographerName: target.name || target.studioName,
      }
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 4 * 60 * 60, // 4 hours for support session
      path: "/",
    });

    // Record immutable audit log
    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "ADMIN_IMPERSONATION_START",
      targetType: "photographer",
      targetId: target.id,
      targetName: target.name,
      metadata: { targetEmail: target.email, targetStudio: target.studioName },
      result: "success",
    });

    return NextResponse.json({
      success: true,
      message: `Impersonation session established for ${target.name}`,
      redirectUrl: "/dashboard",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initiate impersonation" }, { status: 500 });
  }
}
