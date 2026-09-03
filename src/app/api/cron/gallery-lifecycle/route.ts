import { NextRequest, NextResponse } from "next/server";
import { processGalleryExpirations, processGalleryExpirationReminders } from "@/lib/gallery-lifecycle";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  // 1. Authorization: verify CRON_SECRET or Super Admin session
  const authHeader = request.headers.get("authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const configuredCronSecret = process.env.CRON_SECRET || "drfilms-cron-secret-2026";

  const isSecretValid =
    (bearerToken && bearerToken === configuredCronSecret) ||
    (cronSecretHeader && cronSecretHeader === configuredCronSecret);

  if (!isSecretValid) {
    const session = await getCurrentSession();
    const isSuperAdmin = session && (session.role === "SUPER_ADMIN" || session.role === "platform_admin");

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Valid cron secret or Super Admin authorization required." },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();

  try {
    // 2. Process automated gallery expirations
    const expirationResults = await processGalleryExpirations();

    // 3. Process 7-day, 3-day, 1-day expiration warning reminders
    const reminderResults = await processGalleryExpirationReminders();

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      expirations: {
        totalScanned: expirationResults.totalScanned,
        expiredCount: expirationResults.expiredCount,
        expiredProjectIds: expirationResults.expiredProjectIds,
      },
      reminders: {
        totalScanned: reminderResults.totalScanned,
        remindersSent: reminderResults.remindersSent,
        details: reminderResults.reminderDetails,
      },
    });
  } catch (err: any) {
    console.error("[Cron Gallery Lifecycle] Error processing lifecycle job:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to execute gallery lifecycle cron job",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
