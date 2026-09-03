// ── Plans & Entitlement Definitions for Photographer SaaS ────────────────────────
// Pure configuration file safe for both Server and Client bundles

import { SubscriptionPlanTier } from "./project-types";

export interface PlanConfig {
  tier: SubscriptionPlanTier;
  name: string;
  tagline: string;
  badge: string;
  popular?: boolean;
  priceMonthly: number; // in INR
  priceAnnual: number;  // in INR (billed annually)
  limits: {
    maxProjects: number;
    maxPhotos: number;
    maxStorageGb: number;
    maxCustomDomains: number;
    maxTeamMembers: number;
  };
  features: string[];
  capabilities: {
    whiteLabel: boolean;
    allTemplates: boolean;
    customBranding: boolean;
    clientSelection: boolean;
    downloadZip: boolean;
    advancedAnalytics: boolean;
    customDomains: boolean;
    prioritySync: boolean;
    teamCollaboration: boolean;
  };
}

export const SAAS_PLANS: Record<SubscriptionPlanTier, PlanConfig> = {
  FREE: {
    tier: "FREE",
    name: "Free Trial",
    tagline: "Explore the luxury client delivery platform",
    badge: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    limits: {
      maxProjects: 1,
      maxPhotos: 200,
      maxStorageGb: 1,
      maxCustomDomains: 0,
      maxTeamMembers: 1,
    },
    features: [
      "1 Active Wedding Project",
      "Up to 200 Photos & 1 Video",
      "Classic & Minimal Templates",
      "Standard Resolution Streaming",
      "Client Favorites & Viewing",
      "Watermarked ('Powered by DR Films')",
    ],
    capabilities: {
      whiteLabel: false,
      allTemplates: false,
      customBranding: false,
      clientSelection: false,
      downloadZip: false,
      advancedAnalytics: false,
      customDomains: false,
      prioritySync: false,
      teamCollaboration: false,
    },
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter Studio",
    tagline: "For growing wedding photographers and boutique studios",
    badge: "Boutique",
    priceMonthly: 999,
    priceAnnual: 9990,
    limits: {
      maxProjects: 5,
      maxPhotos: 2500,
      maxStorageGb: 15,
      maxCustomDomains: 1,
      maxTeamMembers: 1,
    },
    features: [
      "5 Active Wedding Projects",
      "Up to 2,500 Photos & Unlimited Videos",
      "All 6 Luxury & Cinematic Templates",
      "Studio Branding & Custom Logos",
      "Client Album Selection with Limits",
      "1 Custom Domain Mapping",
      "Password Protected Private Galleries",
    ],
    capabilities: {
      whiteLabel: false,
      allTemplates: true,
      customBranding: true,
      clientSelection: true,
      downloadZip: true,
      advancedAnalytics: false,
      customDomains: true,
      prioritySync: false,
      teamCollaboration: false,
    },
  },
  PRO: {
    tier: "PRO",
    name: "Pro Studio",
    tagline: "The complete white-label operating system for busy studios",
    badge: "Most Popular",
    popular: true,
    priceMonthly: 2499,
    priceAnnual: 24990,
    limits: {
      maxProjects: 25,
      maxPhotos: 15000,
      maxStorageGb: 50,
      maxCustomDomains: 3,
      maxTeamMembers: 3,
    },
    features: [
      "25 Active Wedding Projects",
      "Up to 15,000 Photos & 4K Video Streaming",
      "100% White-Label (Zero Platform Branding)",
      "3 Custom Domain Mappings (e.g. gallery.yourstudio.com)",
      "Full Client Delivery & Zip Album Downloads",
      "Advanced Client Analytics & Activity Timeline",
      "3 Team Member Seats",
      "Priority Google Drive Re-sync Engine",
    ],
    capabilities: {
      whiteLabel: true,
      allTemplates: true,
      customBranding: true,
      clientSelection: true,
      downloadZip: true,
      advancedAnalytics: true,
      customDomains: true,
      prioritySync: true,
      teamCollaboration: true,
    },
  },
  STUDIO: {
    tier: "STUDIO",
    name: "Studio Unlimited",
    tagline: "Uncapped scale, high volume delivery, and multi-team collaboration",
    badge: "Unlimited",
    priceMonthly: 4999,
    priceAnnual: 49990,
    limits: {
      maxProjects: 100,
      maxPhotos: 100000,
      maxStorageGb: 250,
      maxCustomDomains: 10,
      maxTeamMembers: 10,
    },
    features: [
      "100 Active Wedding Projects",
      "Up to 100,000 Photos & Unlimited Videos",
      "10 Custom Domain Mappings",
      "Multi-Team Management & Role Permissions",
      "10 Team Member Seats",
      "Dedicated High-Concurrency Streaming",
      "VIP Dedicated WhatsApp & Phone Support",
      "Custom SLA & Priority Feature Requests",
    ],
    capabilities: {
      whiteLabel: true,
      allTemplates: true,
      customBranding: true,
      clientSelection: true,
      downloadZip: true,
      advancedAnalytics: true,
      customDomains: true,
      prioritySync: true,
      teamCollaboration: true,
    },
  },
};

export function getPlanDetails(tier?: SubscriptionPlanTier): PlanConfig {
  if (!tier || !SAAS_PLANS[tier]) {
    return SAAS_PLANS.PRO;
  }
  return SAAS_PLANS[tier];
}
