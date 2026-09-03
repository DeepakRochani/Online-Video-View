/**
 * Automated Verification Test Suite for Phase 12:
 * Google AdSense + Central Platform Ad Management System
 */

import {
  readAdSenseConfig,
  saveAdSenseConfig,
  readAdUnits,
  getAdUnitById,
  getAdUnitByKey,
  saveAdUnit,
  deleteAdUnit,
  readAdPlacements,
  getAdPlacementById,
  getAdPlacementByKey,
  saveAdPlacement,
  deleteAdPlacement,
  readAdOverrides,
  getAdOverrideByPhotographer,
  setPhotographerAdOverride,
  removePhotographerAdOverride,
  getAdReportingStats,
  savePhotographer,
  saveSubscription,
  readPlans,
  DEFAULT_PHOTOGRAPHER_ID,
} from "../lib/db";
import { shouldShowAd, PERMANENTLY_EXCLUDED_ROUTES, CLIENT_GALLERY_ROUTES } from "../lib/ads/visibility";
import { AdSenseConfig, AdUnit, AdPlacement, PlanFeatures } from "../lib/project-types";

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

export async function runPhase12Tests() {
  console.log("================================================================================");
  console.log("  PHASE 12 AUTOMATED VERIFICATION: GOOGLE ADSENSE & PLATFORM AD ENGINE");
  console.log("================================================================================\n");

  // Backup original config
  const originalConfig = readAdSenseConfig();

  try {
    // --------------------------------------------------------------------------
    // 1. ADSENSE GLOBAL CONFIG & KILL SWITCH
    // --------------------------------------------------------------------------
    console.log("--- 1. AdSense Global Configuration & Kill Switch ---");
    const initialConfig = readAdSenseConfig();
    assert(!!initialConfig, "AdSense config initialized from database");
    assert(typeof initialConfig.enabled === "boolean", "Config has 'enabled' boolean");
    assert(typeof initialConfig.testMode === "boolean", "Config has 'testMode' boolean");
    assert(typeof initialConfig.safetyMode === "boolean", "Config has 'safetyMode' (kill switch) boolean");
    assert(typeof initialConfig.manualAdsEnabled === "boolean", "Config has 'manualAdsEnabled' boolean");
    assert(typeof initialConfig.autoAdsEnabled === "boolean", "Config has 'autoAdsEnabled' boolean");
    assert(PERMANENTLY_EXCLUDED_ROUTES.includes("/admin"), "Permanent excluded routes contain /admin");
    assert(PERMANENTLY_EXCLUDED_ROUTES.includes("/checkout"), "Permanent excluded routes contain /checkout");
    assert(CLIENT_GALLERY_ROUTES.includes("/gallery"), "Protected client gallery routes contain /gallery");

    // Test updating config
    const updatedConfig: AdSenseConfig = {
      ...initialConfig,
      publisherId: "ca-pub-1234567890123456",
      enabled: true,
      testMode: true,
      safetyMode: false,
      autoAdsEnabled: false,
      manualAdsEnabled: true,
      maxAdsPerPage: 3,
      minSpacingPx: 300,
      reportingConnected: false,
      updatedAt: new Date().toISOString(),
      updatedBy: "Super Admin Test",
    };
    saveAdSenseConfig(updatedConfig);
    const reloadedConfig = readAdSenseConfig();
    assert(reloadedConfig.publisherId === "ca-pub-1234567890123456", "Saved and reloaded Publisher ID successfully");
    assert(reloadedConfig.testMode === true, "Test mode flag saved correctly");

    // --------------------------------------------------------------------------
    // 2. AD UNITS CRUD OPERATIONS
    // --------------------------------------------------------------------------
    console.log("\n--- 2. Ad Units CRUD Operations ---");
    const initialUnits = readAdUnits();
    assert(initialUnits.length >= 3, `Initial seed ad units loaded (count: ${initialUnits.length})`);

    const testUnitKey = "test_unit_" + Date.now();
    const newUnit: AdUnit = {
      id: "unit-" + Date.now(),
      name: "Test Verification Leaderboard",
      key: testUnitKey,
      slotId: "9876543210",
      format: "horizontal",
      placement: "PHOTOGRAPHER_DASHBOARD_TOP",
      active: true,
      priority: 1,
      responsive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAdUnit(newUnit);
    const fetchedUnit = getAdUnitByKey(testUnitKey);
    assert(!!fetchedUnit && fetchedUnit.slotId === "9876543210", "Created and fetched ad unit by key");
    assert(fetchedUnit?.format === "horizontal", "Ad unit format is horizontal");

    // Update Ad Unit
    if (fetchedUnit) {
      saveAdUnit({ ...fetchedUnit, active: false });
      const updatedUnit = getAdUnitById(fetchedUnit.id);
      assert(updatedUnit?.active === false, "Ad unit status updated to inactive");
    }

    // Delete Ad Unit
    if (fetchedUnit) {
      deleteAdUnit(fetchedUnit.id);
      const deletedUnit = getAdUnitById(fetchedUnit.id);
      assert(!deletedUnit, "Ad unit deleted successfully");
    }

    // --------------------------------------------------------------------------
    // 3. AD PLACEMENTS CRUD OPERATIONS
    // --------------------------------------------------------------------------
    console.log("\n--- 3. Ad Placements CRUD Operations ---");
    const initialPlacements = readAdPlacements();
    assert(initialPlacements.length >= 4, `Initial seed ad placements loaded (count: ${initialPlacements.length})`);

    const testPlacementKey = "TEST_CUSTOM_PLACEMENT_" + Date.now();
    const newPlacement: AdPlacement = {
      id: "plc-" + Date.now(),
      name: "Test Custom Placement",
      placementKey: testPlacementKey,
      pageRule: "/help/*",
      adUnitId: initialUnits[0].id,
      enabled: true,
      allowedRoles: ["PHOTOGRAPHER", "GUEST"],
      planRule: "ALL",
      description: "Custom test placement for automated verification",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAdPlacement(newPlacement);
    const fetchedPlacement = getAdPlacementByKey(testPlacementKey);
    assert(!!fetchedPlacement && fetchedPlacement.pageRule === "/help/*", "Created and fetched placement by key");

    // Update Placement
    if (fetchedPlacement) {
      saveAdPlacement({ ...fetchedPlacement, enabled: false });
      const updatedPlacement = getAdPlacementById(fetchedPlacement.id);
      assert(updatedPlacement?.enabled === false, "Placement updated to inactive");
    }

    // Delete Placement
    if (fetchedPlacement) {
      deleteAdPlacement(fetchedPlacement.id);
      const deletedPlacement = getAdPlacementById(fetchedPlacement.id);
      assert(!deletedPlacement, "Placement deleted successfully");
    }

    // --------------------------------------------------------------------------
    // 4. CENTRAL AD VISIBILITY ENGINE (shouldShowAd)
    // --------------------------------------------------------------------------
    console.log("\n--- 4. Central Ad Visibility Engine Rules ---");

    // Ensure baseline active config with testMode enabled
    saveAdSenseConfig({
      ...initialConfig,
      enabled: true,
      safetyMode: false,
      testMode: true,
      publisherId: "ca-pub-1234567890123456",
    });

    // Rule 4.1: Hard Excluded Route - Super Admin Panel
    const adminRouteResult = shouldShowAd({
      pathname: "/admin/adsense",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "SUPER_ADMIN",
    });
    assert(adminRouteResult.showAd === false, "Ad strictly blocked on /admin/* route");
    assert(adminRouteResult.reason.includes("excluded"), `Admin exclusion reason: ${adminRouteResult.reason}`);

    // Rule 4.2: Hard Excluded Route - Auth / Checkout
    const checkoutRouteResult = shouldShowAd({
      pathname: "/checkout",
      placementKey: "PUBLIC_HOME",
    });
    assert(checkoutRouteResult.showAd === false, "Ad strictly blocked on /checkout route");

    // Rule 4.3: Client Wedding Gallery Protection (SACRED RULE)
    const galleryRouteResult = shouldShowAd({
      pathname: "/gallery/wedding-of-sarah-and-john",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "client",
    });
    assert(galleryRouteResult.showAd === false, "Ad strictly blocked in client wedding gallery (/gallery/*)");
    assert(galleryRouteResult.reason.includes("wedding galleries"), `Gallery protection reason: ${galleryRouteResult.reason}`);

    const clientDisabledPlacementResult = shouldShowAd({
      pathname: "/gallery/wedding-of-sarah-and-john/view",
      placementKey: "CLIENT_GALLERY_DISABLED",
    });
    assert(clientDisabledPlacementResult.showAd === false, "Ad blocked on CLIENT_GALLERY_DISABLED placement");

    // Rule 4.4: Custom Domain & White-Label Protection
    const customDomainResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      isCustomDomain: true,
    });
    assert(customDomainResult.showAd === false, "Ad blocked for custom domain tenant");
    assert(customDomainResult.reason.includes("Custom photographer domain"), `Custom domain reason: ${customDomainResult.reason}`);

    const whiteLabelResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      isWhiteLabel: true,
    });
    assert(whiteLabelResult.showAd === false, "Ad blocked for white-label tenant");

    // Rule 4.5: Global Emergency Safety Mode (Kill Switch)
    saveAdSenseConfig({
      ...initialConfig,
      enabled: true,
      safetyMode: true, // Activate kill switch
    });
    const safetyModeResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
    });
    assert(safetyModeResult.showAd === false, "Ad blocked when Emergency Safety Mode is ON");
    assert(safetyModeResult.reason.includes("safety mode"), `Kill switch reason: ${safetyModeResult.reason}`);

    // Restore safetyMode to false
    saveAdSenseConfig({
      ...initialConfig,
      enabled: true,
      safetyMode: false,
      testMode: true,
      publisherId: "ca-pub-1234567890123456",
    });

    // Rule 4.6: Global Disabled Master Switch
    saveAdSenseConfig({
      ...initialConfig,
      enabled: false, // Turn off master switch
      safetyMode: false,
    });
    const masterOffResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
    });
    assert(masterOffResult.showAd === false, "Ad blocked when Platform Ads Master Switch is OFF");
    assert(masterOffResult.reason.includes("disabled"), `Master switch reason: ${masterOffResult.reason}`);

    // Re-enable master switch
    saveAdSenseConfig({
      ...initialConfig,
      enabled: true,
      safetyMode: false,
      testMode: true,
      publisherId: "ca-pub-1234567890123456",
    });

    // --------------------------------------------------------------------------
    // 5. SUBSCRIPTION PLAN ENTITLEMENTS & TENANT OVERRIDES
    // --------------------------------------------------------------------------
    console.log("\n--- 5. Subscription Plan Entitlements & Tenant Overrides ---");

    const starterPhotogId = "photog-starter-" + Date.now();
    const proPhotogId = "photog-pro-" + Date.now();

    // Setup Starter Photographer
    savePhotographer({
      id: starterPhotogId,
      name: "Starter Photographer",
      email: "starter@test.com",
      plan: "starter",
      status: "active",
      role: "PHOTOGRAPHER",
      passwordHash: "hash123",
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveSubscription({
      id: "sub-starter-" + Date.now(),
      photographerId: starterPhotogId,
      plan: "starter",
      planSlug: "starter",
      status: "ACTIVE",
      billingCycle: "monthly",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Setup Pro Photographer (Ad-Free)
    savePhotographer({
      id: proPhotogId,
      name: "Pro Photographer",
      email: "pro@test.com",
      plan: "pro",
      status: "active",
      role: "PHOTOGRAPHER",
      passwordHash: "hash123",
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveSubscription({
      id: "sub-pro-" + Date.now(),
      photographerId: proPhotogId,
      plan: "pro",
      planSlug: "pro",
      status: "ACTIVE",
      billingCycle: "monthly",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Test 5.1: Starter plan shows ads on marketing/pricing pages
    const starterResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      tenantId: starterPhotogId,
    });
    assert(starterResult.showAd === true, "Starter plan photographer shows ads on dashboard");
    assert(starterResult.testMode === true, "Test mode flagged in visibility result");
    assert(!!starterResult.adUnit, "Matched active AdUnit returned");

    // Test 5.2: Pro plan is ad-free
    const proResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      tenantId: proPhotogId,
    });
    assert(proResult.showAd === false, "Pro plan photographer is completely ad-free");
    assert(proResult.reason.includes("ad-free tier"), `Pro ad-free reason: ${proResult.reason}`);

    // Test 5.3: Super Admin Override - Force Disable on Starter Photographer
    setPhotographerAdOverride(
      starterPhotogId,
      false,
      "VIP promotional partner exception",
      undefined,
      "super_admin_test"
    );
    const overriddenStarterResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      tenantId: starterPhotogId,
    });
    assert(overriddenStarterResult.showAd === false, "Super Admin override successfully disabled ads on Starter plan");
    assert(overriddenStarterResult.reason.includes("Super Admin manual tenant override"), `Override reason: ${overriddenStarterResult.reason}`);

    // Test 5.4: Super Admin Override - Force Enable on Pro Photographer
    setPhotographerAdOverride(
      proPhotogId,
      true,
      "Comp trial special condition",
      undefined,
      "super_admin_test"
    );
    const overriddenProResult = shouldShowAd({
      pathname: "/pricing",
      placementKey: "PHOTOGRAPHER_DASHBOARD_TOP",
      userRole: "photographer",
      tenantId: proPhotogId,
    });
    assert(overriddenProResult.showAd === true, "Super Admin override successfully enabled ads on Pro plan");

    // Clean up override
    removePhotographerAdOverride(starterPhotogId);
    removePhotographerAdOverride(proPhotogId);

    // --------------------------------------------------------------------------
    // 6. PUBLIC HOMEPAGE & PRICING AD BEHAVIOR
    // --------------------------------------------------------------------------
    console.log("\n--- 6. Public Pages & Conversion Flow Protection ---");

    const publicHomeResult = shouldShowAd({
      pathname: "/",
      placementKey: "PUBLIC_HOME",
      userRole: "GUEST",
    });
    assert(publicHomeResult.showAd === true, "Public homepage allows banner ad for anonymous visitor");

    // --------------------------------------------------------------------------
    // 7. HONEST REPORTING / NO FAKE METRICS GUARANTEE
    // --------------------------------------------------------------------------
    console.log("\n--- 7. Honest Reporting & Analytics Integrity ---");
    const reportingStats = getAdReportingStats();
    assert(reportingStats.connected === false, "Reporting stats explicitly returns connected: false when unintegrated");
    assert(
      reportingStats.message.includes("Statistics unavailable — connect AdSense reporting integration"),
      "Reporting stats returns exact required transparency notice"
    );
    assert(reportingStats.estimatedRevenueInr === undefined, "No fake revenue numbers generated");

  } finally {
    // Restore initial config to prevent test side effects
    saveAdSenseConfig(originalConfig);
  }

  console.log("\n================================================================================");
  console.log(`  PHASE 12 ADSENSE TEST SUITE SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log("================================================================================\n");

  if (passedCount !== totalCount) {
    throw new Error(`Phase 12 tests failed: ${passedCount}/${totalCount} passed`);
  }
}

// Run when executed directly
if (require.main === module) {
  runPhase12Tests().catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
}
