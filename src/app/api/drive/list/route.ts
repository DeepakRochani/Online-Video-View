import { NextRequest, NextResponse } from "next/server";
import { scanDriveFolder } from "@/lib/drive";
import { extractGoogleDriveFolderId } from "@/lib/drive-parser";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json(
      { error: "Missing required parameter: folderId" },
      { status: 400 }
    );
  }

  const cleanFolderId = extractGoogleDriveFolderId(folderId);
  if (!cleanFolderId) {
    return NextResponse.json(
      { error: "Invalid folder ID format" },
      { status: 400 }
    );
  }

  const result = await scanDriveFolder(cleanFolderId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to scan folder" },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json({
    files: result.videos || [],
    folder: result.folder,
    events: result.events || [],
    totalVideos: result.totalVideos || 0,
    message:
      (result.videos || []).length === 0
        ? "No video files found in this folder. Make sure the folder is shared with 'Anyone with the link → Viewer' and contains video files."
        : undefined,
  });
}
