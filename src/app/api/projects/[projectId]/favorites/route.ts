import { NextRequest, NextResponse } from "next/server";
import { getFavorites, hydrateMediaForFavorites } from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  const project = ownerCheck.project;
  const rawFavorites = getFavorites(projectId);
  const hydrated = hydrateMediaForFavorites(rawFavorites, project);

  const total = hydrated.length;
  const photos = hydrated.filter((h) => h.mediaType === "PHOTO").length;
  const videos = hydrated.filter((h) => h.mediaType === "VIDEO").length;

  const byEvent: Record<string, number> = {};
  for (const item of hydrated) {
    const eventName = item.media?.eventName || "General";
    byEvent[eventName] = (byEvent[eventName] || 0) + 1;
  }

  return NextResponse.json({
    success: true,
    total,
    photos,
    videos,
    byEvent,
    favorites: hydrated,
  });
}
