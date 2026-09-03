import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface MediaCacheOptions {
  mediaId: string;
  projectId: string;
  modifiedTime?: string;
  tier?: string;
  maxAgeSeconds?: number;
  isDownload?: boolean;
}

/**
 * Generates deterministic, collision-resistant ETag for private media
 */
export function generateMediaETag(options: MediaCacheOptions): string {
  const seed = `${options.projectId}:${options.mediaId}:${options.tier || "default"}:${options.modifiedTime || "1"}`;
  const hash = crypto.createHash("md5").update(seed).digest("hex").substring(0, 16);
  return `W/"m-${hash}"`;
}

/**
 * Builds safe, private cache headers for protected wedding media delivery
 */
export function buildMediaCacheHeaders(options: MediaCacheOptions): Headers {
  const headers = new Headers();
  const etag = generateMediaETag(options);

  headers.set("ETag", etag);

  if (options.isDownload) {
    // Downloads should not be cached aggressively by browsers
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  } else {
    // Private client media caching (1 day local browser cache, 7 day stale-while-revalidate)
    const maxAge = options.maxAgeSeconds || 86400;
    headers.set(
      "Cache-Control",
      `private, no-transform, max-age=${maxAge}, stale-while-revalidate=604800`
    );
  }

  headers.set("Vary", "Accept-Encoding, Range, x-media-token, x-gallery-access-code");
  return headers;
}

/**
 * Checks If-None-Match header and returns 304 Not Modified if matched
 */
export function handleConditionalMediaRequest(
  request: NextRequest,
  options: MediaCacheOptions
): NextResponse | null {
  if (options.isDownload) return null;

  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return null;

  const currentETag = generateMediaETag(options);
  if (ifNoneMatch === currentETag || ifNoneMatch.includes(currentETag)) {
    const headers = buildMediaCacheHeaders(options);
    return new NextResponse(null, {
      status: 304,
      headers,
    });
  }

  return null;
}
