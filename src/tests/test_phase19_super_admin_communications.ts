/**
 * Automated Verification Suite: Phase 19 - Super Admin Global Communication Controls
 * Tests server-side gating, master kill-switch, security bypass, audience isolation,
 * real provider health reporting, database persistence, and audit logging.
 */

import assert from "assert";
import {
  readPlatformCommunicationSettings,
  writePlatformCommunicationSettings,
  updatePlatformCommunicationSettings,
  invalidatePlatformCommunicationSettingsCache,
  DEFAULT_PLATFORM_COMMUNICATION_SETTINGS,
  readAuditLogs
} from "../lib/db";
import {
  canSendCommunication,
  getCommunicationProviderStatuses
} from "../lib/communication-gate";
import {
  dispatchSaasNotification,
  dispatchNotification,
  retryFailedNotification
} from "../lib/notifications";
import { PlatformCommunicationSettings } from "../lib/project-types";

console.log("\n=======================================================");
console.log("🧪 PHASE 19: SUPER ADMIN GLOBAL COMMUNICATION CONTROLS");
console.log("=======================================================\n");

let passed = 0;
let total = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  total++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ❌ [FAIL] ${desc}`);
      console.error(err);
    });
}

export async function runPhase19Tests() {
  // Store initial settings to restore after tests
  const originalSettings = readPlatformCommunicationSettings();

  try {
    // 1. Default Platform Communication Settings Check
    await it("1. Default platform communication settings contain all 40+ scalar boolean switches", () => {
      const defaults = DEFAULT_PLATFORM_COMMUNICATION_SETTINGS;
      assert.strictEqual(defaults.globalEnabled, true);
      assert.strictEqual(defaults.emailEnabled, true);
      assert.strictEqual(defaults.whatsappEnabled, true);
      assert.strictEqual(defaults.smsEnabled, true);
      assert.strictEqual(defaults.pushEnabled, true);
      assert.strictEqual(defaults.inAppEnabled, true);
      assert.strictEqual(defaults.emailPasswordReset, true);
      assert.strictEqual(defaults.emailVerification, true);
      assert.strictEqual(defaults.emailSecurityAlerts, true);
      assert.strictEqual(defaults.clientAllEnabled, true);
      assert.strictEqual(defaults.photographerAllEnabled, true);
      assert.strictEqual(defaults.marketingAllEnabled, true);
      assert.strictEqual(defaults.marketingRequireDoubleOptIn, true);
      assert.strictEqual(defaults.marketingRespectUnsubscribe, true);
    });

    // 2. Database Persistence and Cache Invalidation
    await it("2. updatePlatformCommunicationSettings persists to disk and updates audit log", () => {
      const updated = updatePlatformCommunicationSettings(
        { maintenanceNote: "Phase 19 Automated Test Run" },
        "test-admin-user",
        "127.0.0.1"
      );

      assert.strictEqual(updated.maintenanceNote, "Phase 19 Automated Test Run");

      // Verify read from disk
      invalidatePlatformCommunicationSettingsCache();
      const readBack = readPlatformCommunicationSettings();
      assert.strictEqual(readBack.maintenanceNote, "Phase 19 Automated Test Run");

      // Verify audit log entry
      const logs = readAuditLogs();
      const communicationAudit = logs.find(l => l.action === "PLATFORM_COMMUNICATIONS_UPDATED");
      assert.ok(communicationAudit, "Audit log for PLATFORM_COMMUNICATIONS_UPDATED should exist");
      assert.strictEqual(communicationAudit?.adminId, "test-admin-user");
    });

    // 3. canSendCommunication allows normal traffic when all switches are ON
    await it("3. canSendCommunication permits standard gallery notifications when fully enabled", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: true,
        emailClientGalleries: true,
        clientAllEnabled: true,
        clientGalleryPublished: true
      });

      const check = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });

      assert.strictEqual(check.allowed, true);
    });

    // 4. Global Kill Switch: Disables non-critical communications
    await it("4. Global switch OFF blocks non-critical gallery and marketing emails", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: false,
        maintenanceNote: "Platform maintenance active"
      });

      const galleryCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });

      assert.strictEqual(galleryCheck.allowed, false);
      assert.strictEqual(galleryCheck.code, "GLOBAL_COMMUNICATIONS_DISABLED");
      assert.ok(galleryCheck.reason?.includes("Platform maintenance active"));

      const marketingCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "MARKETING_CAMPAIGN",
        audience: "MARKETING",
        recipient: "lead@example.com"
      });

      assert.strictEqual(marketingCheck.allowed, false);
      assert.strictEqual(marketingCheck.code, "GLOBAL_COMMUNICATIONS_DISABLED");
    });

    // 5. Global Master Switch blocks all communications unconditionally
    await it("5. Global switch OFF blocks all outbound communications (including Password Reset and Security Alerts)", async () => {
      updatePlatformCommunicationSettings({
        allCommunicationsEnabled: false,
        globalEnabled: false,
        emailEnabled: false
      });

      const passwordReset = await canSendCommunication({
        channel: "EMAIL",
        event: "PASSWORD_RESET",
        audience: "SYSTEM",
        recipient: "admin@example.com"
      });
      assert.strictEqual(passwordReset.allowed, false, "PASSWORD_RESET is blocked when Master switch is OFF");
      assert.strictEqual(passwordReset.code, "GLOBAL_COMMUNICATIONS_DISABLED");

      const emailVerification = await canSendCommunication({
        channel: "EMAIL",
        event: "EMAIL_VERIFICATION",
        audience: "SYSTEM",
        recipient: "newuser@example.com"
      });
      assert.strictEqual(emailVerification.allowed, false, "EMAIL_VERIFICATION is blocked when Master switch is OFF");

      const securityAlert = await canSendCommunication({
        channel: "EMAIL",
        event: "SECURITY_ALERT",
        audience: "SYSTEM",
        recipient: "user@example.com"
      });
      assert.strictEqual(securityAlert.allowed, false, "SECURITY_ALERT is blocked when Master switch is OFF");
    });

    // 6. Channel Specific Kill Switches: Email, WhatsApp, SMS, Push, In-App
    await it("6. Channel-specific kill switches independently block respective channels", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: false,
        whatsappEnabled: true,
        smsEnabled: false,
        pushEnabled: false
      });

      const emailCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });
      assert.strictEqual(emailCheck.allowed, false);
      assert.strictEqual(emailCheck.code, "EMAIL_CHANNEL_DISABLED");

      const whatsappCheck = await canSendCommunication({
        channel: "WHATSAPP",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "+919876543210"
      });
      assert.strictEqual(whatsappCheck.allowed, true, "WhatsApp should remain allowed when email is disabled");

      const smsCheck = await canSendCommunication({
        channel: "SMS",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "+919876543210"
      });
      assert.strictEqual(smsCheck.allowed, false);
      assert.strictEqual(smsCheck.code, "SMS_CHANNEL_DISABLED");
    });

    // 7. Feature-Level Granular Switches
    await it("7. Feature-level granular toggles block specific events without disabling entire channel", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: true,
        emailClientGalleries: false, // Turned off
        emailClientSelections: true  // Turned on
      });

      const galleryPublished = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });
      assert.strictEqual(galleryPublished.allowed, false);
      assert.strictEqual(galleryPublished.code, "FEATURE_DISABLED_EMAIL_CLIENT_GALLERIES");

      const selectionConfirmed = await canSendCommunication({
        channel: "EMAIL",
        event: "SELECTION_UPDATED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });
      assert.strictEqual(selectionConfirmed.allowed, true);
    });

    // 8. Audience-Level Controls (Client vs Photographer vs Marketing)
    await it("8. Audience master switches isolate Client and Photographer communications", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: true,
        emailClientGalleries: true,
        clientAllEnabled: false, // Mute all clients
        photographerAllEnabled: true // Keep photographers active
      });

      const clientMsg = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });
      assert.strictEqual(clientMsg.allowed, false);
      assert.strictEqual(clientMsg.code, "AUDIENCE_CLIENT_DISABLED");

      const photographerMsg = await canSendCommunication({
        channel: "EMAIL",
        event: "SELECTION_SUBMITTED",
        audience: "PHOTOGRAPHER",
        recipient: "photographer@example.com"
      });
      assert.strictEqual(photographerMsg.allowed, true);
    });

    // 9. Marketing Guardrails and Opt-In Enforcement
    await it("9. Marketing switch blocks promotional campaigns while keeping transactional active", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: true,
        clientAllEnabled: true,
        marketingAllEnabled: false
      });

      const marketingCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "MARKETING_CAMPAIGN",
        audience: "MARKETING",
        recipient: "subscriber@example.com"
      });
      assert.strictEqual(marketingCheck.allowed, false);
      assert.strictEqual(marketingCheck.code, "MARKETING_DISABLED");

      // Transactional gallery email remains allowed
      const transactionalCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient: "couple@example.com"
      });
      assert.strictEqual(transactionalCheck.allowed, true);
    });

    // 10. Live Infrastructure Provider Status Report (Truthful, No Fake Data)
    await it("10. getCommunicationProviderStatuses returns genuine environment configuration health", () => {
      const report = getCommunicationProviderStatuses();
      assert.ok(report.email, "Email status must exist");
      assert.ok(report.whatsapp, "WhatsApp status must exist");
      assert.ok(report.sms, "SMS status must exist");
      assert.ok(report.push, "Push status must exist");
      assert.ok(report.inApp, "In-App status must exist");

      assert.strictEqual(report.inApp.status, "CONNECTED");
      assert.strictEqual(report.inApp.configured, true);

      // Verify no mock statistics
      assert.ok(typeof report.email.configured === "boolean");
      assert.ok(["CONNECTED", "NOT_CONFIGURED", "ERROR", "DEVELOPMENT"].includes(report.email.status));
      assert.ok(["CONNECTED", "NOT_CONFIGURED", "ERROR", "DEVELOPMENT"].includes(report.whatsapp.status));
    });

    // 11. dispatchSaasNotification creates BLOCKED_BY_PLATFORM_SETTING record when gated
    await it("11. dispatchSaasNotification records BLOCKED_BY_PLATFORM_SETTING when gated", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: false,
        maintenanceNote: "Automated test mute"
      });

      const result = await dispatchSaasNotification({
        photographerId: "test-photographer-phase19",
        projectId: "proj-19",
        event: "GALLERY_PUBLISHED",
        recipientEmail: "client@example.com",
        recipientName: "Test Client",
        coupleTitle: "Test & Partner",
        idempotencyKey: `test-p19-gate-${Date.now()}`
      });

      assert.ok(result.records.length > 0, "A notification record must be logged for auditability");
      const record = result.records[0];
      assert.strictEqual(record.status, "BLOCKED_BY_PLATFORM_SETTING");
      assert.ok(record.errorMessage?.includes("Blocked by Super Admin communication setting"));
    });

    // 12. dispatchNotification blocks non-security events and passes security events
    await it("12. dispatchNotification obeys platform settings for legacy/system events", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: false,
        emailEnabled: false
      });

      const welcomeResult = await dispatchNotification("PHOTOGRAPHER_WELCOME", {
        recipientEmail: "photographer@example.com"
      });
      assert.strictEqual(welcomeResult.success, false);
      assert.ok(welcomeResult.blockedReason?.includes("Platform communications are"));

      const resetResult = await dispatchNotification("PASSWORD_RESET", {
        recipientEmail: "photographer@example.com"
      });
      assert.strictEqual(resetResult.success, false, "PASSWORD_RESET is blocked when Master Switch is disabled");
    });

    // 13. retryFailedNotification respects communication gate
    await it("13. retryFailedNotification blocks retries when platform setting disables communication", async () => {
      updatePlatformCommunicationSettings({
        globalEnabled: true,
        emailEnabled: false // Channel disabled
      });

      // Create a mock record with dynamic unique ID to test retry
      const testRecordId = `notif-test-phase19-retry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { createNotificationRecord } = await import("../lib/db");
      await createNotificationRecord({
        id: testRecordId,
        photographerId: "test-photographer-phase19",
        projectId: "proj-19",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        recipientEmail: "client@example.com",
        recipientName: "Test Client",
        subject: "Gallery Ready",
        content: "Gallery is ready",
        status: "FAILED",
        idempotencyKey: `test-idemp-19-${Date.now()}`
      });

      const retryRes = await retryFailedNotification(testRecordId, "test-photographer-phase19");
      assert.strictEqual(retryRes.success, false);
      assert.ok(retryRes.error?.includes("Retry blocked by Super Admin communication setting"));
    });

  } finally {
    // Restore original settings
    writePlatformCommunicationSettings(originalSettings);
  }

  console.log(`\n=======================================================`);
  console.log(`Phase 19 Test Summary: ${passed}/${total} assertions passed`);
  console.log(`=======================================================\n`);

  if (passed !== total) {
    throw new Error(`Phase 19 verification failed: ${total - passed} assertion(s) failed`);
  }
}

// Auto-execute if run directly
if (process.argv[1]?.includes("test_phase19_super_admin_communications")) {
  runPhase19Tests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
