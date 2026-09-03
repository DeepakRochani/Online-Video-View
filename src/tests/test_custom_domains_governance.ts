import assert from "assert";
import {
  readPlatformDomainSettings,
  writePlatformDomainSettings,
  updatePlatformDomainSettings,
  isCustomDomainGloballyEnabled,
  canUseCustomDomain,
  addOrUpdateDomain,
  removeDomain,
  readDomains,
  writeDomains,
  getPrimaryDomainForPhotographer,
  normalizeDomain,
  detectDomainType,
  savePhotographer,
  getPhotographerById,
  readAdminAuditLogs,
  DEFAULT_PLATFORM_DOMAIN_SETTINGS,
} from "../lib/db";
import { canCreate } from "../lib/entitlements";
import { checkPlanLimit } from "../lib/plan-limits";

async function runTests() {
  console.log("Starting Custom Domains Platform Governance & Single-Domain Limit Test Suite...\n");

  // Reset database state
  writeDomains([]);
  writePlatformDomainSettings({ ...DEFAULT_PLATFORM_DOMAIN_SETTINGS, customDomainsEnabled: true });

  // Setup test photographers
  savePhotographer({
    id: "photog-domain-1",
    email: "studio1@example.com",
    name: "Studio One",
    studioName: "Studio One Weddings",
    role: "PHOTOGRAPHER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  savePhotographer({
    id: "photog-domain-2",
    email: "studio2@example.com",
    name: "Studio Two",
    studioName: "Studio Two Weddings",
    role: "PHOTOGRAPHER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Normalization & Reserved Hostnames
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Test 1: Domain Normalization and Validation");
  assert.strictEqual(
    normalizeDomain("https://GALLERY.MyStudio.com/weddings?ref=123#hero"),
    "gallery.mystudio.com",
    "Should strip scheme, path, query, hash, and lowercase"
  );
  assert.strictEqual(
    normalizeDomain("http://photos.studio.co.uk:8080/"),
    "photos.studio.co.uk",
    "Should strip port, scheme, and trailing slash"
  );
  assert.strictEqual(
    detectDomainType("gallery.mystudio.com"),
    "SUBDOMAIN",
    "Should detect standard subdomain"
  );
  assert.strictEqual(
    detectDomainType("mystudioweddings.com"),
    "CUSTOM_DOMAIN",
    "Should detect apex domain"
  );

  const resReserved = addOrUpdateDomain({
    hostname: "drfilms.com",
    photographerId: "photog-domain-1",
  });
  assert.strictEqual(resReserved.domain, null, "Should reject reserved platform domain");
  assert.strictEqual(resReserved.code, "INVALID_DOMAIN", "Should return INVALID_DOMAIN for reserved host");
  console.log("✓ Normalization & Reserved Hostnames passed.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Single-Domain Limit per Photographer (Max 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nTest 2: Strict Single-Domain Limit per Photographer (1 Domain Max)");
  
  // First domain should succeed
  const res1 = addOrUpdateDomain({
    hostname: "gallery.studio1.com",
    photographerId: "photog-domain-1",
  });
  assert(res1.domain, "First domain registration must succeed");
  assert.strictEqual(res1.domain.hostname, "gallery.studio1.com");
  assert.strictEqual(res1.domain.isPrimary, true, "Sole domain must be primary");
  assert.strictEqual(res1.domain.status, "PENDING");

  // Attempting to add a second domain for photog-domain-1 must FAIL
  const res2 = addOrUpdateDomain({
    hostname: "cinema.studio1.com",
    photographerId: "photog-domain-1",
  });
  assert.strictEqual(res2.domain, null, "Second domain must be rejected");
  assert.strictEqual(res2.code, "CUSTOM_DOMAIN_LIMIT_REACHED");
  assert(res2.error?.includes("already have a custom domain connected"), "Error message must be descriptive");

  // Entitlements check must also report limit reached
  const entCheck = canCreate("photog-domain-1", "customDomains");
  assert.strictEqual(entCheck.allowed, false, "canCreate must return false when limit is reached");
  assert.strictEqual(entCheck.code, "CUSTOM_DOMAIN_LIMIT_REACHED");
  assert.strictEqual(entCheck.current, 1);
  assert.strictEqual(entCheck.limit, 1);

  // Plan limits check must also report limit reached
  const planCheck = checkPlanLimit("photog-domain-1", "maxCustomDomains");
  assert.strictEqual(planCheck.allowed, false, "checkPlanLimit must return false when limit is reached");

  // Updating the existing domain with same hostname should succeed
  const resUpdate = addOrUpdateDomain({
    hostname: "gallery.studio1.com",
    photographerId: "photog-domain-1",
    targetCname: "custom-cname.drfilms.com",
  });
  assert(resUpdate.domain, "Updating existing domain must succeed");
  assert.strictEqual(resUpdate.domain.targetCname, "custom-cname.drfilms.com");

  console.log("✓ Single-Domain Limit per Photographer passed.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Cross-Tenant Domain Isolation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nTest 3: Cross-Tenant Domain Ownership Isolation");
  
  // Photog 2 tries to claim photog 1's domain
  const resCross = addOrUpdateDomain({
    hostname: "gallery.studio1.com",
    photographerId: "photog-domain-2",
  });
  assert.strictEqual(resCross.domain, null, "Cross-tenant domain collision must be rejected");
  assert.strictEqual(resCross.code, "DOMAIN_ALREADY_CONNECTED");

  // Photog 2 connecting their own domain should succeed
  const resPhotog2 = addOrUpdateDomain({
    hostname: "photos.studio2.com",
    photographerId: "photog-domain-2",
  });
  assert(resPhotog2.domain, "Photographer 2 domain must succeed");
  assert.strictEqual(resPhotog2.domain.photographerId, "photog-domain-2");

  console.log("✓ Cross-Tenant Domain Isolation passed.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Global Custom Domain ON/OFF Toggle
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nTest 4: Global Custom Domain ON/OFF Toggle & Governance");

  // 1. Toggle OFF globally
  const updatedSettings = updatePlatformDomainSettings(
    { customDomainsEnabled: false },
    "super-admin-1",
    "admin@drfilms.com"
  );
  assert.strictEqual(updatedSettings.customDomainsEnabled, false);
  assert.strictEqual(isCustomDomainGloballyEnabled(), false);

  // 2. When OFF, canUseCustomDomain returns false
  const canUseRes = canUseCustomDomain("photog-domain-1");
  assert.strictEqual(canUseRes.allowed, false);
  assert.strictEqual(canUseRes.code, "CUSTOM_DOMAINS_DISABLED");

  // 3. When OFF, entitlements canCreate returns false
  const entGlobalCheck = canCreate("photog-domain-2", "customDomains");
  assert.strictEqual(entGlobalCheck.allowed, false);
  assert.strictEqual(entGlobalCheck.code, "CUSTOM_DOMAINS_DISABLED");

  // 4. When OFF, getPrimaryDomainForPhotographer returns null
  const primaryWhenOff = getPrimaryDomainForPhotographer("photog-domain-1");
  assert.strictEqual(primaryWhenOff, null, "Primary domain must return null when custom domains are globally disabled");

  // 5. When OFF, new domain creation fails
  const resWhenOff = addOrUpdateDomain({
    hostname: "brand-new.studio.com",
    photographerId: "photog-domain-3",
  });
  assert.strictEqual(resWhenOff.domain, null);
  assert.strictEqual(resWhenOff.code, "CUSTOM_DOMAINS_DISABLED");

  // 6. Toggle ON globally
  const reenabledSettings = updatePlatformDomainSettings(
    { customDomainsEnabled: true },
    "super-admin-1",
    "admin@drfilms.com"
  );
  assert.strictEqual(reenabledSettings.customDomainsEnabled, true);
  assert.strictEqual(isCustomDomainGloballyEnabled(), true);

  console.log("✓ Global Custom Domain ON/OFF Toggle passed.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Disconnect and Reconnect (Lifecycle)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nTest 5: Disconnect and Reconnect Workflow");

  const domainsBefore = readDomains();
  const photog1Domain = domainsBefore.find((d) => d.photographerId === "photog-domain-1");
  assert(photog1Domain, "Photog 1 domain exists");

  // Disconnect domain
  const removed = removeDomain(photog1Domain.id, "photog-domain-1");
  assert.strictEqual(removed, true, "Domain removal must succeed");

  // Now photographer 1 has 0 domains and can connect a new one
  const entAfterDisconnect = canCreate("photog-domain-1", "customDomains");
  assert.strictEqual(entAfterDisconnect.allowed, true, "canCreate must allow 1 domain after disconnect");

  const resNewDomain = addOrUpdateDomain({
    hostname: "cinema-new.studio1.com",
    photographerId: "photog-domain-1",
  });
  assert(resNewDomain.domain, "Connecting replacement domain must succeed");
  assert.strictEqual(resNewDomain.domain.hostname, "cinema-new.studio1.com");

  console.log("✓ Disconnect and Reconnect Workflow passed.");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Audit Logging Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nTest 6: Admin Audit Logging");
  const auditLogs = readAdminAuditLogs();
  const domainAuditActions = auditLogs.filter(
    (l) => l.action.startsWith("DOMAIN_") || l.action.startsWith("PLATFORM_DOMAINS_")
  );

  assert(domainAuditActions.length >= 3, "Audit logs must record domain creations, deletions, and settings changes");
  const settingsLog = domainAuditActions.find((l) => l.action === "PLATFORM_DOMAINS_UPDATED");
  assert(settingsLog, "PLATFORM_DOMAINS_UPDATED audit log must be recorded");

  console.log("✓ Admin Audit Logging passed.");
  console.log("\n🎉 ALL CUSTOM DOMAINS PLATFORM GOVERNANCE TESTS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
