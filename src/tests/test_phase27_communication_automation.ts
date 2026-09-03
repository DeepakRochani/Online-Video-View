/**
 * Comprehensive 21-Point Test Suite for Phase 27:
 * Production Communication Automation + Global Super Admin Controls
 */

import {
  readPlatformCommunicationSettings,
  writePlatformCommunicationSettings,
  updatePlatformCommunicationSettings,
  invalidatePlatformCommunicationSettingsCache,
  createPhotographer,
  savePhotographer,
  readProjects,
  writeProjects,
  deleteProject,
  createNotificationRecord,
  getNotificationById,
} from "../lib/db";
import { CommunicationService } from "../lib/communication-service";
import { canSendCommunication, getCommunicationProviderStatuses } from "../lib/communication-gate";
import { dispatchSaasNotification, retryFailedNotification } from "../lib/notifications";
import { PlatformCommunicationSettings } from "../lib/project-types";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log("\n========================================================");
  console.log("🚀 STARTING PHASE 27 COMMUNICATION AUTOMATION TEST SUITE");
  console.log("========================================================\n");

  // Save original settings to restore after tests
  const originalSettings = readPlatformCommunicationSettings();

  const testPhotographerId = "test_p27_photographer_" + Date.now();
  const testProjectId = "test_p27_project_" + Date.now();

  try {
    // ── Setup Test Entities ──
    savePhotographer({
      id: testPhotographerId,
      name: "Test Studio P27",
      email: "test_p27_studio@example.com",
      passwordHash: "hashed",
      role: "PHOTOGRAPHER",
      businessName: "Test Studio P27",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const allProjects = readProjects();
    writeProjects([
      ...allProjects,
      {
        id: testProjectId,
        photographerId: testPhotographerId,
        coupleName: "P27 Couple Alpha",
        weddingDate: "2026-10-10",
        status: "published",
        accessCode: "P27CODE",
        clientEmail: "couple_p27@example.com",
        clientPhone: "+15550001111",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      } as any,
    ]);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Master Switch Blocks All Channels
    // ─────────────────────────────────────────────────────────────
    console.log("--- Test 1: Master Switch Blocks All Channels ---");
    writePlatformCommunicationSettings({
      ...originalSettings,
      allCommunicationsEnabled: false,
      globalEnabled: false,
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
    });
    invalidatePlatformCommunicationSettingsCache();

    const t1Email = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });
    const t1WhatsApp = CommunicationService.evaluateGate({
      channel: "WHATSAPP",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: true,
    });
    const t1Sms = CommunicationService.evaluateGate({
      channel: "SMS",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: true,
    });

    assert(
      !t1Email.allowed && t1Email.status === "BLOCKED" && t1Email.code === "GLOBAL_COMMUNICATIONS_DISABLED",
      "Test 1.1: Master Switch blocks Email channel with GLOBAL_COMMUNICATIONS_DISABLED"
    );
    assert(
      !t1WhatsApp.allowed && t1WhatsApp.status === "BLOCKED" && t1WhatsApp.code === "GLOBAL_COMMUNICATIONS_DISABLED",
      "Test 1.2: Master Switch blocks WhatsApp channel with GLOBAL_COMMUNICATIONS_DISABLED"
    );
    assert(
      !t1Sms.allowed && t1Sms.status === "BLOCKED" && t1Sms.code === "GLOBAL_COMMUNICATIONS_DISABLED",
      "Test 1.3: Master Switch blocks SMS channel with GLOBAL_COMMUNICATIONS_DISABLED"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Master Switch Blocks All Feature Types
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 2: Master Switch Blocks All Feature Types ---");
    const featuresToTest = [
      "GALLERY_PUBLISHED",
      "SELECTION_SUBMITTED",
      "SELECTION_UPDATED",
      "GALLERY_EXPIRING_SOON",
      "TEAM_INVITE",
      "PASSWORD_RESET",
      "PAYMENT_RECEIVED",
      "SECURITY_ALERT",
    ];

    let allFeaturesBlocked = true;
    for (const feat of featuresToTest) {
      const res = CommunicationService.evaluateGate({
        channel: "EMAIL",
        event: feat,
        audience: feat.includes("SELECTION_SUBMITTED") || feat.includes("PAYMENT") ? "PHOTOGRAPHER" : "CLIENT",
        recipient: "test@example.com",
        skipProviderCheck: true,
      });
      if (res.allowed || res.status !== "BLOCKED" || res.code !== "GLOBAL_COMMUNICATIONS_DISABLED") {
        allFeaturesBlocked = false;
        console.error(`Feature ${feat} was not blocked under master switch OFF:`, res);
      }
    }
    assert(allFeaturesBlocked, "Test 2: Master Switch blocks all feature types (Gallery, Selection, Expiry, Invite, Reset, Billing, Security)");

    // ─────────────────────────────────────────────────────────────
    // TEST 3 & 4: Master Switch Preserves Channel & Feature Settings
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 3 & 4: Master Switch Preserves Settings ---");
    // Set specific granular values
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: false,
      smsEnabled: true,
      galleryPublishedEnabled: true,
      teamInvitationEnabled: false,
      passwordResetEnabled: true,
    });

    // Now turn Master OFF
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: false,
    });

    const settingsWhileOff = readPlatformCommunicationSettings();
    assert(
      settingsWhileOff.allCommunicationsEnabled === false &&
      settingsWhileOff.globalEnabled === false &&
      settingsWhileOff.emailEnabled === true &&
      settingsWhileOff.whatsappEnabled === false &&
      settingsWhileOff.smsEnabled === true,
      "Test 3: Turning Master Switch OFF preserves individual channel toggles without clearing"
    );

    assert(
      settingsWhileOff.galleryPublishedEnabled === true &&
      settingsWhileOff.teamInvitationEnabled === false &&
      settingsWhileOff.passwordResetEnabled === true,
      "Test 4: Turning Master Switch OFF preserves individual feature toggles without clearing"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Re-enabling Master Switch Restores Previous Settings
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 5: Re-enabling Master Switch Restores Settings ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
    });
    const restoredSettings = readPlatformCommunicationSettings();
    assert(
      restoredSettings.allCommunicationsEnabled === true &&
      restoredSettings.whatsappEnabled === false &&
      restoredSettings.teamInvitationEnabled === false &&
      restoredSettings.emailEnabled === true,
      "Test 5: Re-enabling Master Switch restores exact previous granular state"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Channel-Level Control: Email Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 6: Channel-Level Control: Email Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      emailEnabled: false,
      whatsappEnabled: true,
      smsEnabled: true,
    });

    const t6Email = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });
    const t6WhatsApp = CommunicationService.evaluateGate({
      channel: "WHATSAPP",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: true,
    });

    assert(
      !t6Email.allowed && t6Email.code === "EMAIL_CHANNEL_DISABLED" && t6WhatsApp.allowed,
      "Test 6: Email channel disabled blocks Email while WhatsApp remains allowed"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Channel-Level Control: WhatsApp Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 7: Channel-Level Control: WhatsApp Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: false,
    });

    const t7WhatsApp = CommunicationService.evaluateGate({
      channel: "WHATSAPP",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: true,
    });
    const t7Email = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });

    assert(
      !t7WhatsApp.allowed && t7WhatsApp.code === "WHATSAPP_CHANNEL_DISABLED" && t7Email.allowed,
      "Test 7: WhatsApp channel disabled blocks WhatsApp while Email remains allowed"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Channel-Level Control: SMS Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 8: Channel-Level Control: SMS Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      smsEnabled: false,
    });

    const t8Sms = CommunicationService.evaluateGate({
      channel: "SMS",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: true,
    });
    assert(!t8Sms.allowed && t8Sms.code === "SMS_CHANNEL_DISABLED", "Test 8: SMS channel disabled blocks SMS");

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Feature-Level Control: Gallery Published Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 9: Feature-Level: Gallery Published Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      galleryPublishedEnabled: false,
      selectionSubmittedEnabled: true,
    });

    const t9Published = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });
    const t9Selection = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "SELECTION_SUBMITTED",
      audience: "PHOTOGRAPHER",
      recipient: "photographer@example.com",
      skipProviderCheck: true,
    });

    assert(
      !t9Published.allowed && t9Published.code === "FEATURE_DISABLED_GALLERY_PUBLISHED" && t9Selection.allowed,
      "Test 9: Disabling Gallery Published feature blocks gallery emails while selection alerts pass"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Feature-Level Control: Selection Submitted Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 10: Feature-Level: Selection Submitted Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      selectionSubmittedEnabled: false,
    });

    const t10Selection = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "SELECTION_SUBMITTED",
      audience: "PHOTOGRAPHER",
      recipient: "photographer@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t10Selection.allowed && t10Selection.code === "FEATURE_DISABLED_SELECTION_SUBMITTED",
      "Test 10: Disabling Selection Submitted feature blocks selection alert"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Feature-Level Control: Selection Confirmation Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 11: Feature-Level: Selection Confirmation Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      selectionConfirmationEnabled: false,
    });

    const t11Confirm = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "SELECTION_UPDATED",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t11Confirm.allowed && t11Confirm.code === "FEATURE_DISABLED_SELECTION_CONFIRMATION",
      "Test 11: Disabling Selection Confirmation feature blocks receipt to couple"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Feature-Level Control: Expiry Reminder Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 12: Feature-Level: Expiry Reminder Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      expiryReminderEnabled: false,
    });

    const t12Expiry = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "GALLERY_EXPIRING_SOON",
      audience: "CLIENT",
      recipient: "couple@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t12Expiry.allowed && t12Expiry.code === "FEATURE_DISABLED_EXPIRY_REMINDER",
      "Test 12: Disabling Expiry Reminder feature blocks expiry warnings"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Feature-Level Control: Team Invitation Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 13: Feature-Level: Team Invitation Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      teamInvitationEnabled: false,
    });

    const t13Invite = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "TEAM_INVITE",
      audience: "PHOTOGRAPHER",
      recipient: "assistant@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t13Invite.allowed && t13Invite.code === "FEATURE_DISABLED_TEAM_INVITATION",
      "Test 13: Disabling Team Invitation feature blocks invite emails"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Feature-Level Control: Password Reset Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 14: Feature-Level: Password Reset Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      passwordResetEnabled: false,
    });

    const t14Reset = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "PASSWORD_RESET",
      audience: "SYSTEM",
      recipient: "user@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t14Reset.allowed && t14Reset.code === "FEATURE_DISABLED_PASSWORD_RESET",
      "Test 14: Disabling Password Reset feature blocks password reset emails"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Feature-Level Control: Billing Notifications Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 15: Feature-Level: Billing Notifications Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      billingNotificationsEnabled: false,
    });

    const t15Billing = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "PAYMENT_RECEIVED",
      audience: "PHOTOGRAPHER",
      recipient: "photographer@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t15Billing.allowed && t15Billing.code === "FEATURE_DISABLED_BILLING_NOTIFICATIONS",
      "Test 15: Disabling Billing Notifications feature blocks receipt emails"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Feature-Level Control: Security Notifications Disabled
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 16: Feature-Level: Security Notifications Disabled ---");
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      securityNotificationsEnabled: false,
    });

    const t16Security = CommunicationService.evaluateGate({
      channel: "EMAIL",
      event: "SECURITY_ALERT",
      audience: "SYSTEM",
      recipient: "user@example.com",
      skipProviderCheck: true,
    });
    assert(
      !t16Security.allowed && t16Security.code === "FEATURE_DISABLED_SECURITY_NOTIFICATIONS",
      "Test 16: Disabling Security Notifications feature blocks security alerts"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Photographer Preference Override (Level 5 Precedence)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 17: Photographer Preference Override ---");
    // Reset platform settings to all enabled
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: true,
      emailEnabled: true,
      galleryPublishedEnabled: true,
    });

    const dispatchResult = await CommunicationService.dispatch({
      event: "GALLERY_PUBLISHED",
      photographerId: testPhotographerId,
      recipientName: "Test Couple",
      recipientEmail: "couple_optout@example.com",
      coupleTitle: "Test Couple Optout",
      idempotencyKey: `TEST_P27_PREF_${Date.now()}`,
    });

    assert(
      dispatchResult.records.length > 0,
      "Test 17: Photographer preference check executes with proper record creation"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Unconfigured Provider Status (Level 7 Precedence)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 18: Unconfigured Provider Status ---");
    const statuses = getCommunicationProviderStatuses();
    assert(
      statuses && typeof statuses.email.configured === "boolean" && typeof statuses.whatsapp.configured === "boolean",
      "Test 18.1: getCommunicationProviderStatuses returns verified configuration statuses without mocking"
    );

    const isWaConfigured = CommunicationService.isChannelConfigured("WHATSAPP");
    const waGateCheck = CommunicationService.evaluateGate({
      channel: "WHATSAPP",
      event: "GALLERY_PUBLISHED",
      audience: "CLIENT",
      recipient: "+15550001111",
      skipProviderCheck: false,
    });

    if (!isWaConfigured) {
      assert(
        !waGateCheck.allowed && waGateCheck.status === "NOT_CONFIGURED" && waGateCheck.code === "PROVIDER_NOT_CONFIGURED",
        "Test 18.2: Unconfigured WhatsApp returns NOT_CONFIGURED status instead of false success"
      );
    } else {
      assert(waGateCheck.allowed, "Test 18.2: Configured WhatsApp passes provider check");
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Idempotency Deduplication
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 19: Idempotency Deduplication ---");
    const sharedIdempKey = `IDEMP_KEY_TEST_${Date.now()}`;

    const firstDispatch = await CommunicationService.dispatch({
      event: "GALLERY_PUBLISHED",
      photographerId: testPhotographerId,
      recipientName: "Idempotency Test",
      recipientEmail: "idemp@example.com",
      idempotencyKey: sharedIdempKey,
    });

    const duplicateDispatch = await CommunicationService.dispatch({
      event: "GALLERY_PUBLISHED",
      photographerId: testPhotographerId,
      recipientName: "Idempotency Test",
      recipientEmail: "idemp@example.com",
      idempotencyKey: sharedIdempKey,
    });

    assert(
      duplicateDispatch.skipped === true && duplicateDispatch.code === "IDEMPOTENT_DUPLICATE",
      "Test 19: Second dispatch with identical idempotency key is skipped as duplicate"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Worker Dispatch Re-Check at Dispatch Time
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 20: Worker Dispatch Re-Check at Dispatch Time ---");
    // Create a queued notification record
    const queuedRecord = await createNotificationRecord({
      photographerId: testPhotographerId,
      type: "GALLERY_PUBLISHED",
      channel: "EMAIL",
      recipientEmail: "queued_test@example.com",
      recipientName: "Queued Test",
      status: "QUEUED",
      subject: "Queued Gallery",
      content: "Gallery is ready",
    });

    // Now turn Master Switch OFF
    updatePlatformCommunicationSettings({
      allCommunicationsEnabled: false,
      globalEnabled: false,
    });

    // Run dispatchQueued - it must re-evaluate Master switch and block
    const queuedResult = await CommunicationService.dispatchQueued(queuedRecord.id);

    const updatedQueuedInDb = await getNotificationById(queuedRecord.id);

    assert(
      !queuedResult.success &&
      queuedResult.status === "BLOCKED" &&
      queuedResult.code === "GLOBAL_COMMUNICATIONS_DISABLED" &&
      updatedQueuedInDb?.status === "BLOCKED_BY_PLATFORM_SETTING",
      "Test 20: dispatchQueued detects Master Switch turned OFF at worker runtime and blocks delivery"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 21: Error Classification & Exponential Backoff Retry
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 21: Error Classification & Exponential Backoff ---");
    const transientErr = CommunicationService.classifyError(new Error("connect ETIMEDOUT 198.51.100.1:587"));
    const rateLimitErr = CommunicationService.classifyError({ message: "Rate limit reached", status: 429 });
    const permanentErr = CommunicationService.classifyError(new Error("550 User unknown / invalid recipient"));

    assert(
      transientErr.isTransient === true && rateLimitErr.isTransient === true,
      "Test 21.1: ETIMEDOUT and 429 errors correctly classified as transient"
    );
    assert(
      permanentErr.isTransient === false,
      "Test 21.2: Permanent 550 recipient error correctly classified as non-transient"
    );

    // Test retryFailedNotification tenant isolation & max retry limit
    const retryMaxRecord = await createNotificationRecord({
      photographerId: testPhotographerId,
      type: "GALLERY_PUBLISHED",
      channel: "EMAIL",
      recipientEmail: "retry_max@example.com",
      recipientName: "Retry Max",
      status: "FAILED",
      retryCount: 3,
      subject: "Retry Test",
      content: "Retry Test",
    });

    const retryOverLimit = await CommunicationService.retryFailedNotification(retryMaxRecord.id, testPhotographerId);
    assert(
      Boolean(!retryOverLimit.success && retryOverLimit.error?.includes("Maximum retry limit")),
      "Test 21.3: Retrying a notification that reached max attempts (3) is rejected"
    );

    const retryCrossTenant = await CommunicationService.retryFailedNotification(retryMaxRecord.id, "unauthorized_photographer");
    assert(
      Boolean(!retryCrossTenant.success && retryCrossTenant.error?.includes("Unauthorized")),
      "Test 21.4: Cross-tenant retry is rejected with unauthorized error"
    );

  } finally {
    // Clean up test data and restore platform settings
    writePlatformCommunicationSettings(originalSettings);
    invalidatePlatformCommunicationSettingsCache();
    deleteProject(testProjectId);
  }

  console.log("\n========================================================");
  console.log(`🏁 TEST SUITE COMPLETE: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution threw unhandled exception:", err);
  process.exit(1);
});
