import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { syncProjectMedia } from "@/lib/db";
import { scanDriveFolder } from "@/lib/drive";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const project = auth.project;

  const scanResult = await scanDriveFolder(project.driveFolderId);
  if (!scanResult.success) {
    return NextResponse.json(
      { error: scanResult.error || "Failed to scan folder" },
      { status: scanResult.status || 400 }
    );
  }

  const updated = syncProjectMedia(
    projectId,
    scanResult.media || scanResult.videos || [],
    scanResult.events || []
  );

  const photoCount = updated?.photoFiles?.length || 0;
  const videoCount = updated?.videoFiles?.length || 0;
  const totalCount = updated?.mediaFiles?.length || (photoCount + videoCount);

  return NextResponse.json({
    project: updated,
    count: totalCount,
    photoCount,
    videoCount,
    events: scanResult.events || [],
    message: `✓ Sync Complete (${photoCount} photos, ${videoCount} films detected across ${scanResult.events?.length || 1} event folders)`,
  });
}
