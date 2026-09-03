import { NextRequest, NextResponse } from "next/server";
import { DriveMediaFile } from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";
import { createPhotosZipArchive } from "@/lib/zip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const auth = await requireProjectOwner(projectId);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const project = auth.project;
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get("type") || "photos";
    const eventName = searchParams.get("event");

    let mediaItems: DriveMediaFile[] = project.mediaFiles || [];

    if (typeFilter === "photos") {
      mediaItems = mediaItems.filter((m) => m.type !== "VIDEO");
    }

    if (eventName && eventName !== "all") {
      mediaItems = mediaItems.filter(
        (m) => (m.eventName || "").toLowerCase() === eventName.toLowerCase()
      );
    }

    if (mediaItems.length === 0) {
      return NextResponse.json(
        { error: "No media items found for this selection." },
        { status: 400 }
      );
    }

    const projectSlug = (project.coupleName || "Wedding")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_{2,}/g, "_");
    const zipFileName = `${projectSlug}_Archive.zip`;

    const zipBuffer = await createPhotosZipArchive({
      projectName: project.coupleName,
      coupleNames: project.coupleName,
      studioName: project.branding?.businessName || "Wedding Cinema Studio",
      mediaList: mediaItems,
    });

    const nodeBuffer = Buffer.from(zipBuffer);

    return new NextResponse(nodeBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFileName)}"`,
        "Content-Length": String(nodeBuffer.byteLength),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("[Project ZIP Download Error]", err);
    return NextResponse.json(
      { error: "Failed to generate ZIP archive." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const auth = await requireProjectOwner(projectId);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const project = auth.project;
    const body = await request.json().catch(() => ({}));
    const { mediaIds, eventName, type: typeFilter = "photos", label } = body as {
      mediaIds?: string[];
      eventName?: string;
      type?: string;
      label?: string;
    };

    let mediaItems: DriveMediaFile[] = project.mediaFiles || [];

    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      const idSet = new Set(mediaIds);
      mediaItems = mediaItems.filter(
        (m) => idSet.has(m.id) || (m.driveFileId && idSet.has(m.driveFileId))
      );
    } else {
      if (typeFilter === "photos") {
        mediaItems = mediaItems.filter((m) => m.type !== "VIDEO");
      }
      if (eventName && eventName !== "all") {
        mediaItems = mediaItems.filter(
          (m) => (m.eventName || "").toLowerCase() === eventName.toLowerCase()
        );
      }
    }

    if (mediaItems.length === 0) {
      return NextResponse.json(
        { error: "No media items found for this selection." },
        { status: 400 }
      );
    }

    const projectSlug = (project.coupleName || "Wedding")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_{2,}/g, "_");
    const customLabel = label ? `_${label.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    const zipFileName = `${projectSlug}${customLabel}_Archive.zip`;

    const zipBuffer = await createPhotosZipArchive({
      projectName: project.coupleName,
      coupleNames: project.coupleName,
      studioName: project.branding?.businessName || "Wedding Cinema Studio",
      mediaList: mediaItems,
    });

    const nodeBuffer = Buffer.from(zipBuffer);

    return new NextResponse(nodeBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFileName)}"`,
        "Content-Length": String(nodeBuffer.byteLength),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("[Project ZIP Download POST Error]", err);
    return NextResponse.json(
      { error: "Failed to generate ZIP archive." },
      { status: 500 }
    );
  }
}
