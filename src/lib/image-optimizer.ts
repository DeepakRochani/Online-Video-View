/**
 * Image Optimizer Utility for Google Drive & Gallery Media
 * Provides edge-optimized thumbnail, preview, and responsive srcset URLs
 * avoiding loading multi-megabyte raw photos for grid rendering.
 */

import { generateSignedMediaToken } from "./media-token";

export type ImageSizeTier = "thumbnail" | "grid" | "preview" | "lightbox" | "original";

export interface MediaItemLike {
  id?: string;
  driveFileId?: string;
  thumbnailUrl?: string;
  thumbnailLink?: string;
  url?: string;
  name?: string;
}

export interface ProjectLike {
  id: string;
  photographerId?: string;
  accessCode?: string;
}

/**
 * Returns the optimized URL for a given media item and size tier.
 */
export function getOptimizedImageUrl(
  media: MediaItemLike | string | undefined,
  tier: ImageSizeTier = "grid"
): string {
  if (!media) return "";

  let rawUrl = "";
  let driveId = "";

  if (typeof media === "string") {
    rawUrl = media;
    if (/^[a-zA-Z0-9_-]{20,}$/.test(rawUrl) && !rawUrl.includes("http")) {
      driveId = rawUrl;
    }
  } else {
    driveId = media.driveFileId || media.id || "";
    rawUrl = media.thumbnailUrl || media.thumbnailLink || media.url || "";
  }

  // If we have a Google Drive File ID, use Google's edge thumbnail CDN
  if (driveId && (/^[a-zA-Z0-9_-]{20,}$/.test(driveId) || !rawUrl)) {
    switch (tier) {
      case "thumbnail":
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w400-h400-c`;
      case "grid":
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
      case "preview":
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
      case "lightbox":
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
      case "original":
        return `https://drive.google.com/uc?id=${driveId}&export=download`;
    }
  }

  // If rawUrl is a Google Drive thumbnail URL (e.g. lh3.googleusercontent.com or drive.google.com)
  if (rawUrl.includes("googleusercontent.com") || rawUrl.includes("drive.google.com")) {
    if (/=s\d+/i.test(rawUrl)) {
      const sizeParam =
        tier === "thumbnail"
          ? "=w400-h400-c"
          : tier === "grid"
          ? "=w800"
          : tier === "preview"
          ? "=w1200"
          : tier === "lightbox"
          ? "=w1600"
          : "=s0";
      return rawUrl.replace(/=s\d+.*$/i, sizeParam);
    }

    if (rawUrl.includes("/thumbnail?id=")) {
      const sizeParam =
        tier === "thumbnail"
          ? "sz=w400-h400-c"
          : tier === "grid"
          ? "sz=w800"
          : tier === "preview"
          ? "sz=w1200"
          : tier === "lightbox"
          ? "sz=w1600"
          : "sz=w2048";
      if (rawUrl.includes("sz=")) {
        return rawUrl.replace(/sz=[^&]+/i, sizeParam);
      }
      return `${rawUrl}&${sizeParam}`;
    }
  }

  return rawUrl;
}

/**
 * Generates responsive srcset string for HTML img elements
 */
export function getImageSrcSet(
  media: MediaItemLike | string | undefined,
  tier: ImageSizeTier = "grid"
): string {
  if (!media) return "";

  let driveId = "";
  if (typeof media === "string") {
    if (/^[a-zA-Z0-9_-]{20,}$/.test(media) && !media.includes("http")) {
      driveId = media;
    }
  } else {
    driveId = media.driveFileId || media.id || "";
  }

  if (driveId && /^[a-zA-Z0-9_-]{20,}$/.test(driveId)) {
    if (tier === "lightbox") {
      return [
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w800 800w`,
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200 1200w`,
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600 1600w`,
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w2048 2048w`,
      ].join(", ");
    }

    return [
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w400 400w`,
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w800 800w`,
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200 1200w`,
    ].join(", ");
  }

  return "";
}

/**
 * Standard responsive sizes attributes for layout tiers
 */
export function getImageSizes(tier: ImageSizeTier = "grid"): string {
  switch (tier) {
    case "thumbnail":
      return "64px";
    case "grid":
      return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
    case "preview":
      return "(max-width: 768px) 100vw, 50vw";
    case "lightbox":
    case "original":
      return "100vw";
  }
}

/**
 * Generates an authenticated, signed URL for secure proxy media delivery
 */
export function getSignedMediaUrl(
  media: MediaItemLike,
  project: ProjectLike,
  tier: ImageSizeTier = "grid",
  options: { isDownload?: boolean; ttlMs?: number } = {}
): string {
  const mediaId = media.id || media.driveFileId || "";
  const token = generateSignedMediaToken({
    mediaId,
    projectId: project.id,
    photographerId: project.photographerId || "default_photographer",
    tier,
    isDownload: options.isDownload,
    ttlMs: options.ttlMs,
  });

  const queryParams = new URLSearchParams();
  queryParams.set("token", token);
  if (options.isDownload) {
    queryParams.set("download", "true");
  }
  if (project.accessCode) {
    queryParams.set("accessCode", project.accessCode);
  }

  return `/api/photos/${mediaId}?${queryParams.toString()}`;
}
