import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getProjectsByPhotographer, createProject, parseFolderUrl, getFavorites, getSelections, DEFAULT_PHOTOGRAPHER_ID } from "@/lib/db";
import { scanDriveFolder } from "@/lib/drive";
import { canCreate } from "@/lib/entitlements";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !session.photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawProjects = getProjectsByPhotographer(session.photographerId);
  
  // Enrich projects with favorites and selection counts for dashboard performance
  const projects = rawProjects.map((p) => {
    const favs = getFavorites(p.id);
    const sels = getSelections(p.id);
    return {
      ...p,
      favoritesCount: favs.length,
      selectedCount: sels.length,
    };
  });

  // Sort by updatedAt desc or weddingDate desc
  projects.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || !session.photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId;

  // Entitlement Engine Limit Enforcement
  const limitCheck = canCreate(photographerId, "weddings");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { 
        error: limitCheck.code || "PLAN_LIMIT_REACHED", 
        message: limitCheck.message,
        current: limitCheck.current,
        limit: limitCheck.limit,
        upgradeRequired: true,
        upgradePlan: limitCheck.upgradeRequiredPlan,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      coupleName,
      weddingDate,
      packageType,
      welcomeMessage,
      driveFolderUrl,
      notes,
      coverImage,
      status,
      settings,
      branding,
      weddingLocation,
      expiresAt,
    } = body;

    if (!coupleName || !weddingDate || !driveFolderUrl) {
      return NextResponse.json(
        { error: "Couple name, wedding date, and Google Drive folder URL are required." },
        { status: 400 }
      );
    }

    const folderId = parseFolderUrl(driveFolderUrl);
    if (!folderId) {
      return NextResponse.json(
        { error: "Invalid Google Drive folder link. Please provide a valid folder URL." },
        { status: 400 }
      );
    }

    // Attempt initial scan of the folder
    let videoFiles: any[] = [];
    let photoFiles: any[] = [];
    let mediaFiles: any[] = [];
    let detectedEvents: any[] = [];
    let scanError: string | undefined = undefined;

    const scanResult = await scanDriveFolder(folderId);
    if (scanResult.success) {
      videoFiles = scanResult.videos || [];
      photoFiles = scanResult.photos || [];
      mediaFiles = scanResult.media || [...videoFiles, ...photoFiles];
      detectedEvents = scanResult.events || [];
    } else if (scanResult.error) {
      scanError = scanResult.error;
    }

    const project = createProject({
      photographerId,
      coupleName: coupleName.trim(),
      weddingDate,
      packageType: packageType?.trim() || "Full Wedding Cinema",
      welcomeMessage: welcomeMessage?.trim() || "Our beautiful beginning",
      driveFolderId: folderId,
      driveFolderUrl: driveFolderUrl.trim(),
      notes: notes?.trim() || "",
      coverImage: coverImage || "",
      status: status || "published",
      expiresAt: expiresAt || undefined,
      settings: settings || {
        isPasswordProtected: false,
        allowDownloads: false,
        allowFullscreen: true,
        showBranding: true,
      },
      branding: {
        businessName: branding?.businessName || process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
        weddingLocation: weddingLocation || branding?.weddingLocation || "",
        ...(branding || {}),
      },
      videoFiles,
      photoFiles,
      mediaFiles,
      events: detectedEvents,
    });

    return NextResponse.json({ project, scanWarning: scanError }, { status: 201 });
  } catch (err: unknown) {
    console.error("Create project error:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
