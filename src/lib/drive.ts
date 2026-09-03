import { google } from "googleapis";
import { DriveVideoFile, DriveMediaFile, DriveEventCategory, getPhotographerById } from "./db";
import {
  isVideoFile,
  isPhotoFile,
  detectMediaType,
  extractGoogleDriveFolderId,
  extractGoogleDriveResourceKey,
} from "./drive-parser";

export interface DriveScanResult {
  success: boolean;
  folder?: {
    id: string;
    name: string;
  };
  videos?: DriveVideoFile[];
  photos?: DriveMediaFile[];
  media?: DriveMediaFile[];
  events?: DriveEventCategory[];
  totalVideos?: number;
  totalPhotos?: number;
  totalMedia?: number;
  error?: string;
  status?: number;
}

/**
 * Initializes Google Drive API client using available authentication mechanisms:
 * 0. Photographer-specific OAuth2 tokens (if photographerId is provided and photographer has stored Drive tokens)
 * 1. OAuth2 Refresh Token (if GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN are set)
 * 2. Service Account (if GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are set)
 * 3. API Key (if GOOGLE_DRIVE_API_KEY is set and not a placeholder)
 */
export function getDriveClient(photographerId?: string): { drive: any; authType: string; accountEmail?: string } | { error: string; status: number } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/drive/callback";

  // 0. Photographer-specific OAuth2
  if (photographerId && clientId && clientSecret) {
    const photographer = getPhotographerById(photographerId);
    if (photographer?.googleDriveTokens) {
      const tokens = photographer.googleDriveTokens;
      if (tokens.refreshToken || tokens.accessToken) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oauth2Client.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expiry_date: tokens.expiryDate,
        });
        const drive = google.drive({ version: "v3", auth: oauth2Client });
        return { drive, authType: `Photographer OAuth2 (${photographer.email})`, accountEmail: photographer.email };
      }
    }
  }

  // 1. OAuth2 from Env
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    return { drive, authType: "OAuth2 (Refresh Token)" };
  }

  // 2. Service Account JWT
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (saEmail && saKey) {
    const jwtClient = new google.auth.JWT({
      email: saEmail,
      key: saKey,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth: jwtClient });
    return { drive, authType: "Service Account JWT", accountEmail: saEmail };
  }

  // 3. API Key
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  if (apiKey && apiKey !== "YOUR_API_KEY_HERE" && apiKey.length > 10) {
    const drive = google.drive({ version: "v3", auth: apiKey });
    return { drive, authType: "Google Drive API Key" };
  }

  return {
    error: "No Google Drive API Key or OAuth credentials configured.",
    status: 503,
  };
}

/**
 * Public Initial View Data (IVD) extractor for public link-shared Google Drive folders
 */
async function scanPublicDriveFolder(
  folderId: string,
  folderNameHint = "Wedding Films Folder",
  visitedFolders = new Set<string>(),
  currentDepth = 0,
  maxDepth = 4
): Promise<{ folderName: string; rawItems: any[]; subfolders: { id: string; name: string }[] }> {
  if (visitedFolders.has(folderId) || currentDepth > maxDepth) {
    return { folderName: folderNameHint, rawItems: [], subfolders: [] };
  }
  visitedFolders.add(folderId);

  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} accessing public Drive folder`);
  }

  const html = await response.text();

  // Extract real folder title from <title> tag
  let folderName = folderNameHint;
  const titleMatch = html.match(/<title>(.*?)[\s–-]*Google Drive<\/title>/i);
  if (titleMatch && titleMatch[1]?.trim()) {
    folderName = titleMatch[1].replace(/&amp;/g, "&").trim();
  }

  const rawItems: any[] = [];
  const subfolders: { id: string; name: string }[] = [];

  // Match hex-encoded window['_DRIVE_ivd'] data structure
  const ivdMatch = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'([^']+)'/);
  if (ivdMatch && ivdMatch[1]) {
    try {
      const unescaped = ivdMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      const parsed = JSON.parse(unescaped);
      const items = Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed[0] : [];

      for (const item of items) {
        if (!Array.isArray(item) || !item[0]) continue;
        const id = item[0];
        const parents = Array.isArray(item[1]) ? item[1] : [folderId];
        const name = item[2] || "Untitled";
        const mimeType = item[3] || "";
        const modifiedTime = item[9] ? new Date(item[9]).toISOString() : undefined;
        const size = item[13] ? String(item[13]) : "0";

        if (mimeType === "application/vnd.google-apps.folder") {
          subfolders.push({ id, name });
        } else {
          rawItems.push({
            id,
            name,
            mimeType,
            size,
            parents,
            modifiedTime,
            thumbnailLink: `https://drive.google.com/thumbnail?id=${id}&sz=w600`,
            webViewLink: `https://drive.google.com/file/d/${id}/view`,
            webContentLink: `https://drive.google.com/uc?id=${id}&export=download`,
          });
        }
      }
    } catch (parseErr) {
      console.warn(`[Drive Scan] Error parsing IVD data for folder ${folderId}:`, parseErr);
    }
  }

  return { folderName, rawItems, subfolders };
}

/**
 * Scans a Google Drive folder and its child event subfolders with full pagination,
 * detecting all video files with rich logging.
 */
export async function scanDriveFolder(folderUrlOrId: string, photographerId?: string): Promise<DriveScanResult> {
  const folderId = extractGoogleDriveFolderId(folderUrlOrId);
  const resourceKey = extractGoogleDriveResourceKey(folderUrlOrId);

  console.log(`\n================== [DRIVE SCAN START] ==================`);
  console.log(`Folder ID:\n${folderId}`);

  if (!folderId) {
    console.error(`[Drive Scan Error] Invalid or missing Google Drive Folder ID.`);
    return {
      success: false,
      error: "Invalid Google Drive folder link or folder ID. Please check the URL.",
      status: 400,
    };
  }

  const clientResult = getDriveClient(photographerId);
  const rawFiles: any[] = [];
  const eventFolders: { id: string; name: string }[] = [];
  let rootFolderName = "Wedding Gallery";

  if ("drive" in clientResult) {
    // ──────────────────────────────────────────────────────────────────────────
    // ENGINE A: Official Google Drive API v3
    // ──────────────────────────────────────────────────────────────────────────
    const { drive, authType, accountEmail } = clientResult;
    console.log(`Authenticated Google account / mode:\n${accountEmail || authType}`);

    try {
      // 1. Fetch Root Folder Info
      try {
        const folderRes = await drive.files.get({
          fileId: folderId,
          fields: "id, name, mimeType",
          supportsAllDrives: true,
        });
        if (folderRes.data?.name) {
          rootFolderName = folderRes.data.name;
        }
      } catch (fErr: any) {
        console.warn(`[Drive Scan] Info: Could not get metadata for root folder directly (${fErr?.message || fErr}), continuing query.`);
      }

      // 2. Query Root Items
      const rootQuery = `'${folderId}' in parents and trashed = false`;
      console.log(`\n[ROOT QUERY]\n${rootQuery}`);

      let rootPageToken: string | undefined = undefined;
      const rootItems: any[] = [];

      do {
        const listParams: any = {
          q: rootQuery,
          fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents)",
          orderBy: "name",
          pageSize: 1000,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        };
        if (rootPageToken) listParams.pageToken = rootPageToken;

        const res = await drive.files.list(listParams);
        const files = res.data.files || [];
        rootItems.push(...files);
        rootPageToken = res.data.nextPageToken;
      } while (rootPageToken);

      console.log(`\nRoot items returned: ${rootItems.length}`);

      for (const item of rootItems) {
        console.log(`\n[ROOT ITEM]`);
        console.log(`id: ${item.id}`);
        console.log(`name: ${item.name}`);
        console.log(`mimeType: ${item.mimeType}`);
        console.log(`parents: ${JSON.stringify(item.parents || [folderId])}`);

        if (item.mimeType === "application/vnd.google-apps.folder") {
          eventFolders.push({ id: item.id, name: item.name });
          console.log(`\n[EVENT FOLDER FOUND]\nid: ${item.id}\nname: ${item.name}`);
        } else {
          rawFiles.push({ ...item, eventName: "Main Highlights" });
        }
      }

      // 3. Scan Each Event Subfolder (Haldi, Mehndi, Wedding, Reception, etc.)
      for (const eventFolder of eventFolders) {
        console.log(`\n[SCANNING EVENT]\n${eventFolder.name}`);
        const eventQuery = `'${eventFolder.id}' in parents and trashed = false`;
        let eventPageToken: string | undefined = undefined;
        let eventItemCount = 0;

        do {
          const efParams: any = {
            q: eventQuery,
            fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents)",
            orderBy: "name",
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          };
          if (eventPageToken) efParams.pageToken = eventPageToken;

          const efRes = await drive.files.list(efParams);
          const efFiles = efRes.data.files || [];
          eventItemCount += efFiles.length;

          for (const item of efFiles) {
            console.log(`\n[EVENT ITEM]`);
            console.log(`id: ${item.id}`);
            console.log(`name: ${item.name}`);
            console.log(`mimeType: ${item.mimeType}`);

            if (item.mimeType !== "application/vnd.google-apps.folder") {
              rawFiles.push({
                ...item,
                eventId: eventFolder.id,
                eventName: eventFolder.name,
              });
            } else {
              // Nested subfolder (e.g. Haldi/Photos, Haldi/Videos)
              try {
                const nestedQuery = `'${item.id}' in parents and trashed = false`;
                const nestedRes = await drive.files.list({
                  q: nestedQuery,
                  fields: "files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents)",
                  pageSize: 1000,
                  supportsAllDrives: true,
                  includeItemsFromAllDrives: true,
                });
                for (const nestedItem of nestedRes.data.files || []) {
                  if (nestedItem.mimeType !== "application/vnd.google-apps.folder") {
                    rawFiles.push({
                      ...nestedItem,
                      eventId: eventFolder.id,
                      eventName: eventFolder.name,
                    });
                  }
                }
              } catch (nErr) {
                console.warn(`[Drive Scan] Could not scan nested subfolder "${item.name}":`, nErr);
              }
            }
          }

          eventPageToken = efRes.data.nextPageToken;
        } while (eventPageToken);

        console.log(`\n[EVENT ITEMS FOUND]\n${eventItemCount}`);
      }
    } catch (apiErr: any) {
      console.warn(`[Drive Scan] Drive API v3 encountered error (${apiErr?.message || apiErr}), trying public direct extractor...`);
      return await scanViaPublicFallback(folderId, rootFolderName);
    }
  } else {
    // ──────────────────────────────────────────────────────────────────────────
    // ENGINE B: Public Web IVD Extractor (Works with all shared wedding folders)
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`Authenticated Google account:\nPublic Google Drive Shared Folder Access`);
    return await scanViaPublicFallback(folderId, rootFolderName);
  }

  return processDetectedFiles(rootFolderName, folderId, rawFiles);
}

/**
 * Fallback scanner for public Google Drive links
 */
async function scanViaPublicFallback(folderId: string, defaultName: string): Promise<DriveScanResult> {
  try {
    const visited = new Set<string>();
    const rootScan = await scanPublicDriveFolder(folderId, defaultName, visited, 0);
    const folderName = rootScan.folderName || defaultName;

    console.log(`\n[ROOT QUERY]\n'${folderId}' in parents and trashed = false (Public Stream)`);
    console.log(`Root items returned: ${rootScan.rawItems.length + rootScan.subfolders.length}`);

    const rawFiles: any[] = [];

    // Log root items
    for (const item of rootScan.rawItems) {
      console.log(`\n[ROOT ITEM]`);
      console.log(`id: ${item.id}`);
      console.log(`name: ${item.name}`);
      console.log(`mimeType: ${item.mimeType}`);
      console.log(`parents: ${JSON.stringify(item.parents)}`);
      rawFiles.push({ ...item, eventName: "Main Highlights" });
    }

    for (const sub of rootScan.subfolders) {
      console.log(`\n[EVENT FOLDER FOUND]\nid: ${sub.id}\nname: ${sub.name}`);
    }

    // Recursively scan subfolders (e.g. HALDI, MEHNDI, WEDDING, RECEPTION)
    for (const sub of rootScan.subfolders) {
      console.log(`\n[SCANNING EVENT]\n${sub.name}`);
      try {
        const subScan = await scanPublicDriveFolder(sub.id, sub.name, visited, 1);
        console.log(`\n[EVENT ITEMS FOUND]\n${subScan.rawItems.length}`);

        for (const item of subScan.rawItems) {
          console.log(`\n[EVENT ITEM]`);
          console.log(`id: ${item.id}`);
          console.log(`name: ${item.name}`);
          console.log(`mimeType: ${item.mimeType}`);
          rawFiles.push({ ...item, eventId: sub.id, eventName: sub.name });
        }

        // Check for nested subfolders (e.g. Haldi/Photos or Haldi/Videos)
        for (const nestedSub of subScan.subfolders) {
          console.log(`\n[SCANNING NESTED EVENT FOLDER]\n${sub.name} / ${nestedSub.name}`);
          try {
            const nestedScan = await scanPublicDriveFolder(nestedSub.id, nestedSub.name, visited, 2);
            for (const item of nestedScan.rawItems) {
              rawFiles.push({ ...item, eventId: sub.id, eventName: sub.name });
            }
          } catch (nErr) {
            console.warn(`[Drive Scan] Could not scan nested subfolder "${nestedSub.name}":`, nErr);
          }
        }
      } catch (subErr) {
        console.warn(`[Drive Scan] Could not scan subfolder "${sub.name}":`, subErr);
      }
    }

    return processDetectedFiles(folderName, folderId, rawFiles);
  } catch (err: any) {
    console.error("[Drive Scan Error]", err);
    return {
      success: false,
      error: `Failed to scan Google Drive folder: ${err?.message || "Inaccessible folder"}`,
      status: 500,
    };
  }
}

/**
 * Formats, detects photo and video types, calculates event categories, and outputs final logs
 */
function processDetectedFiles(folderName: string, folderId: string, rawFiles: any[]): DriveScanResult {
  const detectedVideos: DriveVideoFile[] = [];
  const detectedPhotos: DriveMediaFile[] = [];
  const detectedMedia: DriveMediaFile[] = [];
  const seenIds = new Set<string>();
  const eventPhotoCounts: Record<string, number> = {};
  const eventVideoCounts: Record<string, number> = {};
  const eventCovers: Record<string, string> = {};

  for (const file of rawFiles) {
    if (!file.id || seenIds.has(file.id)) continue;

    const mediaType = detectMediaType(file);
    if (!mediaType) continue;

    seenIds.add(file.id);

    // If eventName was not a subfolder name, infer category from filename or use "Main Highlights"
    let eventName = file.eventName || "Main Highlights";
    if (eventName === "Main Highlights") {
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes("haldi")) eventName = "Haldi Ceremony";
      else if (lowerName.includes("mehndi") || lowerName.includes("mehendi")) eventName = "Mehndi Ceremony";
      else if (lowerName.includes("sangeet")) eventName = "Sangeet Night";
      else if (lowerName.includes("baraat")) eventName = "Baraat & Entry";
      else if (lowerName.includes("wedding") || lowerName.includes("phera") || lowerName.includes("varmala")) eventName = "Wedding Rituals";
      else if (lowerName.includes("reception")) eventName = "Grand Reception";
      else if (lowerName.includes("teaser") || lowerName.includes("trailer") || lowerName.includes("highlight")) eventName = "Cinematic Highlights";
      else if (lowerName.includes("bride")) eventName = "Bride Ceremonies";
      else if (lowerName.includes("groom")) eventName = "Groom Ceremonies";
    }

    const defaultThumbnail = `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`;
    const thumbnailLink = file.thumbnailLink || defaultThumbnail;

    if (!eventCovers[eventName]) {
      eventCovers[eventName] = thumbnailLink;
    }

    if (mediaType === "VIDEO") {
      eventVideoCounts[eventName] = (eventVideoCounts[eventName] || 0) + 1;

      const videoFile: DriveVideoFile = {
        id: file.id,
        driveFileId: file.id,
        type: "VIDEO",
        name: file.name || "Wedding Video",
        mimeType: file.mimeType || "video/mp4",
        size: file.size || "0",
        thumbnailUrl: thumbnailLink,
        thumbnailLink: thumbnailLink,
        webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        webContentLink: file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        eventId: file.eventId || folderId,
        eventName: eventName,
      };

      detectedVideos.push(videoFile);
      detectedMedia.push(videoFile);

      console.log(`\n[VIDEO DETECTED]`);
      console.log(`event: ${eventName}`);
      console.log(`id: ${videoFile.id}`);
      console.log(`name: ${videoFile.name}`);
      console.log(`mimeType: ${videoFile.mimeType}`);
      console.log(`size: ${videoFile.size}`);
    } else if (mediaType === "PHOTO") {
      eventPhotoCounts[eventName] = (eventPhotoCounts[eventName] || 0) + 1;

      const photoFile: DriveMediaFile = {
        id: file.id,
        driveFileId: file.id,
        type: "PHOTO",
        name: file.name || "Wedding Photo",
        mimeType: file.mimeType || "image/jpeg",
        size: file.size || "0",
        thumbnailUrl: thumbnailLink,
        thumbnailLink: thumbnailLink,
        webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        webContentLink: file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        eventId: file.eventId || folderId,
        eventName: eventName,
      };

      detectedPhotos.push(photoFile);
      detectedMedia.push(photoFile);

      console.log(`\n[PHOTO DETECTED]`);
      console.log(`event: ${eventName}`);
      console.log(`id: ${photoFile.id}`);
      console.log(`name: ${photoFile.name}`);
      console.log(`mimeType: ${photoFile.mimeType}`);
      console.log(`size: ${photoFile.size}`);
    }
  }

  // Combine all event names
  const allEventNames = Array.from(
    new Set([...Object.keys(eventPhotoCounts), ...Object.keys(eventVideoCounts)])
  );

  const eventsList: DriveEventCategory[] = allEventNames.map((name, index) => {
    const photoCount = eventPhotoCounts[name] || 0;
    const videoCount = eventVideoCounts[name] || 0;
    return {
      id: `evt-${index + 1}`,
      name,
      count: photoCount + videoCount,
      photoCount,
      videoCount,
      coverImage: eventCovers[name],
    };
  });

  console.log(`\n[DRIVE SCAN COMPLETE]`);
  console.log(`Total videos detected: ${detectedVideos.length}`);
  console.log(`Total photos detected: ${detectedPhotos.length}`);
  console.log(`Total media detected: ${detectedMedia.length}`);
  console.log(`========================================================\n`);

  return {
    success: true,
    folder: {
      id: folderId,
      name: folderName,
    },
    videos: detectedVideos,
    photos: detectedPhotos,
    media: detectedMedia,
    events: eventsList,
    totalVideos: detectedVideos.length,
    totalPhotos: detectedPhotos.length,
    totalMedia: detectedMedia.length,
  };
}

/**
 * Backward-compatible helper for legacy callers
 */
export async function fetchDriveVideos(
  folderId: string
): Promise<{ files?: DriveVideoFile[]; events?: DriveEventCategory[]; error?: string; status?: number }> {
  const res = await scanDriveFolder(folderId);
  if (!res.success) {
    return { error: res.error, status: res.status };
  }
  return { files: res.videos, events: res.events };
}

export interface DriveRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Executes Drive folder scan with controlled exponential backoff retry for transient errors.
 * Immediately terminates and rethrows or returns failure for permanent errors (400, 401, 403, 404).
 */
export async function scanDriveFolderWithRetry(
  folderUrlOrId: string,
  photographerId?: string,
  optionsOrMaxRetries: number | DriveRetryOptions = 3,
  scannerFn?: (folderId: string, photogId?: string) => Promise<any>
): Promise<any> {
  const options: DriveRetryOptions =
    typeof optionsOrMaxRetries === "number"
      ? { maxRetries: optionsOrMaxRetries, initialDelayMs: 200, maxDelayMs: 2000 }
      : {
          maxRetries: optionsOrMaxRetries?.maxRetries ?? 3,
          initialDelayMs: optionsOrMaxRetries?.initialDelayMs ?? 200,
          maxDelayMs: optionsOrMaxRetries?.maxDelayMs ?? 2000,
        };

  const maxRetries = options.maxRetries || 3;
  let delay = options.initialDelayMs || 200;
  const maxDelay = options.maxDelayMs || 2000;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (scannerFn) {
        const res = await scannerFn(folderUrlOrId, photographerId);
        return res;
      }

      const result = await scanDriveFolder(folderUrlOrId, photographerId);
      if (result.success) {
        return result;
      }

      // Permanent error check from returned result object
      const isPermanent =
        result.status === 400 ||
        result.status === 401 ||
        result.status === 403 ||
        result.status === 404 ||
        (result.error &&
          /invalid|unauthorized|forbidden|not found|revoked|permission denied/i.test(
            result.error
          ));

      if (isPermanent || attempt >= maxRetries) {
        return result;
      }
    } catch (err: any) {
      const status = err?.status || err?.code || 500;
      const message = err?.message || String(err);
      const isPermanent =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 404 ||
        /invalid|unauthorized|forbidden|not found|revoked|permission denied/i.test(message);

      if (isPermanent || attempt >= maxRetries) {
        throw err;
      }
    }

    // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, maxDelay);
  }

  return {
    success: false,
    error: "Google Drive scan failed after multiple attempts.",
    status: 504,
  };
}

