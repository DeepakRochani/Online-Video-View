import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAccessCode,
  getSelections,
  addSelection,
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

  const config = project.settings?.selectionConfig || {
    enabled: false,
    limit: 20,
    title: "Wedding Album Selection",
    instructions: "Please select your favorite photos for your custom wedding album.",
    status: "OPEN" as const,
  };

  const sessionId = getClientSessionId(request, accessCode);
  const rawSelections = getSelections(project.id);
  const hydrated = hydrateMediaForFavorites(rawSelections as any, project);

  const response = NextResponse.json({
    success: true,
    sessionId,
    config,
    count: hydrated.length,
    limit: config.limit || 20,
    status: config.status,
    isLocked: !config.enabled || config.status === "LOCKED",
    selections: hydrated,
    mediaIds: hydrated.map((s) => s.mediaId),
  });

  response.cookies.set(`wvg_session_${project.accessCode.toUpperCase()}`, sessionId, {
    path: `/`,
    maxAge: 60 * 60 * 24 * 365,
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
    const { mediaId, mediaType, category } = body;

    if (!mediaId || typeof mediaId !== "string") {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    // IDOR Protection: verify media belongs to this project
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

    const sessionId = getClientSessionId(request, accessCode);
    const result = addSelection({
      projectId: project.id,
      accessCode: project.accessCode,
      mediaId,
      mediaType: mediaType || matchingMedia.type || "PHOTO",
      sessionId,
      category: category || "album",
    });

    const config = project.settings?.selectionConfig;
    const isLocked = !config?.enabled || config?.status === "LOCKED";

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, isLocked },
        { status: 400 }
      );
    }

    const currentSelections = getSelections(project.id);

    try {
      recordClientActivity(
        project.id,
        "photo_selected",
        `Client added photo to album selection (${currentSelections.length} selected)`,
        { mediaId, totalSelected: currentSelections.length }
      );
    } catch {}

    const response = NextResponse.json({
      success: true,
      item: result.item,
      count: currentSelections.length,
      mediaIds: currentSelections.map((s) => s.mediaId),
    });

    response.cookies.set(`wvg_session_${project.accessCode.toUpperCase()}`, sessionId, {
      path: `/`,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("Add selection error:", err);
    return NextResponse.json({ error: "Failed to add to selection" }, { status: 500 });
  }
}
