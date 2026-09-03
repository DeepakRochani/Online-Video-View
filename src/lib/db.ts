import fs from "fs";
import path from "path";
import crypto from "crypto";
import dns from "dns";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { extractGoogleDriveFolderId } from "./drive-parser";

import {
  MediaType,
  DriveMediaFile,
  DriveVideoFile,
  DriveEventCategory,
  ProjectStatus,
  GalleryTheme,
  GalleryTemplate,
  HeroStyle,
  FontFamilyPreset,
  PhotoGridStyle,
  SelectionStatus,
  ClientSelectionConfig,
  ClientFavorite,
  SelectionItem,
  GallerySettings,
  PhotographerBranding,
  StudioSettings,
  DomainMapping,
  VideoAnalyticsStat,
  ProjectAnalytics,
  ClientActivityEvent,
  WeddingProject,
  PhotographerAccount,
  PhotographerRole,
  SubscriptionPlanTier,
  SubscriptionStatus,
  Subscription,
  InvoiceRecord,
  TeamMember,
  TeamRole,
  ClientSummary,
  PhotographerStatus,
  AdminPlanOverride,
  AdminAuditLog,
  SupportNote,
  SupportTicket,
  PlatformOverviewMetrics,
  DynamicPlan,
  Coupon,
  AddOn,
  BillingEvent,
  BillingCycle,
  PlanFeatures,
  PlanLimits,
  TenantEntitlementOverride,
  AdSenseConfig,
  AdUnit,
  AdPlacement,
  AdOverride,
  AdSenseReportingStats,
  AdVisibilityContext,
  AdVisibilityResult,
  AdFormat,
  AdPlacementKey,
  NotificationRecord,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  PhotographerNotificationPreferences,
  NotificationMetrics,
  ApplicationError,
  ErrorSeverity,
  PlatformAlert,
  AlertSeverity,
  AlertStatus,
  BackgroundJobRecord,
  JobStatus,
  BackupMetadata,
  PlatformCommunicationSettings,
  PlatformDomainSettings,
  PlatformGalleryLifecycleSettings,
} from "./project-types";


export * from "./project-types";

// ── Paths ────────────────────────────────────────────────────────────────────

export const DEFAULT_PHOTOGRAPHER_ID = "photographer-default";
export const SUPER_ADMIN_PHOTOGRAPHER_ID = "photographer-super-admin";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");
const SELECTIONS_FILE = path.join(DATA_DIR, "selections.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "activity.json");
const STUDIO_SETTINGS_FILE = path.join(DATA_DIR, "studio-settings.json");
const DOMAINS_FILE = path.join(DATA_DIR, "domains.json");
const DOMAIN_SETTINGS_FILE = path.join(DATA_DIR, "domain_settings.json");
const PHOTOGRAPHERS_FILE = path.join(DATA_DIR, "photographers.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");
const COUPONS_FILE = path.join(DATA_DIR, "coupons.json");
const ADDONS_FILE = path.join(DATA_DIR, "addons.json");
const BILLING_EVENTS_FILE = path.join(DATA_DIR, "billing-events.json");
const INVOICES_FILE = path.join(DATA_DIR, "invoices.json");
const WEBHOOK_EVENTS_FILE = path.join(DATA_DIR, "webhook-events.json");
const TEAM_MEMBERS_FILE = path.join(DATA_DIR, "team-members.json");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "audit-logs.json");
const SUPPORT_NOTES_FILE = path.join(DATA_DIR, "support-notes.json");
const SUPPORT_TICKETS_FILE = path.join(DATA_DIR, "support-tickets.json");
const ADSENSE_CONFIG_FILE = path.join(DATA_DIR, "adsense-config.json");
const AD_UNITS_FILE = path.join(DATA_DIR, "ad-units.json");
const AD_PLACEMENTS_FILE = path.join(DATA_DIR, "ad-placements.json");
const AD_OVERRIDES_FILE = path.join(DATA_DIR, "ad-overrides.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const NOTIFICATION_PREFERENCES_FILE = path.join(DATA_DIR, "notification-preferences.json");
const ERRORS_FILE = path.join(DATA_DIR, "errors.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const BACKUPS_FILE = path.join(DATA_DIR, "backups.json");
const COMMUNICATION_SETTINGS_FILE = path.join(DATA_DIR, "platform-communication-settings.json");
const GALLERY_LIFECYCLE_SETTINGS_FILE = path.join(DATA_DIR, "platform-gallery-lifecycle-settings.json");

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, "[]", "utf-8");
if (!fs.existsSync(FAVORITES_FILE)) fs.writeFileSync(FAVORITES_FILE, "[]", "utf-8");
if (!fs.existsSync(SELECTIONS_FILE)) fs.writeFileSync(SELECTIONS_FILE, "[]", "utf-8");
if (!fs.existsSync(ACTIVITY_FILE)) fs.writeFileSync(ACTIVITY_FILE, "[]", "utf-8");
if (!fs.existsSync(DOMAINS_FILE)) fs.writeFileSync(DOMAINS_FILE, "[]", "utf-8");
if (!fs.existsSync(INVOICES_FILE)) fs.writeFileSync(INVOICES_FILE, "[]", "utf-8");
if (!fs.existsSync(WEBHOOK_EVENTS_FILE)) fs.writeFileSync(WEBHOOK_EVENTS_FILE, "[]", "utf-8");
if (!fs.existsSync(BILLING_EVENTS_FILE)) fs.writeFileSync(BILLING_EVENTS_FILE, "[]", "utf-8");
if (!fs.existsSync(TEAM_MEMBERS_FILE)) fs.writeFileSync(TEAM_MEMBERS_FILE, "[]", "utf-8");
if (!fs.existsSync(AUDIT_LOGS_FILE)) fs.writeFileSync(AUDIT_LOGS_FILE, "[]", "utf-8");
if (!fs.existsSync(SUPPORT_NOTES_FILE)) fs.writeFileSync(SUPPORT_NOTES_FILE, "[]", "utf-8");
if (!fs.existsSync(SUPPORT_TICKETS_FILE)) fs.writeFileSync(SUPPORT_TICKETS_FILE, "[]", "utf-8");
if (!fs.existsSync(AD_OVERRIDES_FILE)) fs.writeFileSync(AD_OVERRIDES_FILE, "[]", "utf-8");
if (!fs.existsSync(NOTIFICATIONS_FILE)) fs.writeFileSync(NOTIFICATIONS_FILE, "[]", "utf-8");
if (!fs.existsSync(NOTIFICATION_PREFERENCES_FILE)) fs.writeFileSync(NOTIFICATION_PREFERENCES_FILE, "[]", "utf-8");
if (!fs.existsSync(ERRORS_FILE)) fs.writeFileSync(ERRORS_FILE, "[]", "utf-8");
if (!fs.existsSync(ALERTS_FILE)) fs.writeFileSync(ALERTS_FILE, "[]", "utf-8");
if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, "[]", "utf-8");
if (!fs.existsSync(BACKUPS_FILE)) fs.writeFileSync(BACKUPS_FILE, "[]", "utf-8");
if (!fs.existsSync(GALLERY_LIFECYCLE_SETTINGS_FILE)) fs.writeFileSync(GALLERY_LIFECYCLE_SETTINGS_FILE, "{}", "utf-8");

// Seed initial Dynamic Plans if file does not exist
if (!fs.existsSync(PLANS_FILE)) {
  const initialPlans: DynamicPlan[] = [
    {
      id: "plan-starter",
      slug: "starter",
      name: "Starter Studio",
      tagline: "For growing wedding photographers and boutique studios",
      description: "Everything you need to deliver luxury online galleries to modern couples.",
      badge: "Boutique",
      isPopular: false,
      isActive: true,
      isPublic: true,
      displayOrder: 1,
      priceMonthlyInPaise: 99900,
      priceYearlyInPaise: 999000,
      priceMonthlyPaise: 99900,
      priceYearlyPaise: 999000,
      currency: "INR",
      trialDays: 14,
      isTrialEnabled: true,
      features: {
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
      },
      limits: {
        maxProjects: 5,
        maxActiveProjects: 5,
        maxPhotos: 2500,
        maxVideos: 50,
        maxStorageGb: 15,
        maxCustomDomains: 0,
        maxTeamMembers: 1,
        maxAiCredits: 0,
        maxMonthlyAiJobs: 0,
      },
      featureBullets: [
        "5 Active Wedding Projects",
        "Up to 2,500 Photos & 50 Videos",
        "Studio Branding & Custom Logos",
        "Client Album Selection",
        "High-Speed Zip Album Downloads",
        "QR Codes & WhatsApp Sharing",
        "Password-Protected Private Galleries",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "plan-pro",
      slug: "pro",
      name: "Pro Studio",
      tagline: "The complete white-label operating system for busy studios",
      description: "100% white-label galleries, custom domains, 4K streaming, and multi-user seats.",
      badge: "Most Popular",
      isPopular: true,
      isActive: true,
      isPublic: true,
      displayOrder: 2,
      priceMonthlyInPaise: 249900,
      priceYearlyInPaise: 2499000,
      priceMonthlyPaise: 249900,
      priceYearlyPaise: 2499000,
      currency: "INR",
      trialDays: 14,
      isTrialEnabled: true,
      features: {
        googleDrive: true,
        weddingProjects: true,
        clientGalleries: true,
        photoDelivery: true,
        videoDelivery: true,
        favorites: true,
        clientSelection: true,
        qrCodes: true,
        whatsappSharing: true,
        whiteLabel: true,
        customBranding: true,
        customDomains: true,
        galleryTemplates: true,
        advancedGalleryTemplates: true,
        analytics: true,
        clientNotifications: true,
        aiFeatures: true,
        prioritySupport: true,
        apiAccess: false,
        teamCollaboration: true,
        downloadZip: true,
        prioritySync: true,
      },
      limits: {
        maxProjects: 25,
        maxActiveProjects: 25,
        maxPhotos: 15000,
        maxVideos: 300,
        maxStorageGb: 60,
        maxCustomDomains: 3,
        maxTeamMembers: 3,
        maxAiCredits: 500,
        maxMonthlyAiJobs: 50,
      },
      featureBullets: [
        "25 Active Wedding Projects",
        "Up to 15,000 Photos & 4K Video Streaming",
        "100% White-Label (Zero Platform Branding)",
        "3 Custom Domains (gallery.yourstudio.com)",
        "All 6 Luxury & Cinematic Gallery Templates",
        "Advanced Client Analytics & Activity Timeline",
        "3 Team Collaboration Seats",
        "500 AI Face/Photo Curation Credits",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "plan-studio",
      slug: "studio",
      name: "Studio Elite",
      tagline: "Uncapped scale, high volume delivery, and multi-team collaboration",
      description: "Designed for premier cinema brands with large teams and high-capacity delivery.",
      badge: "High Scale",
      isPopular: false,
      isActive: true,
      isPublic: true,
      displayOrder: 3,
      priceMonthlyInPaise: 499900,
      priceYearlyInPaise: 4999000,
      priceMonthlyPaise: 499900,
      priceYearlyPaise: 4999000,
      currency: "INR",
      trialDays: 14,
      isTrialEnabled: true,
      features: {
        googleDrive: true,
        weddingProjects: true,
        clientGalleries: true,
        photoDelivery: true,
        videoDelivery: true,
        favorites: true,
        clientSelection: true,
        qrCodes: true,
        whatsappSharing: true,
        whiteLabel: true,
        customBranding: true,
        customDomains: true,
        galleryTemplates: true,
        advancedGalleryTemplates: true,
        analytics: true,
        clientNotifications: true,
        aiFeatures: true,
        prioritySupport: true,
        apiAccess: true,
        teamCollaboration: true,
        downloadZip: true,
        prioritySync: true,
        customCss: true,
      },
      limits: {
        maxProjects: 100,
        maxActiveProjects: 100,
        maxPhotos: 100000,
        maxVideos: 2000,
        maxStorageGb: 300,
        maxCustomDomains: 10,
        maxTeamMembers: 10,
        maxAiCredits: 2000,
        maxMonthlyAiJobs: 200,
      },
      featureBullets: [
        "100 Active Wedding Projects",
        "Up to 100,000 Photos & Unlimited Videos",
        "10 Custom Domain Mappings",
        "10 Team Collaboration Seats",
        "2,000 AI Credits Per Month",
        "Dedicated High-Concurrency Streaming",
        "VIP Dedicated WhatsApp & Phone Support",
        "Custom CSS & Template Styling",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "plan-enterprise",
      slug: "enterprise",
      name: "Enterprise",
      tagline: "Custom limits, dedicated infrastructure, and bespoke SLA",
      description: "For nationwide studios, production networks, and custom enterprise deployments.",
      badge: "Custom",
      isPopular: false,
      isActive: true,
      isPublic: true,
      displayOrder: 4,
      priceMonthlyInPaise: 999900,
      priceYearlyInPaise: 9999000,
      priceMonthlyPaise: 999900,
      priceYearlyPaise: 9999000,
      currency: "INR",
      trialDays: 0,
      isTrialEnabled: false,
      features: {
        googleDrive: true,
        weddingProjects: true,
        clientGalleries: true,
        photoDelivery: true,
        videoDelivery: true,
        favorites: true,
        clientSelection: true,
        qrCodes: true,
        whatsappSharing: true,
        whiteLabel: true,
        customBranding: true,
        customDomains: true,
        galleryTemplates: true,
        advancedGalleryTemplates: true,
        analytics: true,
        clientNotifications: true,
        aiFeatures: true,
        prioritySupport: true,
        apiAccess: true,
        teamCollaboration: true,
        downloadZip: true,
        prioritySync: true,
        customCss: true,
      },
      limits: {
        maxProjects: -1,
        maxActiveProjects: -1,
        maxPhotos: -1,
        maxVideos: -1,
        maxStorageGb: -1,
        maxCustomDomains: -1,
        maxTeamMembers: -1,
        maxAiCredits: 10000,
        maxMonthlyAiJobs: 1000,
      },
      featureBullets: [
        "Unlimited Wedding Projects (-1)",
        "Unlimited Photos & 4K Video Streaming",
        "Unlimited Custom Domain Mappings",
        "Unlimited Team Member Seats",
        "Direct Database & API Access",
        "Dedicated Account Manager & SLA",
        "Custom Feature Engineering",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  fs.writeFileSync(PLANS_FILE, JSON.stringify(initialPlans, null, 2), "utf-8");
}

// Seed initial Promotional Coupons if file does not exist
if (!fs.existsSync(COUPONS_FILE)) {
  const initialCoupons: Coupon[] = [
    {
      id: "coupon-welcome20",
      code: "WELCOME20",
      discountType: "percentage",
      discountValue: 20,
      applicableCycles: ["MONTHLY", "YEARLY"],
      maxRedemptions: 500,
      redemptionCount: 0,
      timesRedeemed: 0,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "coupon-yearly25",
      code: "YEARLY25",
      discountType: "percentage",
      discountValue: 25,
      applicableCycles: ["YEARLY"],
      maxRedemptions: 200,
      redemptionCount: 0,
      timesRedeemed: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "coupon-launch50",
      code: "LAUNCH50",
      discountType: "fixed",
      discountValue: 50000, // ₹500 off in paise
      currency: "INR",
      applicableCycles: ["MONTHLY", "YEARLY"],
      maxRedemptions: 50,
      redemptionCount: 0,
      timesRedeemed: 0,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
  fs.writeFileSync(COUPONS_FILE, JSON.stringify(initialCoupons, null, 2), "utf-8");
}

// Seed initial Add-Ons if file does not exist
if (!fs.existsSync(ADDONS_FILE)) {
  const initialAddOns: AddOn[] = [
    {
      id: "addon-extra-weddings",
      slug: "extra-10-weddings",
      name: "Extra 10 Weddings Package",
      description: "Add 10 additional active wedding project slots to your current plan.",
      priceMonthlyInPaise: 49900,
      priceYearlyInPaise: 499000,
      currency: "INR",
      limitBonus: { maxProjects: 10, maxActiveProjects: 10 },
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "addon-extra-storage",
      slug: "extra-500gb-storage",
      name: "500 GB High-Speed Cloud Storage",
      description: "Expand your studio media capacity with 500 GB additional quota.",
      priceMonthlyInPaise: 39900,
      priceYearlyInPaise: 399000,
      currency: "INR",
      limitBonus: { maxStorageGb: 500 },
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "addon-extra-domains",
      slug: "extra-5-domains",
      name: "5 Additional Custom Domains",
      description: "Map up to 5 more custom white-label subdomains.",
      priceMonthlyInPaise: 29900,
      priceYearlyInPaise: 299000,
      currency: "INR",
      limitBonus: { maxCustomDomains: 5 },
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "addon-ai-credits",
      slug: "extra-1000-ai-credits",
      name: "1,000 AI Curation Credits",
      description: "Batch AI face matching and highlights generation credits.",
      priceMonthlyInPaise: 19900,
      priceYearlyInPaise: 199000,
      currency: "INR",
      limitBonus: { maxAiCredits: 1000 },
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
  fs.writeFileSync(ADDONS_FILE, JSON.stringify(initialAddOns, null, 2), "utf-8");
}

if (!fs.existsSync(STUDIO_SETTINGS_FILE)) {
  const initialStudioSettings: StudioSettings = {
    studioName: process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
    tagline: "Fine Art Wedding Cinema & Photography",
    logoUrlLight: "",
    logoUrlDark: "",
    website: "",
    email: "",
    phone: "",
    instagram: "",
    facebook: "",
    footerText: "Crafted with love for your lifelong memories.",
    defaultTemplate: "classic",
    defaultTheme: "luxury",
    defaultAccentColor: "#D4AF37",
    whiteLabelEnabled: true,
    cnameTarget: "cname.drfilms.com",
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STUDIO_SETTINGS_FILE, JSON.stringify(initialStudioSettings, null, 2), "utf-8");
}

// Ensure default photographer exists
if (!fs.existsSync(PHOTOGRAPHERS_FILE)) {
  const defaultPhotographer: PhotographerAccount = {
    id: DEFAULT_PHOTOGRAPHER_ID,
    email: "drfilms@weddingcinema.com",
    passwordHash: process.env.PHOTOGRAPHER_PASSWORD ? crypto.createHash("sha256").update(process.env.PHOTOGRAPHER_PASSWORD).digest("hex") : "",
    name: process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
    phone: "+91 98765 43210",
    studioName: process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
    tagline: "Fine Art Wedding Cinema & Photography",
    logoUrlLight: "",
    logoUrlDark: "",
    website: "https://drfilms.com",
    socialLinks: {
      instagram: "drfilms_weddings",
      facebook: "drfilms",
      whatsapp: "+91 98765 43210",
    },
    role: "owner",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(PHOTOGRAPHERS_FILE, JSON.stringify([defaultPhotographer], null, 2), "utf-8");
}

// Ensure default subscription exists (PRO Studio tier)
if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
  const defaultSub: Subscription = {
    id: "sub-default-pro",
    photographerId: DEFAULT_PHOTOGRAPHER_ID,
    plan: "PRO",
    status: "ACTIVE",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([defaultSub], null, 2), "utf-8");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return uuidv4();
}

export function generateAccessCode(): string {
  const bytes = crypto.randomBytes(6);
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Remove confusing 0, O, 1, I
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars[bytes[i % bytes.length] % chars.length];
  }
  return token;
}

export function hashPassword(plain: string): string {
  if (!plain) return "";
  return crypto.createHash("sha256").update(plain).digest("hex");
}

export function verifyPassword(plain: string, hashed?: string): boolean {
  if (!hashed) return true;
  if (!plain) return false;
  return hashPassword(plain) === hashed;
}

export async function hashUserPassword(plain: string): Promise<string> {
  if (!plain) return "";
  return await bcrypt.hash(plain, 10);
}

export async function verifyUserPassword(plain: string, hashed?: string): Promise<boolean> {
  if (!hashed || !plain) return false;
  if (hashed.startsWith("$2a$") || hashed.startsWith("$2b$") || hashed.startsWith("$2y$")) {
    return await bcrypt.compare(plain, hashed);
  }
  // Fallback for SHA-256 legacy hashes during account migration
  const sha = crypto.createHash("sha256").update(plain).digest("hex");
  return sha === hashed;
}

export function parseFolderUrl(url: string): string | null {
  return extractGoogleDriveFolderId(url);
}

// ── Deduplication Helper ──────────────────────────────────────────────────

export function deduplicateMediaList<T extends { id: string; driveFileId?: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.driveFileId || item.id;
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key)!;
      map.set(key, { ...existing, ...item });
    }
  }
  return Array.from(map.values());
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export function readProjects(): WeddingProject[] {
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, "utf-8");
    const list = JSON.parse(raw) as any[];
    let migrationNeeded = false;

    const projects = list.map((p) => {
      const photographerId = p.photographerId || DEFAULT_PHOTOGRAPHER_ID;
      if (!p.photographerId) {
        migrationNeeded = true;
      }
      const status: ProjectStatus = p.status || (p.isActive ? "published" : "draft");
      const theme: GalleryTheme = p.theme || "cinematic";
      const template: GalleryTemplate = p.template || p.settings?.template || "classic";
      const settings: GallerySettings = {
        isPasswordProtected: p.settings?.isPasswordProtected || false,
        password: p.settings?.password || "",
        allowDownloads: p.settings?.allowDownloads ?? false,
        allowPhotoDownload: p.settings?.allowPhotoDownload ?? p.settings?.allowDownloads ?? true,
        allowVideoDownload: p.settings?.allowVideoDownload ?? p.settings?.allowDownloads ?? false,
        allowFullscreen: p.settings?.allowFullscreen ?? true,
        showBranding: p.settings?.showBranding ?? true,
        whiteLabelEnabled: p.settings?.whiteLabelEnabled ?? true,
        template,
        heroStyle: p.settings?.heroStyle || "large",
        gridStyle: p.settings?.gridStyle || "masonry",
        fontFamily: p.settings?.fontFamily || "serif-elegant",
        primaryAccent: p.settings?.primaryAccent || p.branding?.accentColor || "#D4AF37",
        secondaryAccent: p.settings?.secondaryAccent || "#E5C158",
        textColor: p.settings?.textColor || "#F8FAFC",
        backgroundColor: p.settings?.backgroundColor || "#0B0C10",
        selectionConfig: p.settings?.selectionConfig
          ? {
              enabled: !!p.settings.selectionConfig.enabled,
              limit: typeof p.settings.selectionConfig.limit === "number" ? p.settings.selectionConfig.limit : 20,
              title: p.settings.selectionConfig.title || "Wedding Album Selection",
              instructions: p.settings.selectionConfig.instructions || "Please select your favorite photos for your custom wedding album.",
              status: p.settings.selectionConfig.status || "OPEN",
              submittedAt: p.settings.selectionConfig.submittedAt,
              submittedCount: p.settings.selectionConfig.submittedCount,
              submittedBy: p.settings.selectionConfig.submittedBy,
            }
          : undefined,
      };
      const branding: PhotographerBranding = {
        businessName: p.branding?.businessName || p.photographerName || "DR Films Wedding Cinema",
        studioName: p.branding?.studioName || p.branding?.businessName || p.photographerName || "DR Films Wedding Cinema",
        tagline: p.branding?.tagline || "Fine Art Wedding Cinema & Photography",
        subtitle: p.branding?.subtitle || "Wedding Cinema & Photography",
        weddingLocation: p.branding?.weddingLocation || "",
        logoUrl: p.branding?.logoUrl || "",
        logoUrlLight: p.branding?.logoUrlLight || p.branding?.logoUrl || "",
        logoUrlDark: p.branding?.logoUrlDark || "",
        backgroundStyle: p.branding?.backgroundStyle || "cinematic-dark",
        website: p.branding?.website || "",
        instagram: p.branding?.instagram || "",
        facebook: p.branding?.facebook || "",
        phone: p.branding?.phone || "",
        whatsapp: p.branding?.whatsapp || "",
        email: p.branding?.email || "",
        footerText: p.branding?.footerText || "Crafted with love for your lifelong memories.",
        accentColor: p.branding?.accentColor || settings.primaryAccent || "#D4AF37",
        useStudioDefaults: p.branding?.useStudioDefaults ?? false,
      };
      const analytics: ProjectAnalytics = {
        views: p.analytics?.views || 0,
        plays: p.analytics?.plays || 0,
        completions: p.analytics?.completions || 0,
        favorites: p.analytics?.favorites || 0,
        videoStats: p.analytics?.videoStats || {},
      };
      const events: DriveEventCategory[] = p.events || [];
      const rawVideoFiles: DriveVideoFile[] = (p.videoFiles || []).map((v: any) => ({
        ...v,
        type: "VIDEO" as const,
        thumbnailUrl: v.thumbnailUrl || v.thumbnailLink,
      }));
      const rawPhotoFiles: DriveMediaFile[] = (p.photoFiles || []).map((photo: any) => ({
        ...photo,
        type: "PHOTO" as const,
        thumbnailUrl: photo.thumbnailUrl || photo.thumbnailLink,
      }));
      const videoFiles = deduplicateMediaList(rawVideoFiles);
      const photoFiles = deduplicateMediaList(rawPhotoFiles);
      const mediaFiles = deduplicateMediaList([
        ...videoFiles,
        ...photoFiles,
        ...(p.mediaFiles || []).map((m: any) => ({
          ...m,
          thumbnailUrl: m.thumbnailUrl || m.thumbnailLink,
        })),
      ]);

      return {
        ...p,
        photographerId,
        status,
        theme,
        expiresAt: p.expiresAt || undefined,
        deletedAt: p.deletedAt || undefined,
        deletedBy: p.deletedBy || undefined,
        archivedAt: p.archivedAt || undefined,
        publishedAt: p.publishedAt || undefined,
        isActive: !p.deletedAt && status === "published" && !isProjectExpired(p),
        welcomeMessage: p.welcomeMessage || "Our beautiful beginning",
        settings,
        branding,
        analytics,
        events,
        videoFiles,
        photoFiles,
        mediaFiles,
      } as WeddingProject;
    });

    if (migrationNeeded) {
      try {
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
      } catch {}
    }

    return projects;
  } catch {
    return [];
  }
}

export function writeProjects(projects: WeddingProject[]): void {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

export function getProjectsByPhotographer(photographerId: string): WeddingProject[] {
  return readProjects().filter((p) => (p.photographerId || DEFAULT_PHOTOGRAPHER_ID) === photographerId);
}

export function getProjectForPhotographer(projectId: string, photographerId: string): WeddingProject | null {
  const project = getProjectById(projectId);
  if (!project) return null;
  if ((project.photographerId || DEFAULT_PHOTOGRAPHER_ID) !== photographerId) return null;
  return project;
}

export function getProjectById(id: string): WeddingProject | null {
  return readProjects().find((p) => p.id === id) ?? null;
}

export function getProjectByAccessCode(code: string): WeddingProject | null {
  return readProjects().find((p) => p.accessCode.toUpperCase() === code.toUpperCase()) ?? null;
}

export function getVideoRecord(videoIdOrDriveFileId: string): { video: DriveVideoFile; project: WeddingProject } | null {
  const projects = readProjects();
  for (const project of projects) {
    const list = project.videoFiles || (project.mediaFiles?.filter((m) => m.type === "VIDEO") as DriveVideoFile[]) || [];
    const video = list.find(
      (v) => v.id === videoIdOrDriveFileId || v.driveFileId === videoIdOrDriveFileId
    );
    if (video) {
      return { video, project };
    }
  }
  return null;
}

export function getMediaRecord(mediaIdOrDriveFileId: string): { media: DriveMediaFile; project: WeddingProject } | null {
  const projects = readProjects();
  for (const project of projects) {
    const allMedia = (project.mediaFiles && project.mediaFiles.length > 0)
      ? project.mediaFiles
      : [
          ...(project.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
          ...(project.photoFiles || []),
        ];
    const media = allMedia.find(
      (m) => m.id === mediaIdOrDriveFileId || m.driveFileId === mediaIdOrDriveFileId
    );
    if (media) {
      return { media, project };
    }
  }
  return null;
}

export function toggleMediaFeatured(projectId: string, mediaId: string): DriveMediaFile | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const allMedia = project.mediaFiles ? [...project.mediaFiles] : [
    ...(project.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
    ...(project.photoFiles || []),
  ];

  const targetIdx = allMedia.findIndex((m) => m.id === mediaId || m.driveFileId === mediaId);
  if (targetIdx === -1) return null;

  const currentFeatured = !!allMedia[targetIdx].isFeatured;
  allMedia[targetIdx] = {
    ...allMedia[targetIdx],
    isFeatured: !currentFeatured,
  };

  const updatedVideos = allMedia.filter((m) => m.type === "VIDEO") as DriveVideoFile[];
  const updatedPhotos = allMedia.filter((m) => m.type === "PHOTO");

  updateProject(projectId, {
    mediaFiles: allMedia,
    videoFiles: updatedVideos,
    photoFiles: updatedPhotos,
  });

  return allMedia[targetIdx];
}

export function createProject(
  data: Partial<WeddingProject> & {
    coupleName: string;
    weddingDate: string;
    driveFolderUrl: string;
    driveFolderId: string;
  }
): WeddingProject {
  const projects = readProjects();
  const now = new Date().toISOString();
  const studio = readStudioSettings();

  const status: ProjectStatus = data.status || "published";
  const theme: GalleryTheme = data.theme || studio.defaultTheme || "luxury";
  const template: GalleryTemplate = data.template || data.settings?.template || studio.defaultTemplate || "classic";

  const settings: GallerySettings = {
    isPasswordProtected: data.settings?.isPasswordProtected || false,
    password: data.settings?.password ? hashPassword(data.settings.password) : "",
    allowDownloads: data.settings?.allowDownloads ?? false,
    allowPhotoDownload: data.settings?.allowPhotoDownload ?? data.settings?.allowDownloads ?? true,
    allowVideoDownload: data.settings?.allowVideoDownload ?? data.settings?.allowDownloads ?? false,
    allowFullscreen: data.settings?.allowFullscreen ?? true,
    showBranding: data.settings?.showBranding ?? true,
    whiteLabelEnabled: data.settings?.whiteLabelEnabled ?? studio.whiteLabelEnabled ?? true,
    template,
    heroStyle: data.settings?.heroStyle || "large",
    gridStyle: data.settings?.gridStyle || "masonry",
    fontFamily: data.settings?.fontFamily || "serif-elegant",
    primaryAccent: data.settings?.primaryAccent || studio.defaultAccentColor || "#D4AF37",
    secondaryAccent: data.settings?.secondaryAccent || "#E5C158",
    selectionConfig: data.settings?.selectionConfig,
  };

  const branding: PhotographerBranding = {
    businessName: data.branding?.businessName || studio.studioName || data.photographerName || "DR Films Wedding Cinema",
    studioName: data.branding?.studioName || data.branding?.businessName || studio.studioName || "DR Films Wedding Cinema",
    tagline: data.branding?.tagline || studio.tagline || "Fine Art Wedding Cinema & Photography",
    subtitle: data.branding?.subtitle || studio.tagline || "Wedding Cinema & Photography",
    weddingLocation: data.branding?.weddingLocation || "",
    logoUrl: data.branding?.logoUrl || studio.logoUrlLight || "",
    logoUrlLight: data.branding?.logoUrlLight || studio.logoUrlLight || "",
    logoUrlDark: data.branding?.logoUrlDark || studio.logoUrlDark || "",
    backgroundStyle: data.branding?.backgroundStyle || "cinematic-dark",
    website: data.branding?.website || studio.website || "",
    instagram: data.branding?.instagram || studio.instagram || "",
    facebook: data.branding?.facebook || studio.facebook || "",
    phone: data.branding?.phone || studio.phone || "",
    whatsapp: data.branding?.whatsapp || studio.phone || "",
    email: data.branding?.email || studio.email || "",
    footerText: data.branding?.footerText || studio.footerText || "Crafted with love for your lifelong memories.",
    accentColor: data.branding?.accentColor || studio.defaultAccentColor || "#D4AF37",
    useStudioDefaults: data.branding?.useStudioDefaults ?? false,
  };

  const analytics: ProjectAnalytics = {
    views: 0,
    plays: 0,
    completions: 0,
    favorites: 0,
    videoStats: {},
  };

  const project: WeddingProject = {
    id: generateId(),
    photographerId: data.photographerId || DEFAULT_PHOTOGRAPHER_ID,
    accessCode: generateAccessCode(),
    coupleName: data.coupleName,
    weddingDate: data.weddingDate,
    packageType: data.packageType || "Full Wedding Cinema",
    welcomeMessage: data.welcomeMessage || "Our beautiful beginning",
    coverImage: data.coverImage || "",
    notes: data.notes || "",
    photographerName: branding.businessName,
    driveFolderId: data.driveFolderId,
    driveFolderUrl: data.driveFolderUrl,
    status,
    theme,
    template,
    expiresAt: data.expiresAt || undefined,
    isActive: status === "published",
    settings,
    branding,
    analytics,
    videoFiles: data.videoFiles || [],
    photoFiles: data.photoFiles || [],
    mediaFiles: data.mediaFiles || [
      ...(data.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
      ...(data.photoFiles || []),
    ],
    events: data.events || [],
    clientName: data.clientName || "",
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone || "",
    clientWhatsapp: data.clientWhatsapp || "",
    lastScanned: now,
    lastSyncStatus: "✓ Synced",
    createdAt: now,
    updatedAt: now,
  };

  projects.push(project);
  writeProjects(projects);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<WeddingProject>
): WeddingProject | null {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const current = projects[idx];

  // Handle password update hashing
  let settings = current.settings;
  if (patch.settings) {
    let password = current.settings.password;
    if (patch.settings.password && patch.settings.password !== current.settings.password) {
      password = hashPassword(patch.settings.password);
    } else if (patch.settings.password === "") {
      password = "";
    }
    settings = {
      ...current.settings,
      ...patch.settings,
      password,
    };
  }

  const status = patch.status || current.status;
  const isActive = status === "published";
  const theme = patch.theme || current.theme || "cinematic";

  const updated: WeddingProject = {
    ...current,
    ...patch,
    status,
    theme,
    isActive,
    settings,
    branding: {
      ...current.branding,
      ...(patch.branding || {}),
    },
    analytics: {
      ...current.analytics,
      ...(patch.analytics || {}),
    },
    videoFiles: patch.videoFiles !== undefined ? patch.videoFiles : current.videoFiles,
    photoFiles: patch.photoFiles !== undefined ? patch.photoFiles : current.photoFiles,
    mediaFiles: patch.mediaFiles !== undefined ? patch.mediaFiles : current.mediaFiles,
    updatedAt: new Date().toISOString(),
  };

  projects[idx] = updated;
  writeProjects(projects);
  return updated;
}

export function deleteProject(id: string, soft: boolean = true, deletedBy?: string): boolean {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;

  if (soft) {
    projects[idx] = {
      ...projects[idx],
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy || "owner",
      isActive: false,
      updatedAt: new Date().toISOString(),
    };
    writeProjects(projects);
    return true;
  }

  const filtered = projects.filter((p) => p.id !== id);
  writeProjects(filtered);
  return true;
}

export function restoreDeletedProject(id: string): WeddingProject | null {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const current = projects[idx];
  const updated: WeddingProject = {
    ...current,
    deletedAt: undefined,
    deletedBy: undefined,
    isActive: current.status === "published",
    updatedAt: new Date().toISOString(),
  };

  projects[idx] = updated;
  writeProjects(projects);
  return updated;
}

export function syncProjectVideos(
  projectId: string,
  scannedVideos: DriveVideoFile[],
  detectedEvents: DriveEventCategory[]
): WeddingProject | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  // Deduplicate videos by driveFileId
  const existingMap = new Map<string, DriveVideoFile>();
  for (const v of project.videoFiles || []) {
    existingMap.set(v.driveFileId || v.id, v);
  }

  for (const v of scannedVideos) {
    const fileKey = v.driveFileId || v.id;
    existingMap.set(fileKey, {
      ...v,
      weddingId: projectId,
    });
  }

  const mergedVideos = Array.from(existingMap.values());
  const now = new Date().toISOString();

  return updateProject(projectId, {
    videoFiles: mergedVideos,
    events: detectedEvents,
    lastScanned: now,
    lastSyncStatus: `✓ Sync Complete (${mergedVideos.length} videos)`,
  });
}

export function syncProjectMedia(
  projectId: string,
  scannedMedia: DriveMediaFile[],
  detectedEvents: DriveEventCategory[]
): WeddingProject | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  // Track existing media in a map keyed by canonical driveFileId || id
  const existingMap = new Map<string, DriveMediaFile>();
  const currentMedia = deduplicateMediaList([
    ...(project.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
    ...(project.photoFiles || []),
    ...(project.mediaFiles || []),
  ]);

  for (const m of currentMedia) {
    const key = m.driveFileId || m.id;
    if (key) existingMap.set(key, m);
  }

  // Set of freshly scanned Google Drive file IDs
  const scannedKeys = new Set<string>();

  for (const m of scannedMedia) {
    const key = m.driveFileId || m.id;
    if (!key) continue;
    scannedKeys.add(key);

    const existing = existingMap.get(key);
    existingMap.set(key, {
      ...existing,
      ...m,
      id: existing?.id || m.id || generateId(),
      driveFileId: m.driveFileId || key,
      weddingId: projectId,
      isFeatured: existing?.isFeatured ?? m.isFeatured ?? false,
      isUnavailable: false,
    });
  }

  // Files previously in database but absent from the latest Drive scan
  for (const [key, existing] of existingMap.entries()) {
    if (!scannedKeys.has(key)) {
      existingMap.set(key, {
        ...existing,
        isUnavailable: true,
      });
    }
  }

  // Active (available) media for the project
  const allMedia = deduplicateMediaList(Array.from(existingMap.values()));
  const activeMedia = allMedia.filter((m) => !m.isUnavailable);
  const activeVideos = activeMedia.filter((m) => m.type === "VIDEO") as DriveVideoFile[];
  const activePhotos = activeMedia.filter((m) => m.type === "PHOTO");
  const now = new Date().toISOString();

  return updateProject(projectId, {
    mediaFiles: activeMedia,
    videoFiles: activeVideos,
    photoFiles: activePhotos,
    events: detectedEvents,
    lastScanned: now,
    lastSyncStatus: `✓ Sync Complete (${activePhotos.length} photos, ${activeVideos.length} films)`,
  });
}

// ── Analytics Event Logger ───────────────────────────────────────────────────

export function recordAnalyticsEvent(
  accessCode: string,
  eventType: "view" | "play" | "completion" | "favorite" | "unfavorite" | "share_clicked" | "whatsapp_clicked" | "qr_generated" | "photo_viewed" | "video_viewed",
  videoId?: string
): ProjectAnalytics | null {
  const project = getProjectByAccessCode(accessCode);
  if (!project) return null;

  const currentAnalytics: ProjectAnalytics = project.analytics || {
    views: 0,
    plays: 0,
    completions: 0,
    favorites: 0,
    shares: 0,
    whatsappShares: 0,
    qrGenerated: 0,
    photoViews: 0,
    videoStats: {},
  };

  const videoStats = { ...(currentAnalytics.videoStats || {}) };

  if (videoId) {
    if (!videoStats[videoId]) {
      videoStats[videoId] = { plays: 0, completions: 0, favorites: 0 };
    }
  }

  if (eventType === "view") {
    currentAnalytics.views = (currentAnalytics.views || 0) + 1;
  } else if (eventType === "play" || eventType === "video_viewed") {
    currentAnalytics.plays = (currentAnalytics.plays || 0) + 1;
    if (videoId && videoStats[videoId]) {
      videoStats[videoId].plays = (videoStats[videoId].plays || 0) + 1;
    }
  } else if (eventType === "completion") {
    currentAnalytics.completions = (currentAnalytics.completions || 0) + 1;
    if (videoId && videoStats[videoId]) {
      videoStats[videoId].completions = (videoStats[videoId].completions || 0) + 1;
    }
  } else if (eventType === "favorite") {
    currentAnalytics.favorites = (currentAnalytics.favorites || 0) + 1;
    if (videoId && videoStats[videoId]) {
      videoStats[videoId].favorites = (videoStats[videoId].favorites || 0) + 1;
    }
  } else if (eventType === "unfavorite") {
    currentAnalytics.favorites = Math.max(0, (currentAnalytics.favorites || 0) - 1);
    if (videoId && videoStats[videoId]) {
      videoStats[videoId].favorites = Math.max(0, (videoStats[videoId].favorites || 0) - 1);
    }
  } else if (eventType === "share_clicked") {
    currentAnalytics.shares = (currentAnalytics.shares || 0) + 1;
  } else if (eventType === "whatsapp_clicked") {
    currentAnalytics.whatsappShares = (currentAnalytics.whatsappShares || 0) + 1;
    currentAnalytics.shares = (currentAnalytics.shares || 0) + 1;
  } else if (eventType === "qr_generated") {
    currentAnalytics.qrGenerated = (currentAnalytics.qrGenerated || 0) + 1;
  } else if (eventType === "photo_viewed") {
    currentAnalytics.photoViews = (currentAnalytics.photoViews || 0) + 1;
  }

  updateProject(project.id, {
    analytics: {
      ...currentAnalytics,
      videoStats,
    },
  });

  return currentAnalytics;
}

export function isProjectExpired(project: WeddingProject): boolean {
  if (project.deletedAt) return true;
  if (project.status === "expired") return true;
  if (project.expiresAt) {
    const exp = new Date(project.expiresAt);
    if (!isNaN(exp.getTime()) && Date.now() > exp.getTime()) {
      return true;
    }
  }
  return false;
}

export function isExpiringSoon(
  project: { status?: string; expiresAt?: string; deletedAt?: string },
  thresholdDays: number = 7
): boolean {
  if (project.deletedAt) return false;
  if (project.status !== "published") return false;
  if (!project.expiresAt) return false;

  const exp = new Date(project.expiresAt);
  if (isNaN(exp.getTime())) return false;

  const now = Date.now();
  const diffMs = exp.getTime() - now;
  if (diffMs <= 0) return false;

  const daysRemaining = diffMs / (1000 * 60 * 60 * 24);
  return daysRemaining <= thresholdDays;
}

export function regenerateProjectAccessCode(projectId: string): {
  success: boolean;
  newAccessCode?: string;
  error?: string;
} {
  const project = getProjectById(projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  let newCode = generateAccessCode();
  let attempts = 0;
  while (getProjectByAccessCode(newCode) && attempts < 10) {
    newCode = generateAccessCode();
    attempts++;
  }

  const updated = updateProject(projectId, {
    accessCode: newCode,
    updatedAt: new Date().toISOString(),
  });

  if (!updated) {
    return { success: false, error: "Failed to update project access code" };
  }

  return { success: true, newAccessCode: newCode };
}

export function duplicateProject(projectId: string): WeddingProject | null {
  const source = getProjectById(projectId);
  if (!source) return null;

  // Generate unique access code
  let newCode = generateAccessCode();
  let attempts = 0;
  while (getProjectByAccessCode(newCode) && attempts < 10) {
    newCode = generateAccessCode();
    attempts++;
  }

  // Create isolated duplicate
  const cloned = createProject({
    coupleName: `${source.coupleName} (Copy)`,
    weddingDate: source.weddingDate,
    packageType: source.packageType,
    welcomeMessage: source.welcomeMessage,
    driveFolderId: source.driveFolderId,
    driveFolderUrl: source.driveFolderUrl,
    notes: source.notes ? `Cloned from ${source.coupleName}. ${source.notes}` : `Cloned from ${source.coupleName}.`,
    coverImage: source.coverImage || "",
    status: "draft",
    theme: source.theme || "cinematic",
    expiresAt: source.expiresAt,
    settings: {
      ...source.settings,
      selectionConfig: source.settings?.selectionConfig
        ? {
            ...source.settings.selectionConfig,
            status: "OPEN",
            submittedAt: undefined,
            submittedCount: undefined,
            submittedBy: undefined,
          }
        : undefined,
    },
    branding: { ...source.branding },
    videoFiles: [], // Fresh sync
    photoFiles: [],
    mediaFiles: [],
    events: source.events?.map(e => ({ ...e, count: 0, photoCount: 0, videoCount: 0 })) || [],
  });

  return cloned;
}

// ── Client Favorites Storage & Operations ───────────────────────────────────

export function readFavorites(): ClientFavorite[] {
  try {
    const raw = fs.readFileSync(FAVORITES_FILE, "utf-8");
    return JSON.parse(raw) as ClientFavorite[];
  } catch {
    return [];
  }
}

export function writeFavorites(favorites: ClientFavorite[]): void {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites, null, 2), "utf-8");
}

export function getFavorites(projectId: string, sessionId?: string): ClientFavorite[] {
  const all = readFavorites();
  const filtered = all.filter((f) => {
    if (f.projectId !== projectId) return false;
    if (sessionId && f.sessionId !== sessionId) return false;
    return true;
  });

  // Strict deduplication by mediaId to guarantee uniqueness
  const uniqueMap = new Map<string, ClientFavorite>();
  for (const item of filtered) {
    if (!uniqueMap.has(item.mediaId)) {
      uniqueMap.set(item.mediaId, item);
    }
  }
  return Array.from(uniqueMap.values());
}

export function addFavorite(data: {
  projectId: string;
  accessCode: string;
  mediaId: string;
  mediaType: MediaType;
  sessionId: string;
}): ClientFavorite {
  const all = readFavorites();
  const existing = all.find(
    (f) =>
      f.projectId === data.projectId &&
      f.mediaId === data.mediaId &&
      (!data.sessionId || f.sessionId === data.sessionId)
  );

  if (existing) {
    return existing;
  }

  const newFav: ClientFavorite = {
    id: generateId(),
    projectId: data.projectId,
    accessCode: data.accessCode,
    mediaId: data.mediaId,
    mediaType: data.mediaType,
    sessionId: data.sessionId,
    createdAt: new Date().toISOString(),
  };

  all.push(newFav);
  writeFavorites(all);

  // Update project analytics count
  try {
    recordAnalyticsEvent(data.accessCode, "favorite", data.mediaId);
  } catch {
    // Ignore analytics background failure
  }

  return newFav;
}

export function removeFavorite(
  projectId: string,
  mediaId: string,
  sessionId: string
): boolean {
  const all = readFavorites();
  const filtered = all.filter(
    (f) =>
      !(
        f.projectId === projectId &&
        (f.mediaId === mediaId || f.id === mediaId) &&
        (!sessionId || f.sessionId === sessionId)
      )
  );

  if (filtered.length === all.length) {
    const fallbackFiltered = all.filter(
      (f) => !(f.projectId === projectId && (f.mediaId === mediaId || f.id === mediaId))
    );
    writeFavorites(fallbackFiltered);
    return true;
  }

  writeFavorites(filtered);

  // Decrement analytics
  const project = getProjectById(projectId);
  if (project?.accessCode) {
    try {
      recordAnalyticsEvent(project.accessCode, "unfavorite", mediaId);
    } catch {
      // Ignore
    }
  }

  return true;
}

export function hydrateMediaForFavorites(
  favorites: ClientFavorite[],
  project: WeddingProject
): Array<ClientFavorite & { media?: DriveMediaFile; isAvailable: boolean }> {
  const allMedia = deduplicateMediaList(
    project.mediaFiles || [
      ...(project.videoFiles || []).map((v) => ({ ...v, type: "VIDEO" as const })),
      ...(project.photoFiles || []),
    ]
  );

  return favorites.map((fav) => {
    const media = allMedia.find(
      (m) => m.id === fav.mediaId || m.driveFileId === fav.mediaId
    );
    return {
      ...fav,
      media,
      isAvailable: !!media,
    };
  });
}

// ── Client Album Selection Storage & Operations ─────────────────────────────

export function readSelections(): SelectionItem[] {
  try {
    const raw = fs.readFileSync(SELECTIONS_FILE, "utf-8");
    return JSON.parse(raw) as SelectionItem[];
  } catch {
    return [];
  }
}

export function writeSelections(selections: SelectionItem[]): void {
  fs.writeFileSync(SELECTIONS_FILE, JSON.stringify(selections, null, 2), "utf-8");
}

export function getSelections(projectId: string, _sessionId?: string): SelectionItem[] {
  const all = readSelections();
  // Filter by project. Album selection is unified at project level for the wedding couple.
  const filtered = all.filter((s) => s.projectId === projectId);

  // Strict deduplication by mediaId
  const uniqueMap = new Map<string, SelectionItem>();
  for (const item of filtered) {
    if (!uniqueMap.has(item.mediaId)) {
      uniqueMap.set(item.mediaId, item);
    }
  }
  return Array.from(uniqueMap.values());
}

export function addSelection(data: {
  projectId: string;
  accessCode: string;
  mediaId: string;
  mediaType: MediaType;
  sessionId: string;
  category?: "album" | "selection" | "highlight";
}): { success: boolean; error?: string; item?: SelectionItem } {
  const project = getProjectById(data.projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const config = project.settings?.selectionConfig;
  if (!config || !config.enabled) {
    return { success: false, error: "Selection mode is not enabled for this wedding." };
  }

  if (config.status === "LOCKED") {
    return {
      success: false,
      error: "Selection has been locked by your photographer.",
    };
  }

  const all = readSelections();
  // Check project-wide active selections
  const currentSelections = getSelections(data.projectId);

  const existing = currentSelections.find((s) => s.mediaId === data.mediaId || s.id === data.mediaId);
  if (existing) {
    return { success: true, item: existing };
  }

  const limit = config.limit || 20;
  if (currentSelections.length >= limit) {
    return {
      success: false,
      error: `You have reached the selection limit of ${limit} items. Please remove an item first.`,
    };
  }

  const newItem: SelectionItem = {
    id: generateId(),
    projectId: data.projectId,
    accessCode: data.accessCode,
    mediaId: data.mediaId,
    mediaType: data.mediaType,
    sessionId: data.sessionId,
    category: data.category || "album",
    createdAt: new Date().toISOString(),
  };

  all.push(newItem);
  writeSelections(all);

  return { success: true, item: newItem };
}

export function removeSelection(
  projectId: string,
  mediaId: string,
  _sessionId?: string
): { success: boolean; error?: string } {
  const project = getProjectById(projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const config = project.settings?.selectionConfig;
  if (!config || !config.enabled) {
    return { success: false, error: "Selection mode is not enabled for this wedding." };
  }

  if (config.status === "LOCKED") {
    return {
      success: false,
      error: "Selection is locked by your photographer.",
    };
  }

  const all = readSelections();
  // Completely remove any record matching this mediaId (or id) for this project
  const filtered = all.filter(
    (s) =>
      !(
        s.projectId === projectId &&
        (s.mediaId === mediaId || s.id === mediaId)
      )
  );

  writeSelections(filtered);
  return { success: true };
}

export function submitSelection(
  projectId: string,
  sessionId: string,
  submittedBy?: string
): { success: boolean; error?: string; count?: number; submittedAt?: string } {
  const project = getProjectById(projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const config = project.settings?.selectionConfig;
  if (!config || !config.enabled) {
    return { success: false, error: "Selection mode is not enabled." };
  }

  if (config.status === "LOCKED") {
    return { success: false, error: "Selection is locked by your photographer." };
  }

  let selections = getSelections(projectId, sessionId);
  if (selections.length === 0) {
    selections = getSelections(projectId);
  }
  if (selections.length === 0) {
    return { success: false, error: "Please select at least one item before submitting." };
  }

  const now = new Date().toISOString();
  const updatedConfig: ClientSelectionConfig = {
    ...config,
    status: "SUBMITTED",
    submittedAt: now,
    submittedCount: selections.length,
    submittedBy: submittedBy || "Client",
  };

  updateProject(projectId, {
    settings: {
      ...project.settings,
      selectionConfig: updatedConfig,
    },
  });

  return {
    success: true,
    count: selections.length,
    submittedAt: now,
  };
}

export function reopenSelection(projectId: string): boolean {
  const project = getProjectById(projectId);
  if (!project) return false;

  const config = project.settings?.selectionConfig;
  if (!config) return false;

  const updatedConfig: ClientSelectionConfig = {
    ...config,
    status: "REOPENED",
  };

  updateProject(projectId, {
    settings: {
      ...project.settings,
      selectionConfig: updatedConfig,
    },
  });

  return true;
}

export function updateSelectionConfig(
  projectId: string,
  patch: Partial<ClientSelectionConfig>
): ClientSelectionConfig | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const currentConfig: ClientSelectionConfig = project.settings?.selectionConfig || {
    enabled: false,
    limit: 20,
    title: "Wedding Album Selection",
    instructions: "Please select your favorite photos for your custom wedding album.",
    status: "OPEN",
  };

  const updatedConfig: ClientSelectionConfig = {
    ...currentConfig,
    ...patch,
  };

  updateProject(projectId, {
    settings: {
      ...project.settings,
      selectionConfig: updatedConfig,
    },
  });

  return updatedConfig;
}

// ── Client Activity Logging ──────────────────────────────────────────────────

export function readActivities(): ClientActivityEvent[] {
  try {
    const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
    return JSON.parse(raw) as ClientActivityEvent[];
  } catch {
    return [];
  }
}

export function writeActivities(activities: ClientActivityEvent[]): void {
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2), "utf-8");
}

export function recordClientActivity(
  projectId: string,
  eventType: ClientActivityEvent["eventType"],
  description: string,
  metadata?: Record<string, any>
): ClientActivityEvent {
  const activities = readActivities();
  const newActivity: ClientActivityEvent = {
    id: generateId(),
    projectId,
    eventType,
    description,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Keep most recent 500 events across system
  activities.unshift(newActivity);
  if (activities.length > 500) {
    activities.length = 500;
  }
  writeActivities(activities);
  return newActivity;
}

export function getProjectActivity(projectId: string, limit = 50): ClientActivityEvent[] {
  return readActivities()
    .filter((a) => a.projectId === projectId)
    .slice(0, limit);
}

// ── Event Management ─────────────────────────────────────────────────────────

export function updateProjectEvents(
  projectId: string,
  events: DriveEventCategory[]
): DriveEventCategory[] | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  updateProject(projectId, {
    events,
  });

  return events;
}

// ── Studio Settings & Branding Inheritance ──────────────────────────────────

export function readStudioSettings(): StudioSettings {
  try {
    if (!fs.existsSync(STUDIO_SETTINGS_FILE)) {
      const initial: StudioSettings = {
        studioName: process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
        tagline: "Fine Art Wedding Cinema & Photography",
        logoUrlLight: "",
        logoUrlDark: "",
        website: "",
        email: "",
        phone: "",
        instagram: "",
        facebook: "",
        footerText: "Crafted with love for your lifelong memories.",
        defaultTemplate: "classic",
        defaultTheme: "luxury",
        defaultAccentColor: "#D4AF37",
        whiteLabelEnabled: true,
        cnameTarget: "cname.drfilms.com",
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STUDIO_SETTINGS_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(STUDIO_SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as StudioSettings;
  } catch {
    return {
      studioName: process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
      tagline: "Fine Art Wedding Cinema & Photography",
      footerText: "Crafted with love for your lifelong memories.",
      defaultTemplate: "classic",
      defaultTheme: "luxury",
      defaultAccentColor: "#D4AF37",
      whiteLabelEnabled: true,
      cnameTarget: "cname.drfilms.com",
      updatedAt: new Date().toISOString(),
    };
  }
}

export function writeStudioSettings(settings: Partial<StudioSettings>): StudioSettings {
  const current = readStudioSettings();
  const updated: StudioSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STUDIO_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

/**
 * Normalizes a raw website string into safe href and clean display format.
 * Examples:
 *   "drfilms.com" -> { href: "https://drfilms.com", display: "drfilms.com" }
 *   "https://www.drfilms.com/" -> { href: "https://www.drfilms.com", display: "www.drfilms.com" }
 */
export function normalizeWebsiteUrl(rawUrl?: string | null): { href: string; display: string } | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Prevent javascript: or data: URIs
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;

  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    href = `https://${href}`;
  }

  // Remove trailing slashes
  href = href.replace(/\/+$/, "");

  // Generate clean display version
  let display = trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!display) return null;

  return { href, display };
}

/**
 * Resolves gallery layout, theme, and styling by applying priority:
 * PROJECT SETTINGS -> STUDIO / PHOTOGRAPHER DEFAULTS -> SYSTEM DEFAULT
 */
export function resolveGalleryAppearance(
  project: WeddingProject,
  studioDefaults?: StudioSettings
): {
  template: string;
  theme: string;
  fontPreset: string;
  heroStyle: string;
  primaryAccent: string;
} {
  const studio = studioDefaults || readStudioSettings();

  const template =
    project.template?.trim() ||
    project.settings?.template?.trim() ||
    studio.defaultTemplate?.trim() ||
    "classic";

  const theme =
    project.theme?.trim() ||
    studio.defaultTheme?.trim() ||
    "cinematic";

  const fontPreset =
    project.settings?.fontPreset?.trim() ||
    project.settings?.fontFamily?.trim() ||
    "serif-elegant";

  const heroStyle =
    project.settings?.heroStyle?.trim() ||
    "large";

  const primaryAccent =
    project.settings?.primaryAccent?.trim() ||
    project.photographerBranding?.accentColor?.trim() ||
    project.branding?.accentColor?.trim() ||
    studio.defaultAccentColor?.trim() ||
    "#D4AF37";

  return {
    template,
    theme,
    fontPreset,
    heroStyle,
    primaryAccent,
  };
}

/**
 * Resolves effective branding by applying priority:
 * Project Branding > Studio Default Settings > System Default
 */
export function resolveBranding(
  projectBranding?: PhotographerBranding,
  studioDefaults?: StudioSettings
): PhotographerBranding {
  const studio = studioDefaults || readStudioSettings();
  const systemDefaultName = process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema";

  const useDefaults = projectBranding?.useStudioDefaults ?? false;

  const businessName = (!useDefaults && projectBranding?.businessName?.trim())
    ? projectBranding.businessName.trim()
    : (studio.studioName?.trim() || systemDefaultName);

  const studioName = (!useDefaults && (projectBranding?.studioName?.trim() || projectBranding?.businessName?.trim()))
    ? (projectBranding.studioName?.trim() || projectBranding.businessName?.trim()!)
    : (studio.studioName?.trim() || systemDefaultName);

  const tagline = (!useDefaults && projectBranding?.tagline?.trim())
    ? projectBranding.tagline.trim()
    : (studio.tagline?.trim() || "Fine Art Wedding Cinema & Photography");

  const subtitle = (!useDefaults && projectBranding?.subtitle?.trim())
    ? projectBranding.subtitle.trim()
    : (studio.tagline?.trim() || "Wedding Cinema & Photography");

  const logoUrlLight = (!useDefaults && (projectBranding?.logoUrlLight || projectBranding?.logoUrl))
    ? (projectBranding.logoUrlLight || projectBranding.logoUrl)
    : (studio.logoUrlLight || "");

  const logoUrlDark = (!useDefaults && projectBranding?.logoUrlDark)
    ? projectBranding.logoUrlDark
    : (studio.logoUrlDark || "");

  const website = (!useDefaults && projectBranding?.website?.trim())
    ? projectBranding.website.trim()
    : (studio.website?.trim() || "");

  const websiteUrl = normalizeWebsiteUrl(website);

  const instagram = (!useDefaults && projectBranding?.instagram?.trim())
    ? projectBranding.instagram.trim()
    : (studio.instagram?.trim() || "");

  const facebook = (!useDefaults && projectBranding?.facebook?.trim())
    ? projectBranding.facebook.trim()
    : (studio.facebook?.trim() || "");

  const phone = (!useDefaults && projectBranding?.phone?.trim())
    ? projectBranding.phone.trim()
    : (studio.phone?.trim() || "");

  const whatsapp = (!useDefaults && projectBranding?.whatsapp?.trim())
    ? projectBranding.whatsapp.trim()
    : (studio.whatsapp?.trim() || studio.phone?.trim() || "");

  const email = (!useDefaults && projectBranding?.email?.trim())
    ? projectBranding.email.trim()
    : (studio.email?.trim() || "");

  const footerText = (!useDefaults && projectBranding?.footerText?.trim())
    ? projectBranding.footerText.trim()
    : (studio.footerText?.trim() || `© ${new Date().getFullYear()} ${studioName}. All rights reserved.`);

  const accentColor = (!useDefaults && projectBranding?.accentColor)
    ? projectBranding.accentColor
    : (studio.defaultAccentColor || "#D4AF37");

  return {
    businessName,
    studioName,
    tagline,
    subtitle,
    weddingLocation: projectBranding?.weddingLocation || "",
    logoUrl: logoUrlLight,
    logoUrlLight,
    logoUrlDark,
    backgroundStyle: projectBranding?.backgroundStyle || "cinematic-dark",
    website,
    websiteUrl,
    instagram,
    facebook,
    phone,
    whatsapp,
    email,
    footerText,
    accentColor,
    useStudioDefaults: useDefaults,
  };
}

// ── Custom Domain Mapping Architecture (Phase 14) ────────────────────────────

export function normalizeDomain(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let host = raw.trim().toLowerCase();

  // Reject dangerous injection protocols
  if (
    host.startsWith("javascript:") ||
    host.startsWith("data:") ||
    host.startsWith("vbscript:") ||
    host.startsWith("file:")
  ) {
    return "";
  }

  // Strip protocol
  host = host.replace(/^[a-zA-Z0-9+-.]+:\/\//, "");
  // Strip trailing slashes, paths, query parameters and fragments
  host = host.split("/")[0].split("?")[0].split("#")[0];
  // Strip port
  host = host.split(":")[0];
  // Strip trailing dot if present (standard DNS FQDN)
  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }

  // Strict domain character validation: alphanumeric, hyphens, and dots
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    return "";
  }

  return host;
}

export const normalizeHostname = normalizeDomain;

export function detectDomainType(domain: string): "SUBDOMAIN" | "CUSTOM_DOMAIN" {
  const norm = normalizeDomain(domain);
  if (!norm) return "CUSTOM_DOMAIN";
  const parts = norm.split(".");
  // Standard apex domain has 2 parts (e.g. "studio.com")
  // Common 2-part ccTLDs: .co.uk, .com.au, .co.in, .org.uk, .net.in, .edu.in
  const doubleTlds = ["co.uk", "com.au", "co.in", "org.uk", "net.in", "edu.in", "gov.in", "co.nz", "com.br"];
  const isDoubleTld = doubleTlds.some((tld) => norm.endsWith(`.${tld}`));
  
  if (isDoubleTld) {
    return parts.length > 3 ? "SUBDOMAIN" : "CUSTOM_DOMAIN";
  }
  return parts.length > 2 ? "SUBDOMAIN" : "CUSTOM_DOMAIN";
}

// ── Global Platform Custom Domain Controls & Settings ───────────────────────

export const DEFAULT_PLATFORM_DOMAIN_SETTINGS: PlatformDomainSettings = {
  id: "platform_domain_settings",
  customDomainsEnabled: true,
  maxDomainsPerPhotographer: 1,
  allowSubdomains: true,
  allowApexDomains: true,
  cnameTarget: process.env.CNAME_TARGET || process.env.PLATFORM_DOMAIN || "cname.drfilms.com",
  maintenanceNotice: "Custom domains are currently disabled by the platform administrator.",
  lastUpdated: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "SYSTEM",
};

let cachedPlatformDomainSettings: PlatformDomainSettings | null = null;

export function readPlatformDomainSettings(): PlatformDomainSettings {
  if (cachedPlatformDomainSettings) {
    return { ...cachedPlatformDomainSettings };
  }
  try {
    if (!fs.existsSync(DOMAIN_SETTINGS_FILE)) {
      writePlatformDomainSettings(DEFAULT_PLATFORM_DOMAIN_SETTINGS);
      cachedPlatformDomainSettings = { ...DEFAULT_PLATFORM_DOMAIN_SETTINGS };
      return { ...DEFAULT_PLATFORM_DOMAIN_SETTINGS };
    }
    const raw = fs.readFileSync(DOMAIN_SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const merged: PlatformDomainSettings = {
      ...DEFAULT_PLATFORM_DOMAIN_SETTINGS,
      ...parsed,
      id: "platform_domain_settings",
      maxDomainsPerPhotographer: 1, // Strictly capped at 1 domain per photographer
    };
    cachedPlatformDomainSettings = { ...merged };
    return merged;
  } catch (err) {
    cachedPlatformDomainSettings = { ...DEFAULT_PLATFORM_DOMAIN_SETTINGS };
    return { ...DEFAULT_PLATFORM_DOMAIN_SETTINGS };
  }
}

export function writePlatformDomainSettings(settings: PlatformDomainSettings): void {
  try {
    cachedPlatformDomainSettings = { ...settings };
    fs.writeFileSync(DOMAIN_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Failed to write platform domain settings:", err);
  }
}

export function invalidatePlatformDomainSettingsCache(): void {
  cachedPlatformDomainSettings = null;
}

export function updatePlatformDomainSettings(
  updates: Partial<PlatformDomainSettings>,
  adminId: string = "admin-system",
  adminEmail: string = "admin@drfilms.com"
): PlatformDomainSettings {
  const current = readPlatformDomainSettings();
  const now = new Date().toISOString();

  const updated: PlatformDomainSettings = {
    ...current,
    ...updates,
    id: "platform_domain_settings",
    maxDomainsPerPhotographer: 1, // strictly 1
    updatedAt: now,
    updatedBy: adminEmail,
    lastUpdated: now,
  };

  writePlatformDomainSettings(updated);

  // Compute diffs for detailed audit log
  const changedKeys: string[] = [];
  const changesSummary: Record<string, { old: any; new: any }> = {};

  for (const [k, v] of Object.entries(updates)) {
    if ((current as any)[k] !== v && k !== "updatedAt" && k !== "updatedBy" && k !== "lastUpdated") {
      changedKeys.push(k);
      changesSummary[k] = {
        old: (current as any)[k],
        new: v,
      };
    }
  }

  if (changedKeys.length > 0) {
    recordAdminAuditLog({
      adminId,
      adminEmail,
      action: "PLATFORM_DOMAINS_UPDATED",
      targetType: "system",
      targetId: "platform_domain_settings",
      targetName: "Platform Custom Domain Controls",
      result: "success",
      metadata: {
        changedKeys,
        changes: changesSummary,
        customDomainsEnabled: updated.customDomainsEnabled,
      },
    });
  }

  return updated;
}

export function isCustomDomainGloballyEnabled(): boolean {
  return readPlatformDomainSettings().customDomainsEnabled;
}

export function canUseCustomDomain(photographerId?: string): {
  allowed: boolean;
  code?: string;
  message?: string;
} {
  const settings = readPlatformDomainSettings();
  if (!settings.customDomainsEnabled) {
    return {
      allowed: false,
      code: "CUSTOM_DOMAINS_DISABLED",
      message: settings.maintenanceNotice || "Custom domains are currently disabled by the platform administrator.",
    };
  }

  if (photographerId) {
    const sub = getSubscription(photographerId);
    const plan = (sub?.plan || "PRO").toUpperCase();
    if (plan === "FREE") {
      return {
        allowed: false,
        code: "FEATURE_NOT_IN_PLAN",
        message: "Custom domain mapping is not included in your current plan. Upgrade to connect your domain.",
      };
    }
  }

  return { allowed: true };
}

// ── In-Memory Queue Lock for Concurrency / Race Condition Safety ────────────

class DomainAsyncLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => T | Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = this.queue.then(() => next);
    await current;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export const domainOperationLock = new DomainAsyncLock();

export function readDomains(): DomainMapping[] {
  try {
    if (!fs.existsSync(DOMAINS_FILE)) return [];
    const raw = fs.readFileSync(DOMAINS_FILE, "utf-8");
    return JSON.parse(raw) as DomainMapping[];
  } catch {
    return [];
  }
}

export const getAllDomains = readDomains;

export function writeDomains(domains: DomainMapping[]): void {
  fs.writeFileSync(DOMAINS_FILE, JSON.stringify(domains, null, 2), "utf-8");
}

export function getDomainById(id: string): DomainMapping | null {
  if (!id) return null;
  return readDomains().find((d) => d.id === id) || null;
}

export function getDomainByHostname(hostname: string): DomainMapping | null {
  const norm = normalizeDomain(hostname);
  if (!norm) return null;
  return (
    readDomains().find(
      (d) =>
        normalizeDomain(d.normalizedDomain || d.hostname || d.domain || "") === norm
    ) || null
  );
}

export const getDomainByNormalized = getDomainByHostname;

export function getDomainsByProjectId(projectId: string): DomainMapping[] {
  if (!projectId) return [];
  return readDomains().filter((d) => d.projectId === projectId);
}

export function getPrimaryDomainForPhotographer(photographerId: string): DomainMapping | null {
  // If custom domains are disabled by platform admin, return null
  if (!isCustomDomainGloballyEnabled()) {
    return null;
  }

  const domains = getDomainsByPhotographer(photographerId);
  const activeDomains = domains.filter(
    (d) =>
      d.status === "ACTIVE" ||
      d.status === "VERIFIED" ||
      d.status === "active" ||
      d.status === "verified" ||
      d.verificationStatus === "verified"
  );
  if (activeDomains.length === 0) return null;
  return activeDomains.find((d) => d.isPrimary) || activeDomains[0] || null;
}

export function setPrimaryDomain(
  domainId: string,
  photographerId: string
): { success: boolean; domain?: DomainMapping; error?: string } {
  const domains = readDomains();
  const target = domains.find((d) => d.id === domainId);

  if (!target) {
    return { success: false, error: "Domain record not found." };
  }

  const effectivePhotogId = target.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  if (photographerId !== "SUPER_ADMIN" && effectivePhotogId !== photographerId) {
    return { success: false, error: "Unauthorized to modify this domain." };
  }

  const isVerified =
    target.verificationStatus === "verified" ||
    target.status === "ACTIVE" ||
    target.status === "VERIFIED" ||
    target.status === "active" ||
    target.status === "verified";

  if (!isVerified) {
    return { success: false, error: "Only verified domains can be designated as primary." };
  }

  // Atomically unset isPrimary for other domains of this photographer
  domains.forEach((d) => {
    if ((d.photographerId || DEFAULT_PHOTOGRAPHER_ID) === effectivePhotogId) {
      d.isPrimary = d.id === domainId;
      d.updatedAt = new Date().toISOString();
    }
  });

  writeDomains(domains);

  const photog = getPhotographerById(photographerId);
  recordAdminAuditLog({
    adminId: photographerId,
    adminEmail: photographerId === "SUPER_ADMIN" ? "admin@drfilms.com" : (photog?.email || "photographer@drfilms.com"),
    action: "DOMAIN_SET_PRIMARY",
    targetType: "domain",
    targetId: domainId,
    targetName: target.normalizedDomain || target.hostname,
    result: "success",
  });

  return { success: true, domain: target };
}

export function addOrUpdateDomain(params: {
  domain?: string;
  hostname: string;
  projectId?: string;
  photographerId?: string;
  targetCname?: string;
  isPrimary?: boolean;
}): { domain: DomainMapping; error?: string; code?: string } {
  // 1. Global Custom Domain ON/OFF Check
  if (!isCustomDomainGloballyEnabled()) {
    return {
      domain: null as any,
      error: "Custom domains are currently disabled by the platform administrator.",
      code: "CUSTOM_DOMAINS_DISABLED",
    };
  }

  const rawHost = params.domain || params.hostname;
  const norm = normalizeDomain(rawHost);

  if (!norm || norm.length < 3 || !norm.includes(".")) {
    return {
      domain: null as any,
      error: "Please provide a valid fully qualified domain name (e.g., gallery.yourstudio.com).",
      code: "INVALID_DOMAIN",
    };
  }

  // 2. Reserved hostnames check (prevent hijacking platform routing)
  const reserved = [
    "localhost",
    "127.0.0.1",
    "drfilms.com",
    "vercel.app",
    "herokuapp.com",
    "yourplatform.com",
    "api.drfilms.com",
    "admin.drfilms.com",
  ];
  if (reserved.includes(norm) || norm.endsWith(".vercel.app") || norm.endsWith(".drfilms.com")) {
    return {
      domain: null as any,
      error: "This hostname is reserved or invalid for custom domain mapping.",
      code: "INVALID_DOMAIN",
    };
  }

  const effectivePhotogId = params.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const domains = readDomains();

  // 3. Domain Ownership Check across all tenants
  const existingByHost = domains.find(
    (d) => normalizeDomain(d.normalizedDomain || d.hostname || d.domain || "") === norm
  );

  if (existingByHost) {
    const existingOwner = existingByHost.photographerId || DEFAULT_PHOTOGRAPHER_ID;
    if (existingOwner !== effectivePhotogId) {
      return {
        domain: null as any,
        error: "This custom domain is already registered by another photographer.",
        code: "DOMAIN_ALREADY_CONNECTED",
      };
    }

    // Updating existing domain of the SAME photographer
    const defaultTarget =
      process.env.CNAME_TARGET ||
      process.env.PLATFORM_DOMAIN ||
      readStudioSettings().cnameTarget ||
      "cname.drfilms.com";

    existingByHost.targetCname = params.targetCname || existingByHost.targetCname || defaultTarget;
    if (params.projectId) existingByHost.projectId = params.projectId;
    if (params.isPrimary !== undefined) existingByHost.isPrimary = params.isPrimary;
    existingByHost.updatedAt = new Date().toISOString();
    writeDomains(domains);
    return { domain: existingByHost };
  }

  // 4. Strict Single-Domain Limit per Photographer (Maximum 1 custom domain)
  const existingActivePhotogDomains = domains.filter(
    (d) =>
      (d.photographerId || DEFAULT_PHOTOGRAPHER_ID) === effectivePhotogId &&
      d.status !== "DISCONNECTED"
  );

  if (existingActivePhotogDomains.length >= 1) {
    return {
      domain: null as any,
      error: "You already have a custom domain connected. Disconnect your existing domain before connecting another domain.",
      code: "CUSTOM_DOMAIN_LIMIT_REACHED",
    };
  }

  const defaultTarget =
    process.env.CNAME_TARGET ||
    process.env.PLATFORM_DOMAIN ||
    readStudioSettings().cnameTarget ||
    "cname.drfilms.com";

  const verificationToken = `wvg-verify-${crypto.randomBytes(12).toString("hex")}`;
  const domainType = detectDomainType(norm);

  const newDomain: DomainMapping = {
    id: `dom-${generateId().toLowerCase()}`,
    photographerId: effectivePhotogId,
    projectId: params.projectId || "general",
    hostname: norm,
    domain: norm,
    normalizedDomain: norm,
    type: domainType,
    status: "PENDING",
    verificationStatus: "pending",
    verificationToken,
    verificationMethod: domainType === "SUBDOMAIN" ? "CNAME" : "TXT",
    targetCname: params.targetCname || defaultTarget,
    txtRecordName: `_wvg-verify.${norm}`,
    txtRecordValue: verificationToken,
    sslStatus: "pending",
    isPrimary: true, // Sole domain is always primary
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  domains.push(newDomain);
  writeDomains(domains);

  const photog = getPhotographerById(effectivePhotogId);
  recordAdminAuditLog({
    adminId: effectivePhotogId,
    adminEmail: effectivePhotogId === "SUPER_ADMIN" ? "admin@drfilms.com" : (photog?.email || "photographer@drfilms.com"),
    action: "DOMAIN_CREATE",
    targetType: "domain",
    targetId: newDomain.id,
    targetName: norm,
    metadata: {
      type: domainType,
      isPrimary: newDomain.isPrimary,
    },
    result: "success",
  });

  return { domain: newDomain };
}

export function removeDomain(id: string, photographerId?: string): boolean {
  const domains = readDomains();
  const target = domains.find((d) => d.id === id);
  if (!target) return false;

  const effectiveOwner = target.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  if (photographerId && photographerId !== "SUPER_ADMIN" && effectiveOwner !== photographerId) {
    return false; // Unauthorized to delete another tenant's domain
  }

  const filtered = domains.filter((d) => d.id !== id);
  
  // If removed domain was primary, promote another verified domain if available
  if (target.isPrimary) {
    const nextVerified = filtered.find(
      (d) =>
        (d.photographerId || DEFAULT_PHOTOGRAPHER_ID) === effectiveOwner &&
        (d.verificationStatus === "verified" || d.status === "ACTIVE" || d.status === "active")
    );
    if (nextVerified) {
      nextVerified.isPrimary = true;
      nextVerified.updatedAt = new Date().toISOString();
    }
  }

  writeDomains(filtered);

  const photog = getPhotographerById(photographerId || effectiveOwner);
  recordAdminAuditLog({
    adminId: photographerId || effectiveOwner,
    adminEmail: (photographerId || effectiveOwner) === "SUPER_ADMIN" ? "admin@drfilms.com" : (photog?.email || "photographer@drfilms.com"),
    action: "DOMAIN_DELETE",
    targetType: "domain",
    targetId: id,
    targetName: target.normalizedDomain || target.hostname,
    result: "success",
  });

  return true;
}

export async function verifyDomainDns(domainId: string): Promise<{
  success: boolean;
  status: DomainMapping["status"];
  verificationStatus: DomainMapping["verificationStatus"];
  message: string;
  domain: DomainMapping | null;
}> {
  const domains = readDomains();
  const domain = domains.find((d) => d.id === domainId);
  if (!domain) {
    return {
      success: false,
      status: "FAILED",
      verificationStatus: "failed",
      message: "Domain record not found.",
      domain: null,
    };
  }

  const norm = normalizeDomain(domain.normalizedDomain || domain.hostname || domain.domain || "");
  domain.lastCheckedAt = new Date().toISOString();

  const photog = getPhotographerById(domain.photographerId || DEFAULT_PHOTOGRAPHER_ID);
  const adminEmail = (domain.photographerId || DEFAULT_PHOTOGRAPHER_ID) === "SUPER_ADMIN" ? "admin@drfilms.com" : (photog?.email || "photographer@drfilms.com");

  // Test / local / mock development environment bypass
  const isDevOrTest =
    process.env.NODE_ENV === "test" ||
    process.env.MOCK_DNS_VERIFY === "true" ||
    norm.endsWith(".test") ||
    norm.endsWith(".local") ||
    norm.includes("mock") ||
    norm.startsWith("demo.");

  if (isDevOrTest) {
    domain.status = "ACTIVE";
    domain.verificationStatus = "verified";
    domain.sslStatus = "managed";
    domain.verifiedAt = new Date().toISOString();
    domain.updatedAt = new Date().toISOString();
    writeDomains(domains);

    recordAdminAuditLog({
      adminId: domain.photographerId || DEFAULT_PHOTOGRAPHER_ID,
      adminEmail,
      action: "DOMAIN_VERIFY_SUCCESS",
      targetType: "domain",
      targetId: domain.id,
      targetName: norm,
      metadata: { mode: "dev_test_simulation" },
      result: "success",
    });

    return {
      success: true,
      status: "ACTIVE",
      verificationStatus: "verified",
      message: `Domain ${norm} successfully verified and activated.`,
      domain,
    };
  }

  // Real Server-Side DNS Verification
  let txtVerified = false;
  let cnameVerified = false;

  // 1. Try TXT record lookup: _wvg-verify.<domain>
  try {
    const txtRecordHost = domain.txtRecordName || `_wvg-verify.${norm}`;
    const txtRecords = await dns.promises.resolveTxt(txtRecordHost);
    const flattenedTxt = txtRecords.map((chunk) => chunk.join("")).map((t) => t.trim());
    if (flattenedTxt.includes(domain.verificationToken)) {
      txtVerified = true;
    }
  } catch {
    // TXT lookup not found or not propagated yet
  }

  // 2. Try CNAME record lookup: <domain>
  if (!txtVerified) {
    try {
      const cnames = await dns.promises.resolveCname(norm);
      const targetNorm = normalizeDomain(domain.targetCname);
      if (cnames.some((c) => normalizeDomain(c) === targetNorm)) {
        cnameVerified = true;
      }
    } catch {
      // CNAME lookup not found or not propagated yet
    }
  }

  if (txtVerified || cnameVerified) {
    domain.status = "ACTIVE";
    domain.verificationStatus = "verified";
    domain.sslStatus = "managed";
    domain.verifiedAt = new Date().toISOString();
    domain.updatedAt = new Date().toISOString();
    writeDomains(domains);

    recordAdminAuditLog({
      adminId: domain.photographerId || DEFAULT_PHOTOGRAPHER_ID,
      adminEmail,
      action: "DOMAIN_VERIFY_SUCCESS",
      targetType: "domain",
      targetId: domain.id,
      targetName: norm,
      metadata: { method: txtVerified ? "TXT" : "CNAME" },
      result: "success",
    });

    return {
      success: true,
      status: "ACTIVE",
      verificationStatus: "verified",
      message: `Domain DNS verified successfully via ${txtVerified ? "TXT record" : "CNAME record"}!`,
      domain,
    };
  }

  // Verification failed or pending propagation
  domain.status = "PENDING";
  domain.verificationStatus = "failed";
  domain.updatedAt = new Date().toISOString();
  writeDomains(domains);

  recordAdminAuditLog({
    adminId: domain.photographerId || DEFAULT_PHOTOGRAPHER_ID,
    adminEmail,
    action: "DOMAIN_VERIFY_FAILED",
    targetType: "domain",
    targetId: domain.id,
    targetName: norm,
    result: "failed",
  });

  return {
    success: false,
    status: "PENDING",
    verificationStatus: "failed",
    message: `DNS record not found yet for ${norm}. DNS changes can take a few minutes to propagate across servers.`,
    domain,
  };
}

// ── Phase 9: Client Delivery, Session Token & Canonical URL Helpers ──────────

const GALLERY_SESSION_SECRET = process.env.SESSION_SECRET || "wedding-video-gallery-secret-salt-2025";

/**
 * Creates a cryptographically verified, project-scoped gallery session token.
 * Token cannot be used to access another project.
 */
export function createGallerySessionToken(projectId: string): string {
  if (!projectId) return "";
  const signature = crypto
    .createHmac("sha256", GALLERY_SESSION_SECRET)
    .update(`wvg_session_auth:${projectId}`)
    .digest("hex");
  return `${projectId}:${signature}`;
}

/**
 * Verifies a project-scoped gallery session token.
 */
export function verifyGallerySessionToken(token: string | undefined | null, projectId: string): boolean {
  if (!token || !projectId) return false;
  const expected = createGallerySessionToken(projectId);
  return token.trim() === expected;
}

/**
 * Resolves the canonical public gallery URL for display, sharing, and QR codes.
 * GUARANTEED: Never outputs "localhost" or "127.0.0.1" in production or QR contexts.
 * Priority:
 * 1. Verified active custom domain (e.g. https://gallery.priyavart.com)
 * 2. Explicit public app URL from environment (NEXT_PUBLIC_APP_URL or APP_URL)
 * 3. Incoming request origin IF it is not localhost
 * 4. Production fallback public domain (https://gallery.drfilms.com)
 */
export function resolveCanonicalGalleryUrl(
  accessCode: string,
  customDomain?: string | null,
  requestOrigin?: string | null
): string {
  const code = (accessCode || "").trim().toUpperCase();

  // 1. Verified Custom Domain
  if (customDomain && customDomain.trim()) {
    let cleanDomain = customDomain.trim().replace(/\/+$/, "");
    if (!cleanDomain.includes("localhost") && !cleanDomain.includes("127.0.0.1")) {
      const baseUrl = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`;
      if (baseUrl.includes(`/gallery/${code}`)) {
        return baseUrl;
      }
      return `${baseUrl}/gallery/${code}`;
    }
  }

  // 2. Public App URL config
  const publicEnvUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (publicEnvUrl && !publicEnvUrl.includes("localhost") && !publicEnvUrl.includes("127.0.0.1")) {
    return `${publicEnvUrl.replace(/\/+$/, "")}/gallery/${code}`;
  }

  // 3. Request origin if real public host
  if (requestOrigin && requestOrigin.trim()) {
    const cleanOrigin = requestOrigin.trim();
    if (!cleanOrigin.includes("localhost") && !cleanOrigin.includes("127.0.0.1")) {
      return `${cleanOrigin.replace(/\/+$/, "")}/gallery/${code}`;
    }
  }

  // 4. Clean public canonical fallback (prevents broken localhost QR codes on mobile phone cameras)
  return `https://gallery.drfilms.com/gallery/${code}`;
}

/**
 * Formats timestamps into natural human-readable relative time strings.
 * e.g. "just now", "2 minutes ago", "1 hour ago", "Yesterday", "3 days ago"
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return isoString;
  }
}

/**
 * Aggregates client activity analytics and popular content statistics for a project.
 */
export function getProjectAnalyticsSummary(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) return null;

  const activities = getProjectActivity(projectId, 500);
  const favorites = getFavorites(projectId);
  const selections = getSelections(projectId);
  const config = project.settings?.selectionConfig;

  // Track unique client sessions
  const uniqueSessions = new Set<string>();
  let photoViews = project.analytics?.photoViews || 0;
  let videoPlays = project.analytics?.plays || 0;
  let downloads = 0;
  let shares = (project.analytics?.shares || 0) + (project.analytics?.whatsappShares || 0);

  const photoViewCounts: Record<string, { count: number; name?: string; thumbnail?: string }> = {};
  const videoPlayCounts: Record<string, { count: number; name?: string; eventName?: string }> = {};
  const eventInteractionCounts: Record<string, number> = {};

  for (const act of activities) {
    if (act.sessionId) uniqueSessions.add(act.sessionId);

    if (act.eventType === "photo_viewed" || act.eventType === "photo_opened") {
      photoViews += 1;
      if (act.mediaId) {
        if (!photoViewCounts[act.mediaId]) {
          photoViewCounts[act.mediaId] = {
            count: 0,
            name: act.mediaTitle || "Wedding Photo",
            thumbnail: act.metadata?.thumbnailUrl,
          };
        }
        photoViewCounts[act.mediaId].count += 1;
      }
    }

    if (act.eventType === "video_played" || act.eventType === "play") {
      if (act.mediaId) {
        if (!videoPlayCounts[act.mediaId]) {
          videoPlayCounts[act.mediaId] = {
            count: 0,
            name: act.mediaTitle || "Wedding Film",
            eventName: act.metadata?.eventName,
          };
        }
        videoPlayCounts[act.mediaId].count += 1;
      }
    }

    if (act.eventType === "download_requested" || act.eventType === "zip_downloaded") {
      downloads += 1;
    }

    if (act.eventType === "share_clicked" || act.eventType === "whatsapp_clicked") {
      shares += 1;
    }

    if (act.metadata?.eventName) {
      const evt = act.metadata.eventName;
      eventInteractionCounts[evt] = (eventInteractionCounts[evt] || 0) + 1;
    }
  }

  // Include videoStats from project.analytics
  if (project.analytics?.videoStats) {
    for (const [vId, stat] of Object.entries(project.analytics.videoStats)) {
      if (stat.plays > 0) {
        if (!videoPlayCounts[vId]) {
          const matchVid = project.videoFiles?.find((v) => v.id === vId || v.driveFileId === vId);
          videoPlayCounts[vId] = {
            count: stat.plays,
            name: matchVid?.name || "Wedding Film",
            eventName: matchVid?.eventName,
          };
        } else {
          videoPlayCounts[vId].count = Math.max(videoPlayCounts[vId].count, stat.plays);
        }
      }
    }
  }

  // Rank popular content
  const sortedPhotos = Object.entries(photoViewCounts)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sortedVideos = Object.entries(videoPlayCounts)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let mostPopularEvent: { name: string; interactions: number } | null = null;
  const sortedEvents = Object.entries(eventInteractionCounts).sort((a, b) => b[1] - a[1]);
  if (sortedEvents.length > 0) {
    mostPopularEvent = { name: sortedEvents[0][0], interactions: sortedEvents[0][1] };
  }

  // Format recent activity
  const recentActivity = activities.slice(0, 20).map((act) => ({
    id: act.id,
    eventType: act.eventType,
    description: act.description,
    timestamp: act.timestamp,
    relativeTime: formatRelativeTime(act.timestamp),
    mediaTitle: act.mediaTitle,
  }));

  return {
    totalVisits: Math.max(project.analytics?.views || 0, activities.filter((a) => a.eventType === "gallery_opened").length),
    uniqueSessions: uniqueSessions.size,
    photoViews,
    videoPlays,
    favoritesCount: favorites.length,
    currentSelectionCount: selections.length,
    selectionLimit: config?.limit || 20,
    selectionStatus: config?.status || "OPEN",
    isSelectionLocked: !config?.enabled || config?.status === "LOCKED",
    downloads,
    shares,
    popularContent: {
      mostViewedPhotos: sortedPhotos,
      mostViewedVideos: sortedVideos,
      mostPopularEvent,
    },
    recentActivity,
  };
}

// ── Multi-Tenant SaaS Entities & Query Operations ─────────────────────────────

// Photographers
export function readPhotographers(): PhotographerAccount[] {
  try {
    if (!fs.existsSync(PHOTOGRAPHERS_FILE)) return [];
    const raw = fs.readFileSync(PHOTOGRAPHERS_FILE, "utf-8");
    const photographers = JSON.parse(raw) as PhotographerAccount[];

    // Ensure Super Admin account is present
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@drfilms.com").trim().toLowerCase();
    const superAdminPass = process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin2025";
    
    const hasAdmin = photographers.some(
      (p) => p.role === "platform_admin" || p.role === "SUPER_ADMIN" || p.id === SUPER_ADMIN_PHOTOGRAPHER_ID || p.email.toLowerCase() === superAdminEmail
    );
    
    if (!hasAdmin) {
      const superAdmin: PhotographerAccount = {
        id: SUPER_ADMIN_PHOTOGRAPHER_ID,
        email: superAdminEmail,
        passwordHash: bcrypt.hashSync(superAdminPass, 10),
        name: "Platform Owner",
        phone: "+91 99999 00000",
        studioName: "DR Films Platform Control Center",
        tagline: "SaaS Super Admin & Operations",
        logoUrlLight: "",
        logoUrlDark: "",
        website: "https://drfilms.com",
        socialLinks: {},
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        tokenVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      photographers.unshift(superAdmin);
      fs.writeFileSync(PHOTOGRAPHERS_FILE, JSON.stringify(photographers, null, 2), "utf-8");
    }
    return photographers;
  } catch {
    return [];
  }
}

export function writePhotographers(photographers: PhotographerAccount[]): void {
  fs.writeFileSync(PHOTOGRAPHERS_FILE, JSON.stringify(photographers, null, 2), "utf-8");
}

/**
 * Ensures a legitimate Super Admin database record exists with canonical role "SUPER_ADMIN"
 * and is synchronized with configured SUPER_ADMIN_EMAIL and bcrypt hash of SUPER_ADMIN_PASSWORD.
 */
export async function ensureSuperAdminAccount(): Promise<PhotographerAccount> {
  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@drfilms.com").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin2025";
  const photographers = readPhotographers();
  let admin = photographers.find(
    (p) =>
      p.id === SUPER_ADMIN_PHOTOGRAPHER_ID ||
      p.role === "SUPER_ADMIN" ||
      p.role === "platform_admin" ||
      p.email.toLowerCase() === email
  );

  const passwordHash = await hashUserPassword(password);

  if (!admin) {
    admin = {
      id: SUPER_ADMIN_PHOTOGRAPHER_ID,
      email,
      passwordHash,
      name: "Platform Owner",
      studioName: "DR Films Platform Control Center",
      tagline: "SaaS Super Admin & Operations",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    photographers.push(admin);
    writePhotographers(photographers);
  } else {
    let modified = false;
    if (admin.role !== "SUPER_ADMIN") {
      admin.role = "SUPER_ADMIN";
      modified = true;
    }
    if ((admin.status || "").toUpperCase() !== "ACTIVE") {
      admin.status = "ACTIVE";
      modified = true;
    }
    if (admin.email.toLowerCase() !== email) {
      admin.email = email;
      modified = true;
    }
    if (password) {
      const matches = await verifyUserPassword(password, admin.passwordHash);
      if (!matches) {
        admin.passwordHash = passwordHash;
        admin.tokenVersion = (admin.tokenVersion || 1) + 1;
        modified = true;
      }
    }
    if (modified) {
      admin.updatedAt = new Date().toISOString();
      savePhotographer(admin);
    }
  }
  return admin;
}

export function getPhotographerById(id: string): PhotographerAccount | null {
  return readPhotographers().find((p) => p.id === id) || null;
}

export function getPhotographerByEmail(email: string): PhotographerAccount | null {
  const norm = email.trim().toLowerCase();
  return readPhotographers().find((p) => p.email.toLowerCase() === norm) || null;
}

export async function registerPhotographerAccount(data: {
  name: string;
  studioName?: string;
  email: string;
  password: string;
  phone?: string;
  website?: string;
  city?: string;
  country?: string;
  termsAccepted?: boolean;
}): Promise<{ success: boolean; photographer?: PhotographerAccount; error?: string }> {
  const normEmail = data.email.trim().toLowerCase();
  const existing = getPhotographerByEmail(normEmail);
  if (existing) {
    return { success: false, error: "An account with this email address already exists. Please sign in." };
  }

  const passwordHash = await hashUserPassword(data.password);
  const photographerId = `photographer-${generateId().toLowerCase()}`;
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const account: PhotographerAccount = {
    id: photographerId,
    name: data.name.trim(),
    studioName: (data.studioName || data.name).trim(),
    businessName: (data.studioName || data.name).trim(),
    email: normEmail,
    passwordHash,
    phone: data.phone?.trim() || "",
    website: data.website?.trim() || "",
    city: data.city?.trim() || "",
    country: data.country?.trim() || "",
    termsAccepted: !!data.termsAccepted,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
    lastVerificationSentAt: new Date().toISOString(),
    onboardingCompleted: false,
    onboardingStep: 1,
    role: "PHOTOGRAPHER",
    status: "ACTIVE",
    tokenVersion: 1,
    plan: "FREE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  savePhotographer(account);

  // Initialize default trial / free subscription
  try {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
    const sub: Subscription = {
      id: `sub-${generateId().toLowerCase()}`,
      photographerId,
      plan: "FREE",
      status: "TRIAL",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialStart: now.toISOString(),
      trialEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const subs = readSubscriptions();
    subs.push(sub);
    writeSubscriptions(subs);

    recordAdminAuditLog({
      adminId: photographerId,
      adminEmail: normEmail,
      action: "PHOTOGRAPHER_REGISTERED",
      targetType: "photographer",
      targetId: photographerId,
      targetName: account.name,
      result: "success",
      metadata: { studioName: account.studioName, email: normEmail },
    });
  } catch (err) {
    console.error("Failed to seed subscription or audit log for new photographer:", err);
  }

  return { success: true, photographer: account };
}

export function updateOnboardingProgress(
  photographerId: string,
  updates: Partial<PhotographerAccount>
): PhotographerAccount | null {
  const account = getPhotographerById(photographerId);
  if (!account) return null;

  if (updates.name) account.name = updates.name.trim();
  if (updates.studioName) {
    account.studioName = updates.studioName.trim();
    account.businessName = updates.studioName.trim();
  }
  if (updates.phone !== undefined) account.phone = updates.phone.trim();
  if (updates.website !== undefined) account.website = updates.website.trim();
  if (updates.city !== undefined) account.city = updates.city.trim();
  if (updates.country !== undefined) account.country = updates.country.trim();
  if (updates.logoUrlLight !== undefined) account.logoUrlLight = updates.logoUrlLight;
  if (updates.logoUrlDark !== undefined) account.logoUrlDark = updates.logoUrlDark;
  if (updates.avatarUrl !== undefined) account.avatarUrl = updates.avatarUrl;
  if (updates.branding !== undefined) {
    account.branding = {
      ...account.branding,
      ...updates.branding,
    };
  }
  if (updates.onboardingStep !== undefined) account.onboardingStep = updates.onboardingStep;
  if (updates.onboardingCompleted !== undefined) account.onboardingCompleted = updates.onboardingCompleted;

  account.updatedAt = new Date().toISOString();
  savePhotographer(account);
  return account;
}

export async function getOrCreateGooglePhotographerAccount(data: {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}): Promise<{
  success: boolean;
  photographer?: PhotographerAccount;
  isNewAccount: boolean;
  error?: string;
}> {
  const normEmail = data.email.trim().toLowerCase();
  let photographer = getPhotographerByEmail(normEmail);

  if (photographer) {
    // Super Admin must NEVER be accessible through Google Sign-In
    if (photographer.role === "SUPER_ADMIN" || photographer.role === "platform_admin") {
      return {
        success: false,
        error: "Super Admin accounts cannot authenticate via Google Sign-In. Please sign in at /admin/login.",
        isNewAccount: false,
      };
    }

    // Existing photographer — link Google OAuth identity safely
    const currentProviders = photographer.authProviders || (photographer.passwordHash ? ["email"] : []);
    const updatedProviders = currentProviders.includes("google")
      ? currentProviders
      : [...currentProviders, "google" as const];

    photographer = {
      ...photographer,
      googleId: data.googleId || photographer.googleId,
      googleEmail: normEmail,
      googleAvatarUrl: data.avatarUrl || photographer.googleAvatarUrl || photographer.avatarUrl,
      avatarUrl: photographer.avatarUrl || data.avatarUrl || "",
      authProviders: updatedProviders,
      emailVerified: true, // Email confirmed by Google OAuth
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePhotographer(photographer);

    recordAdminAuditLog({
      adminId: photographer.id,
      adminEmail: normEmail,
      action: "PHOTOGRAPHER_GOOGLE_LINKED",
      targetType: "photographer",
      targetId: photographer.id,
      targetName: photographer.name,
      result: "success",
      metadata: { email: normEmail, googleId: data.googleId },
    });

    return { success: true, photographer, isNewAccount: false };
  }

  // Create real database photographer user with role = PHOTOGRAPHER, status = ACTIVE
  const photographerId = `photographer-${generateId().toLowerCase()}`;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
  const displayName = (data.name || normEmail.split("@")[0] || "Photographer").trim();
  const studioName = `${displayName} Photography`;

  const newAccount: PhotographerAccount = {
    id: photographerId,
    name: displayName,
    studioName,
    businessName: studioName,
    email: normEmail,
    googleId: data.googleId,
    googleEmail: normEmail,
    googleAvatarUrl: data.avatarUrl || "",
    avatarUrl: data.avatarUrl || "",
    authProviders: ["google"],
    termsAccepted: true,
    emailVerified: true, // Verified by Google
    onboardingCompleted: false,
    onboardingStep: 1,
    role: "PHOTOGRAPHER",
    status: "ACTIVE",
    tokenVersion: 1,
    plan: "FREE",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastLoginAt: now.toISOString(),
  };

  savePhotographer(newAccount);

  // Initialize trial subscription
  try {
    const sub: Subscription = {
      id: `sub-${generateId().toLowerCase()}`,
      photographerId,
      plan: "FREE",
      status: "TRIAL",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialStart: now.toISOString(),
      trialEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const subs = readSubscriptions();
    subs.push(sub);
    writeSubscriptions(subs);

    recordAdminAuditLog({
      adminId: photographerId,
      adminEmail: normEmail,
      action: "PHOTOGRAPHER_REGISTERED",
      targetType: "photographer",
      targetId: photographerId,
      targetName: newAccount.name,
      result: "success",
      metadata: { studioName: newAccount.studioName, email: normEmail, provider: "google" },
    });
  } catch (err) {
    console.error("Failed to seed subscription for Google photographer:", err);
  }

  return { success: true, photographer: newAccount, isNewAccount: true };
}

// ── Email Verification Functions ─────────────────────────────────────────────

export function createEmailVerificationToken(email: string): { token: string; expires: string; photographer: PhotographerAccount } | null {
  const account = getPhotographerByEmail(email);
  if (!account) return null;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  account.emailVerificationToken = rawToken;
  account.emailVerificationExpires = expires;
  account.lastVerificationSentAt = new Date().toISOString();
  account.updatedAt = new Date().toISOString();
  savePhotographer(account);

  return { token: rawToken, expires, photographer: account };
}

export function verifyPhotographerEmail(token: string): { success: boolean; message: string; photographer?: PhotographerAccount } {
  if (!token || typeof token !== "string") {
    return { success: false, message: "Verification token is required" };
  }

  const photographers = readPhotographers();
  const account = photographers.find((p) => p.emailVerificationToken === token);

  if (!account) {
    return { success: false, message: "Invalid verification link or already verified." };
  }

  if (account.emailVerificationExpires && new Date(account.emailVerificationExpires).getTime() < Date.now()) {
    return { success: false, message: "This verification link has expired. Please request a new one." };
  }

  account.emailVerified = true;
  account.emailVerificationToken = undefined;
  account.emailVerificationExpires = undefined;
  account.updatedAt = new Date().toISOString();

  savePhotographer(account);

  return {
    success: true,
    message: "Your email address has been verified successfully.",
    photographer: account,
  };
}

export function resendEmailVerification(email: string): { success: boolean; message: string; token?: string; expires?: string; rateLimited?: boolean } {
  const account = getPhotographerByEmail(email);
  if (!account) {
    // Return generic success to prevent email enumeration
    return {
      success: true,
      message: "If an account exists with this email address, a verification email has been dispatched.",
    };
  }

  if (account.emailVerified) {
    return {
      success: true,
      message: "Your email is already verified. You can log in directly.",
    };
  }

  // Rate limiting check (60 seconds cooldown)
  if (account.lastVerificationSentAt) {
    const lastSent = new Date(account.lastVerificationSentAt).getTime();
    const now = Date.now();
    if (now - lastSent < 60 * 1000) {
      return {
        success: false,
        rateLimited: true,
        message: "Please wait at least 60 seconds before requesting another verification email.",
      };
    }
  }

  const result = createEmailVerificationToken(account.email);
  return {
    success: true,
    message: "A fresh verification email has been sent. Please check your inbox.",
    token: result?.token,
    expires: result?.expires,
  };
}

// ── Google Drive Photographer Token Integration ───────────────────────────────

export function saveGoogleDriveTokens(
  photographerId: string,
  tokens: { accessToken?: string; refreshToken?: string; expiryDate?: number; scope?: string; tokenType?: string },
  email?: string
): PhotographerAccount | null {
  const account = getPhotographerById(photographerId);
  if (!account) return null;

  account.googleDriveConnected = true;
  account.googleDriveEmail = email || account.googleDriveEmail || account.email;
  account.googleDriveTokens = {
    ...account.googleDriveTokens,
    ...tokens,
  };
  account.updatedAt = new Date().toISOString();

  savePhotographer(account);
  return account;
}

export function disconnectGoogleDrive(photographerId: string): PhotographerAccount | null {
  const account = getPhotographerById(photographerId);
  if (!account) return null;

  account.googleDriveConnected = false;
  account.googleDriveEmail = undefined;
  account.googleDriveTokens = undefined;
  account.updatedAt = new Date().toISOString();

  savePhotographer(account);
  return account;
}

export function createPasswordResetToken(email: string): { token: string; expires: string; photographer: PhotographerAccount } | null {
  const account = getPhotographerByEmail(email);
  if (!account) return null;

  const rawToken = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  account.passwordResetToken = rawToken;
  account.passwordResetExpires = expires;
  account.updatedAt = new Date().toISOString();
  savePhotographer(account);

  return { token: rawToken, expires, photographer: account };
}

export async function resetPhotographerPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  if (!token || !newPassword) {
    return { success: false, message: "Reset token and new password are required" };
  }

  const photographers = readPhotographers();
  const account = photographers.find((p) => p.passwordResetToken === token);
  if (!account || !account.passwordResetExpires) {
    return { success: false, message: "Invalid or expired password reset link" };
  }

  if (new Date(account.passwordResetExpires).getTime() < Date.now()) {
    return { success: false, message: "This password reset link has expired. Please request a new one." };
  }

  const passwordHash = await hashUserPassword(newPassword);
  account.passwordHash = passwordHash;
  account.passwordResetToken = undefined;
  account.passwordResetExpires = undefined;
  account.tokenVersion = (account.tokenVersion || 1) + 1; // Invalidate all prior sessions
  account.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return { success: true, message: "Password reset successful. Please sign in with your new password." };
}

export function forceLogoutPhotographer(
  photographerId: string,
  adminId?: string,
  adminEmail?: string
): boolean {
  const photographers = readPhotographers();
  const account = photographers.find((p) => p.id === photographerId);
  if (!account) return false;

  account.tokenVersion = (account.tokenVersion || 1) + 1;
  account.updatedAt = new Date().toISOString();
  writePhotographers(photographers);

  if (adminId) {
    recordAdminAuditLog({
      adminId,
      adminEmail: adminEmail || "admin",
      action: "FORCE_LOGOUT",
      targetType: "photographer",
      targetId: photographerId,
      targetName: account.name || account.studioName,
      result: "success",
    });
  }

  return true;
}

export async function adminResetPhotographerPassword(
  photographerId: string,
  newPassword: string,
  adminId: string,
  adminEmail?: string
): Promise<{ success: boolean; message?: string }> {
  const photographers = readPhotographers();
  const account = photographers.find((p) => p.id === photographerId);
  if (!account) return { success: false, message: "Photographer account not found" };

  const passwordHash = await hashUserPassword(newPassword);
  account.passwordHash = passwordHash;
  account.tokenVersion = (account.tokenVersion || 1) + 1;
  account.updatedAt = new Date().toISOString();
  writePhotographers(photographers);

  recordAdminAuditLog({
    adminId,
    adminEmail: adminEmail || "admin",
    action: "ADMIN_PASSWORD_RESET",
    targetType: "photographer",
    targetId: photographerId,
    targetName: account.name || account.studioName,
    result: "success",
  });

  return { success: true, message: "Password has been successfully updated" };
}

export function createPhotographer(
  data: Omit<PhotographerAccount, "id" | "createdAt" | "updatedAt"> & { id?: string }
): PhotographerAccount {
  const newAccount: PhotographerAccount = {
    id: data.id || `photographer-${generateId().toLowerCase()}`,
    name: data.name,
    email: data.email,
    studioName: data.studioName || data.businessName || data.name,
    businessName: data.businessName || data.studioName || data.name,
    plan: data.plan || "FREE",
    role: data.role || "PHOTOGRAPHER",
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    passwordHash: data.passwordHash,
    tokenVersion: data.tokenVersion || 1,
    status: data.status || "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return savePhotographer(newAccount);
}

export function savePhotographer(account: PhotographerAccount): PhotographerAccount {
  const list = readPhotographers();
  const idx = list.findIndex((p) => p.id === account.id);
  account.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = account;
  } else {
    list.push(account);
  }
  writePhotographers(list);
  return account;
}

export function updatePhotographer(
  id: string,
  patch: Partial<PhotographerAccount>
): PhotographerAccount | null {
  const account = getPhotographerById(id);
  if (!account) return null;

  const updated: PhotographerAccount = {
    ...account,
    ...patch,
    id: account.id, // Immutable
    updatedAt: new Date().toISOString(),
  };
  return savePhotographer(updated);
}

// ── Dynamic SaaS Plans ───────────────────────────────────────────────────────

export function readPlans(): DynamicPlan[] {
  try {
    if (!fs.existsSync(PLANS_FILE)) return [];
    const raw = fs.readFileSync(PLANS_FILE, "utf-8");
    const plans = JSON.parse(raw) as DynamicPlan[];
    return plans.map((p) => {
      const mPaise = p.priceMonthlyInPaise ?? p.priceMonthlyPaise ?? (p.slug === "starter" ? 99900 : p.slug === "pro" ? 249900 : p.slug === "studio" ? 499900 : 999900);
      const yPaise = p.priceYearlyInPaise ?? p.priceYearlyPaise ?? mPaise * 10;
      return {
        ...p,
        priceMonthlyInPaise: mPaise,
        priceMonthlyPaise: mPaise,
        priceYearlyInPaise: yPaise,
        priceYearlyPaise: yPaise,
      };
    }).sort((a, b) => (a.displayOrder || a.sortOrder || 0) - (b.displayOrder || b.sortOrder || 0));
  } catch {
    return [];
  }
}

export function writePlans(plans: DynamicPlan[]): void {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), "utf-8");
}

export function getPlanById(id: string): DynamicPlan | null {
  return readPlans().find((p) => p.id === id) || null;
}

export function getPlanBySlug(slug: string): DynamicPlan | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  return readPlans().find((p) => p.slug.toLowerCase() === clean) || null;
}

export function savePlan(planData: Partial<DynamicPlan> & { name: string; slug: string }): DynamicPlan {
  const plans = readPlans();
  const now = new Date().toISOString();
  const slug = planData.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-");
  const existingIdx = plans.findIndex((p) => p.id === planData.id || p.slug.toLowerCase() === slug);

  const mPaise = Math.round(Number(planData.priceMonthlyInPaise ?? planData.priceMonthlyPaise ?? 0));
  const yPaise = Math.round(Number(planData.priceYearlyInPaise ?? planData.priceYearlyPaise ?? mPaise * 10));

  const plan: DynamicPlan = {
    id: planData.id || `plan-${generateId().toLowerCase()}`,
    slug,
    name: planData.name.trim(),
    tagline: planData.tagline || "",
    description: planData.description || "",
    badge: planData.badge || "",
    isPopular: !!planData.isPopular,
    isActive: planData.isActive !== false,
    isPublic: planData.isPublic !== false,
    displayOrder: planData.displayOrder ?? planData.sortOrder ?? (existingIdx >= 0 ? plans[existingIdx].displayOrder : plans.length + 1),
    sortOrder: planData.sortOrder ?? planData.displayOrder ?? (existingIdx >= 0 ? plans[existingIdx].sortOrder : plans.length + 1),
    priceMonthlyInPaise: mPaise,
    priceMonthlyPaise: mPaise,
    priceYearlyInPaise: yPaise,
    priceYearlyPaise: yPaise,
    currency: (planData.currency || "INR").toUpperCase(),
    trialDays: Number(planData.trialDays ?? 14),
    isTrialEnabled: planData.isTrialEnabled !== false,
    features: {
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
      ...(planData.features || {}),
    },
    limits: {
      maxProjects: 5,
      maxActiveProjects: 5,
      maxPhotos: 2500,
      maxVideos: 50,
      maxStorageGb: 15,
      maxCustomDomains: 0,
      maxTeamMembers: 1,
      maxAiCredits: 0,
      maxMonthlyAiJobs: 0,
      ...(planData.limits || {}),
    },
    featureBullets: planData.featureBullets || [],
    createdAt: existingIdx >= 0 ? plans[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    plans[existingIdx] = plan;
  } else {
    plans.push(plan);
  }

  writePlans(plans);
  return plan;
}

export function deletePlan(idOrSlug: string): boolean {
  const plans = readPlans();
  const idx = plans.findIndex((p) => p.id === idOrSlug || p.slug.toLowerCase() === idOrSlug.toLowerCase());
  if (idx < 0) return false;
  plans.splice(idx, 1);
  writePlans(plans);
  return true;
}

// ── Coupons ───────────────────────────────────────────────────────────────────

export function readCoupons(): Coupon[] {
  try {
    if (!fs.existsSync(COUPONS_FILE)) return [];
    const raw = fs.readFileSync(COUPONS_FILE, "utf-8");
    const coupons = JSON.parse(raw) as Coupon[];
    return coupons.map((c) => {
      const tRedeemed = c.timesRedeemed ?? c.redemptionCount ?? 0;
      const dType = c.discountType === "percentage" || c.discountType === "PERCENT" ? "PERCENT" : "FLAT_AMOUNT";
      return {
        ...c,
        discountType: dType,
        timesRedeemed: tRedeemed,
        redemptionCount: tRedeemed,
        allowedPlans: c.allowedPlans || c.applicablePlans || [],
        applicablePlans: c.applicablePlans || c.allowedPlans || [],
      };
    });
  } catch {
    return [];
  }
}

export function writeCoupons(coupons: Coupon[]): void {
  fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2), "utf-8");
}

export function getCouponByCode(code: string): Coupon | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  return readCoupons().find((c) => c.code.toUpperCase() === clean && c.isActive) || null;
}

export function saveCoupon(couponData: Partial<Coupon> & { code: string; discountValue: number }): Coupon {
  const coupons = readCoupons();
  const now = new Date().toISOString();
  const code = couponData.code.trim().toUpperCase();
  const existingIdx = coupons.findIndex((c) => c.id === couponData.id || c.code.toUpperCase() === code);
  const tRedeemed = couponData.timesRedeemed ?? couponData.redemptionCount ?? (existingIdx >= 0 ? coupons[existingIdx].timesRedeemed : 0);
  const dType = couponData.discountType === "percentage" || couponData.discountType === "PERCENT" ? "PERCENT" : "FLAT_AMOUNT";

  const coupon: Coupon = {
    id: couponData.id || `coupon-${generateId().toLowerCase()}`,
    code,
    discountType: dType,
    discountValue: Math.round(Number(couponData.discountValue || 0)),
    currency: (couponData.currency || "INR").toUpperCase(),
    applicablePlans: couponData.applicablePlans || couponData.allowedPlans || [],
    allowedPlans: couponData.allowedPlans || couponData.applicablePlans || [],
    applicableCycles: couponData.applicableCycles || ["MONTHLY", "YEARLY"],
    maxRedemptions: couponData.maxRedemptions,
    timesRedeemed: tRedeemed,
    redemptionCount: tRedeemed,
    validFrom: couponData.validFrom,
    validUntil: couponData.validUntil || couponData.expiresAt,
    expiresAt: couponData.expiresAt || couponData.validUntil,
    isActive: couponData.isActive !== false,
    createdAt: existingIdx >= 0 ? coupons[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    coupons[existingIdx] = coupon;
  } else {
    coupons.push(coupon);
  }

  writeCoupons(coupons);
  return coupon;
}

export function redeemCoupon(code: string): boolean {
  const coupons = readCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon || !coupon.isActive) return false;
  if (coupon.maxRedemptions && (coupon.timesRedeemed || 0) >= coupon.maxRedemptions) return false;
  const expiry = coupon.validUntil || coupon.expiresAt;
  if (expiry && new Date(expiry).getTime() < Date.now()) return false;

  coupon.timesRedeemed = (coupon.timesRedeemed || 0) + 1;
  coupon.redemptionCount = coupon.timesRedeemed;
  writeCoupons(coupons);
  return true;
}

// ── Add-Ons ───────────────────────────────────────────────────────────────────

export function readAddOns(): AddOn[] {
  try {
    if (!fs.existsSync(ADDONS_FILE)) return [];
    const raw = fs.readFileSync(ADDONS_FILE, "utf-8");
    return JSON.parse(raw) as AddOn[];
  } catch {
    return [];
  }
}

export function writeAddOns(addOns: AddOn[]): void {
  fs.writeFileSync(ADDONS_FILE, JSON.stringify(addOns, null, 2), "utf-8");
}

export function getAddOnBySlug(slug: string): AddOn | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  return readAddOns().find((a) => a.slug.toLowerCase() === clean && a.isActive) || null;
}

export function saveAddOn(addonData: Partial<AddOn> & { name: string; slug: string; priceMonthlyInPaise: number }): AddOn {
  const list = readAddOns();
  const now = new Date().toISOString();
  const slug = addonData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  const existingIdx = list.findIndex((a) => a.id === addonData.id || a.slug.toLowerCase() === slug);

  const addon: AddOn = {
    id: addonData.id || `addon-${generateId().toLowerCase()}`,
    slug,
    name: addonData.name.trim(),
    description: addonData.description || "",
    priceMonthlyInPaise: Math.round(Number(addonData.priceMonthlyInPaise || 0)),
    priceYearlyInPaise: Math.round(Number(addonData.priceYearlyInPaise || addonData.priceMonthlyInPaise * 10)),
    currency: (addonData.currency || "INR").toUpperCase(),
    limitBonus: addonData.limitBonus || {},
    featureBonus: addonData.featureBonus || {},
    isActive: addonData.isActive !== false,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = addon;
  } else {
    list.push(addon);
  }

  writeAddOns(list);
  return addon;
}

// ── Billing Events (Idempotency Ledger) ───────────────────────────────────────

export function readBillingEvents(): BillingEvent[] {
  try {
    if (!fs.existsSync(BILLING_EVENTS_FILE)) return [];
    const raw = fs.readFileSync(BILLING_EVENTS_FILE, "utf-8");
    return JSON.parse(raw) as BillingEvent[];
  } catch {
    return [];
  }
}

export function writeBillingEvents(events: BillingEvent[]): void {
  fs.writeFileSync(BILLING_EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
}

export function isBillingEventProcessed(providerEventId: string): boolean {
  if (!providerEventId) return false;
  return readBillingEvents().some((e) => e.providerEventId === providerEventId && (e.status === "processed" || !e.status));
}

export function recordBillingEvent(event: Omit<BillingEvent, "id" | "processedAt">): BillingEvent {
  const events = readBillingEvents();
  const record: BillingEvent = {
    ...event,
    status: event.status || "processed",
    id: `be-${generateId().toLowerCase()}`,
    processedAt: new Date().toISOString(),
  };
  events.unshift(record);
  writeBillingEvents(events);
  return record;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function readSubscriptions(): Subscription[] {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8");
    return JSON.parse(raw) as Subscription[];
  } catch {
    return [];
  }
}

export function writeSubscriptions(subs: Subscription[]): void {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
}

export function getSubscription(photographerId: string): Subscription | null {
  if (!photographerId || typeof photographerId !== "string" || photographerId === "[object Object]") {
    return null;
  }
  const subs = readSubscriptions();
  const sub = subs.find((s) => s.photographerId === photographerId);
  if (sub) return sub;

  // If default photographer has no subscription yet, create default PRO
  if (photographerId === DEFAULT_PHOTOGRAPHER_ID) {
    const defaultSub: Subscription = {
      id: "sub-default-pro",
      photographerId: DEFAULT_PHOTOGRAPHER_ID,
      plan: "PRO",
      planSlug: "pro",
      status: "ACTIVE",
      billingCycle: "YEARLY",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSubscription(defaultSub);
    return defaultSub;
  }

  // Fallback 14-day TRIAL plan for newly created tenants
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const freeSub: Subscription = {
    id: `sub-${photographerId}`,
    photographerId,
    plan: "PRO", // Free trial of PRO features
    planSlug: "pro",
    status: "TRIAL",
    billingCycle: "MONTHLY",
    trialStart: now.toISOString(),
    trialEnd: trialEnd.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: trialEnd.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  saveSubscription(freeSub);
  return freeSub;
}

export function saveSubscription(sub: Subscription): Subscription {
  if (
    !sub ||
    typeof sub.id !== "string" ||
    !sub.photographerId ||
    typeof sub.photographerId !== "string" ||
    sub.id.includes("[object Object]") ||
    sub.photographerId.includes("[object Object]")
  ) {
    console.error("Invalid subscription rejected in saveSubscription:", sub);
    return sub;
  }
  const list = readSubscriptions();
  const idx = list.findIndex((s) => s.photographerId === sub.photographerId);
  sub.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = sub;
  } else {
    list.push(sub);
  }
  writeSubscriptions(list);
  return sub;
}

export function updateSubscriptionPlanAndPeriod(
  arg1: any,
  planArg?: string,
  planSlugArg?: string,
  currentPeriodEndArg?: string,
  statusArg?: SubscriptionStatus,
  billingCycleArg?: BillingCycle
): Subscription {
  let photographerId: string;
  let plan: string;
  let planSlug: string;
  let billingCycle: BillingCycle;
  let status: SubscriptionStatus;
  let currentPeriodStart: string;
  let currentPeriodEnd: string;
  let razorpaySubscriptionId: string | undefined;
  let razorpayOrderId: string | undefined;
  let planSnapshot: any;
  let appliedCoupon: string | undefined;
  let discountInPaise: number | undefined;

  if (typeof arg1 === "object" && arg1 !== null) {
    photographerId = arg1.photographerId;
    plan = (arg1.plan || "PRO").toUpperCase();
    planSlug = (arg1.planSlug || "pro").toLowerCase();
    billingCycle = (arg1.billingCycle || "MONTHLY").toUpperCase() as BillingCycle;
    status = arg1.status || "ACTIVE";
    currentPeriodStart = arg1.currentPeriodStart || new Date().toISOString();
    currentPeriodEnd = arg1.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    razorpaySubscriptionId = arg1.razorpaySubscriptionId;
    razorpayOrderId = arg1.razorpayOrderId;
    planSnapshot = arg1.planSnapshot;
    appliedCoupon = arg1.appliedCoupon;
    discountInPaise = arg1.discountInPaise;
  } else {
    photographerId = String(arg1);
    plan = (planArg || "PRO").toUpperCase();
    planSlug = (planSlugArg || "pro").toLowerCase();
    status = statusArg || "ACTIVE";
    billingCycle = (billingCycleArg || "MONTHLY").toUpperCase() as BillingCycle;
    currentPeriodStart = new Date().toISOString();
    currentPeriodEnd = currentPeriodEndArg || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const sub = getSubscription(photographerId);
  const updated: Subscription = {
    ...(sub || {
      id: `sub-${generateId().toLowerCase()}`,
      photographerId,
      createdAt: new Date().toISOString(),
    }),
    plan,
    planSlug,
    billingCycle,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: undefined,
    razorpaySubscriptionId: razorpaySubscriptionId || sub?.razorpaySubscriptionId,
    razorpayOrderId: razorpayOrderId || sub?.razorpayOrderId,
    planSnapshot: planSnapshot || sub?.planSnapshot,
    appliedCoupon: appliedCoupon || sub?.appliedCoupon,
    discountInPaise: discountInPaise || sub?.discountInPaise,
    updatedAt: new Date().toISOString(),
  };
  return saveSubscription(updated);
}

export function extendSubscriptionPeriod(
  photographerId: string,
  extraDays: number,
  adminId?: string,
  reason?: string
): Subscription | null {
  const sub = getSubscription(photographerId);
  if (!sub) return null;

  const currentEnd = new Date(sub.currentPeriodEnd).getTime();
  const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
  const newEnd = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000).toISOString();

  sub.currentPeriodEnd = newEnd;
  sub.status = "ACTIVE";
  sub.cancelAtPeriodEnd = false;
  sub.updatedAt = new Date().toISOString();

  saveSubscription(sub);

  if (adminId) {
    recordAdminAuditLog({
      adminId,
      adminEmail: "admin",
      action: "EXTEND_SUBSCRIPTION",
      targetType: "subscription",
      targetId: sub.id,
      metadata: { photographerId, extraDays, oldEnd: new Date(currentEnd).toISOString(), newEnd, reason },
      result: "success",
    });
  }

  return sub;
}

export function grantCompSubscription(
  dataOrPhotographerId:
    | {
        photographerId: string;
        planSlug: string;
        durationDays: number;
        reason: string;
        adminId?: string;
        adminEmail?: string;
      }
    | string,
  planSlugArg?: string,
  durationDaysArg?: number,
  reasonArg?: string,
  adminIdArg?: string,
  adminEmailArg?: string
): Subscription | null {
  let photographerId = "";
  let planSlug = "";
  let durationDays = 30;
  let reason = "Admin complimentary grant";
  let adminId = "admin";
  let adminEmail = "admin@platform.internal";

  if (typeof dataOrPhotographerId === "object" && dataOrPhotographerId !== null) {
    photographerId = dataOrPhotographerId.photographerId;
    planSlug = dataOrPhotographerId.planSlug;
    durationDays = dataOrPhotographerId.durationDays ?? 30;
    reason = dataOrPhotographerId.reason || reason;
    adminId = dataOrPhotographerId.adminId || adminId;
    adminEmail = dataOrPhotographerId.adminEmail || adminEmail;
  } else {
    photographerId = dataOrPhotographerId;
    planSlug = planSlugArg || "pro";
    durationDays = durationDaysArg ?? 30;
    reason = reasonArg || reason;
    adminId = adminIdArg || adminId;
    adminEmail = adminEmailArg || adminEmail;
  }

  const plan = getPlanBySlug(planSlug);
  if (!plan) return null;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const sub = getSubscription(photographerId);
  const updated: Subscription = {
    ...(sub || {
      id: `sub-${generateId().toLowerCase()}`,
      photographerId: photographerId,
      createdAt: now.toISOString(),
    }),
    plan: plan.name.toUpperCase(),
    planSlug: plan.slug,
    status: "ACTIVE",
    billingCycle: "YEARLY",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    isComp: true,
    compReason: reason,
    planSnapshot: {
      name: plan.name,
      pricePaidInPaise: 0,
      billingCycle: "YEARLY",
      currency: plan.currency,
    },
    updatedAt: now.toISOString(),
  };

  saveSubscription(updated);

  recordAdminAuditLog({
    adminId,
    adminEmail,
    action: "GRANT_COMP_SUBSCRIPTION",
    targetType: "subscription",
    targetId: updated.id,
    metadata: { photographerId, plan: plan.slug, durationDays, reason },
    result: "success",
  });

  return updated;
}

export function setTenantEntitlementOverride(
  dataOrPhotographerId:
    | {
        photographerId: string;
        features?: Partial<PlanFeatures>;
        limits?: Partial<PlanLimits>;
        expiresAt?: string;
        grantedBy?: string;
        reason?: string;
      }
    | string,
  overrideArg?: {
    features?: Partial<PlanFeatures>;
    limits?: Partial<PlanLimits>;
    expiresAt?: string;
    grantedBy?: string;
    grantedAt?: string;
    reason?: string;
  },
  adminIdArg?: string,
  reasonArg?: string
): Subscription | null {
  let photographerId = "";
  let features: Partial<PlanFeatures> | undefined;
  let limits: Partial<PlanLimits> | undefined;
  let expiresAt: string | undefined;
  let grantedBy = "admin";
  let reason = "Super Admin manual override";

  if (typeof dataOrPhotographerId === "object" && dataOrPhotographerId !== null) {
    photographerId = typeof dataOrPhotographerId.photographerId === "string" ? dataOrPhotographerId.photographerId : "";
    features = dataOrPhotographerId.features;
    limits = dataOrPhotographerId.limits;
    expiresAt = dataOrPhotographerId.expiresAt;
    grantedBy = dataOrPhotographerId.grantedBy || grantedBy;
    reason = dataOrPhotographerId.reason || reason;
  } else if (typeof dataOrPhotographerId === "string") {
    photographerId = dataOrPhotographerId;
    if (overrideArg) {
      features = overrideArg.features;
      limits = overrideArg.limits;
      expiresAt = overrideArg.expiresAt;
      grantedBy = overrideArg.grantedBy || adminIdArg || grantedBy;
      reason = overrideArg.reason || reasonArg || reason;
    }
  }

  if (!photographerId || typeof photographerId !== "string" || photographerId === "[object Object]") {
    return null;
  }

  const sub = getSubscription(photographerId);
  if (!sub) return null;

  sub.entitlementOverride = {
    features,
    limits,
    grantedAt: new Date().toISOString(),
    expiresAt,
    grantedBy,
    reason,
  };
  sub.updatedAt = new Date().toISOString();

  saveSubscription(sub);

  recordAdminAuditLog({
    adminId: grantedBy,
    adminEmail: "admin",
    action: "SET_ENTITLEMENT_OVERRIDE",
    targetType: "subscription",
    targetId: sub.id,
    metadata: { photographerId, overrides: sub.entitlementOverride },
    result: "success",
  });

  return sub;
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function readInvoices(): InvoiceRecord[] {
  try {
    if (!fs.existsSync(INVOICES_FILE)) return [];
    const raw = fs.readFileSync(INVOICES_FILE, "utf-8");
    return JSON.parse(raw) as InvoiceRecord[];
  } catch {
    return [];
  }
}

export function writeInvoices(invoices: InvoiceRecord[]): void {
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), "utf-8");
}

export function getInvoicesByPhotographer(photographerId: string): InvoiceRecord[] {
  return readInvoices()
    .filter((inv) => inv.photographerId === photographerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const getInvoices = getInvoicesByPhotographer;
export const addInvoice = createInvoiceRecord;

export function createInvoiceRecord(data: {
  id?: string;
  photographerId: string;
  subscriptionId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  plan?: string;
  planName?: string;
  amount?: number;
  amountPaise?: number;
  subtotalInPaise?: number;
  discountInPaise?: number;
  taxInPaise?: number;
  currency?: string;
  billingPeriod?: string;
  periodStart?: string;
  periodEnd?: string;
  billingCycle?: BillingCycle | string;
  couponCode?: string;
  status?: "paid" | "failed" | "pending" | "refunded" | "PAID";
  description?: string;
  createdAt?: string;
}): InvoiceRecord {
  const invoices = readInvoices();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSeq = crypto.randomInt(1000, 10000);
  const invoiceNumber = data.invoiceNumber || `INV-${yearMonth}-${randomSeq}`;

  const subtotal = data.subtotalInPaise ?? data.amountPaise ?? (data.amount !== undefined ? Math.round(data.amount * 100) : 0);
  const discount = data.discountInPaise || 0;
  const tax = data.taxInPaise || 0;
  const totalPaise = Math.max(0, subtotal - discount + tax);
  const planStr = (data.plan || data.planName || "PRO").toUpperCase();

  const invoice: InvoiceRecord = {
    id: data.id || `inv-${generateId().toLowerCase()}`,
    photographerId: data.photographerId,
    subscriptionId: data.subscriptionId,
    invoiceNumber,
    paymentId: data.paymentId || data.razorpayPaymentId || `pay-${generateId().slice(0, 8)}`,
    razorpayPaymentId: data.razorpayPaymentId,
    razorpayOrderId: data.razorpayOrderId,
    subtotalInPaise: subtotal,
    discountInPaise: discount,
    taxInPaise: tax,
    amountInPaise: totalPaise,
    amountPaise: totalPaise,
    amount: data.amount !== undefined ? data.amount : totalPaise / 100, // Legacy display amount in INR
    currency: (data.currency || "INR").toUpperCase(),
    status: (data.status?.toLowerCase() === "paid" || data.status === "PAID" ? "paid" : (data.status as any)) || "paid",
    plan: planStr,
    planName: data.planName || data.plan || planStr,
    billingPeriod: data.billingPeriod || (data.periodStart && data.periodEnd ? `${data.periodStart} - ${data.periodEnd}` : undefined),
    billingCycle: (data.billingCycle?.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY") as any,
    couponCode: data.couponCode,
    createdAt: data.createdAt || now.toISOString(),
  };

  invoices.unshift(invoice);
  writeInvoices(invoices);
  return invoice;
}

// Webhook Idempotency
export function readWebhookEvents(): Array<{ id: string; eventType?: string; status?: string; provider?: string; processedAt: string; [key: string]: any }> {
  try {
    if (!fs.existsSync(WEBHOOK_EVENTS_FILE)) return [];
    const raw = fs.readFileSync(WEBHOOK_EVENTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isWebhookProcessed(eventId: string): boolean {
  if (!eventId) return false;
  const events = readWebhookEvents();
  return events.some((e) => e.id === eventId);
}

export function recordWebhookProcessed(
  eventIdOrObj: string | { id?: string; eventId?: string; eventType?: string; status?: string; [key: string]: any },
  eventType?: string
): void {
  if (!eventIdOrObj) return;
  const events = readWebhookEvents();
  let eventRecord: any;
  if (typeof eventIdOrObj === "string") {
    if (events.some((e) => e.id === eventIdOrObj)) return;
    eventRecord = {
      id: eventIdOrObj,
      eventType,
      processedAt: new Date().toISOString(),
      status: "success",
    };
  } else {
    const id = eventIdOrObj.id || eventIdOrObj.eventId || `wb_${Date.now()}`;
    eventRecord = {
      id,
      ...eventIdOrObj,
      processedAt: eventIdOrObj.createdAt || new Date().toISOString(),
    };
  }
  events.push(eventRecord);
  // Cap at 1000 recent events
  if (events.length > 1000) events.shift();
  fs.writeFileSync(WEBHOOK_EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
}

export const readWebhooks = readWebhookEvents;

// Team Members
export function readTeamMembers(): TeamMember[] {
  try {
    if (!fs.existsSync(TEAM_MEMBERS_FILE)) return [];
    const raw = fs.readFileSync(TEAM_MEMBERS_FILE, "utf-8");
    return JSON.parse(raw) as TeamMember[];
  } catch {
    return [];
  }
}

export function writeTeamMembers(members: TeamMember[]): void {
  fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(members, null, 2), "utf-8");
}

export function getTeamMembersByPhotographer(photographerId: string): TeamMember[] {
  return readTeamMembers().filter((m) => m.photographerId === photographerId);
}

export function getTeamMemberById(memberId: string): TeamMember | undefined {
  return readTeamMembers().find((m) => m.id === memberId);
}

export function getTeamMemberByEmail(email: string, photographerId?: string): TeamMember | undefined {
  const normEmail = (email || "").trim().toLowerCase();
  const all = readTeamMembers();
  if (photographerId) {
    return all.find((m) => m.email.toLowerCase() === normEmail && m.photographerId === photographerId);
  }
  return all.find((m) => m.email.toLowerCase() === normEmail);
}

export function getTeamMemberByInviteToken(token: string): TeamMember | undefined {
  if (!token) return undefined;
  return readTeamMembers().find((m) => m.inviteToken === token);
}

export function generateTeamInviteToken(): { token: string; expires: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  return { token, expires };
}

export function addTeamMember(member: Partial<TeamMember> & {
  photographerId: string;
  name: string;
  email: string;
  role: TeamRole;
}): TeamMember {
  const list = readTeamMembers();
  const normEmail = member.email.trim().toLowerCase();
  
  // Check if member with email already exists for this photographer
  const existingIdx = list.findIndex((m) => m.email.toLowerCase() === normEmail && m.photographerId === member.photographerId);
  
  const invite = generateTeamInviteToken();
  const newMember: TeamMember = {
    id: member.id || generateId(),
    photographerId: member.photographerId,
    name: member.name.trim(),
    email: normEmail,
    role: member.role || "editor",
    status: member.status || "invited",
    passwordHash: member.passwordHash,
    inviteToken: member.inviteToken !== undefined ? member.inviteToken : invite.token,
    inviteTokenExpires: member.inviteTokenExpires !== undefined ? member.inviteTokenExpires : invite.expires,
    assignedProjectIds: member.assignedProjectIds || [],
    hasAllProjectsAccess: member.hasAllProjectsAccess !== undefined ? member.hasAllProjectsAccess : false,
    permissions: member.permissions || undefined,
    tokenVersion: member.tokenVersion || 1,
    invitedAt: member.invitedAt || new Date().toISOString(),
    joinedAt: member.joinedAt,
    lastLoginAt: member.lastLoginAt,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newMember };
  } else {
    list.push(newMember);
  }

  writeTeamMembers(list);
  return newMember;
}

export function updateTeamMember(
  memberId: string,
  photographerId: string,
  updates: Partial<TeamMember>
): TeamMember | null {
  const list = readTeamMembers();
  const idx = list.findIndex((m) => m.id === memberId && m.photographerId === photographerId);
  if (idx === -1) return null;

  const current = list[idx];
  const updated: TeamMember = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  list[idx] = updated;
  writeTeamMembers(list);
  return updated;
}

export function removeTeamMember(memberId: string, photographerId: string): boolean {
  const list = readTeamMembers();
  const filtered = list.filter((m) => !(m.id === memberId && m.photographerId === photographerId));
  if (filtered.length === list.length) return false;
  writeTeamMembers(filtered);
  return true;
}

export function acceptTeamInvite(
  token: string,
  passwordHash: string,
  name?: string
): { success: boolean; member?: TeamMember; error?: string } {
  const list = readTeamMembers();
  const member = list.find((m) => m.inviteToken === token);

  if (!member) {
    return { success: false, error: "Invalid or expired invitation token." };
  }

  if (member.inviteTokenExpires && new Date(member.inviteTokenExpires).getTime() < Date.now()) {
    return { success: false, error: "This invitation link has expired. Please ask your studio owner to resend it." };
  }

  member.status = "active";
  member.passwordHash = passwordHash;
  if (name && name.trim()) {
    member.name = name.trim();
  }
  member.inviteToken = undefined;
  member.inviteTokenExpires = undefined;
  member.joinedAt = new Date().toISOString();
  member.tokenVersion = (member.tokenVersion || 0) + 1;
  member.updatedAt = new Date().toISOString();

  writeTeamMembers(list);
  return { success: true, member };
}

// Custom Domains Scoped
export function getDomainsByPhotographer(photographerId: string): DomainMapping[] {
  return readDomains().filter((d) => (d.photographerId || DEFAULT_PHOTOGRAPHER_ID) === photographerId);
}

// Client Management CRM Aggregation
export function getAllClientsSummary(photographerId: string): ClientSummary[] {
  const projects = getProjectsByPhotographer(photographerId);
  return projects.map((p) => {
    const favorites = getFavorites(p.id);
    const selections = getSelections(p.id);
    const activities = getProjectActivity(p.id);
    const lastActivity = activities.length > 0 ? activities[0].timestamp : p.updatedAt || p.createdAt;

    const selConfig = p.settings?.selectionConfig;
    const selectionStatus = selConfig?.status || (selConfig?.enabled ? "OPEN" : "LOCKED");

    return {
      projectId: p.id,
      coupleName: p.coupleName,
      weddingDate: p.weddingDate,
      weddingLocation: p.branding?.weddingLocation || "",
      packageType: p.packageType || "Full Wedding Cinema",
      accessCode: p.accessCode,
      status: p.status,
      selectionStatus: selectionStatus as SelectionStatus,
      selectionCount: selections.length,
      selectionLimit: selConfig?.limit || 20,
      favoritesCount: favorites.length,
      totalPhotos: p.photoFiles?.length || 0,
      totalVideos: p.videoFiles?.length || 0,
      lastActivity,
      coverImage: p.coverImage || p.photoFiles?.[0]?.thumbnailUrl,
    };
  });
}

// ── Super Admin Control Center Entities & Queries ────────────────────────────

// Audit Logs
export function readAuditLogs(): AdminAuditLog[] {
  try {
    if (!fs.existsSync(AUDIT_LOGS_FILE)) return [];
    const raw = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
    return JSON.parse(raw) as AdminAuditLog[];
  } catch {
    return [];
  }
}

export const readAdminAuditLogs = readAuditLogs;

export function writeAuditLogs(logs: AdminAuditLog[]): void {
  fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

export function recordAdminAuditLog(data: Omit<AdminAuditLog, "id" | "timestamp">): AdminAuditLog {
  const list = readAuditLogs();
  const newLog: AdminAuditLog = {
    id: `audit-${generateId().toLowerCase()}`,
    ...data,
    timestamp: new Date().toISOString(),
  };
  list.unshift(newLog);
  // Keep last 1000 logs
  if (list.length > 1000) list.splice(1000);
  writeAuditLogs(list);
  return newLog;
}

export function getAdminAuditLogs(options?: {
  targetType?: string;
  targetId?: string;
  adminId?: string;
  limit?: number;
}): AdminAuditLog[] {
  let logs = readAuditLogs();
  if (options?.targetType) {
    logs = logs.filter((l) => l.targetType === options.targetType);
  }
  if (options?.targetId) {
    logs = logs.filter((l) => l.targetId === options.targetId);
  }
  if (options?.adminId) {
    logs = logs.filter((l) => l.adminId === options.adminId);
  }
  if (options?.limit && options.limit > 0) {
    logs = logs.slice(0, options.limit);
  }
  return logs;
}

// Support Notes
export function readSupportNotes(): SupportNote[] {
  try {
    if (!fs.existsSync(SUPPORT_NOTES_FILE)) return [];
    const raw = fs.readFileSync(SUPPORT_NOTES_FILE, "utf-8");
    return JSON.parse(raw) as SupportNote[];
  } catch {
    return [];
  }
}

export function writeSupportNotes(notes: SupportNote[]): void {
  fs.writeFileSync(SUPPORT_NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
}

export function getSupportNotesByPhotographer(photographerId: string): SupportNote[] {
  return readSupportNotes()
    .filter((n) => n.photographerId === photographerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addSupportNote(
  photographerId: string,
  authorId: string,
  authorName: string,
  note: string
): SupportNote {
  const notes = readSupportNotes();
  const newNote: SupportNote = {
    id: `note-${generateId().toLowerCase()}`,
    photographerId,
    authorId,
    authorName,
    note,
    createdAt: new Date().toISOString(),
  };
  notes.unshift(newNote);
  writeSupportNotes(notes);
  return newNote;
}

// Support Tickets
export function readSupportTickets(): SupportTicket[] {
  try {
    if (!fs.existsSync(SUPPORT_TICKETS_FILE)) return [];
    const raw = fs.readFileSync(SUPPORT_TICKETS_FILE, "utf-8");
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

export function writeSupportTickets(tickets: SupportTicket[]): void {
  fs.writeFileSync(SUPPORT_TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf-8");
}

export function getSupportTickets(filter?: {
  status?: string;
  photographerId?: string;
  priority?: string;
}): SupportTicket[] {
  let tickets = readSupportTickets();
  if (filter?.status && filter.status !== "all") {
    tickets = tickets.filter((t) => t.status === filter.status);
  }
  if (filter?.photographerId) {
    tickets = tickets.filter((t) => t.photographerId === filter.photographerId);
  }
  if (filter?.priority && filter.priority !== "all") {
    tickets = tickets.filter((t) => t.priority === filter.priority);
  }
  return tickets.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function createSupportTicket(
  data: Omit<SupportTicket, "id" | "createdAt" | "updatedAt">
): SupportTicket {
  const tickets = readSupportTickets();
  const now = new Date().toISOString();
  const newTicket: SupportTicket = {
    id: `ticket-${generateId().toLowerCase()}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  tickets.unshift(newTicket);
  writeSupportTickets(tickets);
  return newTicket;
}

export function updateSupportTicket(
  ticketId: string,
  updates: Partial<SupportTicket>
): SupportTicket | null {
  const tickets = readSupportTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx < 0) return null;
  tickets[idx] = {
    ...tickets[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeSupportTickets(tickets);
  return tickets[idx];
}

// Photographer Lifecycle (Suspend, Reactivate, Soft Delete)
export function suspendPhotographer(
  photographerId: string,
  reason: string,
  suspendedBy: string
): PhotographerAccount | null {
  const photographers = readPhotographers();
  const p = photographers.find((item) => item.id === photographerId);
  if (!p) return null;

  p.status = "suspended";
  p.suspendedAt = new Date().toISOString();
  p.suspensionReason = reason;
  p.suspendedBy = suspendedBy;
  p.tokenVersion = (p.tokenVersion || 1) + 1; // Instant session invalidation
  p.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return p;
}

export function reactivatePhotographer(
  photographerId: string,
  _reactivatedBy: string
): PhotographerAccount | null {
  const photographers = readPhotographers();
  const p = photographers.find((item) => item.id === photographerId);
  if (!p) return null;

  p.status = "active";
  p.suspendedAt = undefined;
  p.suspensionReason = undefined;
  p.suspendedBy = undefined;
  p.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return p;
}

export function softDeletePhotographer(
  photographerId: string,
  deletedBy: string
): PhotographerAccount | null {
  const photographers = readPhotographers();
  const p = photographers.find((item) => item.id === photographerId);
  if (!p) return null;

  p.status = "pending_deletion";
  p.deletedAt = new Date().toISOString();
  p.deletedBy = deletedBy;
  p.tokenVersion = (p.tokenVersion || 1) + 1; // Instant session invalidation
  p.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return p;
}

// Plan Overrides
export function setAdminPlanOverride(
  photographerId: string,
  plan: SubscriptionPlanTier,
  expiresAt: string,
  reason: string,
  grantedBy: string
): PhotographerAccount | null {
  const photographers = readPhotographers();
  const p = photographers.find((item) => item.id === photographerId);
  if (!p) return null;

  p.adminPlanOverride = {
    plan,
    grantedAt: new Date().toISOString(),
    expiresAt,
    reason,
    grantedBy,
  };
  p.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return p;
}

export function revokeAdminPlanOverride(
  photographerId: string,
  _revokedBy: string
): PhotographerAccount | null {
  const photographers = readPhotographers();
  const p = photographers.find((item) => item.id === photographerId);
  if (!p) return null;

  p.adminPlanOverride = undefined;
  p.updatedAt = new Date().toISOString();

  writePhotographers(photographers);
  return p;
}

// Global Invoices & Subscriptions
export function getAllInvoices(): InvoiceRecord[] {
  return readInvoices().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getAllSubscriptions(): Subscription[] {
  const subs = readSubscriptions();
  const seenIds = new Set<string>();
  const valid: Subscription[] = [];
  for (const s of subs) {
    if (!s || typeof s.id !== "string" || typeof s.photographerId !== "string") continue;
    if (s.id.includes("[object Object]") || s.photographerId.includes("[object Object]")) continue;
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    valid.push(s);
  }
  return valid;
}

// Platform Overview Metrics
export function getPlatformOverviewMetrics(): PlatformOverviewMetrics {
  const photographers = readPhotographers().filter((p) => p.role !== "platform_admin");
  const allProjects = readProjects();
  const subscriptions = getAllSubscriptions();
  const invoices = readInvoices();

  const totalPhotographers = photographers.length;
  const activePhotographers = photographers.filter((p) => (p.status || "active") === "active").length;
  const suspendedPhotographers = photographers.filter((p) => p.status === "suspended").length;
  const trialPhotographers = subscriptions.filter((s) => s.status === "TRIAL").length;

  const totalWeddings = allProjects.length;
  const liveGalleries = allProjects.filter((p) => p.status === "published").length;

  let totalPhotos = 0;
  let totalVideos = 0;
  let totalBytes = 0;

  for (const p of allProjects) {
    if (p.photoFiles) {
      totalPhotos += p.photoFiles.length;
      for (const f of p.photoFiles) {
        if (f.sizeBytes) totalBytes += f.sizeBytes;
      }
    }
    if (p.videoFiles) {
      totalVideos += p.videoFiles.length;
      for (const v of p.videoFiles) {
        if (v.sizeBytes) totalBytes += v.sizeBytes;
      }
    }
  }

  const totalStorageGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const pastDueSubscriptions = subscriptions.filter((s) => s.status === "PAST_DUE").length;

  const dynamicPlans = readPlans();
  const planPrices: Record<string, number> = {};
  for (const dp of dynamicPlans) {
    planPrices[dp.slug.toUpperCase()] = (dp.priceMonthlyPaise || 0) / 100;
    planPrices[dp.slug.toLowerCase()] = (dp.priceMonthlyPaise || 0) / 100;
  }

  let mrrInr = 0;
  for (const sub of subscriptions) {
    if (sub.status === "ACTIVE") {
      const planKey = (sub.plan || "").toString();
      mrrInr += planPrices[planKey.toUpperCase()] ?? planPrices[planKey.toLowerCase()] ?? 0;
    }
  }

  const arrInr = mrrInr * 12;

  const paidInvoices = invoices.filter((inv) => (inv.status || "").toUpperCase() === "PAID");
  const totalRevenueInr = paidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const failedPaymentsCount = invoices.filter((inv) => (inv.status || "").toLowerCase() === "failed").length;

  let failedWebhooksCount = 0;
  try {
    const webhooks = readWebhooks();
    failedWebhooksCount = webhooks.filter((w) => (w.status || "").toLowerCase() === "failed").length;
  } catch {}

  let failedNotificationsCount = 0;
  try {
    const notifications = readNotifications();
    failedNotificationsCount = notifications.filter((n) => (n.status || "").toUpperCase() === "FAILED").length;
  } catch {}

  let openAlertsCount = 0;
  try {
    const alerts = readAlerts();
    openAlertsCount = alerts.filter((a) => a.status === "OPEN" || a.status === "ACKNOWLEDGED").length;
  } catch {}

  return {
    totalPhotographers,
    activePhotographers,
    suspendedPhotographers,
    trialPhotographers,
    totalWeddings,
    liveGalleries,
    totalPhotos,
    totalVideos,
    totalStorageGb,
    activeSubscriptions,
    pastDueSubscriptions,
    mrrInr,
    arrInr,
    totalRevenueInr,
    failedPaymentsCount,
    failedWebhooksCount,
    failedNotificationsCount,
    openAlertsCount,
  };
}

// Photographer Directory with Rich Filters
export function getAllPhotographersWithStats(options?: {
  search?: string;
  status?: string;
  plan?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const photographers = readPhotographers().filter((p) => p.role !== "platform_admin");
  const projects = readProjects();
  const subscriptions = readSubscriptions();
  const domains = readDomains();

  const results = photographers.map((p) => {
    const pProjects = projects.filter((proj) => proj.photographerId === p.id);
    const sub = subscriptions.find((s) => s.photographerId === p.id);
    const pDomains = domains.filter((d) => d.photographerId === p.id);

    const isOverride = !!(p.adminPlanOverride && new Date(p.adminPlanOverride.expiresAt) > new Date());
    const effectivePlan = isOverride
      ? p.adminPlanOverride!.plan
      : sub?.plan || p.plan || "FREE";

    let photoCount = 0;
    let videoCount = 0;
    let totalSizeBytes = 0;

    for (const proj of pProjects) {
      photoCount += proj.photoFiles?.length || 0;
      videoCount += proj.videoFiles?.length || 0;
      proj.photoFiles?.forEach((f) => {
        if (f.sizeBytes) totalSizeBytes += f.sizeBytes;
        else if (f.size) { const s = parseInt(f.size, 10); if (!isNaN(s)) totalSizeBytes += s; }
      });
      proj.videoFiles?.forEach((v) => {
        if (v.sizeBytes) totalSizeBytes += v.sizeBytes;
        else if (v.size) { const s = parseInt(v.size, 10); if (!isNaN(s)) totalSizeBytes += s; }
      });
    }

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      studioName: p.studioName || "",
      status: p.status || "active",
      role: p.role,
      plan: effectivePlan,
      isOverride,
      adminPlanOverride: p.adminPlanOverride,
      subscriptionStatus: sub?.status || "ACTIVE",
      currentPeriodEnd: sub?.currentPeriodEnd,
      totalWeddings: pProjects.length,
      publishedWeddings: pProjects.filter((proj) => proj.status === "published").length,
      totalPhotos: photoCount,
      totalVideos: videoCount,
      totalStorageGb: Number((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)),
      customDomain: pDomains.find((d) => d.status === "active" || d.verificationStatus === "verified")?.hostname || null,
      suspendedAt: p.suspendedAt,
      suspensionReason: p.suspensionReason,
      createdAt: p.createdAt,
      lastActive: p.updatedAt || p.createdAt,
    };
  });

  let filtered = results;

  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.studioName || "").toLowerCase().includes(q) ||
        (p.customDomain && p.customDomain.toLowerCase().includes(q))
    );
  }

  if (options?.status && options.status !== "all") {
    filtered = filtered.filter((p) => {
      if (options.status === "suspended") return p.status === "suspended";
      if (options.status === "active") return p.status === "active";
      if (options.status === "trial") return p.subscriptionStatus === "TRIAL";
      if (options.status === "past_due") return p.subscriptionStatus === "PAST_DUE";
      if (options.status === "cancelled") return p.subscriptionStatus === "CANCELLED";
      return true;
    });
  }

  if (options?.plan && options.plan !== "all") {
    filtered = filtered.filter((p) => p.plan === (options?.plan || "").toUpperCase());
  }

  if (options?.sortBy) {
    const order = options.sortOrder === "asc" ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      const valA = a[options.sortBy!] || "";
      const valB = b[options.sortBy!] || "";
      if (typeof valA === "number" && typeof valB === "number") {
        return (valA - valB) * order;
      }
      return String(valA).localeCompare(String(valB)) * order;
    });
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return filtered;
}

// Photographer Detail with Full Stats
export function getPhotographerDetailWithFullStats(photographerId: string) {
  const photographer = getPhotographerById(photographerId);
  if (!photographer) return null;

  const projects = getProjectsByPhotographer(photographerId);
  const subscription = getSubscription(photographerId);
  const invoices = getInvoices(photographerId);
  const domains = getDomainsByPhotographer(photographerId);
  const notes = getSupportNotesByPhotographer(photographerId);
  const tickets = getSupportTickets({ photographerId });
  const auditLogs = getAdminAuditLogs({ targetType: "photographer", targetId: photographerId });

  let totalPhotos = 0;
  let totalVideos = 0;
  let totalStorageBytes = 0;

  for (const proj of projects) {
    totalPhotos += proj.photoFiles?.length || 0;
    totalVideos += proj.videoFiles?.length || 0;
    proj.photoFiles?.forEach((f) => {
      if (f.sizeBytes) totalStorageBytes += f.sizeBytes;
      else if (f.size) { const s = parseInt(f.size, 10); if (!isNaN(s)) totalStorageBytes += s; }
    });
    proj.videoFiles?.forEach((v) => {
      if (v.sizeBytes) totalStorageBytes += v.sizeBytes;
      else if (v.size) { const s = parseInt(v.size, 10); if (!isNaN(s)) totalStorageBytes += s; }
    });
  }

  return {
    photographer,
    stats: {
      totalWeddings: projects.length,
      publishedWeddings: projects.filter((p) => p.status === "published").length,
      draftWeddings: projects.filter((p) => p.status === "draft").length,
      archivedWeddings: projects.filter((p) => p.status === "archived").length,
      totalPhotos,
      totalVideos,
      totalStorageGb: Number((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)),
    },
    subscription,
    invoices,
    domains,
    projects: projects.map((p) => ({
      id: p.id,
      coupleName: p.coupleName,
      weddingDate: p.weddingDate,
      status: p.status,
      accessCode: p.accessCode,
      photoCount: p.photoFiles?.length || 0,
      videoCount: p.videoFiles?.length || 0,
      coverImage: p.coverImage || p.photoFiles?.[0]?.thumbnailUrl,
      updatedAt: p.updatedAt || p.createdAt,
      createdAt: p.createdAt,
    })),
    notes,
    tickets,
    auditLogs,
  };
}

// ── Google AdSense & Platform Ad Management System ────────────────────────────

export const DEFAULT_ADSENSE_CONFIG: AdSenseConfig = {
  publisherId: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "",
  enabled: false,
  testMode: false,
  autoAdsEnabled: false,
  manualAdsEnabled: false,
  clientGalleryAdsEnabled: false,
  safetyMode: false,
  maxAdsPerPage: 3,
  minSpacingPx: 300,
  reportingConnected: false,
  updatedAt: new Date().toISOString(),
  updatedBy: "Platform Initializer",
};

export const INITIAL_AD_UNITS: AdUnit[] = [
  {
    id: "unit-dashboard-top",
    name: "Dashboard Header Leaderboard",
    key: "dashboard_top",
    slotId: "1234567890",
    format: "horizontal",
    placement: "PHOTOGRAPHER_DASHBOARD_TOP",
    active: true,
    priority: 10,
    responsive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "unit-dashboard-bottom",
    name: "Dashboard Footer Banner",
    key: "dashboard_bottom",
    slotId: "2345678901",
    format: "horizontal",
    placement: "PHOTOGRAPHER_DASHBOARD_BOTTOM",
    active: true,
    priority: 5,
    responsive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "unit-pricing-banner",
    name: "Pricing Page Promotion Banner",
    key: "pricing_banner",
    slotId: "3456789012",
    format: "horizontal",
    placement: "PRICING_PAGE",
    active: false,
    priority: 1,
    responsive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "unit-marketing-footer",
    name: "Public Homepage Footer",
    key: "marketing_footer",
    slotId: "4567890123",
    format: "horizontal",
    placement: "PUBLIC_HOME",
    active: true,
    priority: 5,
    responsive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "unit-help-sidebar",
    name: "Help & Docs Sidebar",
    key: "help_sidebar",
    slotId: "5678901234",
    format: "rectangle",
    placement: "HELP",
    active: true,
    priority: 5,
    responsive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_AD_PLACEMENTS: AdPlacement[] = [
  {
    id: "place-photographer-dashboard-top",
    name: "Photographer Dashboard Top Banner",
    placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
    pageRule: "/dashboard",
    adUnitId: "unit-dashboard-top",
    enabled: true,
    allowedRoles: ["PHOTOGRAPHER"],
    planRule: "ADS_ENABLED_ONLY",
    description: "Subtle top banner above wedding project management for ad-supported plans.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-photographer-dashboard-bottom",
    name: "Photographer Dashboard Bottom Banner",
    placementKey: "PHOTOGRAPHER_DASHBOARD_BOTTOM",
    pageRule: "/dashboard",
    adUnitId: "unit-dashboard-bottom",
    enabled: true,
    allowedRoles: ["PHOTOGRAPHER"],
    planRule: "ADS_ENABLED_ONLY",
    description: "Lower banner above system footer.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-public-home",
    name: "Public Landing Page Footer",
    placementKey: "PUBLIC_HOME",
    pageRule: "/",
    adUnitId: "unit-marketing-footer",
    enabled: true,
    allowedRoles: ["GUEST", "PHOTOGRAPHER"],
    planRule: "ALL",
    description: "Discreet sponsor slot in public landing page footer.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-pricing-page",
    name: "Pricing Comparison Page",
    placementKey: "PRICING_PAGE",
    pageRule: "/pricing",
    adUnitId: "unit-pricing-banner",
    enabled: false,
    allowedRoles: ["GUEST", "PHOTOGRAPHER"],
    planRule: "ALL",
    description: "Conversion page banner (disabled by default to protect conversions).",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-help",
    name: "Help & Documentation Portal",
    placementKey: "HELP",
    pageRule: "/help",
    adUnitId: "unit-help-sidebar",
    enabled: true,
    allowedRoles: ["GUEST", "PHOTOGRAPHER"],
    planRule: "ALL",
    description: "Sidebar sponsor unit for public guides and tutorials.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-client-gallery",
    name: "Client Wedding Galleries",
    placementKey: "CLIENT_GALLERY_DISABLED",
    pageRule: "/gallery/*",
    enabled: false,
    allowedRoles: [],
    planRule: "EXCLUDE_PAID",
    description: "Hard-isolated luxury client delivery experience — strictly ad-free.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "place-admin-panel",
    name: "Super Admin Platform Engine",
    placementKey: "ADMIN_DISABLED",
    pageRule: "/admin/*",
    enabled: false,
    allowedRoles: [],
    planRule: "EXCLUDE_PAID",
    description: "SaaS administrative infrastructure — permanently excluded from all ad serving.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 1. AdSense Global Config
export function readAdSenseConfig(): AdSenseConfig {
  try {
    if (!fs.existsSync(ADSENSE_CONFIG_FILE)) {
      fs.writeFileSync(ADSENSE_CONFIG_FILE, JSON.stringify(DEFAULT_ADSENSE_CONFIG, null, 2), "utf-8");
      return DEFAULT_ADSENSE_CONFIG;
    }
    const raw = fs.readFileSync(ADSENSE_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ADSENSE_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_ADSENSE_CONFIG;
  }
}

export const getAdSenseConfig = readAdSenseConfig;

export function saveAdSenseConfig(
  configUpdate: Partial<AdSenseConfig>,
  adminId?: string,
  adminEmail?: string
): AdSenseConfig {
  const current = readAdSenseConfig();
  const updated: AdSenseConfig = {
    ...current,
    ...configUpdate,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || adminId || current.updatedBy || "Super Admin",
  };

  fs.writeFileSync(ADSENSE_CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");

  const actorId = adminId || "admin-system";
  const actorEmail = adminEmail || "admin@drfilms.com";

  // Record primary audit log
  recordAdminAuditLog({
    adminId: actorId,
    adminEmail: actorEmail,
    action: "UPDATE_ADSENSE_CONFIG",
    targetType: "system",
    targetId: "adsense-global-config",
    targetName: "Google AdSense Settings",
    result: "success",
    metadata: {
      publisherId: updated.publisherId,
      enabled: updated.enabled,
      testMode: updated.testMode,
      safetyMode: updated.safetyMode,
      autoAdsEnabled: updated.autoAdsEnabled,
      clientGalleryAdsEnabled: updated.clientGalleryAdsEnabled,
    },
  });

  // Granular action logs
  if (configUpdate.publisherId !== undefined && configUpdate.publisherId !== current.publisherId) {
    recordAdminAuditLog({
      adminId: actorId,
      adminEmail: actorEmail,
      action: "ADSENSE_PUBLISHER_ID_UPDATED",
      targetType: "system",
      targetId: "adsense-global-config",
      targetName: "AdSense Publisher ID",
      result: "success",
      metadata: { publisherId: updated.publisherId },
    });
  }

  if (configUpdate.enabled !== undefined && configUpdate.enabled !== current.enabled) {
    recordAdminAuditLog({
      adminId: actorId,
      adminEmail: actorEmail,
      action: updated.enabled ? "ADSENSE_ENABLED" : "ADSENSE_DISABLED",
      targetType: "system",
      targetId: "adsense-global-config",
      targetName: "Platform Ads Master Switch",
      result: "success",
      metadata: { enabled: updated.enabled },
    });
  }

  if (configUpdate.testMode !== undefined && configUpdate.testMode !== current.testMode) {
    recordAdminAuditLog({
      adminId: actorId,
      adminEmail: actorEmail,
      action: "ADSENSE_TEST_MODE_CHANGED",
      targetType: "system",
      targetId: "adsense-global-config",
      targetName: "AdSense Test Mode",
      result: "success",
      metadata: { testMode: updated.testMode },
    });
  }

  if (configUpdate.autoAdsEnabled !== undefined && configUpdate.autoAdsEnabled !== current.autoAdsEnabled) {
    recordAdminAuditLog({
      adminId: actorId,
      adminEmail: actorEmail,
      action: "ADSENSE_AUTO_ADS_CHANGED",
      targetType: "system",
      targetId: "adsense-global-config",
      targetName: "Google Auto Ads",
      result: "success",
      metadata: { autoAdsEnabled: updated.autoAdsEnabled },
    });
  }

  if (configUpdate.clientGalleryAdsEnabled !== undefined && configUpdate.clientGalleryAdsEnabled !== current.clientGalleryAdsEnabled) {
    recordAdminAuditLog({
      adminId: actorId,
      adminEmail: actorEmail,
      action: "ADSENSE_CLIENT_GALLERY_ADS_CHANGED",
      targetType: "system",
      targetId: "adsense-global-config",
      targetName: "Client Gallery Ads Policy",
      result: "success",
      metadata: { clientGalleryAdsEnabled: updated.clientGalleryAdsEnabled },
    });
  }

  return updated;
}

// 2. Ad Units
export function readAdUnits(): AdUnit[] {
  try {
    if (!fs.existsSync(AD_UNITS_FILE)) {
      fs.writeFileSync(AD_UNITS_FILE, JSON.stringify(INITIAL_AD_UNITS, null, 2), "utf-8");
      return INITIAL_AD_UNITS;
    }
    const raw = fs.readFileSync(AD_UNITS_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      fs.writeFileSync(AD_UNITS_FILE, JSON.stringify(INITIAL_AD_UNITS, null, 2), "utf-8");
      return INITIAL_AD_UNITS;
    }
    return list;
  } catch {
    return INITIAL_AD_UNITS;
  }
}

export function writeAdUnits(units: AdUnit[]): void {
  fs.writeFileSync(AD_UNITS_FILE, JSON.stringify(units, null, 2), "utf-8");
}

export function getAdUnitById(id: string): AdUnit | null {
  const units = readAdUnits();
  return units.find((u) => u.id === id) || null;
}

export function getAdUnitByKey(key: string): AdUnit | null {
  const units = readAdUnits();
  return units.find((u) => u.key.toLowerCase() === key.toLowerCase()) || null;
}

export function saveAdUnit(
  unitData: Partial<AdUnit> & { name: string; key: string; slotId: string },
  adminId?: string,
  adminEmail?: string
): AdUnit {
  const units = readAdUnits();
  const cleanKey = unitData.key.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  const now = new Date().toISOString();

  let existingIndex = -1;
  if (unitData.id) {
    existingIndex = units.findIndex((u) => u.id === unitData.id);
  }
  if (existingIndex === -1) {
    existingIndex = units.findIndex((u) => u.key.toLowerCase() === cleanKey);
  }

  let savedUnit: AdUnit;

  if (existingIndex >= 0) {
    savedUnit = {
      ...units[existingIndex],
      ...unitData,
      key: cleanKey,
      updatedAt: now,
    };
    units[existingIndex] = savedUnit;
  } else {
    savedUnit = {
      id: unitData.id || `unit-${cleanKey}-${generateId().slice(0, 6)}`,
      name: unitData.name.trim(),
      key: cleanKey,
      slotId: unitData.slotId.trim(),
      format: unitData.format || "horizontal",
      placement: unitData.placement || "PHOTOGRAPHER_DASHBOARD_TOP",
      active: unitData.active !== false,
      priority: typeof unitData.priority === "number" ? unitData.priority : 5,
      responsive: unitData.responsive !== false,
      customCss: unitData.customCss || "",
      createdAt: now,
      updatedAt: now,
    };
    units.push(savedUnit);
  }

  writeAdUnits(units);

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: existingIndex >= 0 ? "UPDATE_AD_UNIT" : "CREATE_AD_UNIT",
    targetType: "system",
    targetId: savedUnit.id,
    targetName: savedUnit.name,
    result: "success",
    metadata: { key: savedUnit.key, slotId: savedUnit.slotId, format: savedUnit.format, active: savedUnit.active },
  });

  return savedUnit;
}

export function deleteAdUnit(id: string, adminId?: string, adminEmail?: string): boolean {
  const units = readAdUnits();
  const target = units.find((u) => u.id === id || u.key === id);
  if (!target) return false;

  const filtered = units.filter((u) => u.id !== target.id);
  writeAdUnits(filtered);

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: "DELETE_AD_UNIT",
    targetType: "system",
    targetId: target.id,
    targetName: target.name,
    result: "success",
  });

  return true;
}

// 3. Ad Placements
export function readAdPlacements(): AdPlacement[] {
  try {
    if (!fs.existsSync(AD_PLACEMENTS_FILE)) {
      fs.writeFileSync(AD_PLACEMENTS_FILE, JSON.stringify(INITIAL_AD_PLACEMENTS, null, 2), "utf-8");
      return INITIAL_AD_PLACEMENTS;
    }
    const raw = fs.readFileSync(AD_PLACEMENTS_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      fs.writeFileSync(AD_PLACEMENTS_FILE, JSON.stringify(INITIAL_AD_PLACEMENTS, null, 2), "utf-8");
      return INITIAL_AD_PLACEMENTS;
    }
    return list;
  } catch {
    return INITIAL_AD_PLACEMENTS;
  }
}

export function writeAdPlacements(placements: AdPlacement[]): void {
  fs.writeFileSync(AD_PLACEMENTS_FILE, JSON.stringify(placements, null, 2), "utf-8");
}

export function getAdPlacementById(id: string): AdPlacement | null {
  const placements = readAdPlacements();
  return placements.find((p) => p.id === id) || null;
}

export function getAdPlacementByKey(placementKey: string): AdPlacement | null {
  const placements = readAdPlacements();
  return placements.find((p) => p.placementKey.toUpperCase() === placementKey.toUpperCase()) || null;
}

export function saveAdPlacement(
  placementData: Partial<AdPlacement> & { name: string; placementKey: string },
  adminId?: string,
  adminEmail?: string
): AdPlacement {
  const placements = readAdPlacements();
  const cleanKey = placementData.placementKey.toUpperCase().trim();
  const now = new Date().toISOString();

  let existingIndex = -1;
  if (placementData.id) {
    existingIndex = placements.findIndex((p) => p.id === placementData.id);
  }
  if (existingIndex === -1) {
    existingIndex = placements.findIndex((p) => p.placementKey.toUpperCase() === cleanKey);
  }

  let savedPlacement: AdPlacement;

  if (existingIndex >= 0) {
    savedPlacement = {
      ...placements[existingIndex],
      ...placementData,
      placementKey: cleanKey,
      updatedAt: now,
    };
    placements[existingIndex] = savedPlacement;
  } else {
    savedPlacement = {
      id: placementData.id || `place-${cleanKey.toLowerCase().replace(/_/g, "-")}-${generateId().slice(0, 6)}`,
      name: placementData.name.trim(),
      placementKey: cleanKey,
      pageRule: placementData.pageRule || "/dashboard",
      adUnitId: placementData.adUnitId,
      enabled: placementData.enabled !== false,
      allowedRoles: placementData.allowedRoles || ["PHOTOGRAPHER"],
      planRule: placementData.planRule || "ADS_ENABLED_ONLY",
      description: placementData.description || "",
      createdAt: now,
      updatedAt: now,
    };
    placements.push(savedPlacement);
  }

  writeAdPlacements(placements);

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: "ADSENSE_PLACEMENT_CHANGED",
    targetType: "system",
    targetId: savedPlacement.id,
    targetName: savedPlacement.name,
    result: "success",
    metadata: {
      action: existingIndex >= 0 ? "UPDATE_AD_PLACEMENT" : "CREATE_AD_PLACEMENT",
      key: savedPlacement.placementKey,
      enabled: savedPlacement.enabled,
      planRule: savedPlacement.planRule,
    },
  });

  return savedPlacement;
}

export function deleteAdPlacement(id: string, adminId?: string, adminEmail?: string): boolean {
  const placements = readAdPlacements();
  const target = placements.find((p) => p.id === id || p.placementKey === id);
  if (!target) return false;

  const filtered = placements.filter((p) => p.id !== target.id);
  writeAdPlacements(filtered);

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: "DELETE_AD_PLACEMENT",
    targetType: "system",
    targetId: target.id,
    targetName: target.name,
    result: "success",
  });

  return true;
}

// 4. Tenant Ad Overrides
export function readAdOverrides(): AdOverride[] {
  try {
    if (!fs.existsSync(AD_OVERRIDES_FILE)) return [];
    const raw = fs.readFileSync(AD_OVERRIDES_FILE, "utf-8");
    return JSON.parse(raw) as AdOverride[];
  } catch {
    return [];
  }
}

export function writeAdOverrides(overrides: AdOverride[]): void {
  fs.writeFileSync(AD_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf-8");
}

export function getAdOverrideByPhotographer(photographerId: string): AdOverride | null {
  const overrides = readAdOverrides();
  const now = Date.now();
  const match = overrides.find((o) => o.photographerId === photographerId);
  if (!match) return null;
  if (match.expiresAt && new Date(match.expiresAt).getTime() < now) {
    return null; // Expired override
  }
  return match;
}

export function setPhotographerAdOverride(
  photographerId: string,
  adsEnabled: boolean,
  reason?: string,
  expiresAt?: string,
  adminId?: string,
  adminEmail?: string
): AdOverride {
  if (!photographerId || typeof photographerId !== "string" || photographerId === "[object Object]") {
    throw new Error("Invalid photographerId provided to setPhotographerAdOverride");
  }
  const overrides = readAdOverrides();
  const existingIdx = overrides.findIndex((o) => o.photographerId === photographerId);
  const now = new Date().toISOString();

  const override: AdOverride = {
    photographerId,
    adsEnabled,
    reason: reason || (adsEnabled ? "Admin enabled advertising override" : "Admin VIP ad-free override"),
    grantedBy: adminEmail || adminId || "admin@drfilms.com",
    grantedAt: now,
    expiresAt,
  };

  if (existingIdx >= 0) {
    overrides[existingIdx] = override;
  } else {
    overrides.push(override);
  }

  writeAdOverrides(overrides);

  // Also sync to subscription entitlement override for unified entitlement engine
  const sub = getSubscription(photographerId);
  if (sub) {
    setTenantEntitlementOverride(photographerId, {
      features: {
        ...(sub.entitlementOverride?.features || {}),
        adsEnabled,
      },
      expiresAt,
      reason,
      grantedBy: adminEmail || adminId || "admin@drfilms.com",
    });
  }

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: "SET_PHOTOGRAPHER_AD_OVERRIDE",
    targetType: "photographer",
    targetId: photographerId,
    targetName: `Photographer ${photographerId}`,
    result: "success",
    metadata: { adsEnabled, reason, expiresAt },
  });

  return override;
}

export function removePhotographerAdOverride(
  photographerId: string,
  adminId?: string,
  adminEmail?: string
): boolean {
  if (!photographerId || typeof photographerId !== "string" || photographerId === "[object Object]") {
    return false;
  }
  const overrides = readAdOverrides();
  const existing = overrides.find((o) => o.photographerId === photographerId);
  if (!existing) return false;

  const filtered = overrides.filter((o) => o.photographerId !== photographerId);
  writeAdOverrides(filtered);

  // Clear from subscription override if present
  const sub = getSubscription(photographerId);
  if (sub?.entitlementOverride?.features) {
    const updatedFeatures = { ...sub.entitlementOverride.features };
    delete updatedFeatures.adsEnabled;
    setTenantEntitlementOverride(photographerId, {
      features: updatedFeatures,
    });
  }

  recordAdminAuditLog({
    adminId: adminId || "admin-system",
    adminEmail: adminEmail || "admin@drfilms.com",
    action: "REMOVE_PHOTOGRAPHER_AD_OVERRIDE",
    targetType: "photographer",
    targetId: photographerId,
    targetName: `Photographer ${photographerId}`,
    result: "success",
  });

  return true;
}

// 5. AdSense Reporting Stats Service
export function getAdReportingStats(): AdSenseReportingStats {
  const config = readAdSenseConfig();
  if (!config.reportingConnected) {
    return {
      connected: false,
      message: "Statistics unavailable — connect AdSense reporting integration.",
      impressions: undefined,
      clicks: undefined,
      ctr: undefined,
      estimatedRevenueInr: undefined,
      rpm: undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    connected: true,
    message: "Connected to Google AdSense Management API.",
    impressions: 0,
    clicks: 0,
    ctr: 0,
    estimatedRevenueInr: 0,
    rpm: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ── Phase 15: Production Client Notifications & Communication Architecture ──

export function readNotifications(): NotificationRecord[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as NotificationRecord[];
    if (!Array.isArray(parsed)) return [];

    // Deduplicate by ID preserving the last (most recent) entry
    const map = new Map<string, NotificationRecord>();
    for (const item of parsed) {
      if (item && typeof item.id === "string") {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function writeNotifications(notifications: NotificationRecord[]): void {
  // Deduplicate by ID before writing to guarantee physical database uniqueness
  const map = new Map<string, NotificationRecord>();
  for (const item of notifications) {
    if (item && typeof item.id === "string") {
      map.set(item.id, item);
    }
  }
  const cleanList = Array.from(map.values());
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(cleanList, null, 2), "utf-8");
}

export const getAllNotifications = readNotifications;

export function getNotificationById(id: string): NotificationRecord | null {
  if (!id) return null;
  return readNotifications().find((n) => n.id === id) || null;
}

export function getNotificationsByPhotographer(
  photographerId: string,
  limit = 50,
  offset = 0,
  filters?: {
    channel?: NotificationChannel;
    status?: NotificationStatus;
    type?: NotificationType;
    projectId?: string;
  }
): { notifications: NotificationRecord[]; total: number } {
  if (!photographerId) return { notifications: [], total: 0 };
  const all = readNotifications();
  let filtered = all
    .filter((n) => (n.photographerId || DEFAULT_PHOTOGRAPHER_ID) === photographerId)
    .sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (b.id || "").localeCompare(a.id || "");
    });

  if (filters?.channel) {
    filtered = filtered.filter((n) => n.channel === filters.channel);
  }
  if (filters?.status) {
    filtered = filtered.filter((n) => n.status === filters.status);
  }
  if (filters?.type) {
    filtered = filtered.filter((n) => n.type === filters.type);
  }
  if (filters?.projectId) {
    filtered = filtered.filter((n) => n.projectId === filters.projectId);
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);
  return { notifications: paginated, total };
}

export function createNotificationRecord(
  data: Partial<NotificationRecord> & {
    photographerId: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    recipient?: string;
  }
): NotificationRecord {
  const notifications = readNotifications();
  const now = new Date().toISOString();
  const recipient = (data.recipient || data.recipientEmail || data.recipientPhone || "").trim();
  const recipientEmail = data.recipientEmail || (recipient.includes("@") ? recipient : undefined);
  const recipientPhone = data.recipientPhone || (!recipient.includes("@") && recipient.length > 0 ? recipient : undefined);
  const recordId = data.id || `notif-${generateId().toLowerCase()}`;

  const record: NotificationRecord = {
    id: recordId,
    photographerId: data.photographerId,
    clientId: data.clientId,
    weddingId: data.weddingId || data.projectId,
    projectId: data.projectId || data.weddingId,
    galleryId: data.galleryId,
    type: data.type || "GALLERY_PUBLISHED",
    channel: data.channel || "EMAIL",
    status: data.status || "PENDING",
    recipient,
    recipientEmail,
    recipientPhone,
    recipientName: data.recipientName?.trim(),
    subject: data.subject || "",
    content: data.content || "",
    provider: data.provider || "development",
    providerMessageId: data.providerMessageId,
    errorMessage: data.errorMessage,
    isTransientError: data.isTransientError,
    retryCount: data.retryCount || 0,
    maxRetries: data.maxRetries ?? 3,
    nextRetryAt: data.nextRetryAt,
    idempotencyKey: data.idempotencyKey,
    metadata: data.metadata || {},
    sentAt: data.sentAt,
    deliveredAt: data.deliveredAt,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const existingIdx = notifications.findIndex((n) => n.id === recordId);
  if (existingIdx !== -1) {
    // Upsert / update existing record if ID already exists
    notifications[existingIdx] = {
      ...notifications[existingIdx],
      ...record,
      updatedAt: now,
    };
  } else {
    notifications.push(record);
  }

  writeNotifications(notifications);
  return record;
}

export function updateNotificationRecord(
  id: string,
  updates: Partial<NotificationRecord>
): NotificationRecord | null {
  const notifications = readNotifications();
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  notifications[idx] = {
    ...notifications[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeNotifications(notifications);
  return notifications[idx];
}

export function isNotificationIdempotent(idempotencyKey: string): boolean {
  if (!idempotencyKey) return false;
  const notifications = readNotifications();
  const existing = notifications.find(
    (n) => n.idempotencyKey === idempotencyKey && n.status !== "FAILED" && n.status !== "CANCELLED"
  );
  return !!existing;
}

export function maskSensitiveRecipient(recipient?: string): string {
  if (!recipient) return "N/A";
  const trimmed = recipient.trim();
  if (trimmed.includes("@")) {
    const [local, domain] = trimmed.split("@");
    if (!domain) return trimmed;
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }
  // Phone number masking
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 7) {
    const last4 = digitsOnly.slice(-4);
    const prefix = trimmed.startsWith("+") ? trimmed.slice(0, 3) + " " : "";
    return `${prefix}******${last4}`;
  }
  return trimmed;
}

export interface AdminCommunicationLogQuery {
  limit?: number;
  offset?: number;
  search?: string;
  channel?: string;
  status?: string;
  audience?: string;
  type?: string;
  dateRange?: "today" | "7d" | "30d" | "all" | "custom";
  startDate?: string;
  endDate?: string;
}

export function getAdminCommunicationRecords(
  query: AdminCommunicationLogQuery = {}
): { records: NotificationRecord[]; total: number } {
  const all = readNotifications();
  const {
    limit = 50,
    offset = 0,
    search,
    channel,
    status,
    audience,
    type,
    dateRange = "all",
    startDate,
    endDate,
  } = query;

  let filtered = [...all].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (b.id || "").localeCompare(a.id || "");
  });

  // Search Filter
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter((n) => {
      return (
        n.id.toLowerCase().includes(term) ||
        (n.recipient && n.recipient.toLowerCase().includes(term)) ||
        (n.recipientEmail && n.recipientEmail.toLowerCase().includes(term)) ||
        (n.recipientPhone && n.recipientPhone.toLowerCase().includes(term)) ||
        (n.recipientName && n.recipientName.toLowerCase().includes(term)) ||
        (n.subject && n.subject.toLowerCase().includes(term)) ||
        (n.content && n.content.toLowerCase().includes(term)) ||
        (n.provider && n.provider.toLowerCase().includes(term)) ||
        (n.type && n.type.toLowerCase().includes(term)) ||
        (n.photographerId && n.photographerId.toLowerCase().includes(term)) ||
        (n.projectId && n.projectId.toLowerCase().includes(term)) ||
        (n.errorMessage && n.errorMessage.toLowerCase().includes(term))
      );
    });
  }

  // Channel Filter
  if (channel && channel !== "ALL") {
    filtered = filtered.filter((n) => n.channel === channel);
  }

  // Status Filter
  if (status && status !== "ALL") {
    if (status === "SENT") {
      filtered = filtered.filter((n) => n.status === "SENT" || n.status === "DELIVERED");
    } else if (status === "BLOCKED") {
      filtered = filtered.filter((n) => n.status === "BLOCKED_BY_PLATFORM_SETTING");
    } else if (status === "SKIPPED") {
      filtered = filtered.filter((n) => n.status === "SKIPPED_BY_PREFERENCE");
    } else {
      filtered = filtered.filter((n) => n.status === status);
    }
  }

  // Audience Filter
  if (audience && audience !== "ALL") {
    filtered = filtered.filter((n) => {
      const isPhotographerAudience =
        n.type === "SELECTION_SUBMITTED" ||
        n.type === "PAYMENT_RECEIVED" ||
        n.type === "SUBSCRIPTION_EXPIRING" ||
        n.type === "SUBSCRIPTION_EXPIRED";
      const isSystemAudience =
        n.type === "PASSWORD_RESET" ||
        n.type === "EMAIL_VERIFICATION";
      
      if (audience === "PHOTOGRAPHER") return isPhotographerAudience;
      if (audience === "SYSTEM" || audience === "ADMIN") return isSystemAudience;
      if (audience === "CLIENT") return !isPhotographerAudience && !isSystemAudience;
      return true;
    });
  }

  // Type Filter
  if (type && type !== "ALL") {
    filtered = filtered.filter((n) => n.type.toLowerCase().includes(type.toLowerCase()));
  }

  // Date Filter
  const now = new Date();
  if (dateRange === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    filtered = filtered.filter((n) => new Date(n.createdAt).getTime() >= startOfToday);
  } else if (dateRange === "7d") {
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((n) => new Date(n.createdAt).getTime() >= sevenDaysAgo);
  } else if (dateRange === "30d") {
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((n) => new Date(n.createdAt).getTime() >= thirtyDaysAgo);
  } else if (dateRange === "custom") {
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter((n) => new Date(n.createdAt).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter((n) => new Date(n.createdAt).getTime() <= endMs);
    }
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return { records: paginated, total };
}

export interface AdminCommunicationAnalyticsReport {
  timeframe: string;
  totalAttempts: number;
  successful: number;
  failed: number;
  blocked: number;
  skipped: number;
  successRate: number | null; // null if 0 attempts to avoid misleading 100%
  failureRate: number | null;
  blockedRate: number | null;
  channelBreakdown: {
    email: number;
    whatsapp: number;
    sms: number;
    push: number;
    inApp: number;
  };
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export function getAdminCommunicationAnalytics(
  range: "24h" | "7d" | "30d" | "all" = "7d"
): AdminCommunicationAnalyticsReport {
  const all = readNotifications();
  const now = Date.now();

  let cutoffMs = 0;
  if (range === "24h") cutoffMs = now - 24 * 60 * 60 * 1000;
  else if (range === "7d") cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
  else if (range === "30d") cutoffMs = now - 30 * 24 * 60 * 60 * 1000;

  const inWindow = cutoffMs > 0
    ? all.filter((n) => new Date(n.createdAt).getTime() >= cutoffMs)
    : all;

  const totalAttempts = inWindow.length;
  let successful = 0;
  let failed = 0;
  let blocked = 0;
  let skipped = 0;

  const channelBreakdown = {
    email: 0,
    whatsapp: 0,
    sms: 0,
    push: 0,
    inApp: 0,
  };

  const failureReasonMap: Record<string, number> = {};

  for (const record of inWindow) {
    // Channel Breakdown
    if (record.channel === "EMAIL") channelBreakdown.email++;
    else if (record.channel === "WHATSAPP") channelBreakdown.whatsapp++;
    else if (record.channel === "SMS") channelBreakdown.sms++;
    else if (record.channel === "PUSH") channelBreakdown.push++;
    else if (record.channel === "IN_APP") channelBreakdown.inApp++;

    // Status aggregation
    if (record.status === "SENT" || record.status === "DELIVERED") {
      successful++;
    } else if (record.status === "FAILED") {
      failed++;
      const rawReason = record.errorMessage || "Unknown provider error";
      let category = "Provider error";
      const lower = rawReason.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("429")) category = "Rate limit exceeded";
      else if (lower.includes("timeout") || lower.includes("timed out")) category = "Connection timeout";
      else if (lower.includes("recipient") || lower.includes("invalid email") || lower.includes("phone")) category = "Invalid recipient address/number";
      else if (lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("auth")) category = "Provider authorization error";
      else if (lower.includes("not configured")) category = "Provider not configured";
      else category = rawReason.slice(0, 60);

      failureReasonMap[category] = (failureReasonMap[category] || 0) + 1;
    } else if (record.status === "BLOCKED_BY_PLATFORM_SETTING") {
      blocked++;
    } else if (record.status === "SKIPPED_BY_PREFERENCE") {
      skipped++;
    }
  }

  const successRate = totalAttempts > 0 ? Number(((successful / totalAttempts) * 100).toFixed(1)) : null;
  const failureRate = totalAttempts > 0 ? Number(((failed / totalAttempts) * 100).toFixed(1)) : null;
  const blockedRate = totalAttempts > 0 ? Number(((blocked / totalAttempts) * 100).toFixed(1)) : null;

  const topFailureReasons = Object.entries(failureReasonMap)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: failed > 0 ? Number(((count / failed) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    timeframe: range,
    totalAttempts,
    successful,
    failed,
    blocked,
    skipped,
    successRate,
    failureRate,
    blockedRate,
    channelBreakdown,
    topFailureReasons,
  };
}

export function readNotificationPreferences(): PhotographerNotificationPreferences[] {
  try {
    if (!fs.existsSync(NOTIFICATION_PREFERENCES_FILE)) return [];
    const raw = fs.readFileSync(NOTIFICATION_PREFERENCES_FILE, "utf-8");
    return JSON.parse(raw) as PhotographerNotificationPreferences[];
  } catch {
    return [];
  }
}

export function writeNotificationPreferences(prefs: PhotographerNotificationPreferences[]): void {
  fs.writeFileSync(NOTIFICATION_PREFERENCES_FILE, JSON.stringify(prefs, null, 2), "utf-8");
}

export function getDefaultNotificationPreferences(photographerId: string): PhotographerNotificationPreferences {
  return {
    photographerId,
    clientGalleryPublished: true,
    clientSelectionConfirmation: true,
    clientGalleryExpiring: true,
    photographerSelectionSubmitted: true,
    photographerDownloadAlert: true,
    photographerPaymentAlert: true,
    whatsappEnabled: false,
    whatsappStatus: "NOT_CONFIGURED",
    email: {
      galleryPublished: true,
      selectionSubmitted: true,
      selectionChanged: true,
      subscriptionEvents: true,
    },
    clientEmail: {
      galleryPublished: true,
      selectionConfirmation: true,
    },
    whatsapp: {
      enabled: false,
      galleryPublished: true,
      selectionConfirmation: true,
      notifyPhotographerOnSelection: true,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getNotificationPreferences(photographerId: string): PhotographerNotificationPreferences {
  if (!photographerId) return getDefaultNotificationPreferences(DEFAULT_PHOTOGRAPHER_ID);
  const all = readNotificationPreferences();
  const found = all.find((p) => p.photographerId === photographerId);
  const defaults = getDefaultNotificationPreferences(photographerId);
  if (!found) return defaults;
  return {
    ...defaults,
    ...found,
    clientGalleryPublished: found.clientGalleryPublished ?? found.clientEmail?.galleryPublished ?? true,
    clientSelectionConfirmation: found.clientSelectionConfirmation ?? found.clientEmail?.selectionConfirmation ?? true,
    photographerSelectionSubmitted: found.photographerSelectionSubmitted ?? found.email?.selectionSubmitted ?? true,
    whatsappEnabled: found.whatsappEnabled ?? found.whatsapp?.enabled ?? false,
  };
}

export function saveNotificationPreferences(
  photographerId: string,
  prefs: Partial<PhotographerNotificationPreferences>
): PhotographerNotificationPreferences {
  const all = readNotificationPreferences();
  const current = getNotificationPreferences(photographerId);

  const updated: PhotographerNotificationPreferences = {
    ...current,
    ...prefs,
    photographerId,
    clientGalleryPublished: prefs.clientGalleryPublished ?? current.clientGalleryPublished,
    clientSelectionConfirmation: prefs.clientSelectionConfirmation ?? current.clientSelectionConfirmation,
    clientGalleryExpiring: prefs.clientGalleryExpiring ?? current.clientGalleryExpiring,
    photographerSelectionSubmitted: prefs.photographerSelectionSubmitted ?? current.photographerSelectionSubmitted,
    photographerDownloadAlert: prefs.photographerDownloadAlert ?? current.photographerDownloadAlert,
    photographerPaymentAlert: prefs.photographerPaymentAlert ?? current.photographerPaymentAlert,
    whatsappEnabled: prefs.whatsappEnabled ?? current.whatsappEnabled,
    whatsappPhoneNumber: prefs.whatsappPhoneNumber !== undefined ? prefs.whatsappPhoneNumber : current.whatsappPhoneNumber,
    whatsappStatus: prefs.whatsappStatus || current.whatsappStatus,
    emailReplyTo: prefs.emailReplyTo !== undefined ? prefs.emailReplyTo : current.emailReplyTo,
    customEmailSubjectTemplate: prefs.customEmailSubjectTemplate !== undefined ? prefs.customEmailSubjectTemplate : current.customEmailSubjectTemplate,
    customEmailFooter: prefs.customEmailFooter !== undefined ? prefs.customEmailFooter : current.customEmailFooter,
    email: {
      galleryPublished: prefs.clientGalleryPublished ?? current.email?.galleryPublished ?? true,
      selectionSubmitted: prefs.photographerSelectionSubmitted ?? current.email?.selectionSubmitted ?? true,
      selectionChanged: current.email?.selectionChanged ?? true,
      subscriptionEvents: current.email?.subscriptionEvents ?? true,
      ...(prefs.email || {}),
    },
    clientEmail: {
      galleryPublished: prefs.clientGalleryPublished ?? current.clientEmail?.galleryPublished ?? true,
      selectionConfirmation: prefs.clientSelectionConfirmation ?? current.clientEmail?.selectionConfirmation ?? true,
      ...(prefs.clientEmail || {}),
    },
    whatsapp: {
      enabled: prefs.whatsappEnabled ?? current.whatsapp?.enabled ?? false,
      galleryPublished: prefs.clientGalleryPublished ?? current.whatsapp?.galleryPublished ?? true,
      selectionConfirmation: prefs.clientSelectionConfirmation ?? current.whatsapp?.selectionConfirmation ?? true,
      notifyPhotographerOnSelection: prefs.photographerSelectionSubmitted ?? current.whatsapp?.notifyPhotographerOnSelection ?? true,
      ...(prefs.whatsapp || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  const idx = all.findIndex((p) => p.photographerId === photographerId);
  if (idx === -1) {
    all.push(updated);
  } else {
    all[idx] = updated;
  }

  writeNotificationPreferences(all);
  return updated;
}

export function getNotificationMetrics(): NotificationMetrics {
  const notifications = readNotifications();
  let sent = 0;
  let delivered = 0;
  let failed = 0;
  let pending = 0;
  const byChannel = { EMAIL: 0, WHATSAPP: 0, IN_APP: 0 };
  const byType: Record<string, number> = {};

  for (const n of notifications) {
    if (n.status === "SENT") sent++;
    else if (n.status === "DELIVERED") delivered++;
    else if (n.status === "FAILED") failed++;
    else if (n.status === "PENDING" || n.status === "SENDING") pending++;

    if (n.channel === "EMAIL") byChannel.EMAIL++;
    else if (n.channel === "WHATSAPP") byChannel.WHATSAPP++;
    else if (n.channel === "IN_APP") byChannel.IN_APP++;

    byType[n.type] = (byType[n.type] || 0) + 1;
  }

  const completed = sent + delivered + failed;
  const deliveryRate = completed > 0 ? Math.round(((sent + delivered) / completed) * 100) : 100;

  return {
    total: notifications.length,
    sent,
    delivered,
    failed,
    pending,
    totalSent: sent,
    totalDelivered: delivered,
    totalFailed: failed,
    totalPending: pending,
    deliveryRate,
    byChannel,
    byType,
    channels: {
      email: byChannel.EMAIL,
      whatsapp: byChannel.WHATSAPP,
      inApp: byChannel.IN_APP,
    },
    types: byType,
  };
}

// ── Phase 17: Application Errors, Platform Alerts, Background Jobs & Backups ──

export function readErrors(): ApplicationError[] {
  try {
    if (!fs.existsSync(ERRORS_FILE)) return [];
    const content = fs.readFileSync(ERRORS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

export function writeErrors(errors: ApplicationError[]): void {
  try {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2), "utf-8");
  } catch (err) {}
}

export function recordApplicationError(error: ApplicationError): ApplicationError {
  const all = readErrors();
  const existingIdx = all.findIndex(
    (e) => e.fingerprint === error.fingerprint && !e.resolvedAt
  );

  if (existingIdx !== -1) {
    all[existingIdx].occurrences = (all[existingIdx].occurrences || 1) + 1;
    all[existingIdx].lastSeenAt = error.lastSeenAt || new Date().toISOString();
    all[existingIdx].statusCode = error.statusCode ?? all[existingIdx].statusCode;
    if (error.metadata) {
      all[existingIdx].metadata = { ...all[existingIdx].metadata, ...error.metadata };
    }
    writeErrors(all);
    return all[existingIdx];
  }

  all.unshift(error);
  // Keep maximum 500 errors in store for performance
  if (all.length > 500) all.length = 500;
  writeErrors(all);
  return error;
}

export function getErrors(filters?: {
  severity?: ErrorSeverity;
  source?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}): { errors: ApplicationError[]; total: number } {
  let all = readErrors();

  if (filters?.severity) {
    all = all.filter((e) => e.severity === filters.severity);
  }
  if (filters?.source) {
    all = all.filter((e) => e.source.toLowerCase() === filters.source?.toLowerCase());
  }
  if (filters?.resolved !== undefined) {
    all = all.filter((e) => (filters.resolved ? !!e.resolvedAt : !e.resolvedAt));
  }

  const total = all.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  const paged = all.slice(offset, offset + limit);

  return { errors: paged, total };
}

export function getErrorById(id: string): ApplicationError | null {
  const all = readErrors();
  return all.find((e) => e.id === id) || null;
}

export function resolveApplicationError(idOrFingerprint: string, resolvedBy: string): ApplicationError | null {
  const all = readErrors();
  const idx = all.findIndex((e) => e.id === idOrFingerprint || e.fingerprint === idOrFingerprint);
  if (idx === -1) return null;

  all[idx].resolvedAt = new Date().toISOString();
  all[idx].resolvedBy = resolvedBy;
  writeErrors(all);
  return all[idx];
}

// ── Alerts Persistence ────────────────────────────────────────────────────────

export function readAlerts(): PlatformAlert[] {
  try {
    if (!fs.existsSync(ALERTS_FILE)) return [];
    const content = fs.readFileSync(ALERTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

export function writeAlerts(alerts: PlatformAlert[]): void {
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf-8");
  } catch (err) {}
}

export function recordPlatformAlert(alert: PlatformAlert): PlatformAlert {
  const all = readAlerts();
  const existingIdx = all.findIndex(
    (a) => a.fingerprint === alert.fingerprint && a.status !== "RESOLVED"
  );

  if (existingIdx !== -1) {
    all[existingIdx].occurrences = (all[existingIdx].occurrences || 1) + 1;
    all[existingIdx].lastOccurredAt = alert.lastOccurredAt || new Date().toISOString();
    all[existingIdx].severity = alert.severity;
    all[existingIdx].description = alert.description;
    if (alert.metadata) {
      all[existingIdx].metadata = { ...all[existingIdx].metadata, ...alert.metadata };
    }
    writeAlerts(all);
    return all[existingIdx];
  }

  all.unshift(alert);
  if (all.length > 300) all.length = 300;
  writeAlerts(all);
  return alert;
}

export function getPlatformAlerts(filters?: {
  status?: AlertStatus;
  severity?: AlertSeverity;
  limit?: number;
  offset?: number;
}): { alerts: PlatformAlert[]; total: number } {
  let all = readAlerts();

  if (filters?.status) {
    all = all.filter((a) => a.status === filters.status);
  }
  if (filters?.severity) {
    all = all.filter((a) => a.severity === filters.severity);
  }

  const total = all.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  const paged = all.slice(offset, offset + limit);

  return { alerts: paged, total };
}

export function getPlatformAlertById(id: string): PlatformAlert | null {
  const all = readAlerts();
  return all.find((a) => a.id === id) || null;
}

export function updatePlatformAlertStatus(
  id: string,
  status: AlertStatus,
  actionBy: string
): PlatformAlert | null {
  const all = readAlerts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  all[idx].status = status;

  if (status === "ACKNOWLEDGED") {
    all[idx].acknowledgedAt = now;
    all[idx].acknowledgedBy = actionBy;
  } else if (status === "RESOLVED") {
    all[idx].resolvedAt = now;
    all[idx].resolvedBy = actionBy;
  }

  writeAlerts(all);

  // Record Admin Audit Log
  recordAdminAuditLog({
    adminId: actionBy,
    adminEmail: actionBy,
    action: `ALERT_${status}`,
    targetType: "system",
    targetId: id,
    targetName: all[idx].title,
    metadata: {
      alertId: id,
      newStatus: status,
      severity: all[idx].severity,
      occurrences: all[idx].occurrences,
    },
    result: "success",
  });

  return all[idx];
}

export function getOpenAlertsCount(): number {
  const all = readAlerts();
  return all.filter((a) => a.status === "OPEN" || a.status === "ACKNOWLEDGED").length;
}

// ── Background Jobs Persistence ───────────────────────────────────────────────

export function readJobs(): BackgroundJobRecord[] {
  try {
    if (!fs.existsSync(JOBS_FILE)) return [];
    const content = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

export function writeJobs(jobs: BackgroundJobRecord[]): void {
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
  } catch (err) {}
}

export function createOrUpdateJobRecord(job: BackgroundJobRecord): BackgroundJobRecord {
  const all = readJobs();
  const idx = all.findIndex((j) => j.id === job.id);
  if (idx === -1) {
    all.unshift(job);
    if (all.length > 200) all.length = 200;
  } else {
    all[idx] = { ...all[idx], ...job };
  }
  writeJobs(all);
  return job;
}

export function getJobRecords(options?: number | { jobType?: string; name?: string; limit?: number }): BackgroundJobRecord[] {
  let all = readJobs();
  const limit = typeof options === "number" ? options : options?.limit || 50;
  if (typeof options === "object" && options !== null) {
    if (options.jobType) {
      all = all.filter((j) => (j.jobType || j.name).toLowerCase() === options.jobType?.toLowerCase());
    }
    if (options.name) {
      all = all.filter((j) => j.name.toLowerCase() === options.name?.toLowerCase());
    }
  }
  return all.slice(0, limit);
}

export function getJobRecordById(id: string): BackgroundJobRecord | null {
  const all = readJobs();
  return all.find((j) => j.id === id) || null;
}

// ── Backup Metadata Persistence ───────────────────────────────────────────────

export function readBackups(): BackupMetadata[] {
  try {
    if (!fs.existsSync(BACKUPS_FILE)) return [];
    const content = fs.readFileSync(BACKUPS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

export function writeBackups(backups: BackupMetadata[]): void {
  try {
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify(backups, null, 2), "utf-8");
  } catch (err) {}
}

export function recordBackupMetadata(backup: BackupMetadata): BackupMetadata {
  const all = readBackups();
  all.unshift(backup);
  if (all.length > 100) all.length = 100;
  writeBackups(all);
  return backup;
}

export function getBackups(): BackupMetadata[] {
  return readBackups();
}

// ── Phase 19: Platform Global Communication Settings Persistence ──────────────

export const DEFAULT_PLATFORM_COMMUNICATION_SETTINGS: PlatformCommunicationSettings = {
  id: "platform_communication_settings",
  globalEnabled: true,
  allCommunicationsEnabled: true,
  emergencyKillSwitch: false,

  // 1. Email Controls
  emailEnabled: true,
  emailClientGalleries: true,
  emailClientSelections: true,
  emailPhotographerDigest: true,
  emailPhotographerBilling: true,
  emailMarketingCampaigns: true,
  emailSecurityAlerts: true, // Protected / Security Critical
  emailPasswordReset: true, // Protected / Security Critical
  emailVerification: true, // Protected / Security Critical
  emailAccountAlerts: true,

  // 2. WhatsApp Controls
  whatsappEnabled: true,
  whatsappClientGalleries: true,
  whatsappClientSelections: true,
  whatsappPhotographerAlerts: true,
  whatsappMarketingBroadcasts: true,

  // 3. SMS Controls
  smsEnabled: true,
  smsClientGalleries: true,
  smsClientSelections: true,
  smsPhotographerAlerts: true,
  smsSecurityOtp: true, // Protected / Security Critical
  smsMarketing: true,

  // 4. Push Notifications
  pushEnabled: true,
  pushClientGalleries: true,
  pushPhotographerAlerts: true,
  pushMarketing: true,

  // 5. In-App Notifications
  inAppEnabled: true,
  inAppClientGalleries: true,
  inAppPhotographerAlerts: true,
  inAppSystemAnnouncements: true,

  // 6. Client Communication Controls
  clientAllEnabled: true,
  clientGalleryPublished: true,
  clientSelectionConfirmation: true,
  clientMarketing: true,

  // 7. Photographer Communication Controls
  photographerAllEnabled: true,
  photographerSelectionSubmitted: true,
  photographerBillingReceipts: true,
  photographerStorageAlerts: true,
  photographerMarketing: true,

  // 8. Marketing Communication Controls
  marketingAllEnabled: true,
  marketingPromotions: true,
  marketingProductUpdates: true,
  marketingNewsletter: true,
  marketingRequireDoubleOptIn: true,
  marketingRespectUnsubscribe: true,

  // Phase 27: Feature-Level Granular Controls
  galleryPublishedEnabled: true,
  selectionSubmittedEnabled: true,
  selectionConfirmationEnabled: true,
  expiryReminderEnabled: true,
  teamInvitationEnabled: true,
  passwordResetEnabled: true,
  billingNotificationsEnabled: true,
  securityNotificationsEnabled: true,

  lastUpdated: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "SYSTEM",
};

let cachedPlatformCommunicationSettings: PlatformCommunicationSettings | null = null;

export function readPlatformCommunicationSettings(): PlatformCommunicationSettings {
  if (cachedPlatformCommunicationSettings) {
    return { ...cachedPlatformCommunicationSettings };
  }
  try {
    if (!fs.existsSync(COMMUNICATION_SETTINGS_FILE)) {
      writePlatformCommunicationSettings(DEFAULT_PLATFORM_COMMUNICATION_SETTINGS);
      cachedPlatformCommunicationSettings = { ...DEFAULT_PLATFORM_COMMUNICATION_SETTINGS };
      return { ...DEFAULT_PLATFORM_COMMUNICATION_SETTINGS };
    }
    const raw = fs.readFileSync(COMMUNICATION_SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const masterVal = parsed.allCommunicationsEnabled !== undefined 
      ? parsed.allCommunicationsEnabled 
      : (parsed.globalEnabled !== undefined ? parsed.globalEnabled : true);

    const merged: PlatformCommunicationSettings = {
      ...DEFAULT_PLATFORM_COMMUNICATION_SETTINGS,
      ...parsed,
      id: "platform_communication_settings",
      globalEnabled: masterVal,
      allCommunicationsEnabled: masterVal,
      galleryPublishedEnabled: parsed.galleryPublishedEnabled !== undefined ? parsed.galleryPublishedEnabled : true,
      selectionSubmittedEnabled: parsed.selectionSubmittedEnabled !== undefined ? parsed.selectionSubmittedEnabled : true,
      selectionConfirmationEnabled: parsed.selectionConfirmationEnabled !== undefined ? parsed.selectionConfirmationEnabled : true,
      expiryReminderEnabled: parsed.expiryReminderEnabled !== undefined ? parsed.expiryReminderEnabled : true,
      teamInvitationEnabled: parsed.teamInvitationEnabled !== undefined ? parsed.teamInvitationEnabled : true,
      passwordResetEnabled: parsed.passwordResetEnabled !== undefined ? parsed.passwordResetEnabled : true,
      billingNotificationsEnabled: parsed.billingNotificationsEnabled !== undefined ? parsed.billingNotificationsEnabled : true,
      securityNotificationsEnabled: parsed.securityNotificationsEnabled !== undefined ? parsed.securityNotificationsEnabled : true,
      // Security-critical defaults enforced
      emailPasswordReset: parsed.emailPasswordReset !== undefined ? parsed.emailPasswordReset : true,
      emailVerification: parsed.emailVerification !== undefined ? parsed.emailVerification : true,
      emailSecurity: parsed.emailSecurity !== undefined ? parsed.emailSecurity : true,
      smsOtp: parsed.smsOtp !== undefined ? parsed.smsOtp : true,
      smsSecurity: parsed.smsSecurity !== undefined ? parsed.smsSecurity : true,
    };
    cachedPlatformCommunicationSettings = { ...merged };
    return merged;
  } catch (err) {
    cachedPlatformCommunicationSettings = { ...DEFAULT_PLATFORM_COMMUNICATION_SETTINGS };
    return { ...DEFAULT_PLATFORM_COMMUNICATION_SETTINGS };
  }
}

export function writePlatformCommunicationSettings(settings: PlatformCommunicationSettings): void {
  try {
    cachedPlatformCommunicationSettings = { ...settings };
    fs.writeFileSync(COMMUNICATION_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Failed to write platform communication settings:", err);
  }
}

export function invalidatePlatformCommunicationSettingsCache(): void {
  cachedPlatformCommunicationSettings = null;
}

export function updatePlatformCommunicationSettings(
  updates: Partial<PlatformCommunicationSettings>,
  adminId: string = "admin-system",
  adminEmail: string = "admin@drfilms.com"
): PlatformCommunicationSettings {
  const current = readPlatformCommunicationSettings();
  const now = new Date().toISOString();

  // Sync allCommunicationsEnabled and globalEnabled
  const safeUpdates: Partial<PlatformCommunicationSettings> = { ...updates };
  if (safeUpdates.allCommunicationsEnabled !== undefined) {
    safeUpdates.globalEnabled = safeUpdates.allCommunicationsEnabled;
  } else if (safeUpdates.globalEnabled !== undefined) {
    safeUpdates.allCommunicationsEnabled = safeUpdates.globalEnabled;
  }

  const updated: PlatformCommunicationSettings = {
    ...current,
    ...safeUpdates,
    id: "platform_communication_settings",
    updatedAt: now,
    updatedBy: adminEmail,
  };

  writePlatformCommunicationSettings(updated);

  // Compute diffs for detailed audit log
  const changedKeys: string[] = [];
  const changesSummary: Record<string, { old: any; new: any }> = {};

  for (const [k, v] of Object.entries(safeUpdates)) {
    if ((current as any)[k] !== v && k !== "updatedAt" && k !== "updatedBy") {
      changedKeys.push(k);
      changesSummary[k] = {
        old: (current as any)[k],
        new: v,
      };
    }
  }

  if (changedKeys.length > 0) {
    recordAdminAuditLog({
      adminId,
      adminEmail,
      action: "PLATFORM_COMMUNICATIONS_UPDATED",
      targetType: "system",
      targetId: "platform_communication_settings",
      targetName: "Platform Communication Controls",
      result: "success",
      metadata: {
        changedKeys,
        changes: changesSummary,
        globalEnabled: updated.globalEnabled,
        allCommunicationsEnabled: updated.allCommunicationsEnabled,
      },
    });
  }

  return updated;
}

// ── Platform Gallery Lifecycle Settings Storage ──────────────────────────────

export const DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS: PlatformGalleryLifecycleSettings = {
  id: "platform_gallery_lifecycle_settings",
  expirationEnabled: true,
  defaultExpirationDays: 90,
  defaultLifespanDays: 90,
  warningThresholdDays: 7,
  autoArchiveAfterExpiration: false,
  autoArchiveDays: 30,
  autoDeleteAfterArchived: false,
  autoDeleteDays: 180,
  allowNeverExpire: true,
  maxRetentionDays: null,
  autoArchiveExpiredGalleries: false,
  autoArchiveDaysAfterExpiry: 30,
  updatedAt: new Date().toISOString(),
  updatedBy: "SYSTEM",
};

let cachedGalleryLifecycleSettings: PlatformGalleryLifecycleSettings | null = null;

export function readPlatformGalleryLifecycleSettings(): PlatformGalleryLifecycleSettings {
  if (cachedGalleryLifecycleSettings) {
    return { ...cachedGalleryLifecycleSettings };
  }
  try {
    if (!fs.existsSync(GALLERY_LIFECYCLE_SETTINGS_FILE)) {
      writePlatformGalleryLifecycleSettings(DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS);
      cachedGalleryLifecycleSettings = { ...DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS };
      return { ...DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS };
    }
    const raw = fs.readFileSync(GALLERY_LIFECYCLE_SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const merged: PlatformGalleryLifecycleSettings = {
      ...DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS,
      ...parsed,
      id: "platform_gallery_lifecycle_settings",
    };
    cachedGalleryLifecycleSettings = { ...merged };
    return merged;
  } catch {
    cachedGalleryLifecycleSettings = { ...DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS };
    return { ...DEFAULT_PLATFORM_GALLERY_LIFECYCLE_SETTINGS };
  }
}

export function writePlatformGalleryLifecycleSettings(settings: PlatformGalleryLifecycleSettings): void {
  try {
    cachedGalleryLifecycleSettings = { ...settings };
    fs.writeFileSync(GALLERY_LIFECYCLE_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Failed to write gallery lifecycle settings:", err);
  }
}

export function invalidatePlatformGalleryLifecycleSettingsCache(): void {
  cachedGalleryLifecycleSettings = null;
}

export function updatePlatformGalleryLifecycleSettings(
  updates: Partial<PlatformGalleryLifecycleSettings>,
  adminId: string = "admin-system",
  adminEmail: string = "admin@drfilms.com"
): PlatformGalleryLifecycleSettings {
  const current = readPlatformGalleryLifecycleSettings();
  const now = new Date().toISOString();

  const safeUpdates: Partial<PlatformGalleryLifecycleSettings> = { ...updates };

  const updated: PlatformGalleryLifecycleSettings = {
    ...current,
    ...safeUpdates,
    id: "platform_gallery_lifecycle_settings",
    updatedAt: now,
    updatedBy: adminEmail,
  };

  writePlatformGalleryLifecycleSettings(updated);

  const changedKeys: string[] = [];
  const changesSummary: Record<string, { old: any; new: any }> = {};

  for (const [k, v] of Object.entries(safeUpdates)) {
    if ((current as any)[k] !== v && k !== "updatedAt" && k !== "updatedBy") {
      changedKeys.push(k);
      changesSummary[k] = {
        old: (current as any)[k],
        new: v,
      };
    }
  }

  if (changedKeys.length > 0) {
    recordAdminAuditLog({
      adminId,
      adminEmail,
      action: "PLATFORM_GALLERY_LIFECYCLE_UPDATED",
      targetType: "system",
      targetId: "platform_gallery_lifecycle_settings",
      targetName: "Platform Gallery Lifecycle Settings",
      result: "success",
      metadata: {
        changedKeys,
        changes: changesSummary,
      },
    });
  }

  return updated;
}

