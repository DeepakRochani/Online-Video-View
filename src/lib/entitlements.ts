/**
 * Centralized Server-Side Entitlement Engine for Multi-Tenant SaaS
 * Computes effective feature access and resource limits by combining:
 * 1. Base Dynamic Plan
 * 2. Active Tenant Add-Ons
 * 3. Super Admin Manual Overrides
 * 4. Subscription State Lifecycle (Trialing, Active, Past Due, Grace Period, Expired, Suspended)
 * 5. Tenant Account Status
 */

import {
  Subscription,
  DynamicPlan,
  PlanFeatures,
  PlanLimits,
  SubscriptionStatus,
  PhotographerAccount,
  DEFAULT_GRACE_PERIOD_DAYS,
} from "./project-types";
import {
  getSubscription,
  readPlans,
  getPlanBySlug,
  getPhotographerById,
  getProjectsByPhotographer,
  getDomainsByPhotographer,
  getTeamMembersByPhotographer,
  readAddOns,
  isCustomDomainGloballyEnabled,
} from "./db";

export interface EffectiveEntitlements {
  photographerId: string;
  planId: string;
  planSlug: string;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  isTrial: boolean;
  trialDaysRemaining?: number;
  isGracePeriod: boolean;
  graceDaysRemaining?: number;
  isExpired: boolean;
  isSuspended: boolean;
  currentPeriodEnd: string;
  features: PlanFeatures;
  limits: PlanLimits;
  hasAdminOverride: boolean;
  activeAddOnsCount: number;
}

export function getTenantEntitlements(photographerId: string): EffectiveEntitlements {
  const account = getPhotographerById(photographerId);
  const sub = getSubscription(photographerId);
  const allPlans = readPlans();

  // Find plan by slug or fallback to default starter/pro
  let basePlan: DynamicPlan | undefined;
  if (sub?.planSlug) {
    basePlan = getPlanBySlug(sub.planSlug) || undefined;
  }
  if (!basePlan && sub?.plan) {
    basePlan = getPlanBySlug(sub.plan.toLowerCase()) || allPlans.find((p) => p.name.toUpperCase() === sub.plan.toUpperCase());
  }
  if (!basePlan) {
    basePlan = allPlans.find((p) => p.slug === "pro") || allPlans[0];
  }

  const now = Date.now();
  let effectiveStatus: SubscriptionStatus = sub?.status || "ACTIVE";
  let trialDaysRemaining: number | undefined;
  let graceDaysRemaining: number | undefined;

  // 1. Account-level status check
  if (account?.status === "suspended" || account?.status === "SUSPENDED") {
    effectiveStatus = "SUSPENDED";
  } else if (sub) {
    // 2. Trial evaluation
    if (sub.status === "TRIAL" || sub.status === "TRIALING") {
      const trialEndTime = sub.trialEnd ? new Date(sub.trialEnd).getTime() : new Date(sub.currentPeriodEnd).getTime();
      if (now > trialEndTime) {
        effectiveStatus = "EXPIRED";
        trialDaysRemaining = 0;
      } else {
        effectiveStatus = "TRIAL";
        trialDaysRemaining = Math.max(0, Math.ceil((trialEndTime - now) / (24 * 60 * 60 * 1000)));
      }
    } else if (sub.status === "ACTIVE" || sub.status === "PAST_DUE") {
      // 3. Active / Past due period evaluation
      const periodEnd = new Date(sub.currentPeriodEnd).getTime();
      if (now > periodEnd) {
        // Configurable Grace period (default 7 days)
        const graceEnd = sub.gracePeriodEnd
          ? new Date(sub.gracePeriodEnd).getTime()
          : periodEnd + DEFAULT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
        if (now <= graceEnd) {
          effectiveStatus = "GRACE_PERIOD";
          graceDaysRemaining = Math.max(0, Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000)));
        } else {
          effectiveStatus = "EXPIRED";
        }
      } else if (sub.status === "PAST_DUE") {
        effectiveStatus = "PAST_DUE";
      }
    } else if (sub.status === "CANCELLED") {
      const periodEnd = new Date(sub.currentPeriodEnd).getTime();
      if (now > periodEnd) {
        effectiveStatus = "EXPIRED";
      } else {
        effectiveStatus = "CANCELLED"; // Active until period ends
      }
    }
  }

  // 4. Base Features & Limits
  const defaultFeatures: PlanFeatures = {
    googleDrive: true,
    weddingProjects: true,
    clientGalleries: true,
    photoDelivery: true,
    videoDelivery: true,
    favorites: true,
    clientSelection: true,
    qrCodes: true,
    whatsappSharing: true,
    whiteLabel: false,
    customBranding: true,
    customDomains: false,
    galleryTemplates: true,
    advancedGalleryTemplates: false,
    analytics: false,
    clientNotifications: true,
    aiFeatures: false,
    prioritySupport: false,
    apiAccess: false,
    teamCollaboration: false,
    downloadZip: true,
    prioritySync: false,
    adsEnabled: false,
  };

  const defaultLimits: PlanLimits = {
    maxProjects: 5,
    maxActiveProjects: 5,
    maxPhotos: 2500,
    maxVideos: 50,
    maxStorageGb: 15,
    maxCustomDomains: 0,
    maxTeamMembers: 1,
    maxAiCredits: 0,
    maxMonthlyAiJobs: 0,
  };

  const features: PlanFeatures = {
    ...defaultFeatures,
    ...(basePlan?.features || {}),
  };

  const limits: PlanLimits = {
    ...defaultLimits,
    ...(basePlan?.limits || {}),
  };

  // 5. Apply Active Add-ons
  let activeAddOnsCount = 0;
  if (sub?.addOns && Array.isArray(sub.addOns)) {
    const allAddons = readAddOns();
    for (const item of sub.addOns) {
      if (!item.expiresAt || new Date(item.expiresAt).getTime() > now) {
        activeAddOnsCount++;
        const addonDef = allAddons.find((a) => a.slug === item.addOnSlug || a.id === item.addOnId);
        if (addonDef?.limitBonus) {
          for (const [k, val] of Object.entries(addonDef.limitBonus)) {
            if (typeof val === "number" && typeof limits[k] === "number") {
              if (limits[k] !== -1) {
                limits[k] = (limits[k] || 0) + val * (item.quantity || 1);
              }
            }
          }
        }
        if (addonDef?.featureBonus) {
          for (const [k, val] of Object.entries(addonDef.featureBonus)) {
            if (val === true) {
              features[k] = true;
            }
          }
        }
      }
    }
  }

  // 6. Apply Super Admin Manual Overrides
  let hasAdminOverride = false;
  if (sub?.entitlementOverride) {
    const override = sub.entitlementOverride;
    const isOverrideValid = !override.expiresAt || new Date(override.expiresAt).getTime() > now;
    if (isOverrideValid) {
      hasAdminOverride = true;
      if (override.features) {
        for (const [k, v] of Object.entries(override.features)) {
          if (typeof v === "boolean") {
            features[k] = v;
          }
        }
      }
      if (override.limits) {
        for (const [k, v] of Object.entries(override.limits)) {
          if (typeof v === "number") {
            limits[k] = v;
          }
        }
      }
    }
  }

  // 7. Restriction rules for Suspended/Expired states
  if (effectiveStatus === "SUSPENDED" || effectiveStatus === "EXPIRED") {
    // Read-only mode for client viewing; prevent adding new capacity
    limits.maxProjects = 0;
    limits.maxActiveProjects = 0;
    limits.maxCustomDomains = 0;
    limits.maxTeamMembers = 0;
  }

  return {
    photographerId,
    planId: basePlan?.id || "plan-pro",
    planSlug: basePlan?.slug || "pro",
    planName: basePlan?.name || "Pro Studio",
    subscriptionStatus: sub?.status || "ACTIVE",
    effectiveStatus,
    isTrial: effectiveStatus === "TRIAL",
    trialDaysRemaining,
    isGracePeriod: effectiveStatus === "GRACE_PERIOD",
    graceDaysRemaining,
    isExpired: effectiveStatus === "EXPIRED",
    isSuspended: effectiveStatus === "SUSPENDED",
    currentPeriodEnd: sub?.currentPeriodEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    features,
    limits,
    hasAdminOverride,
    activeAddOnsCount,
  };
}

export function hasFeature(photographerId: string, featureKey: keyof PlanFeatures | string): boolean {
  const entitlements = getTenantEntitlements(photographerId);
  if (entitlements.isSuspended) return false;
  return !!entitlements.features[featureKey];
}

export function getLimit(photographerId: string, limitKey: keyof PlanLimits | string): number {
  const entitlements = getTenantEntitlements(photographerId);
  const limit = entitlements.limits[limitKey];
  return typeof limit === "number" ? limit : 0;
}

export function canCreate(
  photographerId: string,
  resourceType: "weddings" | "activeWeddings" | "photos" | "videos" | "customDomains" | "teamMembers"
): {
  allowed: boolean;
  current: number;
  limit: number;
  code?: string;
  message?: string;
  upgradeRequiredPlan?: string;
} {
  const entitlements = getTenantEntitlements(photographerId);

  if (entitlements.isSuspended) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      code: "ACCOUNT_SUSPENDED",
      message: "Your studio account has been suspended. Please contact platform support.",
    };
  }

  if (entitlements.isExpired) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      code: "SUBSCRIPTION_EXPIRED",
      message: "Your subscription has expired. Please renew or upgrade your plan to create new items.",
      upgradeRequiredPlan: "pro",
    };
  }

  let current = 0;
  let limit = 0;

  switch (resourceType) {
    case "weddings":
    case "activeWeddings": {
      const allProjects = getProjectsByPhotographer(photographerId);
      const projects = allProjects.filter((p) => !p.deletedAt && p.status !== "archived");
      current = projects.length;
      limit = entitlements.limits.maxProjects ?? 5;
      if (limit !== -1 && current >= limit) {
        return {
          allowed: false,
          current,
          limit,
          code: "SUBSCRIPTION_LIMIT_REACHED",
          message: `Wedding project limit reached (${current}/${limit} used) on your ${entitlements.planName} plan. Upgrade to increase capacity.`,
          upgradeRequiredPlan: entitlements.planSlug === "starter" ? "pro" : "studio",
        };
      }
      return { allowed: true, current, limit };
    }

    case "customDomains": {
      if (!isCustomDomainGloballyEnabled()) {
        return {
          allowed: false,
          current: 0,
          limit: 0,
          code: "CUSTOM_DOMAINS_DISABLED",
          message: "Custom domains are currently disabled by the platform administrator.",
        };
      }
      if (!entitlements.features.customDomains) {
        return {
          allowed: false,
          current: 0,
          limit: 0,
          code: "FEATURE_NOT_IN_PLAN",
          message: `Custom domain mapping is not included in the ${entitlements.planName} plan. Upgrade to Pro Studio to connect your domain.`,
          upgradeRequiredPlan: "pro",
        };
      }
      const domains = getDomainsByPhotographer(photographerId).filter((d) => d.status !== "DISCONNECTED");
      current = domains.length;
      limit = 1; // Strict platform rule: exactly 1 custom domain per photographer
      if (current >= limit) {
        return {
          allowed: false,
          current,
          limit,
          code: "CUSTOM_DOMAIN_LIMIT_REACHED",
          message: `You already have a custom domain connected (${current}/${limit} used). Disconnect your current domain to connect a new one.`,
        };
      }
      return { allowed: true, current, limit };
    }

    case "teamMembers": {
      if (!entitlements.features.teamCollaboration) {
        return {
          allowed: false,
          current: 1,
          limit: 1,
          code: "FEATURE_NOT_IN_PLAN",
          message: `Team collaboration is not available on the ${entitlements.planName} plan. Upgrade to Pro Studio to invite team members.`,
          upgradeRequiredPlan: "pro",
        };
      }
      const team = getTeamMembersByPhotographer(photographerId);
      current = team.length + 1; // +1 for the owner
      limit = entitlements.limits.maxTeamMembers ?? 1;
      if (limit !== -1 && current >= limit) {
        return {
          allowed: false,
          current,
          limit,
          code: "SUBSCRIPTION_LIMIT_REACHED",
          message: `Team seat limit reached (${current}/${limit} used). Upgrade your plan for more seats.`,
          upgradeRequiredPlan: "studio",
        };
      }
      return { allowed: true, current, limit };
    }

    default:
      return { allowed: true, current: 0, limit: -1 };
  }
}

export function canUse(
  photographerId: string,
  metric: "aiCredits" | "storageGb",
  amount: number
): {
  allowed: boolean;
  current: number;
  limit: number;
  code?: string;
  message?: string;
} {
  const entitlements = getTenantEntitlements(photographerId);
  if (entitlements.isSuspended || entitlements.isExpired) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      code: "SUBSCRIPTION_INACTIVE",
      message: "Active subscription required for this feature.",
    };
  }

  if (metric === "aiCredits") {
    if (!entitlements.features.aiFeatures) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        code: "FEATURE_NOT_IN_PLAN",
        message: `AI features are not enabled on the ${entitlements.planName} plan. Upgrade to Pro Studio.`,
      };
    }
    const limit = entitlements.limits.maxAiCredits ?? 0;
    if (limit !== -1 && amount > limit) {
      return {
        allowed: false,
        current: 0,
        limit,
        code: "AI_CREDITS_EXHAUSTED",
        message: `Insufficient AI credits (${limit} monthly limit). Purchase AI Add-on credits or upgrade plan.`,
      };
    }
    return { allowed: true, current: 0, limit };
  }

  return { allowed: true, current: 0, limit: -1 };
}

// ── Explicit Entitlement Access Helpers for Business Logic ───────────────────────

export function canCreateWedding(photographerId: string): {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
  upgradeRequiredPlan?: string;
} {
  return canCreate(photographerId, "weddings");
}

export function canCreateGallery(photographerId: string): {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
} {
  const result = canCreate(photographerId, "weddings");
  return {
    allowed: result.allowed,
    current: result.current,
    limit: result.limit,
    message: result.message,
  };
}

export function canUseCustomDomain(photographerId: string): {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
} {
  const result = canCreate(photographerId, "customDomains");
  return {
    allowed: result.allowed,
    current: result.current,
    limit: result.limit,
    message: result.message,
  };
}

export function canUseWhiteLabel(photographerId: string): boolean {
  return hasFeature(photographerId, "whiteLabel");
}

export function canUseAdvancedSelection(photographerId: string): boolean {
  return hasFeature(photographerId, "clientSelection");
}

export function canUseAI(photographerId: string): boolean {
  return hasFeature(photographerId, "aiFeatures");
}

export function canUseLargeStorage(photographerId: string, requiredGb: number): boolean {
  const entitlements = getTenantEntitlements(photographerId);
  if (entitlements.isSuspended || entitlements.isExpired) return false;
  const maxGb = entitlements.limits.maxStorageGb;
  if (maxGb === -1) return true;
  return maxGb >= requiredGb;
}

export function canUseVideoDelivery(photographerId: string): boolean {
  return hasFeature(photographerId, "videoDelivery");
}

export function canUseGoogleDrive(photographerId: string): boolean {
  return hasFeature(photographerId, "googleDrive");
}

export const getPhotographerEntitlements = getTenantEntitlements;

export class EntitlementService {
  static getEntitlements(photographerId: string): EffectiveEntitlements {
    return getTenantEntitlements(photographerId);
  }

  static hasFeature(photographerId: string, featureKey: keyof PlanFeatures | string): boolean {
    return hasFeature(photographerId, featureKey);
  }

  static getLimit(photographerId: string, limitKey: keyof PlanLimits | string): number {
    return getLimit(photographerId, limitKey);
  }

  static canCreate(
    photographerId: string,
    resourceType: "weddings" | "activeWeddings" | "photos" | "videos" | "customDomains" | "teamMembers"
  ) {
    return canCreate(photographerId, resourceType);
  }

  static canUse(
    photographerId: string,
    metric: "aiCredits" | "storageGb",
    amount: number
  ) {
    return canUse(photographerId, metric, amount);
  }

  static canCreateWedding(photographerId: string) {
    return canCreateWedding(photographerId);
  }

  static canCreateGallery(photographerId: string) {
    return canCreateGallery(photographerId);
  }

  static canUseCustomDomain(photographerId: string) {
    return canUseCustomDomain(photographerId);
  }

  static canUseWhiteLabel(photographerId: string): boolean {
    return canUseWhiteLabel(photographerId);
  }

  static canUseAdvancedSelection(photographerId: string): boolean {
    return canUseAdvancedSelection(photographerId);
  }

  static canUseAI(photographerId: string): boolean {
    return canUseAI(photographerId);
  }

  static canUseLargeStorage(photographerId: string, requiredGb: number): boolean {
    return canUseLargeStorage(photographerId, requiredGb);
  }

  static canUseVideoDelivery(photographerId: string): boolean {
    return canUseVideoDelivery(photographerId);
  }

  static canUseGoogleDrive(photographerId: string): boolean {
    return canUseGoogleDrive(photographerId);
  }
}


