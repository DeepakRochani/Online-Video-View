import { NextResponse } from "next/server";
import { getCurrentSession, COOKIE_NAME } from "@/lib/auth";
import { recordAdminAuditLog } from "@/lib/db";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (session && (session.role === "SUPER_ADMIN" || session.role === "platform_admin")) {
      recordAdminAuditLog({
        adminId: session.photographerId,
        adminEmail: session.email,
        action: "SUPER_ADMIN_LOGOUT",
        targetType: "system",
        targetId: session.photographerId,
        targetName: "Super Admin",
        result: "success",
      });
    }
  } catch {}

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
