import { NextRequest, NextResponse } from "next/server";
import { getProjectByAccessCode, removeSelection, getSelections, isProjectExpired } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getClientSessionId } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; mediaId: string }> }
) {
  const { accessCode, mediaId } = await params;
  if (!accessCode || !mediaId) {
    return NextResponse.json({ error: "Access code and mediaId required" }, { status: 400 });
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
  const result = removeSelection(project.id, mediaId, sessionId);

  const config = project.settings?.selectionConfig;
  const isLocked = !config?.enabled || config?.status === "LOCKED";

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to remove item", isLocked },
      { status: 400 }
    );
  }

  const remaining = getSelections(project.id);

  const response = NextResponse.json({
    success: true,
    count: remaining.length,
    mediaIds: remaining.map((s) => s.mediaId),
  });

  response.cookies.set(`wvg_session_${project.accessCode.toUpperCase()}`, sessionId, {
    path: `/`,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
