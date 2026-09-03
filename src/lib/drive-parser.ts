/**
 * Google Drive URL & Video Detection Utilities
 */

export const SUPPORTED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-m4v",
  "video/mpeg",
  "video/ogg",
  "video/3gpp",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/mp2t",
]);

export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".m4v",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".wmv",
  ".flv",
  ".ts",
  ".mts",
  ".m2ts",
]);

export const SUPPORTED_PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
  "image/bmp",
  "image/gif",
]);

export const SUPPORTED_PHOTO_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
  ".tiff",
  ".tif",
  ".bmp",
  ".gif",
]);

export const IGNORED_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.form",
  "application/vnd.google-apps.script",
  "application/vnd.google-apps.folder",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
]);

export const IGNORED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".txt",
  ".csv",
  ".json",
]);

export function isIgnoredFile(file: { name?: string | null; mimeType?: string | null }): boolean {
  if (!file) return true;
  if (file.mimeType && IGNORED_MIME_TYPES.has(file.mimeType.toLowerCase().trim())) {
    return true;
  }
  if (file.name) {
    const lastDot = file.name.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = file.name.substring(lastDot).toLowerCase().trim();
      if (IGNORED_EXTENSIONS.has(ext)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extracts ONLY the Google Drive folder ID from various sharing URL formats or raw strings.
 * Discards query parameters like `?usp=drive_link`, `&usp=sharing`, `resourcekey`, etc.
 */
export function extractGoogleDriveFolderId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. If it's already a clean raw folder ID without slashes or URL schemes
  if (/^[a-zA-Z0-9_-]{5,}$/.test(trimmed) && !trimmed.includes("/") && !trimmed.includes(".") && !trimmed.includes("?")) {
    return trimmed;
  }

  try {
    let urlString = trimmed;
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = "https://" + urlString;
    }

    const url = new URL(urlString);

    // Case A: /drive/folders/FOLDER_ID or /drive/u/N/folders/FOLDER_ID or /folders/FOLDER_ID
    const folderPathMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderPathMatch && folderPathMatch[1]) {
      return folderPathMatch[1];
    }

    // Case B: ?id=FOLDER_ID (e.g. drive.google.com/open?id=... or /drive/folders?id=...)
    const idParam = url.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
      return idParam;
    }

    // Case C: /file/d/FILE_ID/view (if someone pasted file URL instead of folder)
    const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      return fileMatch[1];
    }
  } catch {
    // Fallback regex scan
    const fallbackMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (fallbackMatch && fallbackMatch[1]) return fallbackMatch[1];

    const fallbackId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fallbackId && fallbackId[1]) return fallbackId[1];
  }

  return null;
}

/**
 * Extracts optional Google Drive resourcekey for link-shared assets
 */
export function extractGoogleDriveResourceKey(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    let urlString = input.trim();
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = "https://" + urlString;
    }
    const url = new URL(urlString);
    return url.searchParams.get("resourcekey");
  } catch {
    const match = input.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Checks if a Drive item is a video file by MIME type or file extension
 */
export function isVideoFile(file: { name?: string | null; mimeType?: string | null }): boolean {
  if (!file || isIgnoredFile(file)) return false;

  // 1. Check MIME type
  if (file.mimeType) {
    const mime = file.mimeType.toLowerCase().trim();
    if (SUPPORTED_VIDEO_MIME_TYPES.has(mime) || mime.startsWith("video/")) {
      return true;
    }
  }

  // 2. Check filename extension as fallback
  if (file.name) {
    const lastDot = file.name.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = file.name.substring(lastDot).toLowerCase().trim();
      if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a Drive item is a photo/image file by MIME type or file extension
 */
export function isPhotoFile(file: { name?: string | null; mimeType?: string | null }): boolean {
  if (!file || isIgnoredFile(file)) return false;

  // 1. Check MIME type
  if (file.mimeType) {
    const mime = file.mimeType.toLowerCase().trim();
    if (SUPPORTED_PHOTO_MIME_TYPES.has(mime) || mime.startsWith("image/")) {
      return true;
    }
  }

  // 2. Check filename extension as fallback
  if (file.name) {
    const lastDot = file.name.lastIndexOf(".");
    if (lastDot !== -1) {
      const ext = file.name.substring(lastDot).toLowerCase().trim();
      if (SUPPORTED_PHOTO_EXTENSIONS.has(ext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detects whether a file is a PHOTO, VIDEO, or null (unsupported)
 */
export function detectMediaType(file: { name?: string | null; mimeType?: string | null }): "PHOTO" | "VIDEO" | null {
  if (!file || isIgnoredFile(file)) return null;
  if (isVideoFile(file)) return "VIDEO";
  if (isPhotoFile(file)) return "PHOTO";
  return null;
}
