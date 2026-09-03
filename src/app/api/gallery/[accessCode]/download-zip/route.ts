import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAccessCode,
  DriveMediaFile,
  isProjectExpired,
  verifyGallerySessionToken,
  verifyPassword,
  getSelections,
  getFavorites,
  recordClientActivity,
} from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { createPhotosZipArchive } from "@/lib/zip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  try {
    const { accessCode } = await params;
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event") || undefined;
    const typeFilter = searchParams.get("type") || "photos"; // "photos" | "all"

    const project = getProjectByAccessCode(accessCode);
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
      if (project.status !== "published") {
        return NextResponse.json(
          { error: "Gallery is currently not available for download." },
          { status: 403 }
        );
      }

      if (isProjectExpired(project)) {
        return NextResponse.json(
          { error: "This wedding gallery has expired. Downloads are no longer active." },
          { status: 403 }
        );
      }

      // Password session verification
      if (project.settings?.isPasswordProtected && project.settings?.password) {
        const cookieToken = request.cookies.get(`wvg_auth_${project.id}`)?.value;
        const authHeader = request.headers.get("x-gallery-password") || searchParams.get("pwd") || "";
        const isSessionUnlocked = verifyGallerySessionToken(cookieToken, project.id);
        const isPasswordUnlocked = verifyPassword(authHeader, project.settings.password);

        if (!isSessionUnlocked && !isPasswordUnlocked) {
          return NextResponse.json(
            { error: "Access denied. Valid gallery password session required for downloads." },
            { status: 403 }
          );
        }
      }
    }

    const photoDownloadsAllowed = project.settings?.allowPhotoDownload ?? project.settings?.allowDownloads ?? false;
    if (!photoDownloadsAllowed && !isOwner) {
      return NextResponse.json(
        { error: "Photo downloads have been disabled by the photographer." },
        { status: 403 }
      );
    }

    // Determine media items to include
    let mediaItems: DriveMediaFile[] = project.mediaFiles || [];

    // Filter by type
    if (typeFilter === "photos") {
      mediaItems = mediaItems.filter((m) => m.type !== "VIDEO");
    }

    // Filter by event if requested
    if (eventName && eventName !== "all") {
      mediaItems = mediaItems.filter(
        (m) => (m.eventName || "").toLowerCase() === eventName.toLowerCase()
      );
    }

    if (mediaItems.length === 0) {
      return NextResponse.json(
        { error: "No media files available for this selection." },
        { status: 400 }
      );
    }

    const coupleSlug = (project.coupleName || "Wedding")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_{2,}/g, "_");
    const eventSlug = eventName && eventName !== "all" ? `_${eventName.replace(/\s+/g, "_")}` : "";
    const zipFileName = `${coupleSlug}${eventSlug}_Wedding_Photos.zip`;

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
    console.error("[Gallery ZIP Download Error]", err);
    return NextResponse.json(
      { error: "Failed to generate ZIP archive." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  try {
    const { accessCode } = await params;
    const body = await request.json().catch(() => ({}));
    const { mediaIds, eventName, type: typeFilter = "photos", label, scope } = body as {
      mediaIds?: string[];
      eventName?: string;
      type?: string;
      label?: string;
      scope?: "selected" | "favorites" | "event" | "all";
    };

    const project = getProjectByAccessCode(accessCode);
    if (!project) {
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
      if (project.status !== "published") {
        return NextResponse.json(
          { error: "Gallery is currently not available for download." },
          { status: 403 }
        );
      }

      if (isProjectExpired(project)) {
        return NextResponse.json(
          { error: "This wedding gallery has expired. Downloads are no longer active." },
          { status: 403 }
        );
      }

      // Password session verification
      if (project.settings?.isPasswordProtected && project.settings?.password) {
        const cookieToken = request.cookies.get(`wvg_auth_${project.id}`)?.value;
        const authHeader = request.headers.get("x-gallery-password") || request.nextUrl.searchParams.get("pwd") || "";
        const isSessionUnlocked = verifyGallerySessionToken(cookieToken, project.id);
        const isPasswordUnlocked = verifyPassword(authHeader, project.settings.password);

        if (!isSessionUnlocked && !isPasswordUnlocked) {
          return NextResponse.json(
            { error: "Access denied. Valid gallery password session required for downloads." },
            { status: 403 }
          );
        }
      }
    }

    const photoDownloadsAllowed = project.settings?.allowPhotoDownload ?? project.settings?.allowDownloads ?? false;
    if (!photoDownloadsAllowed && !isOwner) {
      return NextResponse.json(
        { error: "Photo downloads have been disabled by the photographer." },
        { status: 403 }
      );
    }

    let mediaItems: DriveMediaFile[] = project.mediaFiles || [];

    // Scope-based handling
    if (scope === "selected") {
      const currentSelections = getSelections(project.id);
      const selectedIdSet = new Set(currentSelections.map((s) => s.mediaId));
      mediaItems = mediaItems.filter(
        (m) => selectedIdSet.has(m.id) || (m.driveFileId && selectedIdSet.has(m.driveFileId))
      );
    } else if (scope === "favorites") {
      const currentFavs = getFavorites(project.id);
      const favIdSet = new Set(currentFavs.map((f) => f.mediaId));
      mediaItems = mediaItems.filter(
        (m) => favIdSet.has(m.id) || (m.driveFileId && favIdSet.has(m.driveFileId))
      );
    } else if (Array.isArray(mediaIds) && mediaIds.length > 0) {
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
        { error: "No media files matching the selection." },
        { status: 400 }
      );
    }

    const coupleSlug = (project.coupleName || "Wedding")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_{2,}/g, "_");
    const customLabel = label ? `_${label.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    const zipFileName = `${coupleSlug}${customLabel}_Wedding_Photos.zip`;

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
    console.error("[Gallery ZIP Download POST Error]", err);
    return NextResponse.json(
      { error: "Failed to generate ZIP archive." },
      { status: 500 }
    );
  }
}
