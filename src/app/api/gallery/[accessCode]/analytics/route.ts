import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent, recordClientActivity, getProjectByAccessCode } from "@/lib/db";
import { logAnalyticsEvent, AnalyticsEventType } from "@/lib/analytics";
import { getCurrentSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  const { accessCode } = await params;
  if (!accessCode) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }

  const project = getProjectByAccessCode(accessCode.toUpperCase());
  if (!project) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      eventType,
      eventId,
      videoId,
      mediaId,
      mediaTitle,
      mediaType,
      eventName,
      sessionId,
      watchTimeSeconds,
      shareType,
      downloadType,
      source,
    } = body;

    const validEvents: string[] = [
      "view",
      "gallery_view",
      "gallery_opened",
      "play",
      "video_play",
      "completion",
      "video_completed",
      "favorite",
      "unfavorite",
      "select",
      "photo_selected",
      "deselect",
      "photo_deselected",
      "download",
      "download_requested",
      "download_zip",
      "share",
      "share_clicked",
      "whatsapp_clicked",
      "qr_visit",
      "qr_generated",
      "photo_view",
      "photo_viewed",
      "video_viewed",
      "selection_submit",
    ];

    if (!eventType || !validEvents.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Determine normalized event type for the engine
    let normalizedType: AnalyticsEventType = "gallery_view";
    if (eventType === "view" || eventType === "gallery_view" || eventType === "gallery_opened") normalizedType = "gallery_view";
    else if (eventType === "photo_view" || eventType === "photo_viewed") normalizedType = "photo_view";
    else if (eventType === "play" || eventType === "video_play" || eventType === "video_viewed") normalizedType = "video_play";
    else if (eventType === "completion" || eventType === "video_completed") normalizedType = "video_completed";
    else if (eventType === "favorite") normalizedType = "favorite";
    else if (eventType === "unfavorite") normalizedType = "unfavorite";
    else if (eventType === "select" || eventType === "photo_selected") normalizedType = "select";
    else if (eventType === "deselect" || eventType === "photo_deselected") normalizedType = "deselect";
    else if (eventType === "download" || eventType === "download_requested" || eventType === "download_zip") normalizedType = "download";
    else if (eventType === "share" || eventType === "share_clicked" || eventType === "whatsapp_clicked") normalizedType = "share";
    else if (eventType === "qr_visit" || eventType === "qr_generated") normalizedType = "qr_visit";
    else if (eventType === "selection_submit") normalizedType = "selection_submit";

    // Detect device category safely
    const userAgent = request.headers.get("user-agent") || "";
    let deviceCategory: "mobile" | "desktop" | "tablet" | "unknown" = "desktop";
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceCategory = "tablet";
    } else if (/mobile|iphone|android|touch/i.test(userAgent)) {
      deviceCategory = "mobile";
    }

    // Detect admin or photographer preview
    const session = await getCurrentSession();
    const isSuperAdmin = !!(
      session &&
      (session.role === "SUPER_ADMIN" || session.role === "platform_admin" || session.role === "admin")
    );
    const isOwner = !!(session && (isSuperAdmin || session.photographerId === project.photographerId));
    const urlAdminPreview = request.nextUrl.searchParams.get("adminPreview") === "true";
    const isInternal = Boolean(isOwner || (isSuperAdmin && urlAdminPreview));

    // Log to production analytics engine with deduplication
    const result = logAnalyticsEvent({
      eventId,
      photographerId: project.photographerId || "default",
      projectId: project.id,
      accessCode: project.accessCode,
      eventType: normalizedType,
      mediaId: mediaId || videoId,
      mediaTitle,
      mediaType: mediaType || (normalizedType === "video_play" || normalizedType === "video_completed" ? "VIDEO" : "PHOTO"),
      eventName,
      sessionId,
      watchTimeSeconds: typeof watchTimeSeconds === "number" ? watchTimeSeconds : undefined,
      shareType: shareType || (eventType === "whatsapp_clicked" ? "whatsapp" : "copy_link"),
      downloadType,
      source: source || (eventType === "qr_visit" ? "qr" : "direct"),
      deviceCategory,
      isInternal,
    });

    // Update legacy ProjectAnalytics aggregate for backwards compatibility
    const updated = recordAnalyticsEvent(
      accessCode.toUpperCase(),
      (eventType === "video_viewed" ? "play" : eventType === "gallery_opened" ? "view" : eventType) as any,
      videoId || mediaId
    );

    // Record persistent client activity stream if not duplicate and not internal
    if (!isInternal && !result.isDuplicate) {
      let description = `Client performed ${eventType}`;
      if (normalizedType === "gallery_view") description = "Client opened wedding gallery";
      else if (normalizedType === "photo_view") description = `Client viewed photo: ${mediaTitle || mediaId || "Photo"}`;
      else if (normalizedType === "video_play") description = `Client watched film: ${mediaTitle || videoId || "Wedding Film"}`;
      else if (normalizedType === "video_completed") description = `Client completed film: ${mediaTitle || videoId || "Wedding Film"}`;
      else if (normalizedType === "favorite") description = `Client marked photo as favorite: ${mediaTitle || mediaId || "Photo"}`;
      else if (normalizedType === "unfavorite") description = `Client removed favorite: ${mediaTitle || mediaId || "Photo"}`;
      else if (normalizedType === "select") description = `Client selected photo for album: ${mediaTitle || mediaId || "Photo"}`;
      else if (normalizedType === "deselect") description = `Client unselected photo: ${mediaTitle || mediaId || "Photo"}`;
      else if (normalizedType === "download") description = `Client initiated download (${downloadType || mediaTitle || "Photos"})`;
      else if (normalizedType === "share") description = `Client shared gallery (${shareType || "link"})`;
      else if (normalizedType === "qr_visit") description = "Client visited gallery via QR code";
      else if (normalizedType === "selection_submit") description = "Client submitted photo selections for album";

      recordClientActivity(project.id, eventType as any, description, {
        mediaId: mediaId || videoId,
        mediaTitle,
        eventName,
        sessionId,
      });
    }

    return NextResponse.json({
      success: true,
      deduplicated: result.isDuplicate,
      isInternal,
      analytics: updated,
    });
  } catch (err) {
    console.error("Analytics recording error:", err);
    // Non-blocking for client: return success false but don't break
    return NextResponse.json({ error: "Failed to record analytics" }, { status: 500 });
  }
}
