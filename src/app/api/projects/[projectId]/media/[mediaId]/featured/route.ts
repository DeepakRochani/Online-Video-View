import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { toggleMediaFeatured } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; mediaId: string }> }
) {
  const { projectId, mediaId } = await params;
  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  const updatedMedia = toggleMediaFeatured(projectId, mediaId);

  if (!updatedMedia) {
    return NextResponse.json({ error: "Media item or project not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    media: updatedMedia,
    isFeatured: updatedMedia.isFeatured,
  });
}
