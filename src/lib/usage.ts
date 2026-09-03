/**
 * Tenant Resource Usage Service
 * Aggregates live consumption of projects, media, custom domains, team seats, and AI quotas.
 * Calculates utilization percentages and alert thresholds (75% warning, 90% critical, 100% exceeded).
 */

import {
  getProjectsByPhotographer,
  getDomainsByPhotographer,
  getTeamMembersByPhotographer,
  getSubscription,
} from "./db";
import { getTenantEntitlements, EffectiveEntitlements } from "./entitlements";

export interface UsageMetric {
  key: string;
  label: string;
  used: number;
  limit: number; // -1 for unlimited
  unit: string;
  percent: number;
  status: "normal" | "warning" | "critical" | "exceeded";
  isUnlimited: boolean;
}

export interface TenantUsageReport {
  photographerId: string;
  entitlements: EffectiveEntitlements;
  metrics: {
    projects: UsageMetric;
    photos: UsageMetric;
    videos: UsageMetric;
    storageGb: UsageMetric;
    customDomains: UsageMetric;
    teamMembers: UsageMetric;
    aiCredits: UsageMetric;
  };
  hasAnyWarning: boolean;
  hasAnyExceeded: boolean;
  recommendedUpgradePlan?: string;
}

function calculateMetric(
  key: string,
  label: string,
  used: number,
  limit: number,
  unit: string = ""
): UsageMetric {
  const isUnlimited = limit === -1;
  const percent = isUnlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  let status: "normal" | "warning" | "critical" | "exceeded" = "normal";
  if (!isUnlimited && limit > 0) {
    if (used >= limit) {
      status = "exceeded";
    } else if (used >= limit * 0.9) {
      status = "critical";
    } else if (used >= limit * 0.75) {
      status = "warning";
    }
  }

  return {
    key,
    label,
    used,
    limit,
    unit,
    percent,
    status,
    isUnlimited,
  };
}

export function getTenantUsageReport(photographerId: string): TenantUsageReport {
  const entitlements = getTenantEntitlements(photographerId);
  const projects = getProjectsByPhotographer(photographerId);
  const domains = getDomainsByPhotographer(photographerId);
  const team = getTeamMembersByPhotographer(photographerId);
  const sub = getSubscription(photographerId);

  // Aggregate media across all projects
  let totalPhotos = 0;
  let totalVideos = 0;
  let totalBytes = 0;

  for (const p of projects) {
    const rawP = p as any;
    const photosList = p.photoFiles || rawP.photos || [];
    if (Array.isArray(photosList)) {
      totalPhotos += photosList.length;
      totalBytes += photosList.reduce((acc: number, item: any) => acc + (Number(item?.size) || 4 * 1024 * 1024), 0);
    }
    const videosList = p.videoFiles || rawP.videos || [];
    if (Array.isArray(videosList)) {
      totalVideos += videosList.length;
      totalBytes += videosList.reduce((acc: number, item: any) => acc + (Number(item?.size) || 80 * 1024 * 1024), 0);
    }
    if (rawP.highlightVideo) {
      totalVideos += 1;
      totalBytes += 100 * 1024 * 1024;
    }
  }

  const storageGbUsed = Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
  const aiCreditsUsed = (sub as any)?.usage?.aiCreditsUsed || (sub as any)?.aiCreditsUsed || 0;

  const projectsMetric = calculateMetric(
    "projects",
    "Wedding Projects",
    projects.length,
    entitlements.limits.maxProjects,
    "weddings"
  );

  const photosMetric = calculateMetric(
    "photos",
    "Photo Assets",
    totalPhotos,
    entitlements.limits.maxPhotos,
    "photos"
  );

  const videosMetric = calculateMetric(
    "videos",
    "Video Deliveries",
    totalVideos,
    entitlements.limits.maxVideos,
    "videos"
  );

  const storageMetric = calculateMetric(
    "storageGb",
    "Cloud Storage",
    storageGbUsed,
    entitlements.limits.maxStorageGb,
    "GB"
  );

  const domainsMetric = calculateMetric(
    "customDomains",
    "Custom Domains",
    domains.length,
    entitlements.limits.maxCustomDomains,
    "domains"
  );

  const teamMetric = calculateMetric(
    "teamMembers",
    "Team Seats",
    team.length + 1, // include studio owner
    entitlements.limits.maxTeamMembers,
    "seats"
  );

  const aiMetric = calculateMetric(
    "aiCredits",
    "AI Enhancement Credits",
    aiCreditsUsed,
    entitlements.limits.maxAiCredits,
    "credits"
  );

  const allMetrics = [projectsMetric, photosMetric, videosMetric, storageMetric, domainsMetric, teamMetric, aiMetric];
  const hasAnyExceeded = allMetrics.some((m) => m.status === "exceeded");
  const hasAnyWarning = allMetrics.some((m) => m.status === "warning" || m.status === "critical");

  let recommendedUpgradePlan: string | undefined;
  if (hasAnyExceeded || hasAnyWarning) {
    if (entitlements.planSlug === "starter") recommendedUpgradePlan = "pro";
    else if (entitlements.planSlug === "pro") recommendedUpgradePlan = "studio";
    else if (entitlements.planSlug === "studio") recommendedUpgradePlan = "enterprise";
  }

  return {
    photographerId,
    entitlements,
    metrics: {
      projects: projectsMetric,
      photos: photosMetric,
      videos: videosMetric,
      storageGb: storageMetric,
      customDomains: domainsMetric,
      teamMembers: teamMetric,
      aiCredits: aiMetric,
    },
    hasAnyWarning,
    hasAnyExceeded,
    recommendedUpgradePlan,
  };
}
