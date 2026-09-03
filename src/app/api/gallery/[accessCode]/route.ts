export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAccessCode,
  verifyPassword,
  recordAnalyticsEvent,
  isProjectExpired,
  recordClientActivity,
  resolveBranding,
  resolveGalleryAppearance,
  getDomainsByProjectId,
  createGallerySessionToken,
  verifyGallerySessionToken,
} from "@/lib/db";
import { isAuthenticated, getCurrentSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  const { accessCode } = await params;
  if (!accessCode) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }

  const project = getProjectByAccessCode(accessCode.toUpperCase());
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Wedding gallery not found. Please verify your link." }, { status: 404 });
  }

  const session = await getCurrentSession();
  const isSuperAdmin = !!(
    session &&
    (session.role === "SUPER_ADMIN" ||
      session.role === "platform_admin" ||
      session.role === "admin")
  );
  const isOwner = !!(
    session &&
    (isSuperAdmin || session.photographerId === project.photographerId)
  );
  const isPreview = request.nextUrl.searchParams.get("preview") === "true" && isOwner;
  const isAdminPreview = request.nextUrl.searchParams.get("adminPreview") === "true" && isSuperAdmin;

  const effectiveBranding = resolveBranding(project.branding || project.photographerBranding);
  const appearance = resolveGalleryAppearance(project);
  const template = appearance.template;
  const theme = appearance.theme;
  const domains = getDomainsByProjectId(project.id);
  const customDomain = domains.find((d) => d.status === "active")?.hostname || domains[0]?.hostname || null;

  // Check gallery lifecycle status (photographer owner & super admin can preview)
  if (!isOwner && !isAdminPreview) {
    if (project.status === "draft") {
      return NextResponse.json(
        {
          error: "This wedding gallery is currently being curated. Please check back shortly.",
          status: "UNPUBLISHED",
          coupleName: project.coupleName,
          weddingDate: project.weddingDate,
          weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
          branding: effectiveBranding,
        },
        { status: 403 }
      );
    }

    if (project.status === "paused") {
      return NextResponse.json(
        {
          error: "This wedding gallery is temporarily unavailable.",
          status: "PAUSED",
          coupleName: project.coupleName,
          weddingDate: project.weddingDate,
          weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
          branding: effectiveBranding,
        },
        { status: 403 }
      );
    }

    if (isProjectExpired(project)) {
      return NextResponse.json(
        {
          error: "This wedding gallery has expired.",
          status: "EXPIRED",
          coupleName: project.coupleName,
          weddingDate: project.weddingDate,
          weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
          branding: effectiveBranding,
          helpText: "Please contact the studio if you need access.",
        },
        { status: 403 }
      );
    }

    if (project.status === "archived") {
      return NextResponse.json(
        {
          error: "This wedding gallery has been archived and access has concluded.",
          status: "ARCHIVED",
          coupleName: project.coupleName,
          weddingDate: project.weddingDate,
          weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
          branding: effectiveBranding,
        },
        { status: 403 }
      );
    }
  }

  // Password Protection Check
  if (project.settings?.isPasswordProtected && project.settings?.password && !isOwner && !isAdminPreview) {
    const authHeader = request.headers.get("x-gallery-password") || request.nextUrl.searchParams.get("pwd") || "";
    const cookieToken = request.cookies.get(`wvg_auth_${project.id}`)?.value;
    const isSessionUnlocked = verifyGallerySessionToken(cookieToken, project.id);
    const isPasswordUnlocked = verifyPassword(authHeader, project.settings.password);

    if (!isSessionUnlocked && !isPasswordUnlocked) {
      // Return locked state without sensitive media files
      return NextResponse.json({
        isLocked: true,
        status: "PASSWORD_PROTECTED",
        coupleName: project.coupleName,
        weddingDate: project.weddingDate,
        weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
        packageType: project.packageType,
        welcomeMessage: project.welcomeMessage || "Our beautiful beginning",
        coverImage: project.coverImage,
        branding: effectiveBranding,
        theme,
        template,
        customDomain,
        accessCode: project.accessCode,
      });
    }
  }

  // Record view event in analytics
  if (!isOwner) {
    try {
      recordAnalyticsEvent(project.accessCode, "view");
    } catch {
      // Ignore analytics background failure
    }
  }

  // Auto-fill event covers from photo or video thumbnails if missing
  const videoFiles = project.videoFiles || [];
  const photoFiles = project.photoFiles || [];
  const mediaFiles = project.mediaFiles || [...videoFiles, ...photoFiles];
  const events = (project.events || []).map((evt) => {
    if (evt.coverImage) return evt;
    const matchingMedia = mediaFiles.find(
      (m) => (m.eventName || "").toLowerCase() === evt.name.toLowerCase() && (m.thumbnailUrl || m.thumbnailLink)
    );
    return {
      ...evt,
      coverImage: matchingMedia?.thumbnailUrl || matchingMedia?.thumbnailLink || "",
    };
  });

  const allowDownloads = project.settings?.allowDownloads ?? false;
  const allowPhotoDownload = project.settings?.allowPhotoDownload ?? allowDownloads ?? true;
  const allowVideoDownload = project.settings?.allowVideoDownload ?? allowDownloads ?? false;

  if (!isOwner) {
    try {
      recordClientActivity(
        project.id,
        "gallery_opened",
        `Client opened wedding gallery for ${project.coupleName}`
      );
    } catch {}
  }

  return NextResponse.json({
    isLocked: false,
    coupleName: project.coupleName,
    weddingDate: project.weddingDate,
    packageType: project.packageType,
    welcomeMessage: project.welcomeMessage || "Our beautiful beginning",
    coverImage: project.coverImage,
    photographerName: effectiveBranding.businessName || project.photographerName || "DR Films Wedding Cinema",
    branding: effectiveBranding,
    theme,
    template,
    customDomain,
    expiresAt: project.expiresAt,
    isPhotographerPreview: isOwner,
    settings: {
      allowDownloads,
      allowPhotoDownload,
      allowVideoDownload,
      allowFullscreen: project.settings?.allowFullscreen ?? true,
      showBranding: project.settings?.showBranding ?? true,
      whiteLabelEnabled: project.settings?.whiteLabelEnabled ?? true,
      template,
      theme,
      heroStyle: appearance.heroStyle,
      gridStyle: project.settings?.gridStyle || "masonry",
      fontFamily: appearance.fontPreset,
      primaryAccent: appearance.primaryAccent,
      secondaryAccent: project.settings?.secondaryAccent || "#E5C158",
      textColor: project.settings?.textColor || "#F8FAFC",
      backgroundColor: project.settings?.backgroundColor || "#0B0C10",
      selectionConfig: project.settings?.selectionConfig,
    },
    events,
    videoFiles,
    photoFiles,
    mediaFiles,
    totalMedia: mediaFiles.length,
    photoCount: photoFiles.length,
    videoCount: videoFiles.length,
    accessCode: project.accessCode,
    isAdminPreview: !!isAdminPreview,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  const { accessCode } = await params;
  if (!accessCode) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }

  const project = getProjectByAccessCode(accessCode.toUpperCase());
  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Wedding gallery not found" }, { status: 404 });
  }

  const session = await getCurrentSession();
  const isSuperAdmin = !!(
    session &&
    (session.role === "SUPER_ADMIN" ||
      session.role === "platform_admin" ||
      session.role === "admin")
  );
  const isOwner = !!(
    session &&
    (isSuperAdmin || session.photographerId === project.photographerId)
  );

  const effectiveBranding = resolveBranding(project.branding || project.photographerBranding);

  // Check gallery lifecycle status
  if (!isOwner) {
    if (project.status === "draft") {
      return NextResponse.json(
        {
          error: "This wedding gallery is currently being curated.",
          status: "UNPUBLISHED",
          branding: effectiveBranding,
        },
        { status: 403 }
      );
    }
    if (isProjectExpired(project)) {
      return NextResponse.json(
        {
          error: "This wedding gallery has expired.",
          status: "EXPIRED",
          branding: effectiveBranding,
          helpText: "Please contact the studio if you need access.",
        },
        { status: 403 }
      );
    }
    if (project.status === "archived") {
      return NextResponse.json(
        {
          error: "This wedding gallery has been archived.",
          status: "ARCHIVED",
          branding: effectiveBranding,
        },
        { status: 403 }
      );
    }
  }

  try {
    const { password, rememberDevice } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const isValid = verifyPassword(password, project.settings?.password);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    const effectiveBranding = resolveBranding(project.branding || project.photographerBranding);
    const appearance = resolveGalleryAppearance(project);
    const template = appearance.template;
    const theme = appearance.theme;
    const domains = getDomainsByProjectId(project.id);
    const customDomain = domains.find((d) => d.status === "active")?.hostname || domains[0]?.hostname || null;

    const videoFiles = project.videoFiles || [];
    const photoFiles = project.photoFiles || [];
    const mediaFiles = project.mediaFiles || [...videoFiles, ...photoFiles];
    const events = (project.events || []).map((evt) => {
      if (evt.coverImage) return evt;
      const matchingMedia = mediaFiles.find(
        (m) => (m.eventName || "").toLowerCase() === evt.name.toLowerCase() && (m.thumbnailUrl || m.thumbnailLink)
      );
      return {
        ...evt,
        coverImage: matchingMedia?.thumbnailUrl || matchingMedia?.thumbnailLink || "",
      };
    });

    const allowDownloads = project.settings?.allowDownloads ?? false;
    const allowPhotoDownload = project.settings?.allowPhotoDownload ?? allowDownloads ?? true;
    const allowVideoDownload = project.settings?.allowVideoDownload ?? allowDownloads ?? false;
    const sessionToken = createGallerySessionToken(project.id);

    try {
      recordClientActivity(
        project.id,
        "gallery_opened",
        `Client authenticated and unlocked wedding gallery for ${project.coupleName}`,
        { accessCode: project.accessCode }
      );
    } catch {}

    // Return full unlocked payload with project-scoped session cookie
    const response = NextResponse.json({
      success: true,
      isLocked: false,
      sessionToken,
      coupleName: project.coupleName,
      weddingDate: project.weddingDate,
      weddingLocation: project.weddingLocation || effectiveBranding.weddingLocation || "",
      packageType: project.packageType,
      welcomeMessage: project.welcomeMessage || "Our beautiful beginning",
      coverImage: project.coverImage,
      photographerName: effectiveBranding.businessName || project.photographerName || "DR Films Wedding Cinema",
      branding: effectiveBranding,
      theme,
      template,
      customDomain,
      expiresAt: project.expiresAt,
      settings: {
        allowDownloads,
        allowPhotoDownload,
        allowVideoDownload,
        allowFullscreen: project.settings?.allowFullscreen ?? true,
        showBranding: project.settings?.showBranding ?? true,
        whiteLabelEnabled: project.settings?.whiteLabelEnabled ?? true,
        template,
        theme,
        heroStyle: appearance.heroStyle,
        gridStyle: project.settings?.gridStyle || "masonry",
        fontFamily: appearance.fontPreset,
        primaryAccent: appearance.primaryAccent,
        secondaryAccent: project.settings?.secondaryAccent || "#E5C158",
        textColor: project.settings?.textColor || "#F8FAFC",
        backgroundColor: project.settings?.backgroundColor || "#0B0C10",
        selectionConfig: project.settings?.selectionConfig,
      },
      events,
      videoFiles,
      photoFiles,
      mediaFiles,
      totalMedia: mediaFiles.length,
      photoCount: photoFiles.length,
      videoCount: videoFiles.length,
      accessCode: project.accessCode,
    });

    // Set secure project-scoped authentication cookie (30 days if rememberDevice, else 24 hours)
    response.cookies.set(`wvg_auth_${project.id}`, sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: rememberDevice ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to verify password" }, { status: 500 });
  }
}
