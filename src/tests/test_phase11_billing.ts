/**
 * Automated Verification Test Suite for Phase 11:
 * Complete Custom SaaS Subscription + Billing + Server-Side Entitlement System
 */

import {
  readPlans,
  getPlanBySlug,
  getPlanById,
  savePlan,
  readCoupons,
  saveCoupon,
  redeemCoupon,
  getSubscription,
  saveSubscription,
  updateSubscriptionPlanAndPeriod,
  extendSubscriptionPeriod,
  grantCompSubscription,
  setTenantEntitlementOverride,
  createInvoiceRecord,
  getInvoices,
  recordBillingEvent,
  isBillingEventProcessed,
  DEFAULT_PHOTOGRAPHER_ID,
  readPhotographers,
  savePhotographer,
  getPhotographerById,
} from "../lib/db";
import {
  getTenantEntitlements,
  hasFeature,
  getLimit,
  canCreate,
  canUse,
} from "../lib/entitlements";
import { getTenantUsageReport } from "../lib/usage";
import { Subscription } from "../lib/project-types";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

export async function runPhase11Tests() {
  console.log("================================================================================");
  console.log("  PHASE 11 AUTOMATED VERIFICATION: SAAS SUBSCRIPTION & ENTITLEMENT ENGINE");
  console.log("================================================================================\n");

  const testPhotographerId = "test-billing-photog-" + Date.now();

  // Setup mock photographer account
  const mockPhotog = {
    id: testPhotographerId,
    email: `billing-${Date.now()}@teststudio.com`,
    passwordHash: "hash123",
    tokenVersion: 1,
    name: "Test Studio Owner",
    studioName: "Grand Luxe Weddings",
    role: "PHOTOGRAPHER" as const,
    plan: "PRO",
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  savePhotographer(mockPhotog);

  // ── TEST GROUP 1: DYNAMIC PLANS SEEDING & RETRIEVAL ──────────────────────
  console.log("1. Dynamic Plans Engine:");
  const plans = readPlans();
  assert(plans.length >= 4, "Default 4 dynamic plans seeded (Starter, Pro, Studio, Enterprise)", `Count: ${plans.length}`);

  const starterPlan = getPlanBySlug("starter");
  assert(!!starterPlan && starterPlan.priceMonthlyPaise === 99900, "Starter plan has ₹999/mo (99900 paise)");
  assert(starterPlan?.features.whiteLabel === false, "Starter plan does NOT have white-label branding");

  const proPlan = getPlanBySlug("pro");
  assert(!!proPlan && proPlan.features.whiteLabel === true, "Pro plan has white-label branding enabled");
  assert(proPlan?.limits.maxCustomDomains === 3, "Pro plan includes 3 custom domains");

  const studioPlan = getPlanBySlug("studio");
  assert(!!studioPlan && studioPlan.limits.maxProjects === 100, "Studio plan supports 100 wedding projects");

  // Dynamic plan creation test
  const customPlanSlug = `vip-${Date.now()}`;
  savePlan({
    id: `plan-${customPlanSlug}`,
    slug: customPlanSlug,
    name: "Custom VIP Plan",
    tagline: "Tailored for royal wedding cinema",
    badge: "VIP Exclusive",
    priceMonthlyPaise: 1499900,
    priceYearlyPaise: 14999000,
    currency: "INR",
    isPopular: false,
    isActive: true,
    sortOrder: 10,
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
    },
    limits: {
      maxProjects: 500,
      maxActiveProjects: 500,
      maxPhotos: 500000,
      maxVideos: 1000,
      maxStorageGb: 1000,
      maxCustomDomains: 50,
      maxTeamMembers: 20,
      maxAiCredits: 5000,
      maxMonthlyAiJobs: 1000,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const retrievedCustomPlan = getPlanBySlug(customPlanSlug);
  assert(!!retrievedCustomPlan && retrievedCustomPlan.limits.maxProjects === 500, "Custom dynamic plan saved and retrieved with 500 projects limit");

  // ── TEST GROUP 2: COUPON SYSTEM & DISCOUNT VALIDATION ───────────────────
  console.log("\n2. Promo Coupon Engine:");
  const coupons = readCoupons();
  assert(coupons.length >= 3, "Default promo coupons seeded (WELCOME20, YEARLY25, LAUNCH50)", `Count: ${coupons.length}`);

  const welcomeCoupon = coupons.find((c) => c.code === "WELCOME20");
  assert(!!welcomeCoupon && welcomeCoupon.discountType === "PERCENT" && welcomeCoupon.discountValue === 20, "WELCOME20 provides 20% discount");

  const launchCoupon = coupons.find((c) => c.code === "LAUNCH50");
  assert(!!launchCoupon && launchCoupon.discountType === "PERCENT" && launchCoupon.discountValue === 50, "LAUNCH50 provides 50% discount");

  const prevRedeemed = welcomeCoupon?.timesRedeemed || 0;
  redeemCoupon("WELCOME20");
  const updatedWelcome = readCoupons().find((c) => c.code === "WELCOME20");
  assert(updatedWelcome?.timesRedeemed === prevRedeemed + 1, "Coupon redemption counter increments atomically");

  // ── TEST GROUP 3: SERVER-SIDE ENTITLEMENTS CALCULATION ─────────────────
  console.log("\n3. Entitlements Engine & Lifecycle States:");

  // Set photographer to Starter Plan
  updateSubscriptionPlanAndPeriod(
    testPhotographerId,
    starterPlan!.id,
    "starter",
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    "ACTIVE",
    "monthly"
  );

  let ent = getTenantEntitlements(testPhotographerId);
  assert(ent.planSlug === "starter", "Tenant entitlement reflects Starter plan");
  assert(ent.limits.maxProjects === 5, "Starter plan max projects is 5");
  assert(ent.features.whiteLabel === false, "Starter plan has whiteLabel: false");

  // Upgrade to Pro
  updateSubscriptionPlanAndPeriod(
    testPhotographerId,
    proPlan!.id,
    "pro",
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    "ACTIVE",
    "monthly"
  );
  ent = getTenantEntitlements(testPhotographerId);
  assert(ent.planSlug === "pro", "Tenant entitlement updated to Pro plan");
  assert(ent.features.whiteLabel === true, "Pro plan enables whiteLabel: true");
  assert(ent.limits.maxCustomDomains === 3, "Pro plan maxCustomDomains is 3");

  // Super Admin Overrides
  setTenantEntitlementOverride(testPhotographerId, {
    limits: { maxProjects: 75, maxCustomDomains: 10 },
    features: { aiFeatures: true },
    reason: "VIP Partner override",
    grantedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  ent = getTenantEntitlements(testPhotographerId);
  assert(ent.hasAdminOverride === true, "Admin override detected");
  assert(ent.limits.maxProjects === 75, "Max projects overridden from 25 to 75");
  assert(ent.limits.maxCustomDomains === 10, "Custom domains overridden from 3 to 10");
  assert(ent.features.aiFeatures === true, "AI features overridden to true");

  // ── TEST GROUP 4: RESOURCE CREATION GUARDS (canCreate & canUse) ─────────
  console.log("\n4. Resource Limits & Feature Guards:");

  // Check canCreate for weddings
  const weddingCheck = canCreate(testPhotographerId, "weddings");
  assert(weddingCheck.allowed === true, "canCreate allows wedding project creation within limits");

  // Check custom domains on Pro with override
  const domainCheck = canCreate(testPhotographerId, "customDomains");
  assert(domainCheck.allowed === true, "canCreate allows custom domain mapping");

  // Test account suspension restriction
  const suspendedPhotog = getPhotographerById(testPhotographerId)!;
  suspendedPhotog.status = "suspended";
  savePhotographer(suspendedPhotog);

  const suspendedCheck = canCreate(testPhotographerId, "weddings");
  assert(suspendedCheck.allowed === false && suspendedCheck.code === "ACCOUNT_SUSPENDED", "canCreate blocks write actions when studio account is suspended");

  // Restore account
  suspendedPhotog.status = "active";
  savePhotographer(suspendedPhotog);

  // ── TEST GROUP 5: LIFECYCLE EXTENSIONS & COMP SUBSCRIPTIONS ─────────────
  console.log("\n5. Subscription Extensions, Comp Grants & Idempotency:");

  const beforeEnd = new Date(getSubscription(testPhotographerId)!.currentPeriodEnd).getTime();
  const extendedSub = extendSubscriptionPeriod(testPhotographerId, 30);
  const afterEnd = new Date(extendedSub!.currentPeriodEnd).getTime();
  const dayDiff = Math.round((afterEnd - beforeEnd) / (24 * 60 * 60 * 1000));
  assert(dayDiff === 30, "extendSubscriptionPeriod extends period by exactly 30 days", `Diff: ${dayDiff} days`);

  // Complimentary Grant
  const compSub = grantCompSubscription(testPhotographerId, "studio", 60, "Sponsorship Partner");
  assert(compSub!.planSlug === "studio", "Complimentary grant sets plan to studio");
  assert(compSub!.isComp === true, "Complimentary flag isComp: true");
  assert(compSub!.status === "ACTIVE", "Complimentary grant sets status to ACTIVE");

  // Billing event idempotency
  const eventId = `test-evt-${Date.now()}`;
  assert(isBillingEventProcessed(eventId) === false, "Unprocessed event returns false");
  recordBillingEvent({
    photographerId: testPhotographerId,
    eventType: "payment.captured",
    provider: "RAZORPAY",
    providerEventId: eventId,
    payload: { amountPaise: 249900 },
  });
  assert(isBillingEventProcessed(eventId) === true, "Processed event returns true (idempotent protection)");

  // ── TEST GROUP 6: INVOICES & USAGE AGGREGATION ─────────────────────────
  console.log("\n6. Invoices & Live Usage Aggregation:");

  const inv = createInvoiceRecord({
    photographerId: testPhotographerId,
    subscriptionId: compSub!.id,
    razorpayPaymentId: "pay_test123",
    amountPaise: 249900,
    currency: "INR",
    status: "PAID",
    planName: "Pro Studio",
    billingCycle: "monthly",
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Pro Studio Monthly",
  });
  assert(!!inv.id && inv.amountPaise === 249900, "Invoice created with paise integer amount");

  const allInvoices = getInvoices(testPhotographerId);
  assert(allInvoices.some((i) => i.id === inv.id), "Invoice retrievable by photographer ID");

  const usage = getTenantUsageReport(testPhotographerId);
  assert(usage.metrics.projects !== undefined, "Tenant usage report contains projects metric");
  assert(usage.metrics.storageGb !== undefined, "Tenant usage report contains storage metric");
  assert(typeof usage.hasAnyExceeded === "boolean", "Tenant usage report computes quota thresholds");

  console.log("\n================================================================================");
  console.log(`  PHASE 11 TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("================================================================================\n");

  return { passed: passedCount === totalCount, passedCount, totalCount };
}

// Execute if run directly
if (require.main === module) {
  runPhase11Tests()
    .then((res) => {
      if (!res.passed) process.exit(1);
    })
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
}
