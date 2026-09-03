import { NextRequest } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory sliding window cache per IP / client identifier
const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [key, entry] of rateLimitMap.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export type MediaRateLimitType = "VIDEO_STREAM" | "PHOTO_PREVIEW" | "DOWNLOAD";

const LIMIT_CONFIGS: Record<MediaRateLimitType, { limit: number; windowMs: number }> = {
  VIDEO_STREAM: {
    limit: 240, // 240 chunk requests / minute
    windowMs: 60 * 1000,
  },
  PHOTO_PREVIEW: {
    limit: 600, // 600 thumbnail requests / minute
    windowMs: 60 * 1000,
  },
  DOWNLOAD: {
    limit: 20, // 20 downloads / 5 minutes
    windowMs: 5 * 60 * 1000,
  },
};

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
}

export function checkMediaRateLimit(
  request: NextRequest,
  type: MediaRateLimitType
): RateLimitCheckResult {
  const config = LIMIT_CONFIGS[type];
  const now = Date.now();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const key = `${type}:${ip}`;
  let entry = rateLimitMap.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(key, entry);
  }

  // Filter timestamps within current window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < config.windowMs);

  if (entry.timestamps.length >= config.limit) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
  };
}
