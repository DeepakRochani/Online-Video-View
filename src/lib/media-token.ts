import crypto from "crypto";

export interface MediaTokenPayload {
  mediaId: string;
  projectId: string;
  photographerId: string;
  tier: "thumbnail" | "grid" | "preview" | "lightbox" | "original";
  expiresAt: number; // Unix epoch ms
  isDownload?: boolean;
}

function getSigningSecret(): string {
  return (
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "wvg_production_secure_media_signing_secret_2026_fallback"
  );
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed token for secure media delivery.
 * Token TTL default: 2 hours (7,200,000 ms)
 */
export function generateSignedMediaToken(
  payload: Omit<MediaTokenPayload, "expiresAt"> & { ttlMs?: number }
): string {
  const ttlMs = payload.ttlMs || 2 * 60 * 60 * 1000; // 2 hours
  const expiresAt = Date.now() + ttlMs;

  const data: MediaTokenPayload = {
    mediaId: payload.mediaId,
    projectId: payload.projectId,
    photographerId: payload.photographerId,
    tier: payload.tier,
    expiresAt,
    isDownload: payload.isDownload || false,
  };

  const jsonStr = JSON.stringify(data);
  const base64Data = Buffer.from(jsonStr, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(base64Data)
    .digest("base64url");

  return `${base64Data}.${signature}`;
}

export interface VerifyMediaTokenResult {
  valid: boolean;
  payload?: MediaTokenPayload;
  error?: "INVALID_FORMAT" | "INVALID_SIGNATURE" | "EXPIRED" | "CORRUPTED";
}

/**
 * Verifies the signature, expiration, and payload of a signed media token.
 */
export function verifySignedMediaToken(token: string | null | undefined): VerifyMediaTokenResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "INVALID_FORMAT" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "INVALID_FORMAT" };
  }

  const [base64Data, providedSignature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(base64Data)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expectedSignature);
  const providedBuf = Buffer.from(providedSignature);

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, error: "INVALID_SIGNATURE" };
  }

  try {
    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf8");
    const payload: MediaTokenPayload = JSON.parse(jsonStr);

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: "EXPIRED", payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "CORRUPTED" };
  }
}
