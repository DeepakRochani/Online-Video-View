// ── Server-Side Plan Limit & Entitlement Engine ────────────────────────
// Uses db.ts for querying tenant usage and validating limits

import { SubscriptionPlanTier } from "./project-types";
import { SAAS_PLANS, getPlanDetails, PlanConfig } from "./plans";
import { 
  getSubscription, 
  getProjectsByPhotographer,
  getDomainsByPhotographer,
  getTeamMembersByPhotographer,
  isCustomDomainGloballyEnabled,
} from "./db";

export interface TenantUsageSummary {
  planTier: SubscriptionPlanTier;
  planName: string;
  subscriptionStatus: string;
  projectsCount: number;
  maxProjects: number;
  photosCount: number;
  maxPhotos: number;
  videosCount: number;
  customDomainsCount: number;
  maxCustomDomains: number;
  teamMembersCount: number;
  maxTeamMembers: number;
  projectsUsagePercent: number;
  canCreateProject: boolean;
}

export function calculateTenantUsage(photographerId: string): TenantUsageSummary {
  const sub = getSubscription(photographerId);
  const planTier: SubscriptionPlanTier = sub?.plan || "PRO";
  const plan = getPlanDetails(planTier);

  const allProjects = getProjectsByPhotographer(photographerId);
  const projects = allProjects.filter((p) => !p.deletedAt && p.status !== "archived");
  const domains = getDomainsByPhotographer(photographerId);
  const team = getTeamMembersByPhotographer(photographerId);

  const projectsCount = projects.length;
  const photosCount = projects.reduce((sum, p) => sum + (p.photoFiles?.length || 0), 0);
  const videosCount = projects.reduce((sum, p) => sum + (p.videoFiles?.length || 0), 0);
  const customDomainsCount = domains.length;
  const teamMembersCount = team.length + 1; // +1 for the owner

  const maxProjects = plan.limits.maxProjects;
  const projectsUsagePercent = Math.min(100, Math.round((projectsCount / maxProjects) * 100));
  const canCreateProject = projectsCount < maxProjects;

  return {
    planTier,
    planName: plan.name,
    subscriptionStatus: sub?.status || "ACTIVE",
    projectsCount,
    maxProjects,
    photosCount,
    maxPhotos: plan.limits.maxPhotos,
    videosCount,
    customDomainsCount,
    maxCustomDomains: plan.limits.maxCustomDomains,
    teamMembersCount,
    maxTeamMembers: plan.limits.maxTeamMembers,
    projectsUsagePercent,
    canCreateProject,
  };
}

export function checkPlanLimit(
  photographerId: string,
  limitKey: "maxProjects" | "maxPhotos" | "maxCustomDomains" | "maxTeamMembers"
): { allowed: boolean; current: number; limit: number; message?: string } {
  const usage = calculateTenantUsage(photographerId);

  switch (limitKey) {
    case "maxProjects":
      if (usage.projectsCount >= usage.maxProjects) {
        return {
          allowed: false,
          current: usage.projectsCount,
          limit: usage.maxProjects,
          message: `You have reached the limit of ${usage.maxProjects} weddings on the ${usage.planName} plan. Please upgrade to add more weddings.`,
        };
      }
      return { allowed: true, current: usage.projectsCount, limit: usage.maxProjects };

    case "maxCustomDomains":
      if (!isCustomDomainGloballyEnabled()) {
        return {
          allowed: false,
          current: 0,
          limit: 0,
          message: "Custom domains are currently disabled by the platform administrator.",
        };
      }
      if (usage.customDomainsCount >= 1) {
        return {
          allowed: false,
          current: usage.customDomainsCount,
          limit: 1,
          message: "You already have a custom domain connected. Disconnect your existing domain before connecting another domain.",
        };
      }
      return { allowed: true, current: usage.customDomainsCount, limit: 1 };

    case "maxTeamMembers":
      if (usage.teamMembersCount >= usage.maxTeamMembers) {
        return {
          allowed: false,
          current: usage.teamMembersCount,
          limit: usage.maxTeamMembers,
          message: `You have reached the limit of ${usage.maxTeamMembers} team member(s) on the ${usage.planName} plan. Please upgrade for more team seats.`,
        };
      }
      return { allowed: true, current: usage.teamMembersCount, limit: usage.maxTeamMembers };

    default:
      return { allowed: true, current: 0, limit: 9999 };
  }
}

export function hasPlanFeature(
  photographerId: string,
  featureKey: keyof PlanConfig["capabilities"]
): boolean {
  const sub = getSubscription(photographerId);
  const plan = getPlanDetails(sub?.plan);
  return !!plan.capabilities[featureKey];
}
