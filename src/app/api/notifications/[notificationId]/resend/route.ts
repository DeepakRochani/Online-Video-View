import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { retryFailedNotification } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await params;
  if (!notificationId) {
    return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
  }

  const photographerId = (session.role === "SUPER_ADMIN" || session.role === "admin" || session.role === "platform_admin") ? "admin" : session.photographerId;

  try {
    const result = await retryFailedNotification(notificationId, photographerId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to resend notification" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification resend initiated successfully",
      record: result.record
    });
  } catch (err: any) {
    console.error("Resend notification error:", err);
    return NextResponse.json({ error: "Internal server error during notification resend" }, { status: 500 });
  }
}
