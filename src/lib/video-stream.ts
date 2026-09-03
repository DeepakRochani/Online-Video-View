import { NextRequest } from "next/server";
import { getVideoRecord, isProjectExpired } from "./db";
import { getDriveClient } from "./drive";
import { getCurrentSession } from "./auth";
import { verifySignedMediaToken } from "./media-token";

const DEFAULT_STREAM_CHUNK_SIZE = 16 * 1024 * 1024; // 16MB chunk size for smooth 4K/FHD playback & rapid seeking
const CONNECTION_TIMEOUT_MS = 12000; // 12s connection/handshake timeout

interface DriveSessionCache {
  uuid: string;
  cookie: string;
  confirm: string;
  expiresAt: number;
}

// In-memory cache for confirmed Google Drive streaming sessions (15-minute TTL per file)
const driveSessionCache = new Map<string, DriveSessionCache>();

function getAccurateMimeType(fileName: string, storedMime?: string, upstreamMime?: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "mp4") return "video/mp4";
  if (ext === "m4v") return "video/x-m4v";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "avi") return "video/x-msvideo";
  if (upstreamMime && upstreamMime.startsWith("video/")) return upstreamMime;
  if (storedMime && storedMime.startsWith("video/")) return storedMime;
  return "video/mp4";
}

async function fetchGoogleDriveStream(
  driveFileId: string,
  photographerId: string | undefined,
  upstreamRangeHeader: string | undefined,
  clientSignal?: AbortSignal
): Promise<{ response: globalThis.Response; fromCache?: boolean; stageTiming?: Record<string, number> }> {
  const t0 = Date.now();
  const stageTiming: Record<string, number> = {};

  const fetchHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
  if (upstreamRangeHeader) {
    fetchHeaders["Range"] = upstreamRangeHeader;
  }

  // Helper to create a linked abort controller that aborts if either client disconnects or handshake times out
  const createTimedSignal = (timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Google Drive request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (clientSignal) {
      if (clientSignal.aborted) {
        clearTimeout(timeoutId);
        controller.abort(clientSignal.reason);
      } else {
        clientSignal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          controller.abort(clientSignal.reason);
        }, { once: true });
      }
    }

    return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
  };

  // Tier 1: Try authenticated Google Drive API v3 (OAuth2 / Service Account) if configured
  const driveClientResult = getDriveClient(photographerId);
  if ("drive" in driveClientResult && driveClientResult.drive) {
    try {
      const authClient = driveClientResult.drive.context?._options?.auth;
      let accessToken: string | null = null;
      if (authClient && typeof authClient.getAccessToken === "function") {
        const tokenRes = await authClient.getAccessToken();
        accessToken = typeof tokenRes === "string" ? tokenRes : tokenRes?.token || null;
      }

      if (accessToken) {
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&supportsAllDrives=true`;
        const apiHeaders: Record<string, string> = {
          ...fetchHeaders,
          Authorization: `Bearer ${accessToken}`,
        };

        const { signal, cleanup } = createTimedSignal(CONNECTION_TIMEOUT_MS);
        try {
          const apiStart = Date.now();
          const apiRes = await fetch(driveApiUrl, { headers: apiHeaders, signal });
          cleanup();
          stageTiming["tier1_api"] = Date.now() - apiStart;

          const apiType = apiRes.headers.get("content-type") || "";
          if (apiRes.ok && !apiType.includes("text/html")) {
            return { response: apiRes, stageTiming };
          }
        } catch (e) {
          cleanup();
          throw e;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[VideoStream] Authenticated Drive API v3 fetch fallback to direct stream:", e);
      }
    }
  }

  // Tier 2: Direct confirmed stream with fast session cache
  const cached = driveSessionCache.get(driveFileId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    const directConfirmedUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=${cached.confirm}&uuid=${cached.uuid}`;
    const confirmedHeaders: Record<string, string> = {
      ...fetchHeaders,
      ...(cached.cookie ? { Cookie: cached.cookie } : {}),
    };

    const { signal, cleanup } = createTimedSignal(CONNECTION_TIMEOUT_MS);
    try {
      const fastStart = Date.now();
      const fastRes = await fetch(directConfirmedUrl, { headers: confirmedHeaders, signal });
      cleanup();
      stageTiming["tier2_cached"] = Date.now() - fastStart;

      const fastType = fastRes.headers.get("content-type") || "";
      if ((fastRes.ok || fastRes.status === 206) && !fastType.includes("text/html")) {
        return { response: fastRes, fromCache: true, stageTiming };
      }
    } catch (err: any) {
      cleanup();
      if (process.env.NODE_ENV !== "production") {
        console.warn("[VideoStream] Cached session fetch failed, falling back to handshake:", err.message);
      }
    }
    driveSessionCache.delete(driveFileId);
  }

  // Handshake: fetch initial download URL
  const initialUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download`;
  const { signal: handshakeSignal, cleanup: cleanupHandshake } = createTimedSignal(CONNECTION_TIMEOUT_MS);
  let initialRes: globalThis.Response;
  try {
    const hsStart = Date.now();
    initialRes = await fetch(initialUrl, { headers: fetchHeaders, signal: handshakeSignal });
    cleanupHandshake();
    stageTiming["handshake_initial"] = Date.now() - hsStart;
  } catch (err: any) {
    cleanupHandshake();
    throw err;
  }

  const initialType = initialRes.headers.get("content-type") || "";

  if ((initialRes.ok || initialRes.status === 206) && !initialType.includes("text/html")) {
    return { response: initialRes, stageTiming };
  }

  // If virus scan HTML is returned for files > 100MB, extract uuid and confirm
  if (initialType.includes("text/html")) {
    const cookie = initialRes.headers.get("set-cookie") || "";
    const htmlText = await initialRes.text();
    const uuidMatch =
      htmlText.match(/name="uuid"\s+value="([^"]+)"/i) ||
      htmlText.match(/value="([^"]+)"\s+name="uuid"/i);
    const confirmMatch = htmlText.match(/name="confirm"\s+value="([^"]+)"/i);

    if (uuidMatch && uuidMatch[1]) {
      const uuid = uuidMatch[1];
      const confirm = confirmMatch ? confirmMatch[1] : "t";

      // Cache session for 15 minutes
      driveSessionCache.set(driveFileId, {
        uuid,
        cookie,
        confirm,
        expiresAt: now + 15 * 60 * 1000,
      });

      const confirmedUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=${confirm}&uuid=${uuid}`;
      const confirmedHeaders: Record<string, string> = {
        ...fetchHeaders,
        ...(cookie ? { Cookie: cookie } : {}),
      };

      const { signal: confirmSignal, cleanup: cleanupConfirm } = createTimedSignal(CONNECTION_TIMEOUT_MS);
      try {
        const confirmStart = Date.now();
        const confirmedRes = await fetch(confirmedUrl, { headers: confirmedHeaders, signal: confirmSignal });
        cleanupConfirm();
        stageTiming["handshake_confirmed"] = Date.now() - confirmStart;
        return { response: confirmedRes, stageTiming };
      } catch (err: any) {
        cleanupConfirm();
        throw err;
      }
    }

    if (
      htmlText.includes("Quota exceeded") ||
      htmlText.includes("Too many users have viewed or downloaded this file recently")
    ) {
      return {
        response: new Response(
          "Google Drive download quota exceeded for this file. Please view directly in Google Drive or configure a Google Drive API Key.",
          { status: 502, headers: { "Content-Type": "text/plain" } }
        ),
        stageTiming,
      };
    }
  }

  return { response: initialRes, stageTiming };
}

import { checkMediaRateLimit } from "./media-rate-limit";
import { recordMediaMetric } from "./media-metrics";

export async function handleVideoStream(
  request: NextRequest,
  videoIdOrDriveFileId: string
): Promise<Response> {
  const reqStartTime = Date.now();
  const rawRange = request.headers.get("range");
  const isDownload = request.nextUrl.searchParams.get("download") === "true";

  // Rate limiting check
  const rateLimit = checkMediaRateLimit(request, isDownload ? "DOWNLOAD" : "VIDEO_STREAM");
  if (!rateLimit.allowed) {
    recordMediaMetric(isDownload ? "DOWNLOAD" : "VIDEO", { isError: true });
    return new Response("Too many video requests. Please try again shortly.", {
      status: 429,
      headers: {
        "Retry-After": (rateLimit.retryAfterSeconds || 60).toString(),
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] REQUEST START | ID: ${videoIdOrDriveFileId} | Range: ${rawRange || "none"}`);
  }

  // 1. Look up database record
  const record = getVideoRecord(videoIdOrDriveFileId);
  if (!record) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[VideoStream] media record not found for: ${videoIdOrDriveFileId}`);
    }
    return new Response("Video not found in wedding gallery.", { status: 404 });
  }

  const { video, project } = record;
  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] media record found: "${video.name}" (${video.size} bytes) in ${Date.now() - reqStartTime}ms`);
  }

  // 2. Authorization validation: project owner or Super Admin can preview inactive/expired galleries
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
  const isAdminPreview = request.nextUrl.searchParams.get("adminPreview") === "true" && isSuperAdmin;
  const isPreview = request.nextUrl.searchParams.get("preview") === "true" && isOwner;

  // Check Signed Token
  const token = request.nextUrl.searchParams.get("token") || request.headers.get("x-media-token");
  let tokenValid = false;
  if (token) {
    const tokenResult = verifySignedMediaToken(token);
    if (tokenResult.valid && tokenResult.payload) {
      if (tokenResult.payload.projectId === project.id && tokenResult.payload.photographerId === project.photographerId) {
        tokenValid = true;
      }
    }
  }

  // If not owner/preview/token, enforce valid access code and active gallery status
  if (!isOwner && !isAdminPreview && !isPreview && !tokenValid) {
    const providedAccessCode = (queryAccessCode || headerAccessCode || "").trim();
    if (!providedAccessCode || providedAccessCode.toUpperCase() !== project.accessCode.toUpperCase()) {
      return new Response("Access denied: valid gallery access code or authorization required.", { status: 403 });
    }

    if (project.deletedAt) {
      return new Response("This wedding gallery has been removed.", { status: 404 });
    }

    if (project.status !== "published" || isProjectExpired(project)) {
      return new Response("This wedding gallery is currently inactive, expired, or archived.", { status: 403 });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] gallery authorization passed in ${Date.now() - reqStartTime}ms`);
  }

  const driveFileId = video.driveFileId || video.id;
  const fileName = video.name || "Wedding Video.mp4";
  const storedMimeType = video.mimeType || "video/mp4";
  const totalSize = parseInt(video.size || "0", 10);

  if (!driveFileId || !/^[a-zA-Z0-9_-]{10,}$/.test(driveFileId)) {
    return new Response("Invalid video identifier", { status: 400 });
  }

  // Check if download is requested and permitted
  const videoDownloadsAllowed = project.settings?.allowVideoDownload ?? project.settings?.allowDownloads ?? false;
  if (isDownload && !videoDownloadsAllowed && !isOwner) {
    return new Response("Video downloads are disabled for this wedding gallery by the photographer.", { status: 403 });
  }

  // 3. Parse & normalize byte ranges
  let start = 0;
  let end = 0;
  let isRangeRequest = false;

  if (rawRange && !isDownload) {
    isRangeRequest = true;
    const match = rawRange.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const rawStart = match[1];
      const rawEnd = match[2];

      if (rawStart !== "") {
        start = parseInt(rawStart, 10);
        if (rawEnd !== "") {
          end = parseInt(rawEnd, 10);
        } else {
          // Open-ended range (e.g. bytes=0- or bytes=1000000-)
          if (totalSize > 0) {
            end = Math.min(totalSize - 1, start + DEFAULT_STREAM_CHUNK_SIZE - 1);
          } else {
            end = start + DEFAULT_STREAM_CHUNK_SIZE - 1;
          }
        }
      } else if (rawEnd !== "") {
        // Suffix range (e.g. bytes=-500000)
        const suffix = parseInt(rawEnd, 10);
        if (totalSize > 0) {
          start = Math.max(0, totalSize - suffix);
          end = totalSize - 1;
        } else {
          start = 0;
          end = suffix;
        }
      }
    }
  } else if (!isDownload) {
    // No range header provided on media probe: provide initial chunk
    start = 0;
    if (totalSize > 0) {
      end = Math.min(totalSize - 1, DEFAULT_STREAM_CHUNK_SIZE - 1);
    } else {
      end = DEFAULT_STREAM_CHUNK_SIZE - 1;
    }
  }

  // Validate range against known file size (HTTP 416)
  if (totalSize > 0 && start >= totalSize) {
    return new Response("Requested range not satisfiable", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Build upstream request range header
  const upstreamRangeHeader = isDownload ? undefined : `bytes=${start}-${end}`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] requesting Drive media: ${upstreamRangeHeader || "full stream"} in ${Date.now() - reqStartTime}ms`);
  }

  // 4. Fetch media stream from Google Drive with timeout & abort protection
  let streamResult: { response: globalThis.Response; fromCache?: boolean; stageTiming?: Record<string, number> };
  try {
    streamResult = await fetchGoogleDriveStream(
      driveFileId,
      project.photographerId,
      upstreamRangeHeader,
      request.signal
    );
  } catch (err: any) {
    console.error(`[VideoStream] Google Drive stream fetch failed for ${driveFileId}:`, err.message);
    if (err.name === "AbortError" && request.signal.aborted) {
      // Client disconnected cleanly
      return new Response(null, { status: 499 });
    }
    return new Response("Google Drive media stream timed out or was interrupted. Please retry.", { status: 504 });
  }

  const driveResponse = streamResult.response;
  const upstreamStatus = driveResponse.status;
  const upstreamType = driveResponse.headers.get("content-type") || "";
  const upstreamLength = driveResponse.headers.get("content-length") || "";
  const upstreamRange = driveResponse.headers.get("content-range") || "";

  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] Drive response received | Status: ${upstreamStatus} | Type: ${upstreamType} | Range: ${upstreamRange} in ${Date.now() - reqStartTime}ms`);
  }

  // 5. Verify response is real media bytes, NOT Google Drive HTML error page
  if (upstreamType.includes("text/html") || (!driveResponse.ok && upstreamStatus !== 206)) {
    if (upstreamStatus === 401) {
      return new Response("Google Drive authentication expired.", { status: 401 });
    }
    if (upstreamStatus === 403) {
      return new Response("Google Drive permission denied.", { status: 403 });
    }
    if (upstreamStatus === 404) {
      return new Response("Video file not found in Google Drive.", { status: 404 });
    }
    return new Response("Unable to retrieve video media stream from Google Drive.", { status: 502 });
  }

  // 6. Build downstream response headers
  const responseHeaders = new Headers();
  const accurateMime = getAccurateMimeType(fileName, storedMimeType, upstreamType);
  responseHeaders.set("Content-Type", accurateMime);
  responseHeaders.set("Accept-Ranges", "bytes");

  // Format Content-Range & Content-Length
  const effectiveRange =
    upstreamRange ||
    (isDownload ? undefined : `bytes ${start}-${end}/${totalSize > 0 ? totalSize : "*"}`);
  const effectiveLength =
    upstreamLength ||
    (isDownload
      ? totalSize > 0
        ? totalSize.toString()
        : undefined
      : (end - start + 1).toString());

  if (effectiveRange) {
    responseHeaders.set("Content-Range", effectiveRange);
  }
  if (effectiveLength) {
    responseHeaders.set("Content-Length", effectiveLength);
  }

  if (isDownload) {
    responseHeaders.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
  } else {
    responseHeaders.set("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
  }

  // Private media caching
  responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("Expires", "0");

  const downstreamStatus = isRangeRequest || (!isDownload && effectiveRange) ? 206 : upstreamStatus;

  const proxiedBytes = effectiveLength ? parseInt(effectiveLength, 10) : 0;
  recordMediaMetric(isDownload ? "DOWNLOAD" : "VIDEO", {
    bytes: isNaN(proxiedBytes) ? 0 : proxiedBytes,
    isCacheHit: !!streamResult.fromCache,
    isDriveOrigin: !streamResult.fromCache,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[VideoStream] sending response to browser | Status: ${downstreamStatus} | Content-Range: ${responseHeaders.get("Content-Range")} in ${Date.now() - reqStartTime}ms`);
  }

  return new Response(driveResponse.body, {
    status: downstreamStatus,
    headers: responseHeaders,
  });
}
