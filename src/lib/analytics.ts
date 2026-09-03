import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  getProjectsByPhotographer,
  getProjectById,
  getFavorites,
  getSelections,
  getPhotographerById,
  getSubscription,
  WeddingProject,
  DATA_DIR,
  safeWriteFileSync,
} from "./db";
import { SAAS_PLANS, getPlanDetails } from "./plans";
import { SubscriptionPlanTier } from "./project-types";

const ANALYTICS_EVENTS_FILE = path.join(DATA_DIR, "analytics_events.json");

// Ensure data directory and file exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ANALYTICS_EVENTS_FILE)) {
    safeWriteFileSync(ANALYTICS_EVENTS_FILE, "[]");
  }
} catch (err) {
  console.warn("[Storage Warning] Analytics bootstrap warning:", err);
}

export type AnalyticsEventType =
  | "gallery_view"
  | "photo_view"
  | "video_play"
  | "video_completed"
  | "video_progress"
  | "favorite"
  | "unfavorite"
  | "select"
  | "deselect"
  | "download"
  | "share"
  | "selection_submit"
  | "qr_visit";

export interface AnalyticsEvent {
  id: string;
  eventId?: string; // Client idempotency ID
  photographerId: string;
  projectId: string;
  accessCode: string;
  eventType: AnalyticsEventType;
  mediaId?: string;
  mediaTitle?: string;
  mediaType?: "PHOTO" | "VIDEO";
  eventName?: string; // Wedding sub-event (e.g. "Baraat", "Reception")
  watchTimeSeconds?: number;
  shareType?: "native" | "whatsapp" | "copy_link" | "qr" | "other";
  downloadType?: "single_photo" | "single_video" | "zip_all" | "zip_selection" | "zip_favorites";
  source?: string;
  deviceCategory?: "mobile" | "desktop" | "tablet" | "unknown";
  sessionId?: string;
  isInternal?: boolean; // True for admin or photographer preview
  timestamp: string; // ISO 8601
}

export type TimeRangeOption = "today" | "7d" | "30d" | "90d" | "this_year" | "all" | "custom";

export interface AnalyticsFilterOptions {
  range?: TimeRangeOption;
  startDate?: string;
  endDate?: string;
  projectId?: string; // Filter by specific project (must belong to photographer)
}

// In-memory deduplication cache: `${eventId}` or `${sessionId}_${eventType}_${mediaId}` -> timestamp ms
const deduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 8000; // 8 seconds

function cleanDeduplicationCache() {
  const now = Date.now();
  for (const [key, time] of deduplicationCache.entries()) {
    if (now - time > DEDUPLICATION_WINDOW_MS * 2) {
      deduplicationCache.delete(key);
    }
  }
}

/**
 * Read all raw analytics events from persistent storage
 */
export function readAnalyticsEvents(): AnalyticsEvent[] {
  try {
    if (!fs.existsSync(ANALYTICS_EVENTS_FILE)) return [];
    const raw = fs.readFileSync(ANALYTICS_EVENTS_FILE, "utf-8");
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch (err) {
    console.error("Error reading analytics events:", err);
    return [];
  }
}

/**
 * Write raw analytics events to persistent storage
 */
export function writeAnalyticsEvents(events: AnalyticsEvent[]): void {
  try {
    // Keep reasonable max events (e.g., 20,000 events)
    const trimmed = events.length > 20000 ? events.slice(0, 20000) : events;
    fs.writeFileSync(ANALYTICS_EVENTS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing analytics events:", err);
  }
}

/**
 * Records a real client or system analytics interaction with deduplication
 */
export function logAnalyticsEvent(event: Omit<AnalyticsEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }): {
  success: boolean;
  event?: AnalyticsEvent;
  isDuplicate?: boolean;
} {
  cleanDeduplicationCache();

  // Generate deduplication key
  const dedupKey = event.eventId
    ? `event_${event.eventId}`
    : `${event.sessionId || "anon"}_${event.projectId}_${event.eventType}_${event.mediaId || "none"}`;

  const now = Date.now();
  const lastTime = deduplicationCache.get(dedupKey);

  if (lastTime && now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return { success: true, isDuplicate: true };
  }

  deduplicationCache.set(dedupKey, now);

  const fullEvent: AnalyticsEvent = {
    id: event.id || `evt_${crypto.randomBytes(8).toString("hex")}`,
    eventId: event.eventId,
    photographerId: event.photographerId,
    projectId: event.projectId,
    accessCode: event.accessCode.toUpperCase(),
    eventType: event.eventType,
    mediaId: event.mediaId,
    mediaTitle: event.mediaTitle,
    mediaType: event.mediaType,
    eventName: event.eventName,
    watchTimeSeconds: typeof event.watchTimeSeconds === "number" ? Math.max(0, event.watchTimeSeconds) : undefined,
    shareType: event.shareType,
    downloadType: event.downloadType,
    source: event.source,
    deviceCategory: event.deviceCategory,
    sessionId: event.sessionId,
    isInternal: Boolean(event.isInternal),
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const all = readAnalyticsEvents();
  all.unshift(fullEvent);
  writeAnalyticsEvents(all);

  return { success: true, event: fullEvent };
}

/**
 * Determines timestamp range bounds
 */
export function getDateRangeBounds(
  range: TimeRangeOption = "30d",
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = customEnd ? new Date(customEnd) : now;

  let start: Date;

  if (range === "custom" && customStart) {
    start = new Date(customStart);
  } else if (range === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (range === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === "90d") {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === "this_year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else {
    // "all"
    start = new Date(0);
  }

  return { start, end };
}

/**
 * Filter events by date range and exclude internal previews if specified
 */
export function filterEvents(
  events: AnalyticsEvent[],
  start: Date,
  end: Date,
  excludeInternal: boolean = true
): AnalyticsEvent[] {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return events.filter((evt) => {
    if (excludeInternal && evt.isInternal) return false;
    const evtTime = new Date(evt.timestamp).getTime();
    if (isNaN(evtTime)) return false;
    return evtTime >= startTime && evtTime <= endTime;
  });
}

export interface OverviewMetrics {
  totalWeddings: number;
  totalGalleries: number;
  publishedGalleries: number;
  activeGalleries: number;
  draftGalleries: number;
  archivedGalleries: number;
  totalGalleryViews: number;
  uniqueVisits: number;
  totalClientFavorites: number;
  totalSelectedMedia: number;
  totalSelectionSubmissions: number;
  totalVideoPlays: number;
  totalVideoCompletions: number;
  totalWatchTimeSeconds: number;
  totalDownloads: number;
  totalShares: number;
  totalQrVisits: number;
  storageUsedBytes: number;
  storageUsedFormatted: string;
  planStorageLimitBytes: number | null; // null for unlimited
  planStorageLimitFormatted: string;
  activeWeddingsLimit: number | null;
  overallEngagementScore: number; // 0-100 documented formula
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Sep 3"
  views: number;
  uniqueVisits: number;
  favorites: number;
  selections: number;
  videoPlays: number;
}

export interface EventEngagementStat {
  eventName: string;
  views: number;
  favorites: number;
  selections: number;
  totalMediaCount: number;
}

export interface TopMediaItem {
  id: string;
  name: string;
  type: "PHOTO" | "VIDEO";
  eventName?: string;
  thumbnailUrl?: string;
  favoritesCount: number;
  selectionsCount: number;
  viewsCount: number;
  galleryName: string;
}

export interface WeddingEngagementSummary {
  projectId: string;
  coupleName: string;
  accessCode: string;
  weddingDate?: string;
  status: string;
  lastVisit?: string;
  totalVisits: number;
  uniqueVisits: number;
  favoritesCount: number;
  selectedCount: number;
  minSelections: number;
  maxSelections: number;
  isSelectionSubmitted: boolean;
  selectionSubmittedAt?: string;
  engagementScore: number;
  firstVisit?: string;
  firstFavorite?: string;
  firstSelection?: string;
  lastSelectionUpdate?: string;
}

export interface PhotographerAnalyticsResponse {
  photographerId: string;
  timeRange: {
    option: TimeRangeOption;
    startDate: string;
    endDate: string;
  };
  overview: OverviewMetrics;
  timeseries: TimeSeriesPoint[];
  eventBreakdown: EventEngagementStat[];
  topFavoritedMedia: TopMediaItem[];
  topSelectedMedia: TopMediaItem[];
  weddingsEngagement: WeddingEngagementSummary[];
  recentActivity: Array<{
    id: string;
    timestamp: string;
    projectId: string;
    coupleName: string;
    eventType: string;
    description: string;
    deviceCategory?: string;
  }>;
}

/**
 * Format bytes to readable string (e.g. 1.2 GB, 450 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Transparent Engagement Score Formula:
 * Score = Min(100, (Unique Visits * 10) + (Favorites * 3) + (Selections * 4) + (Video Plays * 8) + (Submitted ? 25 : 0))
 */
export function calculateEngagementScore(
  uniqueVisits: number,
  favorites: number,
  selections: number,
  videoPlays: number,
  isSubmitted: boolean
): number {
  if (uniqueVisits === 0 && favorites === 0 && selections === 0 && videoPlays === 0) {
    return 0;
  }
  const raw = uniqueVisits * 10 + favorites * 3 + selections * 4 + videoPlays * 8 + (isSubmitted ? 25 : 0);
  return Math.min(100, Math.round(raw));
}

/**
 * Computes REAL photographer analytics strictly from database activity.
 * Guaranteed 100% tenant isolation (only projects belonging to photographerId).
 */
export function getPhotographerAnalytics(
  photographerId: string,
  options: AnalyticsFilterOptions = {}
): PhotographerAnalyticsResponse {
  // 1. Fetch photographer's own projects
  const allProjects = getProjectsByPhotographer(photographerId);
  const photographerProjectMap = new Map<string, WeddingProject>();
  allProjects.forEach((p) => photographerProjectMap.set(p.id, p));

  // Determine target projects (single project or all photographer projects)
  let targetProjects = allProjects;
  if (options.projectId) {
    targetProjects = allProjects.filter((p) => p.id === options.projectId);
  }
  const targetProjectIds = new Set(targetProjects.map((p) => p.id));

  // 2. Fetch and filter analytics events
  const { start, end } = getDateRangeBounds(options.range || "30d", options.startDate, options.endDate);
  const rawEvents = readAnalyticsEvents();

  // Filter events belonging to this photographer's target projects
  const photographerEvents = rawEvents.filter(
    (evt) => evt.photographerId === photographerId && targetProjectIds.has(evt.projectId)
  );

  // Filter by time window and exclude internal previews
  const clientEvents = filterEvents(photographerEvents, start, end, true);

  // 3. Aggregate Overview Counts
  const totalWeddings = targetProjects.length;
  const totalGalleries = targetProjects.length;
  const publishedGalleries = targetProjects.filter((p) => p.status === "published" || p.isActive).length;
  const activeGalleries = publishedGalleries;
  const draftGalleries = targetProjects.filter((p) => p.status === "draft").length;
  const archivedGalleries = targetProjects.filter((p) => p.status === "archived").length;

  const galleryViewEvents = clientEvents.filter((e) => e.eventType === "gallery_view");
  const totalGalleryViews = galleryViewEvents.length;

  const uniqueSessionSet = new Set<string>();
  galleryViewEvents.forEach((e) => {
    if (e.sessionId) uniqueSessionSet.add(e.sessionId);
  });
  // If sessions are present, use session count; fallback to view count if all sessions were untagged
  const uniqueVisits = uniqueSessionSet.size > 0 ? uniqueSessionSet.size : totalGalleryViews;

  const videoPlayEvents = clientEvents.filter((e) => e.eventType === "video_play");
  const totalVideoPlays = videoPlayEvents.length;

  const videoCompletionEvents = clientEvents.filter((e) => e.eventType === "video_completed");
  const totalVideoCompletions = videoCompletionEvents.length;

  const totalWatchTimeSeconds = clientEvents.reduce((acc, evt) => acc + (evt.watchTimeSeconds || 0), 0);

  const totalDownloads = clientEvents.filter((e) => e.eventType === "download").length;
  const totalShares = clientEvents.filter((e) => e.eventType === "share").length;
  const totalQrVisits = clientEvents.filter((e) => e.eventType === "qr_visit" || e.source === "qr").length;

  // Real favorites & selections counts from authoritative stores
  let totalClientFavorites = 0;
  let totalSelectedMedia = 0;
  let totalSelectionSubmissions = 0;

  const projectEngagementList: WeddingEngagementSummary[] = [];
  const mediaFavoriteCounts = new Map<string, { count: number; project: WeddingProject; media: any }>();
  const mediaSelectionCounts = new Map<string, { count: number; project: WeddingProject; media: any }>();
  const mediaViewCounts = new Map<string, number>();

  // Event category aggregation
  const eventEngagementMap = new Map<
    string,
    { views: number; favorites: number; selections: number; totalMediaCount: number }
  >();

  // Collect media view counts from events
  clientEvents.forEach((evt) => {
    if (evt.mediaId && (evt.eventType === "photo_view" || evt.eventType === "video_play")) {
      mediaViewCounts.set(evt.mediaId, (mediaViewCounts.get(evt.mediaId) || 0) + 1);
    }
  });

  // Calculate real metrics per target wedding
  for (const proj of targetProjects) {
    const favs = getFavorites(proj.id);
    const sels = getSelections(proj.id);
    const isSubmitted = proj.settings?.selectionConfig?.status === "SUBMITTED";

    totalClientFavorites += favs.length;
    totalSelectedMedia += sels.length;
    if (isSubmitted) {
      totalSelectionSubmissions += 1;
    }

    const projEvents = clientEvents.filter((e) => e.projectId === proj.id);
    const projViews = projEvents.filter((e) => e.eventType === "gallery_view");
    const projSessions = new Set<string>();
    projViews.forEach((e) => {
      if (e.sessionId) projSessions.add(e.sessionId);
    });

    // Timestamps
    const sortedProjEvents = [...photographerEvents.filter((e) => e.projectId === proj.id && !e.isInternal)].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstVisit = sortedProjEvents.find((e) => e.eventType === "gallery_view")?.timestamp;
    const lastVisit = sortedProjEvents.filter((e) => e.eventType === "gallery_view").pop()?.timestamp;
    const firstFav = sortedProjEvents.find((e) => e.eventType === "favorite")?.timestamp;
    const firstSel = sortedProjEvents.find((e) => e.eventType === "select")?.timestamp;
    const lastSel = sortedProjEvents.filter((e) => e.eventType === "select" || e.eventType === "deselect").pop()
      ?.timestamp;

    const projVideoPlays = projEvents.filter((e) => e.eventType === "video_play").length;
    const score = calculateEngagementScore(
      projSessions.size || projViews.length,
      favs.length,
      sels.length,
      projVideoPlays,
      isSubmitted
    );

    projectEngagementList.push({
      projectId: proj.id,
      coupleName: proj.coupleName,
      accessCode: proj.accessCode,
      weddingDate: proj.weddingDate,
      status: proj.status,
      lastVisit,
      firstVisit,
      totalVisits: projViews.length,
      uniqueVisits: projSessions.size || projViews.length,
      favoritesCount: favs.length,
      selectedCount: sels.length,
      minSelections: 0,
      maxSelections: proj.settings?.selectionConfig?.limit ?? 100,
      isSelectionSubmitted: isSubmitted,
      selectionSubmittedAt: proj.settings?.selectionConfig?.submittedAt,
      engagementScore: score,
      firstFavorite: firstFav,
      firstSelection: firstSel,
      lastSelectionUpdate: lastSel,
    });

    // Map media items for top media
    const allMedia = proj.mediaFiles || [...(proj.videoFiles || []), ...(proj.photoFiles || [])];
    const mediaById = new Map<string, any>();
    allMedia.forEach((m) => {
      if (m.id) mediaById.set(m.id, m);
      if (m.driveFileId) mediaById.set(m.driveFileId, m);
    });

    favs.forEach((fav) => {
      const media = mediaById.get(fav.mediaId);
      if (media) {
        const cur = mediaFavoriteCounts.get(media.id || media.driveFileId) || {
          count: 0,
          project: proj,
          media,
        };
        cur.count += 1;
        mediaFavoriteCounts.set(media.id || media.driveFileId, cur);
      }
    });

    sels.forEach((sel) => {
      const media = mediaById.get(sel.mediaId);
      if (media) {
        const cur = mediaSelectionCounts.get(media.id || media.driveFileId) || {
          count: 0,
          project: proj,
          media,
        };
        cur.count += 1;
        mediaSelectionCounts.set(media.id || media.driveFileId, cur);
      }
    });

    // Event Categories
    (proj.events || []).forEach((evtCat) => {
      const catName = evtCat.name;
      if (!eventEngagementMap.has(catName)) {
        eventEngagementMap.set(catName, { views: 0, favorites: 0, selections: 0, totalMediaCount: 0 });
      }
      const entry = eventEngagementMap.get(catName)!;
      entry.totalMediaCount += evtCat.count || 0;
    });

    // Attribute favorites and selections to event categories
    favs.forEach((fav) => {
      const m = mediaById.get(fav.mediaId);
      const evtName = m?.eventName || "Highlights";
      if (!eventEngagementMap.has(evtName)) {
        eventEngagementMap.set(evtName, { views: 0, favorites: 0, selections: 0, totalMediaCount: 0 });
      }
      eventEngagementMap.get(evtName)!.favorites += 1;
    });

    sels.forEach((sel) => {
      const m = mediaById.get(sel.mediaId);
      const evtName = m?.eventName || "Highlights";
      if (!eventEngagementMap.has(evtName)) {
        eventEngagementMap.set(evtName, { views: 0, favorites: 0, selections: 0, totalMediaCount: 0 });
      }
      eventEngagementMap.get(evtName)!.selections += 1;
    });
  }

  // Count event category views from clientEvents
  clientEvents.forEach((evt) => {
    if (evt.eventName) {
      if (!eventEngagementMap.has(evt.eventName)) {
        eventEngagementMap.set(evt.eventName, { views: 0, favorites: 0, selections: 0, totalMediaCount: 0 });
      }
      eventEngagementMap.get(evt.eventName)!.views += 1;
    }
  });

  // 4. Real Storage Calculation
  let totalStorageBytes = 0;
  targetProjects.forEach((proj) => {
    const allMedia = proj.mediaFiles || [...(proj.videoFiles || []), ...(proj.photoFiles || [])];
    allMedia.forEach((m: any) => {
      if (typeof m.size === "number" && !isNaN(m.size)) {
        totalStorageBytes += m.size;
      } else if (typeof m.fileSizeBytes === "number" && !isNaN(m.fileSizeBytes)) {
        totalStorageBytes += m.fileSizeBytes;
      } else if (typeof m.sizeBytes === "number" && !isNaN(m.sizeBytes)) {
        totalStorageBytes += m.sizeBytes;
      }
    });
  });

  // 5. Plan & Entitlements
  const subscription = getSubscription(photographerId);
  const photographer = getPhotographerById(photographerId);
  const tier: SubscriptionPlanTier = (subscription?.plan || (photographer?.plan as SubscriptionPlanTier) || "PRO").toUpperCase() as SubscriptionPlanTier;
  const planConfig = getPlanDetails(tier);

  const planStorageLimitBytes = (planConfig.limits.maxStorageGb || 50) * 1024 * 1024 * 1024;
  const planStorageLimitFormatted = `${planConfig.limits.maxStorageGb} GB`;
  const activeWeddingsLimit = planConfig.limits.maxProjects;

  const overallScore = calculateEngagementScore(
    uniqueVisits,
    totalClientFavorites,
    totalSelectedMedia,
    totalVideoPlays,
    totalSelectionSubmissions > 0
  );

  // 6. Time Series Computation (Group by Day)
  const timeseriesMap = new Map<string, TimeSeriesPoint>();
  const curDate = new Date(start);
  const endDateMs = end.getTime();

  // If start is 0 (all time), find earliest event timestamp or 30 days ago
  if (curDate.getTime() === 0) {
    if (clientEvents.length > 0) {
      const earliest = Math.min(...clientEvents.map((e) => new Date(e.timestamp).getTime()).filter((t) => !isNaN(t)));
      curDate.setTime(earliest);
    } else {
      curDate.setTime(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Pre-fill daily slots (up to 90 days for chart readability)
  const dayCount = Math.min(90, Math.max(1, Math.ceil((endDateMs - curDate.getTime()) / (24 * 60 * 60 * 1000))));
  for (let i = 0; i <= dayCount; i++) {
    const d = new Date(curDate.getTime() + i * 24 * 60 * 60 * 1000);
    if (d.getTime() > endDateMs + 24 * 60 * 60 * 1000) break;
    const dateStr = d.toISOString().split("T")[0];
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    const dayNum = d.getDate();
    timeseriesMap.set(dateStr, {
      date: dateStr,
      label: `${monthName} ${dayNum}`,
      views: 0,
      uniqueVisits: 0,
      favorites: 0,
      selections: 0,
      videoPlays: 0,
    });
  }

  // Populate timeseries from real events
  const dailySessions = new Map<string, Set<string>>();
  clientEvents.forEach((evt) => {
    const dateStr = evt.timestamp.split("T")[0];
    if (timeseriesMap.has(dateStr)) {
      const point = timeseriesMap.get(dateStr)!;
      if (evt.eventType === "gallery_view") {
        point.views += 1;
        if (evt.sessionId) {
          if (!dailySessions.has(dateStr)) dailySessions.set(dateStr, new Set());
          dailySessions.get(dateStr)!.add(evt.sessionId);
        }
      } else if (evt.eventType === "favorite") {
        point.favorites += 1;
      } else if (evt.eventType === "select") {
        point.selections += 1;
      } else if (evt.eventType === "video_play") {
        point.videoPlays += 1;
      }
    }
  });

  // Calculate unique visits per day
  for (const [dateStr, point] of timeseriesMap.entries()) {
    const sessions = dailySessions.get(dateStr);
    point.uniqueVisits = sessions ? sessions.size : point.views > 0 ? point.views : 0;
  }

  const timeseries = Array.from(timeseriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 7. Top Media Lists
  const topFavoritedMedia: TopMediaItem[] = Array.from(mediaFavoriteCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(({ count, project, media }) => ({
      id: media.id || media.driveFileId,
      name: media.name || media.title || "Photo",
      type: media.type || "PHOTO",
      eventName: media.eventName,
      thumbnailUrl: media.thumbnailUrl || media.thumbnailLink,
      favoritesCount: count,
      selectionsCount: mediaSelectionCounts.get(media.id || media.driveFileId)?.count || 0,
      viewsCount: mediaViewCounts.get(media.id || media.driveFileId) || 0,
      galleryName: project.coupleName,
    }));

  const topSelectedMedia: TopMediaItem[] = Array.from(mediaSelectionCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(({ count, project, media }) => ({
      id: media.id || media.driveFileId,
      name: media.name || media.title || "Photo",
      type: media.type || "PHOTO",
      eventName: media.eventName,
      thumbnailUrl: media.thumbnailUrl || media.thumbnailLink,
      favoritesCount: mediaFavoriteCounts.get(media.id || media.driveFileId)?.count || 0,
      selectionsCount: count,
      viewsCount: mediaViewCounts.get(media.id || media.driveFileId) || 0,
      galleryName: project.coupleName,
    }));

  // 8. Event Breakdown List
  const eventBreakdown: EventEngagementStat[] = Array.from(eventEngagementMap.entries())
    .map(([eventName, data]) => ({
      eventName,
      views: data.views,
      favorites: data.favorites,
      selections: data.selections,
      totalMediaCount: data.totalMediaCount,
    }))
    .filter((e) => e.views > 0 || e.favorites > 0 || e.selections > 0 || e.totalMediaCount > 0)
    .sort((a, b) => b.views + b.favorites + b.selections - (a.views + a.favorites + a.selections));

  // 9. Recent Real Activity Feed
  const recentActivity = clientEvents.slice(0, 30).map((evt) => {
    const proj = photographerProjectMap.get(evt.projectId);
    let desc = `Client performed ${evt.eventType}`;
    if (evt.eventType === "gallery_view") desc = "Client visited gallery";
    else if (evt.eventType === "photo_view") desc = `Client opened photo ${evt.mediaTitle || ""}`;
    else if (evt.eventType === "video_play") desc = `Client started playing film ${evt.mediaTitle || ""}`;
    else if (evt.eventType === "video_completed") desc = `Client finished watching film ${evt.mediaTitle || ""}`;
    else if (evt.eventType === "favorite") desc = `Client favorited ${evt.mediaTitle || "photo"}`;
    else if (evt.eventType === "unfavorite") desc = `Client unfavorited ${evt.mediaTitle || "photo"}`;
    else if (evt.eventType === "select") desc = `Client selected ${evt.mediaTitle || "photo"} for album`;
    else if (evt.eventType === "deselect") desc = `Client unselected ${evt.mediaTitle || "photo"}`;
    else if (evt.eventType === "selection_submit") desc = "Client submitted album photo selections";
    else if (evt.eventType === "download") desc = `Client downloaded ${evt.downloadType || "photos"}`;
    else if (evt.eventType === "share") desc = `Client shared gallery via ${evt.shareType || "link"}`;
    else if (evt.eventType === "qr_visit") desc = "Client arrived via QR code scan";

    return {
      id: evt.id,
      timestamp: evt.timestamp,
      projectId: evt.projectId,
      coupleName: proj?.coupleName || "Wedding Gallery",
      eventType: evt.eventType,
      description: desc,
      deviceCategory: evt.deviceCategory,
    };
  });

  return {
    photographerId,
    timeRange: {
      option: options.range || "30d",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    overview: {
      totalWeddings,
      totalGalleries,
      publishedGalleries,
      activeGalleries,
      draftGalleries,
      archivedGalleries,
      totalGalleryViews,
      uniqueVisits,
      totalClientFavorites,
      totalSelectedMedia,
      totalSelectionSubmissions,
      totalVideoPlays,
      totalVideoCompletions,
      totalWatchTimeSeconds,
      totalDownloads,
      totalShares,
      totalQrVisits,
      storageUsedBytes: totalStorageBytes,
      storageUsedFormatted: formatBytes(totalStorageBytes),
      planStorageLimitBytes,
      planStorageLimitFormatted,
      activeWeddingsLimit,
      overallEngagementScore: overallScore,
    },
    timeseries,
    eventBreakdown,
    topFavoritedMedia,
    topSelectedMedia,
    weddingsEngagement: projectEngagementList.sort((a, b) => b.engagementScore - a.engagementScore),
    recentActivity,
  };
}
