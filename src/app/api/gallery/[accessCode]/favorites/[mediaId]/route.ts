import { NextRequest, NextResponse } from "next/server";
import { getProjectByAccessCode, removeFavorite, getFavorites, isProjectExpired } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getClientSessionId } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; mediaId: string }> }
) {
  const { accessCode, mediaId } = await params;
  if (!accessCode || !mediaId) {
    return NextResponse.json({ error: "Access code and mediaId are required" }, { status: 400 });
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

  const sessionId = getClientSessionId(request, accessCode);
  const success = removeFavorite(project.id, mediaId, sessionId);
  const remaining = getFavorites(project.id, sessionId);

  return NextResponse.json({
    success,
    removed: success,
    totalFavorites: remaining.length,
    mediaIds: remaining.map((f) => f.mediaId),
  });
}
