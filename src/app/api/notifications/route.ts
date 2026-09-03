import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getNotificationsByPhotographer, getProjectById } from "@/lib/db";
import { dispatchSaasNotification } from "@/lib/notifications";
import { NotificationChannel, NotificationType } from "@/lib/project-types";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const channel = searchParams.get("channel") as NotificationChannel | null;
  const status = searchParams.get("status") as any;
  const type = searchParams.get("type") as NotificationType | null;
  const projectId = searchParams.get("projectId") || undefined;

  // Photographer ID from session (or admin override)
  let photographerId = session.photographerId;
  if ((session.role === "SUPER_ADMIN" || session.role === "admin" || session.role === "platform_admin") && searchParams.get("photographerId")) {
    photographerId = searchParams.get("photographerId")!;
  }

  const result = await getNotificationsByPhotographer(photographerId, limit, offset, {
    channel: channel || undefined,
    status: status || undefined,
    type: type || undefined,
    projectId
  });

  return NextResponse.json({
    notifications: result.notifications,
    total: result.total,
    limit,
    offset
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId;

  try {
    const body = await request.json();
    const {
      projectId,
      recipientName,
      recipientEmail,
      recipientPhone,
      event = "GALLERY_PUBLISHED",
      channelOverride,
      customSubject,
      notes
    } = body;

    if (!recipientName || (!recipientEmail && !recipientPhone)) {
      return NextResponse.json(
        { error: "Recipient name and at least one contact channel (email or phone) are required" },
        { status: 400 }
      );
    }

    let galleryUrl = "https://app.yourplatform.com";
    let accessCode = "";
    let coupleTitle = "Wedding Gallery";

    if (projectId) {
      const project = getProjectById(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.photographerId !== photographerId && session.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized for this project" }, { status: 403 });
      }
      galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.yourplatform.com"}/gallery/${project.accessCode}`;
      accessCode = project.accessCode;
      coupleTitle = project.coupleName;
    }

    const dispatchResult = await dispatchSaasNotification({
      event: event as NotificationType,
      photographerId,
      projectId,
      recipientName,
      recipientEmail,
      recipientPhone,
      coupleTitle,
      galleryUrl,
      accessCode,
      notes,
      channelOverride
    });

    return NextResponse.json({
      success: dispatchResult.success,
      records: dispatchResult.records,
      emailResult: dispatchResult.emailResult,
      whatsappResult: dispatchResult.whatsappResult
    });
  } catch (err: any) {
    console.error("Manual notification error:", err);
    return NextResponse.json({ error: "Failed to dispatch notification" }, { status: 500 });
  }
}
