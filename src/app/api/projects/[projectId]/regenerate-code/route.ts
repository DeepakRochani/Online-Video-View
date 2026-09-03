import { NextRequest, NextResponse } from "next/server";
import { regenerateProjectAccessCode } from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  const result = regenerateProjectAccessCode(projectId);
  if (!result.success || !result.newAccessCode) {
    return NextResponse.json({ error: result.error || "Failed to regenerate access code" }, { status: 500 });
  }

  const origin = request.headers.get("origin") || request.nextUrl.origin || "https://weddingvideogallery.com";
  const galleryUrl = `${origin}/gallery/${result.newAccessCode}`;

  return NextResponse.json({
    success: true,
    accessCode: result.newAccessCode,
    galleryUrl,
    message: "Client link regenerated successfully. Previous links have been invalidated.",
  });
}
