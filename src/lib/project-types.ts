// ── Shared Types & Client Utilities for Wedding Projects ───────────────────────

export type MediaType = "PHOTO" | "VIDEO";

export interface DriveMediaFile {
  id: string; // Internal or Drive file ID
  driveFileId: string; // Unique Google Drive File ID
  weddingId?: string;
  eventId?: string;
  eventName?: string; // e.g. "Engagement", "Haldi", "Mehndi", "Wedding", "Reception", "Main Highlights"
  type?: MediaType;
  name: string;
  mimeType: string;
  size: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  isFeatured?: boolean;
  isUnavailable?: boolean;
}

export interface DriveVideoFile {
  id: string; // Internal or Drive file ID
  driveFileId: string; // Unique Google Drive File ID
  weddingId?: string;
  eventId?: string;
  eventName?: string; // e.g. "Engagement", "Haldi", "Mehndi", "Wedding", "Reception", "Main"
  type?: MediaType;
  name: string;
  mimeType: string;
  size: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  isFeatured?: boolean;
  isUnavailable?: boolean;
}

export interface DriveEventCategory {
  id?: string;
  name: string;
  count: number;
  folderId?: string;
  photoCount?: number;
  videoCount?: number;
  coverImage?: string;
}

export type ProjectStatus = "draft" | "published" | "paused" | "archived" | "expired";
export type GalleryTheme = "cinematic" | "luxury" | "classic" | "minimal";
export type GalleryTemplate = "classic" | "editorial" | "minimal" | "cinematic" | "luxury" | "story";
export type HeroStyle = "fullscreen" | "large" | "compact" | "split" | "minimal";
export type FontFamilyPreset = "serif-elegant" | "sans-modern" | "editorial" | "classic" | "serif-editorial" | "serif-royal" | "serif-classic";
export type PhotoGridStyle = "masonry" | "grid" | "large-grid" | "editorial" | "columns-3" | "columns-4" | "editorial-mixed";
export type SelectionStatus = "OPEN" | "SUBMITTED" | "REOPENED" | "LOCKED";

export interface ClientSelectionConfig {
  enabled: boolean;
  limit?: number; // e.g. 20, 50, 100
  title?: string; // e.g. "Wedding Album Selection"
  instructions?: string; // e.g. "Select up to 20 photos for your print album"
  status: SelectionStatus;
  submittedAt?: string;
  submittedCount?: number;
  submittedBy?: string;
}

export interface ClientFavorite {
  id: string;
  projectId: string; // wedding project ID
  accessCode: string;
  mediaId: string; // Google Drive file ID or media ID
  mediaType: MediaType;
  sessionId: string; // client anonymous session ID (UUID)
  createdAt: string; // ISO date
}

export interface SelectionItem {
  id: string;
  projectId: string;
  accessCode: string;
  mediaId: string;
  mediaType: MediaType;
  sessionId: string;
  category?: "album" | "selection" | "highlight";
  createdAt: string;
}

export interface GallerySettings {
  isPasswordProtected: boolean;
  password?: string; // Hashed or protected password
  allowDownloads: boolean; // Default false
  allowPhotoDownload?: boolean; // Default matches allowDownloads
  allowVideoDownload?: boolean; // Default matches allowDownloads
  allowFavorites?: boolean; // Default true
  downloadQuality?: "preview" | "high" | "original"; // Default "high"
  allowFullscreen: boolean; // Default true
  showBranding: boolean; // Default true
  selectionConfig?: ClientSelectionConfig;
  // Phase 8 White-label & Template additions:
  whiteLabelEnabled?: boolean;
  template?: GalleryTemplate;
  theme?: GalleryTheme;
  heroStyle?: HeroStyle;
  gridStyle?: PhotoGridStyle;
  fontFamily?: FontFamilyPreset;
  fontPreset?: string;
  primaryAccent?: string;
  secondaryAccent?: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface PhotographerBranding {
  businessName: string;
  studioName?: string; // Optional alias for businessName
  tagline?: string; // Studio tagline
  subtitle?: string;
  weddingLocation?: string;
  logoUrl?: string;
  logoUrlLight?: string; // High contrast logo on dark background
  logoUrlDark?: string; // Logo on light background
  backgroundStyle?: "cinematic-dark" | "warm-champagne" | "pure-obsidian";
  website?: string;
  websiteUrl?: { href: string; display: string } | null;
  instagram?: string;
  facebook?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  footerText?: string;
  accentColor?: string;
  useStudioDefaults?: boolean;
}

export interface StudioSettings {
  studioName: string;
  tagline?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  footerText?: string;
  defaultTemplate?: GalleryTemplate;
  defaultTheme?: GalleryTheme;
  defaultAccentColor?: string;
  whiteLabelEnabled?: boolean;
  cnameTarget?: string;
  updatedAt?: string;
}

export type CustomDomainStatus =
  | "PENDING"
  | "VERIFYING"
  | "VERIFIED"
  | "ACTIVE"
  | "FAILED"
  | "DISABLED"
  | "DISABLED_BY_PLATFORM"
  | "DISCONNECTED"
  | "pending"
  | "invalid"
  | "disabled"
  | "verified"
  | "failed"
  | "active";

export type CustomDomainType = "SUBDOMAIN" | "CUSTOM_DOMAIN";

export interface PlatformDomainSettings {
  id: string; // "platform_domain_settings"
  customDomainsEnabled: boolean; // Global master switch: ON / OFF
  maxDomainsPerPhotographer: number; // 1
  allowSubdomains: boolean;
  allowApexDomains: boolean;
  cnameTarget: string;
  maintenanceNotice?: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface DomainMapping {
  id: string;
  photographerId: string;
  projectId?: string;
  hostname: string;
  domain?: string;
  normalizedDomain?: string;
  type?: CustomDomainType;
  status: CustomDomainStatus;
  verificationStatus: "pending" | "verifying" | "verified" | "failed";
  verificationToken: string;
  verificationMethod?: "TXT" | "CNAME";
  targetCname: string;
  txtRecordName?: string;
  txtRecordValue?: string;
  sslStatus: "active" | "pending" | "managed";
  isPrimary?: boolean;
  verifiedAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoAnalyticsStat {
  plays: number;
  completions: number;
  favorites: number;
}

export interface ProjectAnalytics {
  views: number;
  plays: number;
  completions: number;
  favorites: number;
  shares?: number;
  whatsappShares?: number;
  qrGenerated?: number;
  photoViews?: number;
  videoStats: Record<string, VideoAnalyticsStat>;
}

export interface ClientActivityEvent {
  id: string;
  projectId: string;
  eventType: string; // e.g. "gallery_opened", "photo_favorited", "photo_selected", "selection_submitted", "zip_downloaded"
  description: string;
  type?: "VIEW" | "PLAY" | "COMPLETE" | "FAVORITE" | "DOWNLOAD" | "SUBMIT_SELECTION";
  mediaId?: string;
  mediaTitle?: string;
  mediaType?: MediaType;
  sessionId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WeddingProject {
  id: string;
  photographerId?: string; // Scoped photographer/tenant ID
  coupleName: string;
  weddingDate: string;
  weddingLocation?: string;
  packageType: string;
  welcomeMessage?: string; // e.g. "Our beautiful beginning"
  coverImage?: string; // base64 data-URL or direct image URL
  notes?: string;
  photographerName?: string;
  driveFolderId: string;
  driveFolderUrl: string;
  accessCode: string; // Cryptographically secure token
  status: ProjectStatus; // "draft" | "published" | "paused" | "archived"
  theme: GalleryTheme; // "cinematic" | "luxury" | "classic" | "minimal"
  template?: GalleryTemplate; // Phase 8: "classic" | "editorial" | "minimal" | "cinematic" | "luxury" | "story"
  expiresAt?: string; // Optional expiration ISO string
  isActive: boolean; // Backwards compatibility helper
  publishedAt?: string; // ISO string when published
  archivedAt?: string; // ISO string when archived
  deletedAt?: string; // Soft delete ISO string
  deletedBy?: string; // User ID / email who deleted
  settings: GallerySettings;
  branding: PhotographerBranding;
  photographerBranding?: PhotographerBranding;
  analytics: ProjectAnalytics;
  videoFiles: DriveVideoFile[];
  photoFiles?: DriveMediaFile[];
  mediaFiles?: DriveMediaFile[];
  events: DriveEventCategory[];
  lastScanned: string;
  lastSyncStatus?: string;
  createdAt: string;
  updatedAt: string;
  favoritesCount?: number;
  selectedCount?: number;
  // Phase 15: Client Contact Information
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
}

// ── Platform Gallery Lifecycle & Retention Settings ──────────────────────────

export interface PlatformGalleryLifecycleSettings {
  id: string; // "platform_gallery_lifecycle_settings"
  expirationEnabled: boolean;
  defaultExpirationDays: number | null; // e.g. 90 or null for never
  defaultLifespanDays?: number;
  warningThresholdDays?: number;
  autoArchiveAfterExpiration?: boolean;
  autoArchiveDays?: number;
  autoDeleteAfterArchived?: boolean;
  autoDeleteDays?: number;
  allowNeverExpire: boolean;
  maxRetentionDays: number | null;
  autoArchiveExpiredGalleries: boolean;
  autoArchiveDaysAfterExpiry: number;
  updatedAt: string;
  updatedBy: string;
}

// ── Multi-Tenant SaaS & Subscription Types ────────────────────────────────────

export type PhotographerRole = "SUPER_ADMIN" | "PHOTOGRAPHER" | "owner" | "admin" | "editor" | "viewer" | "platform_admin";
export type PhotographerStatus = "ACTIVE" | "SUSPENDED" | "DELETED" | "active" | "suspended" | "pending_deletion";

export interface AdminPlanOverride {
  plan: SubscriptionPlanTier;
  grantedAt: string;
  expiresAt: string;
  grantedBy: string;
  reason?: string;
}

export interface PhotographerAccount {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  phone?: string;
  studioName?: string;
  tagline?: string;
  businessName?: string;
  avatarUrl?: string;
  plan?: SubscriptionPlanTier;
  status?: PhotographerStatus;
  tokenVersion?: number;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  adminPlanOverride?: AdminPlanOverride;
  lastLoginAt?: string;
  lastActiveAt?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  website?: string;
  city?: string;
  country?: string;
  termsAccepted?: boolean;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  googleId?: string;
  googleEmail?: string;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: string;
  lastVerificationSentAt?: string;
  googleDriveConnected?: boolean;
  googleDriveEmail?: string;
  googleDriveTokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
    scope?: string;
    tokenType?: string;
  };
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    defaultTheme?: GalleryTheme;
    defaultTemplate?: GalleryTemplate;
    logoUrl?: string;
    tagline?: string;
    showWatermark?: boolean;
  };
  googleAvatarUrl?: string;
  authProviders?: ("email" | "google")[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    youtube?: string;
  };
  role: PhotographerRole;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: "photographer" | "project" | "subscription" | "domain" | "plan" | "system";
  targetId: string;
  targetName?: string;
  metadata?: Record<string, any>;
  result: "success" | "failed";
  ipAddress?: string;
  timestamp: string;
}

export interface SupportNote {
  id: string;
  photographerId: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  photographerId: string;
  photographerName?: string;
  photographerEmail?: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOverviewMetrics {
  totalPhotographers: number;
  activePhotographers: number;
  suspendedPhotographers: number;
  trialPhotographers: number;
  totalWeddings: number;
  liveGalleries: number;
  totalPhotos: number;
  totalVideos: number;
  totalStorageGb: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  mrrInr: number;
  arrInr: number;
  totalRevenueInr: number;
  failedPaymentsCount?: number;
  failedWebhooksCount?: number;
  failedNotificationsCount?: number;
  openAlertsCount?: number;
}


export const DEFAULT_TRIAL_DAYS = 14;
export const DEFAULT_GRACE_PERIOD_DAYS = 7;

export type SubscriptionPlanTier = "FREE" | "STARTER" | "PRO" | "STUDIO" | "ENTERPRISE" | string;
export type SubscriptionStatus =
  | "TRIAL"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED";
export type BillingCycle = "MONTHLY" | "YEARLY" | "monthly" | "yearly";

export interface PlanFeatures {
  googleDrive: boolean;
  weddingProjects: boolean;
  clientGalleries: boolean;
  photoDelivery: boolean;
  videoDelivery: boolean;
  favorites: boolean;
  clientSelection: boolean;
  qrCodes: boolean;
  whatsappSharing: boolean;
  whiteLabel: boolean;
  customBranding: boolean;
  customDomains: boolean;
  galleryTemplates: boolean;
  advancedGalleryTemplates: boolean;
  analytics: boolean;
  clientNotifications: boolean;
  aiFeatures: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  teamCollaboration: boolean;
  downloadZip: boolean;
  prioritySync: boolean;
  adsEnabled?: boolean;
  customCss?: boolean;
  [key: string]: boolean | undefined;
}

export interface PlanLimits {
  maxProjects: number;          // -1 for unlimited, 0 for disabled
  maxActiveProjects: number;
  maxPhotos: number;
  maxVideos: number;
  maxStorageGb: number;
  maxCustomDomains: number;
  maxTeamMembers: number;
  maxAiCredits: number;
  maxMonthlyAiJobs: number;
  [key: string]: number | undefined;
}

export interface DynamicPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description?: string;
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
  isPublic?: boolean;
  displayOrder?: number;
  sortOrder?: number;
  priceMonthlyInPaise: number; // e.g. 99900 = ₹999
  priceYearlyInPaise: number;  // e.g. 999000 = ₹9,990
  priceMonthlyPaise: number;   // alias for priceMonthlyInPaise
  priceYearlyPaise: number;    // alias for priceYearlyInPaise
  currency: string;            // "INR", "USD", etc.
  trialDays?: number;
  isTrialEnabled?: boolean;
  features: PlanFeatures;
  limits: PlanLimits;
  featureBullets?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed" | "PERCENT" | "FLAT_AMOUNT";
  discountValue: number; // percentage (e.g. 20) or paise (e.g. 20000 = ₹200)
  currency?: string;
  applicablePlans?: string[]; // empty array or undefined means all plans
  allowedPlans?: string[];     // alias for applicablePlans
  applicableCycles?: BillingCycle[];
  maxRedemptions?: number;
  redemptionCount?: number;
  timesRedeemed: number;       // standard counter
  validFrom?: string;
  validUntil?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AddOn {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthlyInPaise: number;
  priceYearlyInPaise: number;
  currency: string;
  limitBonus: Partial<PlanLimits>;
  featureBonus?: Partial<PlanFeatures>;
  isActive: boolean;
  createdAt: string;
}

export interface TenantAddOn {
  id: string;
  addOnId: string;
  addOnSlug: string;
  quantity: number;
  billingCycle: BillingCycle;
  purchasedAt: string;
  expiresAt?: string;
}

export interface TenantEntitlementOverride {
  features?: Partial<PlanFeatures>;
  limits?: Partial<PlanLimits>;
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
  reason?: string;
}

export interface Subscription {
  id: string;
  photographerId: string;
  plan: SubscriptionPlanTier;
  planSlug?: string;
  planSnapshot?: {
    name: string;
    pricePaidInPaise: number;
    billingCycle: BillingCycle;
    currency: string;
  };
  status: SubscriptionStatus;
  billingCycle?: BillingCycle;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  razorpayOrderId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  gracePeriodEnd?: string;
  appliedCoupon?: string;
  discountInPaise?: number;
  addOns?: TenantAddOn[];
  entitlementOverride?: TenantEntitlementOverride;
  isComp?: boolean;
  compReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  photographerId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  paymentId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  subtotalInPaise?: number;
  discountInPaise?: number;
  taxInPaise?: number;
  amount: number; // in INR (major units) for legacy compatibility
  amountInPaise?: number; // in smallest units (paise)
  amountPaise?: number; // alias for tests & components
  currency: string;
  status: "paid" | "failed" | "pending" | "refunded" | "PAID";
  plan: SubscriptionPlanTier | string;
  planName?: string;
  billingPeriod?: string;
  billingCycle?: BillingCycle;
  couponCode?: string;
  description?: string;
  invoicePdfUrl?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  photographerId: string;
  subscriptionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  amountInPaise: number;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "pending" | "refunded";
  method?: string;
  paidAt?: string;
  createdAt: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: string; // "RAZORPAY"
  eventId: string;
  eventType: string;
  processed: boolean;
  processedAt: string;
  status?: "processed" | "ignored" | "failed";
  payloadHash?: string;
  error?: string;
  createdAt: string;
}

export interface BillingEvent {
  id: string;
  providerEventId: string;
  eventType: string;
  provider?: string;
  photographerId?: string;
  subscriptionId?: string;
  paymentId?: string;
  payload: Record<string, any>;
  processedAt: string;
  status?: "processed" | "ignored" | "failed";
}

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type TeamPermission = 
  | "projects:read"
  | "projects:create"
  | "projects:edit"
  | "projects:delete"
  | "media:upload"
  | "media:delete"
  | "selections:view"
  | "selections:manage"
  | "communications:view"
  | "communications:send"
  | "settings:view"
  | "settings:manage"
  | "billing:view"
  | "billing:manage"
  | "team:view"
  | "team:manage"
  | "drive:manage";

export interface TeamMember {
  id: string;
  photographerId: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited" | "suspended";
  passwordHash?: string;
  inviteToken?: string;
  inviteTokenExpires?: string;
  assignedProjectIds?: string[];
  hasAllProjectsAccess?: boolean;
  permissions?: TeamPermission[];
  tokenVersion?: number;
  invitedAt?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  updatedAt?: string;
}

export interface ClientSummary {
  projectId: string;
  coupleName: string;
  weddingDate: string;
  weddingLocation?: string;
  packageType: string;
  accessCode: string;
  status: ProjectStatus;
  selectionStatus: SelectionStatus;
  selectionCount: number;
  selectionLimit?: number;
  favoritesCount: number;
  totalPhotos: number;
  totalVideos: number;
  lastActivity?: string;
  coverImage?: string;
}

export function isProjectExpired(project: { status?: string; expiresAt?: string; deletedAt?: string }): boolean {
  if (project.deletedAt) return true;
  if (project.status === "expired" || project.status === "archived") return true;
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
  if (diffMs <= 0) return false; // already expired

  const daysRemaining = diffMs / (1000 * 60 * 60 * 24);
  return daysRemaining <= thresholdDays;
}

export function getRemainingDays(project: { expiresAt?: string }): number | null {
  if (!project.expiresAt) return null;
  const exp = new Date(project.expiresAt);
  if (isNaN(exp.getTime())) return null;

  const diffMs = exp.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ── Google AdSense & Platform Ad Management Types ─────────────────────────────

export type AdFormat = "auto" | "horizontal" | "vertical" | "rectangle" | "fluid";

export type AdPlacementKey =
  | "PUBLIC_HOME"
  | "PRICING_PAGE"
  | "BLOG"
  | "HELP"
  | "DOCUMENTATION"
  | "PHOTOGRAPHER_DASHBOARD_TOP"
  | "PHOTOGRAPHER_DASHBOARD_BOTTOM"
  | "PHOTOGRAPHER_SIDEBAR"
  | "ADMIN_DISABLED"
  | "CLIENT_GALLERY_DISABLED"
  | string;

export interface AdSenseConfig {
  publisherId: string;           // ca-pub-XXXXXXXXXXXXXXXX
  enabled: boolean;               // Global Platform Ads Master Switch
  testMode: boolean;              // Visual placeholders [ ADVERTISEMENT — TEST MODE ], no fake revenue
  autoAdsEnabled: boolean;        // Google Auto Ads script directive
  manualAdsEnabled: boolean;      // In-page responsive ad slot components
  clientGalleryAdsEnabled: boolean; // Policy flag: allow ads in client galleries (default false)
  safetyMode: boolean;            // Emergency Kill Switch / Policy Safety Mode (instantly suppresses all ads)
  maxAdsPerPage: number;          // Default 3 to prevent ad overload
  minSpacingPx: number;           // Default 300px spacing between units
  reportingConnected: boolean;    // AdSense Management API connection status
  reportingClientId?: string;     // Google OAuth client ID (server-side only)
  reportingClientSecret?: string; // Google OAuth client secret (server-side only)
  updatedAt: string;
  updatedBy: string;
}

export interface AdUnit {
  id: string;
  name: string;                   // Human readable name (e.g. "Dashboard Top Leaderboard")
  key: string;                    // Internal key (e.g. "dashboard_top", "pricing_banner", "marketing_footer")
  slotId: string;                 // Google AdSense Ad Slot ID (e.g. "9876543210")
  format: AdFormat;               // auto, horizontal, vertical, rectangle, fluid
  placement: AdPlacementKey;      // Target placement key
  active: boolean;                // Unit active toggle
  priority: number;               // Ordering/priority weighting
  responsive: boolean;            // Responsive layout wrapping
  customCss?: string;             // Optional styling overrides
  createdAt: string;
  updatedAt: string;
}

export interface AdPlacement {
  id: string;
  name: string;                   // Human readable name
  placementKey: AdPlacementKey;   // Enum key (e.g. "PHOTOGRAPHER_DASHBOARD_TOP")
  pageRule: string;               // URL matching pattern (e.g. "/dashboard", "/", "/pricing")
  adUnitId?: string;              // Linked AdUnit ID
  enabled: boolean;               // Placement active toggle
  allowedRoles: string[];         // User roles that can see ads (e.g. ["PHOTOGRAPHER", "GUEST"])
  planRule: "ALL" | "ADS_ENABLED_ONLY" | "EXCLUDE_PAID"; // Plan entitlement rule
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdOverride {
  photographerId: string;
  adsEnabled: boolean;            // true = force show ads, false = force suppress ads
  reason?: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;             // Optional override expiration ISO string
}

export interface AdSenseReportingStats {
  connected: boolean;
  message: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  estimatedRevenueInr?: number;
  rpm?: number;
  lastUpdated?: string;
}

export interface AdVisibilityContext {
  tenantId?: string;
  userRole?: string;
  pathname: string;
  planSlug?: string;
  isCustomDomain?: boolean;
  isWhiteLabel?: boolean;
  placementKey: AdPlacementKey;
}

export interface AdVisibilityResult {
  showAd: boolean;
  testMode: boolean;
  reason: string;
  publisherId?: string;
  adUnit?: AdUnit | null;
  format?: AdFormat;
  slotId?: string;
}

// ── Phase 15: Production Client Notifications & Communication Architecture ──

export type NotificationChannel = "EMAIL" | "WHATSAPP" | "SMS" | "PUSH" | "IN_APP";

export type NotificationStatus =
  | "QUEUED"
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "BLOCKED"
  | "BLOCKED_BY_PLATFORM_SETTING"
  | "SKIPPED"
  | "SKIPPED_BY_PREFERENCE"
  | "NOT_CONFIGURED"
  | "CANCELLED";

export type NotificationType =
  | "GALLERY_PUBLISHED"
  | "GALLERY_UPDATED"
  | "GALLERY_EXPIRING_SOON"
  | "GALLERY_EXPIRED"
  | "GALLERY_ARCHIVED"
  | "GALLERY_RESTORED"
  | "SELECTION_SUBMITTED"
  | "SELECTION_UPDATED"
  | "PAYMENT_RECEIVED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "TEAM_INVITATION"
  | "BILLING_INVOICE"
  | "BILLING_ALERT"
  | "SECURITY_ALERT"
  | "WELCOME"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET";

export interface NotificationRecord {
  id: string;
  photographerId: string;
  clientId?: string;
  weddingId?: string;
  projectId?: string;
  galleryId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string; // Email address or E.164 phone
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  subject?: string;
  content?: string;
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  isTransientError?: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotographerNotificationPreferences {
  photographerId: string;
  clientGalleryPublished?: boolean;
  clientSelectionConfirmation?: boolean;
  clientGalleryExpiring?: boolean;
  photographerSelectionSubmitted?: boolean;
  photographerDownloadAlert?: boolean;
  photographerPaymentAlert?: boolean;
  whatsappEnabled?: boolean;
  whatsappPhoneNumber?: string;
  whatsappStatus?: "CONNECTED" | "NOT_CONFIGURED" | "CONFIG_REQUIRED";
  emailReplyTo?: string;
  customEmailSubjectTemplate?: string;
  customEmailFooter?: string;
  email?: {
    galleryPublished: boolean;
    selectionSubmitted: boolean;
    selectionChanged: boolean;
    subscriptionEvents: boolean;
  };
  clientEmail?: {
    galleryPublished: boolean;
    selectionConfirmation: boolean;
  };
  whatsapp?: {
    enabled: boolean;
    galleryPublished: boolean;
    selectionConfirmation: boolean;
    notifyPhotographerOnSelection: boolean;
  };
  updatedAt: string;
}

export interface NotificationMetrics {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  byChannel: {
    EMAIL: number;
    WHATSAPP: number;
    IN_APP: number;
  };
  byType: Record<string, number>;
  channels: {
    email: number;
    whatsapp: number;
    inApp: number;
  };
  types: Record<string, number>;
}

// ── Phase 17: Production Reliability, Monitoring, Error Tracking & Backup ──

export type ErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface ApplicationError {
  id: string;
  fingerprint: string;
  severity: ErrorSeverity;
  source: string; // e.g. "DRIVE_SCAN", "PAYMENT_WEBHOOK", "EMAIL_SEND", "AUTH", "API", "DATABASE"
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  photographerId?: string;
  environment: "development" | "staging" | "production" | "test";
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface PlatformAlert {
  id: string;
  fingerprint: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  photographerId?: string;
  status: AlertStatus;
  occurrences: number;
  createdAt: string;
  lastOccurredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface BackgroundJobRecord {
  id: string;
  name: string; // e.g. "DRIVE_RESCAN", "NOTIFICATION_DISPATCH", "DOMAIN_VERIFICATION", "SUBSCRIPTION_SYNC", "BACKUP_SNAPSHOT"
  jobType?: string;
  status: JobStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  attempts: number;
  maxAttempts: number;
  processedItems?: number;
  totalItems?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  filePath?: string;
  sizeBytes: number;
  sizeKb: number;
  storeCount: number;
  recordCount: number;
  createdAt: string;
  checksum: string;
  status: "COMPLETED" | "SUCCESS" | "FAILED";
  error?: string;
}

// ── Phase 19: Super Admin Global Communication Control Models ─────────────────

export interface PlatformCommunicationSettings {
  id: string; // "platform_communication_settings"
  globalEnabled: boolean;
  allCommunicationsEnabled?: boolean; // Phase 27 Master Switch (synced with globalEnabled)
  emergencyKillSwitch: boolean;
  maintenanceNote?: string;

  // Phase 27 Canonical Feature-Level Controls
  galleryPublishedEnabled?: boolean;
  selectionSubmittedEnabled?: boolean;
  selectionConfirmationEnabled?: boolean;
  expiryReminderEnabled?: boolean;
  teamInvitationEnabled?: boolean;
  passwordResetEnabled?: boolean;
  billingNotificationsEnabled?: boolean;
  securityNotificationsEnabled?: boolean;

  // 1. Email Controls
  emailEnabled: boolean;
  emailClientGalleries: boolean;
  emailClientSelections: boolean;
  emailPhotographerDigest: boolean;
  emailPhotographerBilling: boolean;
  emailMarketingCampaigns: boolean;
  emailSecurityAlerts: boolean; // Protected / Security Critical
  emailPasswordReset: boolean; // Protected / Security Critical
  emailVerification: boolean; // Protected / Security Critical
  emailAccountAlerts: boolean;

  // 2. WhatsApp Controls
  whatsappEnabled: boolean;
  whatsappClientGalleries: boolean;
  whatsappClientSelections: boolean;
  whatsappPhotographerAlerts: boolean;
  whatsappMarketingBroadcasts: boolean;

  // 3. SMS Controls
  smsEnabled: boolean;
  smsClientGalleries: boolean;
  smsClientSelections: boolean;
  smsPhotographerAlerts: boolean;
  smsSecurityOtp: boolean; // Protected / Security Critical
  smsMarketing: boolean;

  // 4. Push Notifications
  pushEnabled: boolean;
  pushClientGalleries: boolean;
  pushPhotographerAlerts: boolean;
  pushMarketing: boolean;

  // 5. In-App Notifications
  inAppEnabled: boolean;
  inAppClientGalleries: boolean;
  inAppPhotographerAlerts: boolean;
  inAppSystemAnnouncements: boolean;

  // 6. Client Communication Controls
  clientAllEnabled: boolean;
  clientGalleryPublished: boolean;
  clientSelectionConfirmation: boolean;
  clientMarketing: boolean;

  // 7. Photographer Communication Controls
  photographerAllEnabled: boolean;
  photographerSelectionSubmitted: boolean;
  photographerBillingReceipts: boolean;
  photographerStorageAlerts: boolean;
  photographerMarketing: boolean;

  // 8. Marketing Communication Controls
  marketingAllEnabled: boolean;
  marketingPromotions: boolean;
  marketingProductUpdates: boolean;
  marketingNewsletter: boolean;
  marketingRequireDoubleOptIn: boolean;
  marketingRespectUnsubscribe: boolean;

  lastUpdated: string;
  lastUpdatedBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationProviderHealth = "CONNECTED" | "NOT_CONFIGURED" | "ERROR" | "DEVELOPMENT";

export interface CommunicationProviderStatusReport {
  email: {
    status: CommunicationProviderHealth;
    provider: string;
    fromAddress: string;
    configured: boolean;
    details?: string;
  };
  whatsapp: {
    status: CommunicationProviderHealth;
    provider: string;
    phoneNumberId?: string;
    configured: boolean;
    details?: string;
  };
  sms: {
    status: CommunicationProviderHealth;
    provider: string;
    fromNumber?: string;
    configured: boolean;
    details?: string;
  };
  push: {
    status: CommunicationProviderHealth;
    provider: string;
    configured: boolean;
    details?: string;
  };
  inApp: {
    status: CommunicationProviderHealth;
    provider: string;
    configured: boolean;
    details?: string;
  };
}


