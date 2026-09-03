import { NextRequest, NextResponse } from "next/server";
import { getProjectByAccessCode, submitSelection, recordClientActivity, isProjectExpired } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getClientSessionId } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  const { accessCode } = await params;
  if (!accessCode) {
    return NextResponse.json({ error: "Access code required" }, { status: 400 });
  }

  const project = getProjectByAccessCode(accessCode.toUpperCase());
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const isPhotographer = await isAuthenticated();
  const isPreview = request.nextUrl.searchParams.get("preview") === "true";

  if (!isPhotographer && !isPreview) {
    if (project.status !== "published" || isProjectExpired(project)) {
      return NextResponse.json({ error: "This wedding gallery is currently inactive, expired, or archived." }, { status: 403 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { submittedBy } = body;
    const sessionId = getClientSessionId(request, accessCode);

    const result = submitSelection(
      project.id,
      sessionId,
      submittedBy || `${project.coupleName} (Client)`
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to submit selection" }, { status: 400 });
    }

    try {
      recordClientActivity(
        project.id,
        "selection_submitted",
        `Client submitted ${result.count} selected photos for album`,
        { count: result.count, submittedBy: submittedBy || project.coupleName }
      );
    } catch {}

    // Dispatch Notifications asynchronously (Photographer alert + Client confirmation)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.yourplatform.com";
      const galleryUrl = `${appUrl}/gallery/${project.accessCode}`;
      const clientName = submittedBy || project.clientName || project.coupleName;
      const clientEmail = body.clientEmail || project.clientEmail;
      const clientPhone = body.clientPhone || project.clientWhatsapp || project.clientPhone;
      const { getPhotographerById, DEFAULT_PHOTOGRAPHER_ID } = await import("@/lib/db");
      const { dispatchSaasNotification } = await import("@/lib/notifications");
      const photographerId = project.photographerId || DEFAULT_PHOTOGRAPHER_ID;
      const photographer = await getPhotographerById(photographerId);

      // 1. Notify Photographer of selection submission
      if (photographer?.email) {
        dispatchSaasNotification({
          event: "SELECTION_SUBMITTED",
          photographerId,
          projectId: project.id,
          recipientName: photographer.name || photographer.businessName || "Photographer",
          recipientEmail: photographer.email,
          coupleTitle: project.coupleName,
          galleryUrl,
          selectionCount: result.count,
          notes: body.notes
        }).catch(err => console.error("[NOTIFY_SELECTION_PHOTOGRAPHER_ERR]", err));
      }

      // 2. Notify Client of confirmation
      if (clientEmail || clientPhone) {
        dispatchSaasNotification({
          event: "SELECTION_UPDATED",
          photographerId,
          projectId: project.id,
          recipientName: clientName,
          recipientEmail: clientEmail,
          recipientPhone: clientPhone,
          coupleTitle: project.coupleName,
          galleryUrl,
          selectionCount: result.count,
          notes: body.notes
        }).catch(err => console.error("[NOTIFY_SELECTION_CLIENT_CONFIRM_ERR]", err));
      }
    } catch (notifErr) {
      console.error("[SELECTION_NOTIFICATION_ERROR]", notifErr);
    }

    return NextResponse.json({
      success: true,
      status: "SUBMITTED",
      count: result.count,
      submittedAt: result.submittedAt,
      message: "✓ Selection submitted. Your photographer has received your selections.",
    });
  } catch (err: any) {
    console.error("Submit selection error:", err);
    return NextResponse.json({ error: "Failed to submit selection" }, { status: 500 });
  }
}

