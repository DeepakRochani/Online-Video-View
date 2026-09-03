import { NextRequest } from "next/server";
import {
  getMediaRecord,
  getVideoRecord,
  isProjectExpired,
  verifyGallerySessionToken,
  verifyPassword,
} from "./db";
import { getCurrentSession } from "./auth";
import { verifySignedMediaToken } from "./media-token";
import { WeddingProject, DriveMediaFile, DriveVideoFile } from "./project-types";

export interface MediaAuthContext {
  media: DriveMediaFile | DriveVideoFile;
  project: WeddingProject;
  isOwner: boolean;
  isSuperAdmin: boolean;
  isDownload: boolean;
  tier: "thumbnail" | "grid" | "preview" | "lightbox" | "original";
}

export type MediaAuthFailureReason =
  | "MEDIA_NOT_FOUND"
  | "GALLERY_NOT_FOUND"
  | "GALLERY_DELETED"
  | "GALLERY_UNPUBLISHED"
  | "GALLERY_PAUSED"
  | "GALLERY_EXPIRED"
  | "GALLERY_ARCHIVED"
  | "GALLERY_PASSWORD_REQUIRED"
  | "ACCESS_DENIED"
  | "DOWNLOAD_DISABLED"
  | "INVALID_TOKEN";

export interface MediaAuthResult {
  authorized: boolean;
  status: number;
  reason?: MediaAuthFailureReason;
  errorMessage?: string;
  context?: MediaAuthContext;
}

/**
 * Production Media Authorization Service
 * Enforces strict multi-tenant isolation, gallery lifecycle states, password protection,
 * and signed media token verification for all photos, videos, and downloads.
 */
export async function authorizeMediaRequest(
  request: NextRequest,
  mediaIdOrDriveId: string,
  options: {
    mediaType?: "PHOTO" | "VIDEO";
    isDownload?: boolean;
    tier?: "thumbnail" | "grid" | "preview" | "lightbox" | "original";
  } = {}
): Promise<MediaAuthResult> {
  const isDownload = options.isDownload ?? (request.nextUrl.searchParams.get("download") === "true");
  const tier = options.tier || (isDownload ? "original" : "grid");

  // Helper to fetch media & project safely
  const fetchRecord = () => {
    if (options.mediaType === "VIDEO") {
      const v = getVideoRecord(mediaIdOrDriveId);
      return v ? { media: v.video as DriveMediaFile | DriveVideoFile, project: v.project } : null;
    }
    const m = getMediaRecord(mediaIdOrDriveId);
    return m ? { media: m.media as DriveMediaFile | DriveVideoFile, project: m.project } : null;
  };

  // 1. Signed Token Check (Fast-path if cryptographically valid)
  const token = request.nextUrl.searchParams.get("token") || request.headers.get("x-media-token");
  if (token) {
    const tokenResult = verifySignedMediaToken(token);
    if (!tokenResult.valid || !tokenResult.payload) {
      return {
        authorized: false,
        status: 403,
        reason: "INVALID_TOKEN",
        errorMessage: `Media token verification failed: ${tokenResult.error || "INVALID"}`,
      };
    }

    const { mediaId, projectId, photographerId } = tokenResult.payload;

    // Verify token matches requested media
    if (mediaId !== mediaIdOrDriveId && !mediaIdOrDriveId.includes(mediaId)) {
      return {
        authorized: false,
        status: 403,
        reason: "INVALID_TOKEN",
        errorMessage: "Token media mismatch",
      };
    }

    const record = fetchRecord();

    if (!record) {
      return {
        authorized: false,
        status: 404,
        reason: "MEDIA_NOT_FOUND",
        errorMessage: "Media file not found in wedding registry",
      };
    }

    const { media, project } = record;

    // Verify project and tenant match token
    if (project.id !== projectId || project.photographerId !== photographerId) {
      return {
        authorized: false,
        status: 403,
        reason: "ACCESS_DENIED",
        errorMessage: "Cross-tenant or cross-project token mismatch",
      };
    }

    // Verify gallery lifecycle
    if (project.deletedAt) {
      return {
        authorized: false,
        status: 404,
        reason: "GALLERY_DELETED",
        errorMessage: "This wedding gallery has been removed.",
      };
    }

    if (project.status === "archived") {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_ARCHIVED",
        errorMessage: "This wedding gallery has been archived.",
      };
    }

    if (isProjectExpired(project)) {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_EXPIRED",
        errorMessage: "This wedding gallery has expired.",
      };
    }

    return {
      authorized: true,
      status: 200,
      context: {
        media,
        project,
        isOwner: false,
        isSuperAdmin: false,
        isDownload,
        tier,
      },
    };
  }

  // 2. Standard Session & Access Code Path
  const record = fetchRecord();

  if (!record) {
    return {
      authorized: false,
      status: 404,
      reason: "MEDIA_NOT_FOUND",
      errorMessage: "Media file not found in wedding registry",
    };
  }

  const { media, project } = record;

  if (project.deletedAt) {
    return {
      authorized: false,
      status: 404,
      reason: "GALLERY_DELETED",
      errorMessage: "This wedding gallery has been removed.",
    };
  }

  // Check Actor Session
  const session = await getCurrentSession(request);
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

  const queryAccessCode = request.nextUrl.searchParams.get("accessCode");
  const headerAccessCode = request.headers.get("x-gallery-access-code");
  const providedAccessCode = queryAccessCode || headerAccessCode || "";

  const isAdminPreview = request.nextUrl.searchParams.get("adminPreview") === "true" && isSuperAdmin;
  const isPreview = request.nextUrl.searchParams.get("preview") === "true" && isOwner;

  const accessCodeMatches =
    providedAccessCode.trim().length > 0 &&
    project.accessCode.toUpperCase() === providedAccessCode.trim().toUpperCase();

  // If not owner/preview, must match gallery access code
  if (!isOwner && !isAdminPreview && !isPreview) {
    if (!accessCodeMatches) {
      return {
        authorized: false,
        status: 403,
        reason: "ACCESS_DENIED",
        errorMessage: "Access denied: valid gallery access code required.",
      };
    }

    // Lifecycle enforcement for client
    if (project.status === "draft") {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_UNPUBLISHED",
        errorMessage: "This wedding gallery is currently being curated.",
      };
    }

    if (project.status === "paused") {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_PAUSED",
        errorMessage: "This wedding gallery is temporarily paused.",
      };
    }

    if (project.status === "archived") {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_ARCHIVED",
        errorMessage: "This wedding gallery has been archived and access has concluded.",
      };
    }

    if (isProjectExpired(project)) {
      return {
        authorized: false,
        status: 403,
        reason: "GALLERY_EXPIRED",
        errorMessage: "This wedding gallery has expired.",
      };
    }

    // Password Protection Check
    if (project.settings?.isPasswordProtected && project.settings?.password) {
      const cookieToken = request.cookies.get(`wvg_auth_${project.id}`)?.value;
      const authHeader =
        request.headers.get("x-gallery-password") ||
        request.nextUrl.searchParams.get("pwd") ||
        "";
      const isSessionUnlocked = verifyGallerySessionToken(cookieToken, project.id);
      const isPasswordUnlocked = verifyPassword(authHeader, project.settings.password);

      if (!isSessionUnlocked && !isPasswordUnlocked) {
        return {
          authorized: false,
          status: 403,
          reason: "GALLERY_PASSWORD_REQUIRED",
          errorMessage: "Access denied. Valid gallery password session required.",
        };
      }
    }
  }

  // Download permission enforcement
  if (isDownload && !isOwner) {
    const isVideo = options.mediaType === "VIDEO" || media.type === "VIDEO";
    const allowDownloads = project.settings?.allowDownloads ?? false;
    const downloadAllowed = isVideo
      ? project.settings?.allowVideoDownload ?? allowDownloads
      : project.settings?.allowPhotoDownload ?? allowDownloads;

    if (!downloadAllowed) {
      return {
        authorized: false,
        status: 403,
        reason: "DOWNLOAD_DISABLED",
        errorMessage: `${isVideo ? "Video" : "Photo"} downloads are disabled for this gallery.`,
      };
    }
  }

  return {
    authorized: true,
    status: 200,
    context: {
      media,
      project,
      isOwner,
      isSuperAdmin,
      isDownload,
      tier,
    },
  };
}
