import { NextRequest, NextResponse } from "next/server";
import { scanDriveFolder } from "@/lib/drive";
import { getCurrentSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { folderUrl, folderId } = body;
    const targetUrl = folderUrl || folderId;

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: 'folderUrl'. Please provide a Google Drive folder link.",
        },
        { status: 400 }
      );
    }

    const result = await scanDriveFolder(targetUrl);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to scan Google Drive folder",
        },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: result.folder,
      videos: result.videos,
      events: result.events,
      totalVideos: result.totalVideos,
    });
  } catch (err: any) {
    console.error("[API /api/drive/scan] Unhandled error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error while scanning folder.",
      },
      { status: 500 }
    );
  }
}
