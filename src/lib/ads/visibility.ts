/**
 * Centralized Ad Visibility Engine for Google AdSense & Platform Ad Management
 * 
 * Evaluation Pipeline:
 * 1. Global Platform Ads Master Switch & Emergency Safety Mode (Kill Switch)
 * 2. Hard Excluded Routes (/admin/*, /api/*, /login, /register, /checkout)
 * 3. Client Wedding Gallery Protection (/gallery/*, /client/*)
 * 4. White-Label & Custom Domain Protections
 * 5. Placement Status & Allowed Roles
 * 6. Linked Ad Unit Active Check
 * 7. Tenant Manual Override Check
 * 8. Subscription Plan Entitlements (adsEnabled feature flag)
 */

import {
  AdVisibilityContext,
  AdVisibilityResult,
  AdPlacementKey,
  AdUnit,
  AdPlacement,
} from "../project-types";
import {
  readAdSenseConfig,
  readAdPlacements,
  getAdPlacementByKey,
  readAdUnits,
  getAdUnitById,
  getAdUnitByKey,
  getAdOverrideByPhotographer,
  getPhotographerById,
} from "../db";
import { getTenantEntitlements } from "../entitlements";

import {
  PERMANENTLY_EXCLUDED_ROUTES,
  CLIENT_GALLERY_ROUTES,
  normalizePathname,
  matchesRoutePattern,
} from "./routes";

export {
  PERMANENTLY_EXCLUDED_ROUTES,
  CLIENT_GALLERY_ROUTES,
  normalizePathname,
  matchesRoutePattern,
};

/**
 * Determines whether an advertisement should be displayed given full context.
 * Single source of truth for the entire platform.
 */
export function shouldShowAd(context: AdVisibilityContext): AdVisibilityResult {
  const config = readAdSenseConfig();
  const normPath = normalizePathname(context.pathname || "/");

  // 1. Global Platform Ads Master Switch
  if (!config.enabled) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: "Platform advertising is globally disabled by Super Admin.",
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 2. Emergency Policy Kill Switch / Safety Mode
  if (config.safetyMode) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: "Advertising safety mode (emergency policy kill switch) is active.",
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 3. Hard Excluded Sensitive Routes (/admin/*, /api/*, /login, /register, /checkout)
  if (matchesRoutePattern(normPath, PERMANENTLY_EXCLUDED_ROUTES)) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: `Route '${normPath}' is strictly excluded from ad serving for administrative/security integrity.`,
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 4. Client Wedding Gallery Protection (/gallery/*, /client/*)
  // Client galleries are a high-end photography delivery experience and are ad-free by default.
  if ((matchesRoutePattern(normPath, CLIENT_GALLERY_ROUTES) || context.placementKey === "CLIENT_GALLERY_DISABLED") && !config.clientGalleryAdsEnabled) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: "Client wedding galleries are strictly protected from advertising to maintain luxury delivery quality.",
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 5. Custom Domain & White-Label Brand Protection
  if (context.isCustomDomain) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: "Custom photographer domain detected — platform ads suppressed to respect custom branding.",
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  if (context.isWhiteLabel) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: "Photographer white-label setting active — third-party platform ads suppressed.",
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 6. Placement Lookup & Status
  const placement = getAdPlacementByKey(context.placementKey);
  if (!placement) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: `Placement '${context.placementKey}' is not configured in AdSense settings.`,
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  if (!placement.enabled) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: `Placement '${placement.name}' (${placement.placementKey}) is disabled by Super Admin.`,
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 7. Linked Ad Unit Lookup & Active Check
  let adUnit: AdUnit | null = null;
  if (placement.adUnitId) {
    adUnit = getAdUnitById(placement.adUnitId);
  }
  if (!adUnit) {
    adUnit = getAdUnitByKey(placement.placementKey.toLowerCase());
  }
  if (!adUnit) {
    const allUnits = readAdUnits();
    adUnit = allUnits.find((u) => u.placement === placement.placementKey) || null;
  }

  if (!adUnit || !adUnit.active) {
    return {
      showAd: false,
      testMode: config.testMode,
      reason: `Linked ad unit for placement '${placement.name}' is missing or inactive.`,
      publisherId: config.publisherId,
      adUnit: null,
    };
  }

  // 8. User Role Check
  const effectiveRole = context.userRole ? context.userRole.toUpperCase() : "GUEST";
  if (placement.allowedRoles && placement.allowedRoles.length > 0) {
    const isRoleAllowed =
      placement.allowedRoles.includes("ALL") ||
      placement.allowedRoles.includes(effectiveRole) ||
      (effectiveRole === "PLATFORM_ADMIN" && placement.allowedRoles.includes("PHOTOGRAPHER"));

    if (!isRoleAllowed) {
      return {
        showAd: false,
        testMode: config.testMode,
        reason: `User role '${effectiveRole}' is not in allowed roles for placement '${placement.name}'.`,
        publisherId: config.publisherId,
        adUnit: null,
      };
    }
  }

  // 9. Pricing Page Conversion Protection
  if (context.placementKey === "PRICING_PAGE" || normPath === "/pricing") {
    if (!placement.enabled) {
      return {
        showAd: false,
        testMode: config.testMode,
        reason: "Pricing page ads are disabled by default to maintain conversion rate.",
        publisherId: config.publisherId,
        adUnit: null,
      };
    }
  }

  // 10. Tenant-Specific & Plan Entitlement Evaluation
  if (context.tenantId) {
    // A. Super Admin Manual Tenant Override Check
    const override = getAdOverrideByPhotographer(context.tenantId);
    if (override) {
      if (!override.adsEnabled) {
        return {
          showAd: false,
          testMode: config.testMode,
          reason: `Super Admin manual tenant override active: ads suppressed (${override.reason || "VIP Ad-Free Exemption"}).`,
          publisherId: config.publisherId,
          adUnit: null,
        };
      } else {
        // Admin explicitly forced ads on for this tenant
        return {
          showAd: true,
          testMode: config.testMode,
          reason: `Ad approved: Super Admin forced ads enabled override for tenant '${context.tenantId}'.`,
          publisherId: config.publisherId,
          adUnit,
          format: adUnit.format,
          slotId: adUnit.slotId,
        };
      }
    }

    // B. Plan Entitlements Check
    const entitlements = getTenantEntitlements(context.tenantId);
    
    // If photographer's plan has whiteLabel: true, double check
    if (entitlements.features.whiteLabel && context.placementKey.startsWith("CLIENT_")) {
      return {
        showAd: false,
        testMode: config.testMode,
        reason: "Photographer plan includes white-label features — client-facing ads strictly blocked.",
        publisherId: config.publisherId,
        adUnit: null,
      };
    }

    // Check if ads are enabled on their plan
    if (placement.planRule === "ADS_ENABLED_ONLY") {
      if (!entitlements.features.adsEnabled) {
        return {
          showAd: false,
          testMode: config.testMode,
          reason: `Photographer is subscribed to '${entitlements.planName}' which is an ad-free tier.`,
          publisherId: config.publisherId,
          adUnit: null,
        };
      }
    } else if (placement.planRule === "EXCLUDE_PAID") {
      if (entitlements.planSlug !== "starter" && entitlements.planSlug !== "free") {
        return {
          showAd: false,
          testMode: config.testMode,
          reason: `Placement '${placement.name}' excludes paid subscription tiers.`,
          publisherId: config.publisherId,
          adUnit: null,
        };
      }
    }
  }

  // All verification checks passed — display ad unit!
  return {
    showAd: true,
    testMode: config.testMode,
    reason: `Ad approved for display in placement '${placement.name}' (${placement.placementKey}).`,
    publisherId: config.publisherId,
    adUnit,
    format: adUnit.format,
    slotId: adUnit.slotId,
  };
}
