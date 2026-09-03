import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSession, createSessionCookie, COOKIE_NAME } from "@/lib/auth";
import { recordAdminAuditLog } from "@/lib/db";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "No active session found" }, { status: 401 });
  }

  if (!session.impersonatingFromAdmin) {
    return NextResponse.json({ error: "Current session is not an admin support impersonation session" }, { status: 400 });
  }

  try {
    const { adminId, adminEmail, photographerName } = session.impersonatingFromAdmin;

    // Restore original Super Admin session
    const token = await createSessionCookie(adminId, adminEmail, "platform_admin");

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Record audit log
    recordAdminAuditLog({
      adminId,
      adminEmail,
      action: "ADMIN_IMPERSONATION_EXIT",
      targetType: "photographer",
      targetId: session.photographerId,
      targetName: photographerName || session.photographerId,
      metadata: { impersonatedPhotographerId: session.photographerId },
      result: "success",
    });

    return NextResponse.json({
      success: true,
      message: "Exited support mode and restored Super Admin privileges",
      redirectUrl: `/admin/photographers/${session.photographerId}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to exit support mode" }, { status: 500 });
  }
}
