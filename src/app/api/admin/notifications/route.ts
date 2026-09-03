import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getNotificationMetrics } from "@/lib/db";
import { getEmailProviderStatus } from "@/lib/email/provider";
import { getWhatsAppProviderStatus } from "@/lib/whatsapp/provider";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getCurrentSession(request);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "platform_admin")) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: session ? 403 : 401 }
      );
    }

    const metrics = getNotificationMetrics();
    const emailStatus = getEmailProviderStatus();
    const whatsappStatus = getWhatsAppProviderStatus();

    const duration = Date.now() - startTime;
    console.log(`[Admin Notifications] adminId=${session.photographerId} duration=${duration}ms result=success`);

    return NextResponse.json({
      success: true,
      metrics,
      providers: {
        email: emailStatus,
        whatsapp: whatsappStatus,
      },
      systemTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Admin Notifications] Metrics error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to retrieve notification metrics" },
      { status: 500 }
    );
  }
}
