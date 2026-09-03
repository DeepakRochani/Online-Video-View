import JSZip from "jszip";
import { DriveMediaFile } from "./db";
import { getDriveClient } from "./drive";

export interface ZipArchiveOptions {
  projectName: string;
  coupleNames?: string;
  studioName?: string;
  mediaList: DriveMediaFile[];
  includeReadme?: boolean;
}

/**
 * Downloads a photo's binary buffer from Google Drive or thumbnail CDN.
 */
async function fetchPhotoBuffer(media: DriveMediaFile): Promise<Buffer | null> {
  const driveId = media.driveFileId || media.id;
  const directUrl = media.thumbnailUrl || media.thumbnailLink;

  // 1. Try Google Drive API if authenticated
  const driveClientResult = getDriveClient();
  if (!("error" in driveClientResult)) {
    try {
      const res = await driveClientResult.drive.files.get(
        { fileId: driveId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      if (res?.data) {
        return Buffer.from(res.data);
      }
    } catch {
      // Fall through to public CDN / direct fetch
    }
  }

  // 2. Try Google Drive High-Res Thumbnail CDN (w2500)
  const candidateUrls = [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w2500`,
    `https://drive.google.com/uc?id=${driveId}&export=download`,
    directUrl,
  ].filter(Boolean) as string[];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > 100) {
          return Buffer.from(arrayBuf);
        }
      }
    } catch {
      continue;
    }
  }

  // 3. Fallback placeholder if file is strictly unavailable
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#1e293b"/>
    <text x="600" y="380" fill="#f59e0b" font-family="sans-serif" font-size="32" font-weight="bold" text-anchor="middle">
      ${escapeXml(media.name || "Wedding Photograph")}
    </text>
    <text x="600" y="430" fill="#94a3b8" font-family="sans-serif" font-size="20" text-anchor="middle">
      Event: ${escapeXml(media.eventName || "Wedding Ceremony")}
    </text>
    <text x="600" y="470" fill="#64748b" font-family="sans-serif" font-size="16" text-anchor="middle">
      Google Drive ID: ${escapeXml(driveId)}
    </text>
  </svg>`;

  return Buffer.from(fallbackSvg, "utf-8");
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
}

/**
 * Builds a ZIP archive containing the provided media items sorted by event folders.
 */
export async function createPhotosZipArchive(
  options: ZipArchiveOptions
): Promise<Buffer> {
  const zip = new JSZip();
  const { projectName, coupleNames, studioName, mediaList, includeReadme = true } = options;

  // Add ReadMe
  if (includeReadme) {
    const readmeContent = `========================================================
${(coupleNames || projectName).toUpperCase()} — WEDDING MEMORIES
Captured by: ${studioName || "Wedding Cinema Studio"}
========================================================

Total Media Files: ${mediaList.length}
Date Exported: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Contents:
${Array.from(new Set(mediaList.map((m) => m.eventName || "General")))
  .map((evt) => ` • ${evt}/ (${mediaList.filter((m) => (m.eventName || "General") === evt).length} files)`)
  .join("\n")}

Thank you for letting us capture the emotion, laughter, and timeless beauty of your celebration.

========================================================
`;
    zip.file("README_WEDDING_GALLERY.txt", readmeContent);
  }

  // Group and fetch media files (concurrency limited to 5 at a time)
  const CONCURRENCY_LIMIT = 5;
  const mediaQueue = [...mediaList];

  while (mediaQueue.length > 0) {
    const chunk = mediaQueue.splice(0, CONCURRENCY_LIMIT);
    await Promise.all(
      chunk.map(async (item, idx) => {
        try {
          const folderName = sanitizeFilename(item.eventName || "Photographs");
          let fileName = sanitizeFilename(item.name || `photo_${Date.now()}_${idx}.jpg`);
          if (!fileName.includes(".")) {
            fileName += ".jpg";
          }

          const buf = await fetchPhotoBuffer(item);
          if (buf) {
            zip.file(`${folderName}/${fileName}`, buf);
          }
        } catch (err) {
          console.error(`[ZIP Export] Failed to pack file ${item.name}:`, err);
        }
      })
    );
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}
