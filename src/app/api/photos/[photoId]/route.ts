import { NextRequest, NextResponse } from "next/server";
import { authorizeMediaRequest } from "@/lib/media-auth";
import { buildMediaCacheHeaders, handleConditionalMediaRequest } from "@/lib/media-cache";
import { checkMediaRateLimit } from "@/lib/media-rate-limit";
import { recordMediaMetric } from "@/lib/media-metrics";
import { ImageSizeTier } from "@/lib/image-optimizer";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";
    const requestedSize = searchParams.get("sz");
    
    // Resolve appropriate size tier
    const tier: ImageSizeTier = isDownload
      ? "original"
      : requestedSize === "w400-h400-c"
      ? "thumbnail"
      : requestedSize === "w1600" || requestedSize === "w2048"
      ? "lightbox"
      : requestedSize === "w1200"
      ? "preview"
      : "grid";

    // 1. Rate Limiting Check
    const rateLimit = checkMediaRateLimit(
      request,
      isDownload ? "DOWNLOAD" : "PHOTO_PREVIEW"
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many media requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": (rateLimit.retryAfterSeconds || 60).toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Authorize Request
    const authResult = await authorizeMediaRequest(request, photoId, {
      mediaType: "PHOTO",
      isDownload,
      tier,
    });

    if (!authResult.authorized || !authResult.context) {
      recordMediaMetric(isDownload ? "DOWNLOAD" : "PHOTO", { isError: true });
      return NextResponse.json(
        { error: authResult.errorMessage || "Access denied" },
        { status: authResult.status }
      );
    }

    const { media, project } = authResult.context;
    const driveId = media.driveFileId || media.id;

    // 3. Conditional Request (304 Not Modified) Handling
    const conditionalResponse = handleConditionalMediaRequest(request, {
      mediaId: photoId,
      projectId: project.id,
      modifiedTime: media.modifiedTime,
      tier,
      isDownload,
    });

    if (conditionalResponse) {
      recordMediaMetric(isDownload ? "DOWNLOAD" : "PHOTO", { isCacheHit: true });
      return conditionalResponse;
    }

    // 4. Record real telemetry metric
    recordMediaMetric(isDownload ? "DOWNLOAD" : "PHOTO", {
      isCacheHit: false,
      isDriveOrigin: true,
    });

    // 5. Build Cache Headers
    const cacheHeaders = buildMediaCacheHeaders({
      mediaId: photoId,
      projectId: project.id,
      modifiedTime: media.modifiedTime,
      tier,
      isDownload,
    });

    if (isDownload) {
      const downloadUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
      return NextResponse.redirect(downloadUrl, {
        status: 302,
        headers: cacheHeaders,
      });
    }

    // High resolution preview redirect with size parameter
    const sizeParam = requestedSize || (tier === "lightbox" ? "w1600" : tier === "preview" ? "w1200" : tier === "thumbnail" ? "w400-h400-c" : "w800");
    const previewUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=${sizeParam}`;
    return NextResponse.redirect(previewUrl, {
      status: 302,
      headers: cacheHeaders,
    });
  } catch (err: unknown) {
    recordMediaMetric("PHOTO", { isError: true });
    console.error("[Photo Delivery Error]", err);
    return NextResponse.json({ error: "Failed to load photo" }, { status: 500 });
  }
}
