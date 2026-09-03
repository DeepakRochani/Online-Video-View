import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { readProjects, readPhotographers, DEFAULT_PHOTOGRAPHER_ID, isProjectExpired } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const status = searchParams.get("status");
  const photographerId = searchParams.get("photographerId");

  try {
    const projects = readProjects();
    const photographers = readPhotographers();

    const photographerMap = new Map(photographers.map((p) => [p.id, p]));

    let items = projects.map((p) => {
      const pId = p.photographerId || DEFAULT_PHOTOGRAPHER_ID;
      const photog = photographerMap.get(pId);

      let totalSizeBytes = 0;
      p.photoFiles?.forEach((f) => { if (f.sizeBytes) totalSizeBytes += f.sizeBytes; });
      p.videoFiles?.forEach((v) => { if (v.sizeBytes) totalSizeBytes += v.sizeBytes; });

      return {
        id: p.id,
        coupleName: p.coupleName,
        weddingDate: p.weddingDate,
        weddingLocation: p.branding?.weddingLocation || "",
        status: p.status,
        expiresAt: p.expiresAt || null,
        isExpired: isProjectExpired(p),
        deletedAt: p.deletedAt || null,
        archivedAt: p.archivedAt || null,
        publishedAt: p.publishedAt || null,
        accessCode: p.accessCode,
        photographerId: pId,
        photographerName: photog?.name || "Unknown Studio",
        photographerStudio: photog?.studioName || "Studio",
        photographerEmail: photog?.email || "",
        photoCount: p.photoFiles?.length || 0,
        videoCount: p.videoFiles?.length || 0,
        totalStorageMb: Number((totalSizeBytes / (1024 * 1024)).toFixed(1)),
        isPasswordProtected: !!p.settings?.isPasswordProtected,
        coverImage: p.coverImage || p.photoFiles?.[0]?.thumbnailUrl,
        readOnlyGalleryUrl: `/gallery/${p.accessCode}?adminPreview=true`,
        updatedAt: p.updatedAt || p.createdAt,
        createdAt: p.createdAt,
      };
    });

    if (search) {
      items = items.filter(
        (w) =>
          w.coupleName.toLowerCase().includes(search) ||
          w.accessCode.toLowerCase().includes(search) ||
          w.photographerName.toLowerCase().includes(search) ||
          w.photographerStudio.toLowerCase().includes(search)
      );
    }

    if (status && status !== "all") {
      items = items.filter((w) => w.status === status);
    }

    if (photographerId && photographerId !== "all") {
      items = items.filter((w) => w.photographerId === photographerId);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, weddings: items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve weddings" }, { status: 500 });
  }
}
