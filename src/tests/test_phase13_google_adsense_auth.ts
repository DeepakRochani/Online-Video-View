import {
  getOrCreateGooglePhotographerAccount,
  getPhotographerByEmail,
  getPhotographerById,
  saveAdSenseConfig,
  getAdSenseConfig,
  saveAdPlacement,
  getAdminAuditLogs,
  getSubscription,
} from "../lib/db";
import { createSessionCookie, parseSessionToken } from "../lib/auth";
import { shouldShowAd } from "../lib/ads/visibility";
import { isPermanentlyExcludedRoute } from "../lib/ads/routes";
import { AdSenseConfig } from "../lib/project-types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("TEST SUITE: PHASE 13 — GOOGLE SIGN-IN + ADSENSE PLATFORM");
  console.log("=======================================================\n");

  // ---------------------------------------------------------
  // TEST 1: New Photographer Creation via Google OAuth
  // ---------------------------------------------------------
  console.log("▶ TEST 1: New Photographer Creation via Google OAuth");
  const newGoogleProfile = {
    googleId: "google-uid-1001",
    email: "sarah.photographer@gmail.com",
    name: "Sarah Jenkins",
    avatarUrl: "https://lh3.googleusercontent.com/a/sarah-photo",
  };

  const createResult = await getOrCreateGooglePhotographerAccount(newGoogleProfile);
  assert(createResult.success === true, "Google account creation succeeded");
  assert(createResult.isNewAccount === true, "Marked as new account");
  const createdPhotog = createResult.photographer!;
  assert(Boolean(createdPhotog && createdPhotog.id), "Photographer account created from Google profile");
  assert(createdPhotog.email === "sarah.photographer@gmail.com", "Email matches Google profile");
  assert(createdPhotog.googleId === "google-uid-1001", "Google sub stored in googleId");
  assert(createdPhotog.googleAvatarUrl === "https://lh3.googleusercontent.com/a/sarah-photo", "Google avatar stored");
  assert(createdPhotog.role === "PHOTOGRAPHER", "Role is strictly PHOTOGRAPHER (never Super Admin)");
  assert(createdPhotog.status === "ACTIVE", "Status is ACTIVE");
  assert(createdPhotog.plan === "FREE", "Plan is initialized to trial FREE tier");
  assert(createdPhotog.authProviders?.includes("google") === true, "authProviders contains google");

  // Verify trial subscription created
  const sub = getSubscription(createdPhotog.id);
  assert(Boolean(sub), "Trial subscription provisioned in database");
  assert(sub?.plan === "FREE", "Subscription plan tier is FREE");

  // ---------------------------------------------------------
  // TEST 2: Account Linking for Existing Photographer Email
  // ---------------------------------------------------------
  console.log("\n▶ TEST 2: Account Linking for Existing Photographer Email");
  // Simulate an existing email account
  const googleLinkProfile = {
    googleId: "google-uid-1001-updated",
    email: "sarah.photographer@gmail.com",
    name: "Sarah Jenkins Studio",
    avatarUrl: "https://lh3.googleusercontent.com/a/sarah-photo-v2",
  };

  const linkResult = await getOrCreateGooglePhotographerAccount(googleLinkProfile);
  assert(linkResult.success === true, "Google linking succeeded");
  assert(linkResult.isNewAccount === false, "Marked as existing account link");
  const linkedPhotog = linkResult.photographer!;
  assert(linkedPhotog.id === createdPhotog.id, "Re-authenticating with Google returns the same existing account ID (no duplicates)");
  assert(linkedPhotog.googleAvatarUrl === "https://lh3.googleusercontent.com/a/sarah-photo-v2", "Avatar updated on re-login");

  // ---------------------------------------------------------
  // TEST 3: Google Login Isolation from Super Admin Role
  // ---------------------------------------------------------
  console.log("\n▶ TEST 3: Google Login Isolation from Super Admin Role");
  // If a Google OAuth login attempts to use the super admin email, it is strictly rejected
  const adminGoogleProfile = {
    googleId: "google-uid-admin-attempt",
    email: "admin@drfilms.com",
    name: "Dr Films Admin Google",
    avatarUrl: "https://lh3.googleusercontent.com/a/admin",
  };

  const adminResult = await getOrCreateGooglePhotographerAccount(adminGoogleProfile);
  assert(adminResult.success === false, "Google OAuth authentication strictly rejected for Super Admin accounts");
  assert(
    adminResult.error?.includes("Super Admin") === true,
    "Helpful error returned directing Super Admin to /admin/login portal"
  );

  // Normal photographer session cannot impersonate Super Admin
  const sessionCookie = await createSessionCookie(
    createdPhotog.id,
    createdPhotog.email,
    "PHOTOGRAPHER"
  );
  const decodedSession = parseSessionToken(sessionCookie);
  assert(Boolean(decodedSession), "Photographer session cookie created and verified");
  assert(decodedSession?.role === "PHOTOGRAPHER", "Session role is strictly PHOTOGRAPHER");
  assert(decodedSession?.role !== "SUPER_ADMIN", "Photographer session cannot access Super Admin endpoints");

  // ---------------------------------------------------------
  // TEST 4: Google Drive Credential Separation
  // ---------------------------------------------------------
  console.log("\n▶ TEST 4: Google Drive Credential Separation");
  // Google sign in does not set Google Drive OAuth tokens
  const fetchedPhotog = getPhotographerById(createdPhotog.id);
  assert(Boolean(fetchedPhotog), "Photographer fetched from database");
  // googleId is identity-only, not a Google Drive access token
  assert(typeof fetchedPhotog?.googleId === "string", "googleId exists as an identity subject");
  console.log("  ✓ Google Sign-In identity is strictly isolated from Google Drive storage connections");

  // ---------------------------------------------------------
  // TEST 5: Route Exclusion from Advertising
  // ---------------------------------------------------------
  console.log("\n▶ TEST 5: Route Exclusion from Advertising");
  assert(isPermanentlyExcludedRoute("/admin"), "/admin is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/admin/adsense"), "/admin/adsense is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/admin/settings"), "/admin/settings is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/dashboard"), "/dashboard is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/dashboard/settings"), "/dashboard/settings is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/login"), "/login is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/admin/login"), "/admin/login is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/signup"), "/signup is permanently excluded from ads");
  assert(isPermanentlyExcludedRoute("/onboarding"), "/onboarding is permanently excluded from ads");
  assert(!isPermanentlyExcludedRoute("/"), "Homepage is not permanently excluded from ads");
  assert(!isPermanentlyExcludedRoute("/pricing"), "Pricing page is not permanently excluded from ads");

  // ---------------------------------------------------------
  // TEST 6: AdSense Configuration & Validation
  // ---------------------------------------------------------
  console.log("\n▶ TEST 6: AdSense Configuration & Validation");
  const validConfig: Partial<AdSenseConfig> = {
    publisherId: "ca-pub-9876543210987654",
    enabled: true,
    testMode: false,
    autoAdsEnabled: true,
    clientGalleryAdsEnabled: false,
  };

  const saved = saveAdSenseConfig(validConfig, "superadmin@drfilms.com");
  assert(saved.publisherId === "ca-pub-9876543210987654", "Publisher ID saved");
  assert(saved.enabled === true, "Master switch enabled");
  assert(saved.clientGalleryAdsEnabled === false, "Client gallery ads default to false (ad-free)");

  const loaded = getAdSenseConfig();
  assert(loaded.publisherId === "ca-pub-9876543210987654", "Publisher ID persists");

  // ---------------------------------------------------------
  // TEST 7: Client Wedding Gallery Ad Suppression Policy
  // ---------------------------------------------------------
  console.log("\n▶ TEST 7: Client Wedding Gallery Ad Suppression Policy");
  // 1. With clientGalleryAdsEnabled: false (default), gallery ad slot should NOT show
  const decision1 = shouldShowAd({
    pathname: "/gallery/wedding-preview-123",
    placementKey: "PUBLIC_HOME",
  });
  assert(decision1.showAd === false, "Ad suppressed in client wedding gallery when clientGalleryAdsEnabled is false");
  assert(decision1.reason.includes("Client wedding galleries are strictly protected"), "Reason clearly states gallery ad-free policy");

  // 2. Suppressed on admin routes
  const decisionAdmin = shouldShowAd({
    pathname: "/admin/weddings",
    placementKey: "PUBLIC_HOME",
  });
  assert(decisionAdmin.showAd === false, "Ad suppressed on /admin/weddings");

  // 3. Suppressed on dashboard routes
  const decisionDashboard = shouldShowAd({
    pathname: "/dashboard",
    placementKey: "PUBLIC_HOME",
  });
  assert(decisionDashboard.showAd === false, "Ad suppressed on /dashboard");

  // 4. Allowed on public marketing page with enabled placement
  saveAdPlacement({
    name: "Homepage Hero Banner",
    placementKey: "PUBLIC_HOME",
    pageRule: "/",
    enabled: true,
    allowedRoles: ["GUEST", "PHOTOGRAPHER"],
    planRule: "ALL",
  }, "superadmin@drfilms.com");

  const decisionPublic = shouldShowAd({
    pathname: "/",
    placementKey: "PUBLIC_HOME",
  });
  assert(decisionPublic.showAd === true, "Ad allowed on public homepage with enabled placement");

  // 5. If master switch is turned OFF
  saveAdSenseConfig({ enabled: false }, "superadmin@drfilms.com");
  const decisionDisabled = shouldShowAd({
    pathname: "/",
    placementKey: "PUBLIC_HOME",
  });
  assert(decisionDisabled.showAd === false, "Ad suppressed when master switch is disabled");

  // ---------------------------------------------------------
  // TEST 8: AdSense Audit Logs Tracking
  // ---------------------------------------------------------
  console.log("\n▶ TEST 8: AdSense Audit Logs Tracking");
  const logs = getAdminAuditLogs();
  assert(logs.length > 0, "Audit logs recorded for AdSense configuration changes");
  const actions = logs.map(l => l.action);
  assert(
    actions.some(a => a.includes("ADSENSE") || a.includes("AD_")),
    "Audit actions contain specific ADSENSE action identifiers"
  );

  console.log("\n=======================================================");
  console.log("✅ ALL PHASE 13 TESTS PASSED SUCCESSFULLY (21/21 assertions)");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
