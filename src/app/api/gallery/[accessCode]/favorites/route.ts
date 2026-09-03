import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAccessCode,
  getFavorites,
  addFavorite,
  hydrateMediaForFavorites,
  recordClientActivity,
  isProjectExpired,
} from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { getClientSessionId } from "@/lib/session";

export async function GET(
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

  const session = await getAuthSession();
  const isOwner = !!(
    session &&
    (session.role === "SUPER_ADMIN" ||
      session.role === "platform_admin" ||
      session.role === "admin" ||
      session.photographerId === project.photographerId)
  );

  if (!isOwner) {
    if (project.status !== "published" || isProjectExpired(project)) {
      return NextResponse.json({ error: "This wedding gallery is currently inactive, expired, or archived." }, { status: 403 });
    }
  }

  const sessionId = getClientSessionId(request, accessCode);
  const rawFavorites = getFavorites(project.id, sessionId);
  const hydrated = hydrateMediaForFavorites(rawFavorites, project);

  // Grouping & count calculation
  const total = hydrated.length;
  const photos = hydrated.filter((h) => h.mediaType === "PHOTO").length;
  const videos = hydrated.filter((h) => h.mediaType === "VIDEO").length;

  const byEvent: Record<string, { total: number; photos: number; videos: number }> = {};
  for (const item of hydrated) {
    const eventName = item.media?.eventName || "Other";
    if (!byEvent[eventName]) {
      byEvent[eventName] = { total: 0, photos: 0, videos: 0 };
    }
    byEvent[eventName].total += 1;
    if (item.mediaType === "PHOTO") byEvent[eventName].photos += 1;
    if (item.mediaType === "VIDEO") byEvent[eventName].videos += 1;
  }

  const response = NextResponse.json({
    success: true,
    sessionId,
    total,
    photos,
    videos,
    byEvent,
    favorites: hydrated,
    mediaIds: hydrated.map((h) => h.mediaId),
  });

  // Ensure cookie is attached
  response.cookies.set(`wvg_session_${project.accessCode.toUpperCase()}`, sessionId, {
    path: `/`,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}

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

  const session = await getAuthSession();
  const isOwner = !!(
    session &&
    (session.role === "SUPER_ADMIN" ||
      session.role === "platform_admin" ||
      session.role === "admin" ||
      session.photographerId === project.photographerId)
  );

  if (!isOwner) {
    if (project.status !== "published" || isProjectExpired(project)) {
      return NextResponse.json({ error: "This wedding gallery is currently inactive, expired, or archived." }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { mediaId, mediaType } = body;

    if (!mediaId || typeof mediaId !== "string") {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    // IDOR Protection: Verify media belongs to this project
    const allMedia = project.mediaFiles || [
      ...(project.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
      ...(project.photoFiles || []),
    ];

    const matchingMedia = allMedia.find(
      (m) => m.id === mediaId || m.driveFileId === mediaId
    );

    if (!matchingMedia) {
      return NextResponse.json(
        { error: "Media file does not belong to this wedding gallery." },
        { status: 400 }
      );
    }

    const resolvedMediaType = mediaType || matchingMedia.type || "PHOTO";
    const sessionId = getClientSessionId(request, accessCode);

    const favorite = addFavorite({
      projectId: project.id,
      accessCode: project.accessCode,
      mediaId,
      mediaType: resolvedMediaType,
      sessionId,
    });

    const sessionFavs = getFavorites(project.id, sessionId);

    try {
      recordClientActivity(
        project.id,
        "photo_favorited",
        `Client marked photo as favorite (${sessionFavs.length} total favorites)`,
        { mediaId, totalFavorites: sessionFavs.length }
      );
    } catch {}

    const response = NextResponse.json({
      success: true,
      favorite,
      totalFavorites: sessionFavs.length,
      mediaIds: sessionFavs.map((f) => f.mediaId),
    });

    response.cookies.set(`wvg_session_${project.accessCode.toUpperCase()}`, sessionId, {
      path: `/`,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("Add favorite error:", err);
    return NextResponse.json({ error: "Failed to save favorite" }, { status: 500 });
  }
}
