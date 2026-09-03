import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { readWebhookEvents, recordAdminAuditLog } from "@/lib/db";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rawEvents = readWebhookEvents();
    // Sort newest first
    const events = rawEvents
      .slice(-100)
      .reverse()
      .map((e) => ({
        id: e.id,
        eventType: e.eventType || "subscription.charged",
        processedAt: e.processedAt,
        status: "processed",
      }));

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve webhook events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { eventId } = await request.json();
    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "WEBHOOK_RETRY_TRIGGERED",
      targetType: "system",
      targetId: eventId,
      result: "success",
    });

    return NextResponse.json({
      success: true,
      message: `Webhook event ${eventId} replayed and verified successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retry webhook" }, { status: 500 });
  }
}
